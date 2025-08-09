import { getPool, initSchema } from '../_db.js';
export default async function handler(req,res){
  if (req.method !== 'GET') return res.status(405).end();
  await initSchema();
  const p = getPool();
  const month = req.query.month;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ error: 'month format YYYY-MM required' });
  const y = month.slice(0,4), m = month.slice(5,7);
  try {
    const { rows } = await p.query(
      `SELECT e.id as employee_id, e.name, t.date, t.work_minutes, t.break_minutes, t.overtime_minutes
       FROM timesheets t JOIN employees e ON e.id = t.employee_id
       WHERE EXTRACT(YEAR FROM t.date) = $1::int AND EXTRACT(MONTH FROM t.date) = $2::int
       ORDER BY e.name, t.date`, [y, m]
    );
    const summary = {};
    for (const r of rows){
      const k = r.employee_id;
      if (!summary[k]) summary[k] = { employee_id: k, name: r.name, work_minutes: 0, break_minutes: 0, overtime_minutes: 0, days: [] };
      summary[k].work_minutes += r.work_minutes;
      summary[k].break_minutes += r.break_minutes;
      summary[k].overtime_minutes += r.overtime_minutes;
      summary[k].days.push({ date: r.date, work_minutes: r.work_minutes, break_minutes: r.break_minutes, overtime_minutes: r.overtime_minutes });
    }
    res.json({ ok: true, month, employees: Object.values(summary) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
