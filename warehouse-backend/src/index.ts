import 'dotenv/config'
import http from 'http'
import express from 'express'
import cors from 'cors'
import { initDatabase } from './db/pool'
import { initMinio } from './db/minio'
import { initWebSocket } from './websocket/broadcaster'
import scansRouter from './routes/scans'
import backupRouter from './routes/backup'

async function main() {
  // ── Initialise external services ──────────────────────────────────────────
  await initDatabase()
  await initMinio()

  // ── Express app ───────────────────────────────────────────────────────────
  const app = express()

  app.use(cors({ origin: '*' }))          // All LAN clients are trusted
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  // Health check (useful for Docker healthcheck / Nginx upstream checks)
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  app.use('/api/scans', scansRouter)
  app.use('/api/backup', backupRouter)

  // Catch-all 404 for unknown API routes
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found' })
  })

  // ── HTTP server (shared with WebSocket) ───────────────────────────────────
  const server = http.createServer(app)
  initWebSocket(server)

  const PORT = parseInt(process.env.PORT || '3001')
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Listening on port ${PORT}`)
  })
}

main().catch((err) => {
  console.error('[Fatal]', err)
  process.exit(1)
})
