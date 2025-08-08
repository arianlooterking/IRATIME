import { getPool, initSchema } from '../_db.js';
export default async function handler(req,res){
  if (req.method !== 'POST') return res.status(405).end();
  await initSchema();
  const { secret, mac, type } = req.body || {};
  if (!secret || secret !== process.env.ROUTER_WEBHOOK_SECRET) return res.status(401).json({ error:'bad secret' });
  if (!mac || !type) return res.status(400).json({ error:'mac and type required' });
  const p = getPool();
  try {
    const emp = await p.query('SELECT employee_id, id as device_id FROM devices WHERE lower(wifi_mac)=lower($1) LIMIT 1', [mac]);
    if (!emp.rowCount) return res.status(404).json({ error:'unknown mac' });
    const evt = type === 'assoc' ? 'check_in' : 'check_out';
    const ins = await p.query('INSERT INTO events (employee_id, device_id, type, source, public_ip) VALUES ($1,$2,$3,$4,$5) RETURNING *', [emp.rows[0].employee_id, emp.rows[0].device_id, evt, 'auto', 'router-webhook']);
    res.json({ ok: true, event: ins.rows[0] });
  } catch (e) {
    res.status(500).json({ error:e.message });
  }
}