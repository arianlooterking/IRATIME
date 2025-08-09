import { getPool, initSchema } from '../../_db.js';
import { clientIP, todayYMD, CONFIG } from '../../_helpers.js';
import { recomputeTimesheet } from './timesheet.js';

export default async function handler(req, res){
  if (req.method !== 'POST') return res.status(405).end();
  await initSchema();
  const p = getPool();
  const { device_uuid, source } = req.body || {};
  if (!device_uuid) return res.status(400).json({ error: 'device_uuid required' });
  try {
    const dev = await p.query('SELECT d.*, e.id as employee_id FROM devices d JOIN employees e ON e.id = d.employee_id WHERE device_uuid=$1', [device_uuid]);
    if (!dev.rowCount) return res.status(401).json({ error: 'invalid device' });
    const ip = clientIP(req);
    if (CONFIG.PUBLIC_IPS.length>0 && !CONFIG.PUBLIC_IPS.includes(ip)) return res.status(403).json({ error: `IP ${ip} not allowed` });
    const ev = await p.query('INSERT INTO events (employee_id, device_id, type, source, public_ip) VALUES ($1,$2,$3,$4,$5) RETURNING *', [dev.rows[0].employee_id, dev.rows[0].id, 'break_end', source||'manual', ip]);
    const day = todayYMD();
    await recomputeTimesheet(p, dev.rows[0].employee_id, day);
    res.json({ ok: true, event: ev.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
}
