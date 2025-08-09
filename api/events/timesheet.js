export async function recomputeTimesheet(pool, employeeId, day) {
  const evts = await pool.query('SELECT * FROM events WHERE employee_id=$1 AND created_at::date = $2::date ORDER BY created_at ASC', [employeeId, day]);
  let work = 0, brk = 0, state = 'out', t = null;
  const add = (a, b, k) => {
    const m = Math.max(0, Math.round((b - a) / 60000));
    if (m > 0) {
      if (k === 'work') work += m;
      else brk += m;
    }
  };
  for (const e of evts.rows) {
    const ts = new Date(e.created_at).getTime();
    if (state === 'in') {
      if (e.type === 'break_start') {
        add(t, ts, 'work');
        state = 'break';
        t = ts;
      } else if (e.type === 'check_out') {
        add(t, ts, 'work');
        state = 'out';
        t = null;
      }
    }
    else if (state === 'break') {
      if (e.type === 'break_end') {
        add(t, ts, 'break');
        state = 'in';
        t = ts;
      } else if (e.type === 'check_out') {
        add(t, ts, 'break');
        state = 'out';
        t = null;
      }
    }
    else {
      if (e.type === 'check_in') {
        state = 'in';
        t = ts;
      }
    }
  }
  await pool.query(`INSERT INTO timesheets (employee_id,date,work_minutes,break_minutes,overtime_minutes,details) VALUES ($1,$2::date,$3,$4,$5,'[]'::jsonb)
      ON CONFLICT (employee_id,date) DO UPDATE SET work_minutes=EXCLUDED.work_minutes, break_minutes=EXCLUDED.break_minutes, overtime_minutes=EXCLUDED.overtime_minutes`,
    [employeeId, day, work, brk, Math.max(0, work - 480)]
  );
}
