import type { ScanRecord } from './types'

// In production (served by Nginx) the API is at /api
// In local Next.js dev you can set NEXT_PUBLIC_API_URL=http://localhost:3001
const API_BASE =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) || ''

// ── REST helpers ─────────────────────────────────────────────────────────────

export async function fetchInboundRecords(): Promise<ScanRecord[]> {
  const res = await fetch(`${API_BASE}/api/scans?direction=inbound`)
  if (!res.ok) throw new Error(`Failed to fetch inbound records: ${res.status}`)
  return res.json() as Promise<ScanRecord[]>
}

export async function fetchOutboundRecords(): Promise<ScanRecord[]> {
  const res = await fetch(`${API_BASE}/api/scans?direction=outbound`)
  if (!res.ok) throw new Error(`Failed to fetch outbound records: ${res.status}`)
  return res.json() as Promise<ScanRecord[]>
}

export async function fetchAllRecords(): Promise<ScanRecord[]> {
  const res = await fetch(`${API_BASE}/api/scans`)
  if (!res.ok) throw new Error(`Failed to fetch records: ${res.status}`)
  const records = (await res.json()) as ScanRecord[]
  return records.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )
}

export async function submitScan(
  formData: FormData
): Promise<ScanRecord> {
  const res = await fetch(`${API_BASE}/api/scans`, {
    method: 'POST',
    body: formData, // multipart — no Content-Type header set manually
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string; errors?: { msg: string }[] }
    const message =
      body.error ||
      (body.errors && body.errors.map((e) => e.msg).join(', ')) ||
      `Request failed: ${res.status}`
    throw new Error(message)
  }
  return res.json() as Promise<ScanRecord>
}

// ── Backup / Sync helpers ────────────────────────────────────────────────────

export async function syncToCloud(): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/api/backup/cloud`, {
    method: 'POST',
  })
  if (!res.ok) {
    throw new Error(`Failed to sync to cloud: ${res.status}`)
  }
  return res.json() as Promise<{ success: boolean; message: string }>
}

export async function syncToLocal(): Promise<{ success: boolean; message: string; path?: string }> {
  const res = await fetch(`${API_BASE}/api/backup/local`, {
    method: 'POST',
  })
  if (!res.ok) {
    throw new Error(`Failed to sync to local: ${res.status}`)
  }
  return res.json() as Promise<{ success: boolean; message: string; path?: string }>
}

// ── WebSocket helper ──────────────────────────────────────────────────────────

type WSMessage =
  | { type: 'connected'; timestamp: string }
  | { type: 'new_scan'; data: ScanRecord }

type ScanListener = (record: ScanRecord) => void

export function connectDashboardSocket(onNewScan: ScanListener): () => void {
  // Derive the WS URL from the current page origin
  const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  const wsBase =
    process.env.NEXT_PUBLIC_WS_URL ||
    `${wsProtocol}://${window.location.host}`
  const url = `${wsBase}/ws`

  let ws: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let destroyed = false

  function connect() {
    if (destroyed) return
    ws = new WebSocket(url)

    ws.onopen = () => {
      console.log('[WS] Connected to dashboard socket')
      if (reconnectTimer) clearTimeout(reconnectTimer)
    }

    ws.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data as string) as WSMessage
        if (msg.type === 'new_scan') {
          onNewScan(msg.data)
        }
      } catch {
        // ignore malformed frames
      }
    }

    ws.onclose = () => {
      if (!destroyed) {
        console.log('[WS] Disconnected — reconnecting in 3 s…')
        reconnectTimer = setTimeout(connect, 3000)
      }
    }

    ws.onerror = (err) => {
      console.error('[WS] Error:', err)
      ws?.close()
    }
  }

  connect()

  // Return cleanup function
  return () => {
    destroyed = true
    if (reconnectTimer) clearTimeout(reconnectTimer)
    ws?.close()
  }
}
