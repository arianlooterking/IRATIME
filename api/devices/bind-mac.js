import { getPool, initSchema } from '../_db.js';
export default async function handler(req,res){
  console.log('Incoming request', req.method, req.url, req.body);
  if (req.method !== 'POST') return res.status(405).end();
  await initSchema();
  const { device_uuid, wifi_mac } = req.body || {};
  if (!device_uuid || !wifi_mac) return res.status(400).json({ error:'device_uuid and wifi_mac required' });
  const p = getPool();
  try {
    const d = await p.query('SELECT id FROM devices WHERE device_uuid=$1', [device_uuid]);
    if (!d.rowCount) return res.status(404).json({ error:'device not found' });
    await p.query('UPDATE devices SET wifi_mac=lower($1) WHERE id=$2', [wifi_mac, d.rows[0].id]);
    res.json({ ok:true });
  } catch (e) {
    res.status(500).json({ error:e.message });
  }
}