import { getPool, initSchema } from '../_db.js';

export default async function handler(req, res){
  console.log('Incoming request', req.method, req.url, req.body);
  if (req.method !== 'POST') return res.status(405).end();
  await initSchema();
  const { name, phone, platform, device_uuid } = req.body || {};
  if (!name || !device_uuid) return res.status(400).json({ error: 'name and device_uuid required' });
  const p = getPool();
  try {
    let employeeId;
    if (phone){
      const emp = await p.query('SELECT id FROM employees WHERE phone=$1', [phone]);
      if (emp.rowCount) employeeId = emp.rows[0].id;
      else employeeId = (await p.query('INSERT INTO employees(name,phone) VALUES ($1,$2) RETURNING id', [name, phone])).rows[0].id;
    } else {
      employeeId = (await p.query('INSERT INTO employees(name) VALUES ($1) RETURNING id', [name])).rows[0].id;
    }
    const d = await p.query(
      `INSERT INTO devices (employee_id, device_uuid, platform)
       VALUES ($1,$2,$3)
       ON CONFLICT (device_uuid) DO UPDATE SET employee_id=EXCLUDED.employee_id, platform=EXCLUDED.platform
       RETURNING *`, [employeeId, device_uuid, platform || null]
    );
    res.json({ ok: true, employee_id: employeeId, device_id: d.rows[0].id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
