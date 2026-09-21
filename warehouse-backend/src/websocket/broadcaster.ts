import { WebSocketServer, WebSocket } from 'ws'
import { IncomingMessage, Server } from 'http'

let wss: WebSocketServer | null = null

export function initWebSocket(server: Server): void {
  wss = new WebSocketServer({ server, path: '/ws' })

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const ip = req.socket.remoteAddress
    console.log(`[WS] Client connected from ${ip}. Total: ${wss!.clients.size}`)

    ws.on('close', () => {
      console.log(`[WS] Client disconnected. Total: ${wss!.clients.size}`)
    })

    ws.on('error', (err) => {
      console.error('[WS] Client error:', err.message)
    })

    // Send a welcome ping so the client knows it's connected
    ws.send(JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() }))
  })

  console.log('[WS] WebSocket server ready on /ws')
}

export function broadcastNewScan(record: object): void {
  if (!wss) return
  const message = JSON.stringify({ type: 'new_scan', data: record })
  let delivered = 0
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message)
      delivered++
    }
  })
  console.log(`[WS] Broadcast new_scan to ${delivered} client(s)`)
}
