import { Router, Request, Response } from 'express'
import { body, validationResult } from 'express-validator'
import { v4 as uuidv4 } from 'uuid'
import { pool } from '../db/pool'
import { upload } from '../middleware/upload'
import { uploadPhoto } from '../db/minio'
import { broadcastNewScan } from '../websocket/broadcaster'

const router = Router()

// ── Helpers ──────────────────────────────────────────────────────────────────

function dbRowToRecord(row: Record<string, unknown>) {
  return {
    id:             row.id,
    itemId:         row.item_id,
    timestamp:      (row.timestamp as Date).toISOString(),
    gateLocation:   row.gate_location,
    direction:      row.direction,
    receiver:       row.receiver,
    intendedFor:    row.intended_for    ?? undefined,
    description:    row.description     ?? undefined,
    ticketNumber:   row.ticket_number   ?? undefined,
    trackingNumber: row.tracking_number ?? undefined,
    carrier:        row.carrier         ?? undefined,
    quantity:       row.quantity        ?? 1,
    photos:         row.photos as string[],
  }
}

// ── GET /api/scans?direction=inbound|outbound ─────────────────────────────────
router.get('/', async (req: Request, res: Response) => {
  try {
    const { direction, gate, carrier, limit = '500', offset = '0' } = req.query as Record<string, string>

    let query = 'SELECT * FROM scan_records WHERE 1=1'
    const params: unknown[] = []
    let paramIdx = 1

    if (direction === 'inbound' || direction === 'outbound') {
      query += ` AND direction = $${paramIdx++}`
      params.push(direction)
    }

    if (gate === 'Gate A' || gate === 'Gate B') {
      query += ` AND gate_location = $${paramIdx++}`
      params.push(gate)
    }

    if (carrier) {
      query += ` AND carrier = $${paramIdx++}`
      params.push(carrier)
    }

    query += ` ORDER BY timestamp DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`
    params.push(parseInt(limit), parseInt(offset))

    const result = await pool.query(query, params)
    res.json(result.rows.map(dbRowToRecord))
  } catch (err) {
    console.error('[GET /scans]', err)
    res.status(500).json({ error: 'Failed to fetch records' })
  }
})

// ── POST /api/scans ───────────────────────────────────────────────────────────
const scanValidation = [
  body('itemId').trim().notEmpty().withMessage('Barcode/Item ID is required'),
  body('receiver').trim().notEmpty().withMessage('Receiver name is required'),
  body('gateLocation').isIn(['Gate A', 'Gate B']).withMessage('Invalid gate location'),
  body('direction').isIn(['inbound', 'outbound']).withMessage('Direction must be inbound or outbound'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('ticketNumber').optional({ nullable: true }).trim(),
  body('intendedFor').optional({ nullable: true }).trim(),
  body('description').optional({ nullable: true }).trim(),
  body('trackingNumber').optional({ nullable: true }).trim(),
  body('carrier').optional({ nullable: true }).trim(),
]

router.post(
  '/',
  upload.array('photos', 10),
  scanValidation,
  async (req: Request, res: Response): Promise<void> => {
    // 1. Express-validator errors
    const validationErrors = validationResult(req)
    if (!validationErrors.isEmpty()) {
      res.status(400).json({ errors: validationErrors.array() })
      return
    }

    const files = req.files as Express.Multer.File[]
    const { direction, carrier } = req.body as { direction: 'inbound' | 'outbound'; carrier?: string }

    // 2. Carrier is required for inbound
    if (direction === 'inbound' && !carrier) {
      res.status(400).json({ error: 'Carrier is required for inbound shipments' })
      return
    }

    // 3. Photo count validation (direction-specific)
    const minPhotos = 1
    const maxPhotos = direction === 'inbound' ? 5 : 10

    if (!files || files.length < minPhotos) {
      res.status(400).json({ error: `At least ${minPhotos} photo is required` })
      return
    }
    if (files.length > maxPhotos) {
      res.status(400).json({
        error: `Maximum ${maxPhotos} photos allowed for ${direction} records`,
      })
      return
    }

    try {
      // 4. Upload photos to MinIO
      const id = uuidv4()
      const photoUrls: string[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const ext = file.mimetype === 'image/png' ? 'png' : 'jpg'
        const objectName = `${id}/${i + 1}.${ext}`
        const url = await uploadPhoto(objectName, file.buffer, file.mimetype)
        photoUrls.push(url)
      }

      // 5. Persist to PostgreSQL
      const {
        itemId,
        gateLocation,
        receiver,
        ticketNumber,
        intendedFor,
        description,
        trackingNumber,
        quantity,
      } = req.body as Record<string, string>

      const result = await pool.query(
        `INSERT INTO scan_records
          (id, item_id, timestamp, gate_location, direction, receiver,
           intended_for, description, ticket_number, tracking_number, carrier, quantity, photos)
         VALUES ($1,$2,NOW(),$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         RETURNING *`,
        [
          id,
          itemId,
          gateLocation,
          direction,
          receiver,
          intendedFor     || null,
          description     || null,
          ticketNumber    || null,
          trackingNumber  || null,
          carrier         || null,
          parseInt(quantity) || 1,
          photoUrls,
        ]
      )

      const record = dbRowToRecord(result.rows[0])

      // 6. Broadcast to all dashboard WebSocket clients
      broadcastNewScan(record)

      res.status(201).json(record)
    } catch (err) {
      console.error('[POST /scans]', err)
      res.status(500).json({ error: 'Failed to save record' })
    }
  }
)

// ── GET /api/scans/:id ────────────────────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM scan_records WHERE id = $1',
      [req.params.id]
    )
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Record not found' })
      return
    }
    res.json(dbRowToRecord(result.rows[0]))
  } catch (err) {
    console.error('[GET /scans/:id]', err)
    res.status(500).json({ error: 'Failed to fetch record' })
  }
})

export default router
