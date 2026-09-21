import { Router, Request, Response } from 'express'
import * as XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'
import { pool } from '../db/pool'
import { uploadBackupToCloud } from '../db/minio'

const router = Router()

// Helper to get all records formatted for Excel
async function getAllRecordsForExport() {
  const result = await pool.query(
    'SELECT * FROM scan_records ORDER BY timestamp DESC'
  )
  
  return result.rows.map((row) => ({
    'Record ID': row.id,
    'Item ID': row.item_id,
    'Timestamp': new Date(row.timestamp).toISOString(),
    'Direction': row.direction,
    'Gate Location': row.gate_location,
    'Quantity': row.quantity || 1,
    'Carrier': row.carrier || '',
    'Tracking Number': row.tracking_number || '',
    'Receiver': row.receiver,
    'Intended For': row.intended_for || '',
    'Ticket Number': row.ticket_number || '',
    'Description': row.description || '',
    'Photos Count': (row.photos as string[]).length,
    'Photo URLs': (row.photos as string[]).join('; '),
  }))
}

// Generate Excel workbook
function generateExcelWorkbook(data: Record<string, unknown>[]) {
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Scan Records')

  // Auto-size columns
  const columnWidths = [
    { wch: 36 }, // Record ID
    { wch: 20 }, // Item ID
    { wch: 20 }, // Timestamp
    { wch: 10 }, // Direction
    { wch: 12 }, // Gate Location
    { wch: 8 },  // Quantity
    { wch: 10 }, // Carrier
    { wch: 24 }, // Tracking Number
    { wch: 20 }, // Receiver
    { wch: 20 }, // Intended For
    { wch: 15 }, // Ticket Number
    { wch: 30 }, // Description
    { wch: 12 }, // Photos Count
    { wch: 50 }, // Photo URLs
  ]
  worksheet['!cols'] = columnWidths

  return workbook
}

// ── POST /api/backup/cloud - Sync to cloud storage ────────────────────────────
router.post('/cloud', async (_req: Request, res: Response) => {
  try {
    const records = await getAllRecordsForExport()
    const workbook = generateExcelWorkbook(records)
    
    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    
    // Upload to MinIO/cloud storage
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `backups/warehouse_backup_${timestamp}.xlsx`
    
    await uploadBackupToCloud(filename, buffer)
    
    console.log(`[Backup] Cloud sync completed: ${filename}`)
    
    res.json({
      success: true,
      message: 'Successfully synced to cloud storage',
      filename,
      recordCount: records.length,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[POST /backup/cloud]', err)
    res.status(500).json({ 
      success: false, 
      error: 'Failed to sync to cloud storage' 
    })
  }
})

// ── POST /api/backup/local - Sync to local server folder ──────────────────────
router.post('/local', async (_req: Request, res: Response) => {
  try {
    const records = await getAllRecordsForExport()
    const workbook = generateExcelWorkbook(records)
    
    // Local backup directory (configurable via env)
    const backupDir = process.env.LOCAL_BACKUP_DIR || '/data/backups'
    
    // Ensure directory exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
    }
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `warehouse_backup_${timestamp}.xlsx`
    const filePath = path.join(backupDir, filename)
    
    // Write the file
    XLSX.writeFile(workbook, filePath)
    
    // Also keep a "latest" copy for easy access
    const latestPath = path.join(backupDir, 'warehouse_backup_latest.xlsx')
    XLSX.writeFile(workbook, latestPath)
    
    console.log(`[Backup] Local sync completed: ${filePath}`)
    
    res.json({
      success: true,
      message: 'Successfully synced to local server',
      path: filePath,
      latestPath,
      recordCount: records.length,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[POST /backup/local]', err)
    res.status(500).json({ 
      success: false, 
      error: 'Failed to sync to local server' 
    })
  }
})

// ── GET /api/backup/status - Get last backup status ───────────────────────────
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const backupDir = process.env.LOCAL_BACKUP_DIR || '/data/backups'
    const latestPath = path.join(backupDir, 'warehouse_backup_latest.xlsx')
    
    let localStatus = { exists: false, lastModified: null as Date | null }
    
    if (fs.existsSync(latestPath)) {
      const stats = fs.statSync(latestPath)
      localStatus = {
        exists: true,
        lastModified: stats.mtime,
      }
    }
    
    res.json({
      local: localStatus,
    })
  } catch (err) {
    console.error('[GET /backup/status]', err)
    res.status(500).json({ error: 'Failed to get backup status' })
  }
})

export default router
