import { getPool, initSchema } from '../_db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  await initSchema();
  const { name, phone, platform, device_uuid, wifi_mac } = req.body || {};
  if (!name || !device_uuid) return res.status(400).json({ error: 'name and device_uuid required' });
  const p = getPool();
  try {
    let employee;
    if (phone) {
      const emp = await p.query('SELECT * FROM employees WHERE phone=$1', [phone]);
      if (emp.rowCount) employee = emp.rows[0];
      else employee = (await p.query('INSERT INTO employees(name,phone) VALUES ($1,$2) RETURNING *', [name, phone])).rows[0];
    } else {
      employee = (await p.query('INSERT INTO employees(name) VALUES ($1) RETURNING *', [name])).rows[0];
    }
    const device = (
      await p.query(
        `INSERT INTO devices (employee_id, device_uuid, platform, wifi_mac)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (device_uuid) DO UPDATE SET employee_id=EXCLUDED.employee_id, platform=EXCLUDED.platform, wifi_mac=COALESCE(EXCLUDED.wifi_mac, devices.wifi_mac)
         RETURNING *`,
        [employee.id, device_uuid, platform || null, wifi_mac ? wifi_mac.toLowerCase() : null]
      )
    ).rows[0];
    res.json({ ok: true, employee, device });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
