import { getPool, initSchema } from '../_db.js';
import { clientIP, todayYMD, CONFIG } from '../_helpers.js';

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
    const ev = await p.query('INSERT INTO events (employee_id, device_id, type, source, public_ip) VALUES ($1,$2,$3,$4,$5) RETURNING *', [dev.rows[0].employee_id, dev.rows[0].id, 'break_start', source||'manual', ip]);
    // recompute timesheet
    const day = todayYMD();
    const evts = await p.query('SELECT * FROM events WHERE employee_id=$1 AND created_at::date = $2::date ORDER BY created_at ASC', [dev.rows[0].employee_id, day]);
    let work=0, brk=0, state='out', t=null;
    const add=(a,b,k)=>{ const m=Math.max(0, Math.round((b-a)/60000)); if(m>0){ if(k==='work')work+=m; else brk+=m; } };
    for (const e of evts.rows) {
      const ts = new Date(e.created_at).getTime();
      if (state==='in') { if (e.type==='break_start') { add(t, ts, 'work'); state='break'; t=ts; } else if (e.type==='check_out') { add(t, ts, 'work'); state='out'; t=null; } }
      else if (state==='break') { if (e.type==='break_end') { add(t, ts, 'break'); state='in'; t=ts; } else if (e.type==='check_out') { add(t, ts, 'break'); state='out'; t=null; } }
      else { if (e.type==='check_in') { state='in'; t=ts; } }
    }
    await p.query(`INSERT INTO timesheets (employee_id,date,work_minutes,break_minutes,overtime_minutes,details) VALUES ($1,$2::date,$3,$4,$5,'[]'::jsonb)
      ON CONFLICT (employee_id,date) DO UPDATE SET work_minutes=EXCLUDED.work_minutes, break_minutes=EXCLUDED.break_minutes, overtime_minutes=EXCLUDED.overtime_minutes`,
      [dev.rows[0].employee_id, day, work, brk, Math.max(0, work-480)]
    );
    res.json({ ok: true, event: ev.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
}
