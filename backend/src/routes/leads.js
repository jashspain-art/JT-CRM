import { Router } from 'express';
import { getDb } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { status, stage } = req.query;
  let sql = 'SELECT * FROM leads';
  const conditions = [];
  if (status) conditions.push(`status = '${status}'`);
  if (stage) conditions.push(`pipeline_stage = '${stage}'`);
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY created_at DESC';
  const result = db.exec(sql);
  if (result.length === 0) return res.json([]);
  const cols = result[0].columns;
  const leads = result[0].values.map(v => {
    const obj = {};
    cols.forEach((c, i) => obj[c] = v[i]);
    return obj;
  });
  res.json(leads);
});

router.get('/hot', async (req, res) => {
  const db = await getDb();
  const result = db.exec(`SELECT * FROM leads WHERE status IN ('hot','warm') OR pipeline_stage IN ('proposal','negotiation') ORDER BY updated_at DESC`);
  if (result.length === 0) return res.json([]);
  const cols = result[0].columns;
  const leads = result[0].values.map(v => {
    const obj = {};
    cols.forEach((c, i) => obj[c] = v[i]);
    return obj;
  });
  res.json(leads);
});

router.get('/overdue-followups', async (req, res) => {
  const db = await getDb();
  const result = db.exec(`
    SELECT l.*, MAX(i.created_at) as last_interaction
    FROM leads l
    LEFT JOIN interactions i ON l.id = i.lead_id
    GROUP BY l.id
    HAVING last_interaction IS NULL
       OR datetime(last_interaction) < datetime('now', '-3 days')
    ORDER BY last_interaction ASC
  `);
  if (result.length === 0) return res.json([]);
  const cols = result[0].columns;
  const leads = result[0].values.map(v => {
    const obj = {};
    cols.forEach((c, i) => obj[c] = v[i]);
    return obj;
  });
  res.json(leads);
});

router.get('/pipeline', async (req, res) => {
  const db = await getDb();
  const result = db.exec(`
    SELECT pipeline_stage, COUNT(*) as count
    FROM leads
    GROUP BY pipeline_stage
    ORDER BY CASE pipeline_stage
      WHEN 'lead' THEN 1
      WHEN 'qualified' THEN 2
      WHEN 'proposal' THEN 3
      WHEN 'negotiation' THEN 4
      WHEN 'closed' THEN 5
      ELSE 6
    END
  `);
  if (result.length === 0) return res.json([]);
  const cols = result[0].columns;
  const stages = result[0].values.map(v => {
    const obj = {};
    cols.forEach((c, i) => obj[c] = v[i]);
    return obj;
  });
  res.json(stages);
});

export default router;
