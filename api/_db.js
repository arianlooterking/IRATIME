import { Pool } from 'pg';

// Reuse pool across invocations
let pool;
export function getPool() {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return pool;
}

export async function initSchema() {
  const sql = `
  CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY, name TEXT NOT NULL, phone TEXT UNIQUE, role TEXT, status TEXT DEFAULT 'active', created_at TIMESTAMPTZ DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS devices (
    id SERIAL PRIMARY KEY, employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    device_uuid TEXT UNIQUE NOT NULL, platform TEXT, wifi_mac TEXT, registered_at TIMESTAMPTZ DEFAULT now(), last_seen TIMESTAMPTZ
  );
  CREATE UNIQUE INDEX IF NOT EXISTS devices_wifi_mac_idx ON devices (lower(wifi_mac)) WHERE wifi_mac IS NOT NULL;
  CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY, employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE, device_id INTEGER REFERENCES devices(id) ON DELETE SET NULL,
    type TEXT CHECK (type IN ('check_in','check_out','break_start','break_end')) NOT NULL,
    source TEXT CHECK (source IN ('auto','manual','admin')) NOT NULL DEFAULT 'manual',
    public_ip TEXT, created_at TIMESTAMPTZ DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS timesheets (
    id SERIAL PRIMARY KEY, employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL, work_minutes INTEGER DEFAULT 0, break_minutes INTEGER DEFAULT 0, overtime_minutes INTEGER DEFAULT 0,
    details JSONB DEFAULT '[]'::jsonb, UNIQUE (employee_id, date)
  );`;
  const p = getPool();
  await p.query(sql);
}
