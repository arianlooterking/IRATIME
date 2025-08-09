import { getPool, initSchema } from '../_db.js';
import { clientIP, CONFIG } from '../_helpers.js';
import { recordEvent } from '../events/_utils.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (req.headers['x-router-secret'] !== CONFIG.ROUTER_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  await initSchema();
  const { event, wifi_mac, device_uuid, lat, lon, latitude, longitude } = req.body || {};
  if (!event || !['assoc', 'disassoc'].includes(event)) {
    return res.status(400).json({ error: 'invalid event' });
  }
  if (!wifi_mac && !device_uuid) {
    return res.status(400).json({ error: 'wifi_mac or device_uuid required' });
  }
  const p = getPool();
  try {
    let device;
    if (wifi_mac) {
      const d = await p.query('SELECT * FROM devices WHERE lower(wifi_mac)=lower($1) LIMIT 1', [wifi_mac]);
      if (d.rowCount) device = d.rows[0];
    }
    if (!device && device_uuid) {
      const d = await p.query('SELECT * FROM devices WHERE device_uuid=$1', [device_uuid]);
      if (d.rowCount) device = d.rows[0];
    }
    if (!device) return res.status(404).json({ error: 'device not found' });

    const ip = clientIP(req);
    if (CONFIG.PUBLIC_IPS.length > 0 && !CONFIG.PUBLIC_IPS.includes(ip)) {
      return res.status(403).json({ error: `IP ${ip} not allowed` });
    }

    const evType = event === 'assoc' ? 'check_in' : 'check_out';
    const la = lat ?? latitude;
    const lo = lon ?? longitude;
    const ev = await recordEvent(
      p,
      device,
      evType,
      'auto',
      ip,
      la != null ? Number(la) : null,
      lo != null ? Number(lo) : null
    );
    res.json({ ok: true, event: ev });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
