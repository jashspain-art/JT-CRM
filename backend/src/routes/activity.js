import { Router } from 'express';
import { getDb, saveDb, rows } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const result = db.exec('SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 200');
  res.json(rows(result));
});

router.get('/:entityType/:entityId', async (req, res) => {
  const db = await getDb();
  const result = db.exec('SELECT * FROM activity_log WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC',
    [req.params.entityType, req.params.entityId]);
  res.json(rows(result));
});

export default router;
