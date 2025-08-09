import { getPool, initSchema } from '../_db.js';
import { clientIP, todayYMD, CONFIG, withinGeofence } from '../_helpers.js';

const rateMap = new Map(); // simple in-memory rate limit per IP
function rateLimit(ip) {
  const now = Date.now();
  const rec = rateMap.get(ip) || { ts: now, count: 0 };
  if (now - rec.ts > 60000) { rec.ts = now; rec.count = 0; }
  rec.count++;
  rateMap.set(ip, rec);
  return rec.count <= 10;
}

export async function recordEvent(p, device, eventType, source, ip, lat, lon) {
  const { rows } = await p.query(
    'INSERT INTO events (employee_id, device_id, type, source, public_ip, latitude, longitude) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
    [device.employee_id, device.id, eventType, source, ip, lat, lon]
  );
  await recomputeTimesheet(p, device.employee_id);
  return rows[0];
}

async function recomputeTimesheet(p, employeeId) {
  const day = todayYMD();
  const evts = await p.query(
    'SELECT * FROM events WHERE employee_id=$1 AND created_at::date=$2::date ORDER BY created_at ASC',
    [employeeId, day]
  );
  let work = 0, brk = 0, state = 'out', t = null;
  const add = (a, b, k) => {
    const m = Math.max(0, Math.round((b - a) / 60000));
    if (m > 0) { if (k === 'work') work += m; else brk += m; }
  };
  for (const e of evts.rows) {
    const ts = new Date(e.created_at).getTime();
    if (state === 'in') {
      if (e.type === 'break_start') { add(t, ts, 'work'); state = 'break'; t = ts; }
      else if (e.type === 'check_out') { add(t, ts, 'work'); state = 'out'; t = null; }
    } else if (state === 'break') {
      if (e.type === 'break_end') { add(t, ts, 'break'); state = 'in'; t = ts; }
      else if (e.type === 'check_out') { add(t, ts, 'break'); state = 'out'; t = null; }
    } else {
      if (e.type === 'check_in') { state = 'in'; t = ts; }
    }
  }
  await p.query(
    `INSERT INTO timesheets (employee_id,date,work_minutes,break_minutes,overtime_minutes,details)
     VALUES ($1,$2::date,$3,$4,$5,'[]'::jsonb)
     ON CONFLICT (employee_id,date) DO UPDATE SET work_minutes=EXCLUDED.work_minutes, break_minutes=EXCLUDED.break_minutes, overtime_minutes=EXCLUDED.overtime_minutes` ,
    [employeeId, day, work, brk, Math.max(0, work - 480)]
  );
}

export async function handleEvent(req, res, eventType) {
  if (req.method !== 'POST') return res.status(405).end();
  await initSchema();
  try {
    const ip = clientIP(req);
    if (!rateLimit(ip)) return res.status(429).json({ error: 'rate limit' });

    const { device_uuid, source, lat, lon, latitude, longitude } = req.body || {};
    if (!device_uuid) return res.status(400).json({ error: 'device_uuid required' });

    const la = lat ?? latitude;
    const lo = lon ?? longitude;
    if (!CONFIG.SKIP_GEOFENCE) {
      if (la == null || lo == null) return res.status(400).json({ error: 'latitude and longitude required' });
      if (!withinGeofence(Number(la), Number(lo))) return res.status(403).json({ error: 'outside geofence' });
    }

    const p = getPool();
    const dev = await p.query('SELECT * FROM devices WHERE device_uuid=$1', [device_uuid]);
    if (!dev.rowCount) return res.status(401).json({ error: 'invalid device' });
    const device = dev.rows[0];

    if (CONFIG.PUBLIC_IPS.length > 0 && !CONFIG.PUBLIC_IPS.includes(ip)) {
      return res.status(403).json({ error: `IP ${ip} not allowed` });
    }

    const event = await recordEvent(
      p,
      device,
      eventType,
      source || 'manual',
      ip,
      la != null ? Number(la) : null,
      lo != null ? Number(lo) : null
    );
    res.json({ ok: true, event });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
