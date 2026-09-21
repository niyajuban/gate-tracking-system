import { Pool } from 'pg'

export const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'warehouse',
  user: process.env.POSTGRES_USER || 'warehouse_user',
  password: process.env.POSTGRES_PASSWORD || 'warehouse_pass',
})

export async function initDatabase(): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS scan_records (
        id              TEXT PRIMARY KEY,
        item_id         TEXT NOT NULL,
        timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        gate_location   TEXT NOT NULL CHECK (gate_location IN ('Gate A', 'Gate B')),
        direction       TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
        receiver        TEXT NOT NULL,
        intended_for    TEXT,
        description     TEXT,
        ticket_number   TEXT,
        tracking_number TEXT,
        carrier         TEXT,
        quantity        INTEGER NOT NULL DEFAULT 1,
        photos          TEXT[] NOT NULL DEFAULT '{}'
      )
    `)

    // Add new columns if they don't exist (for existing databases)
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='scan_records' AND column_name='tracking_number') THEN
          ALTER TABLE scan_records ADD COLUMN tracking_number TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='scan_records' AND column_name='carrier') THEN
          ALTER TABLE scan_records ADD COLUMN carrier TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='scan_records' AND column_name='quantity') THEN
          ALTER TABLE scan_records ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1;
        END IF;
      END $$;
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_scan_records_direction   ON scan_records (direction)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_scan_records_timestamp   ON scan_records (timestamp DESC)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_scan_records_gate        ON scan_records (gate_location)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_scan_records_carrier     ON scan_records (carrier)
    `)

    console.log('[DB] Schema ready')
  } finally {
    client.release()
  }
}
