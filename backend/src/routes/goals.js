import { Router } from 'express';
import { getDb } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const row = db.exec('SELECT * FROM goals WHERE id = 1');
  if (row.length > 0 && row[0].values.length > 0) {
    const cols = row[0].columns;
    const vals = row[0].values[0];
    const goal = {};
    cols.forEach((c, i) => goal[c] = vals[i]);
    res.json(goal);
  } else {
    res.json({
      new_leads_per_day: 5,
      outreach_per_day: 20,
      followups_per_day: 10,
      meetings_per_week: 4
    });
  }
});

router.put('/', async (req, res) => {
  const db = await getDb();
  const { new_leads_per_day, outreach_per_day, followups_per_day, meetings_per_week } = req.body;
  db.run(`UPDATE goals SET
    new_leads_per_day = ?,
    outreach_per_day = ?,
    followups_per_day = ?,
    meetings_per_week = ?
    WHERE id = 1`,
    [new_leads_per_day, outreach_per_day, followups_per_day, meetings_per_week]
  );
  const row = db.exec('SELECT * FROM goals WHERE id = 1');
  const cols = row[0].columns;
  const vals = row[0].values[0];
  const goal = {};
  cols.forEach((c, i) => goal[c] = vals[i]);
  res.json(goal);
});

export default router;
