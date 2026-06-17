import { Router } from 'express';
import { getDb, saveDb, rows } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const result = db.exec('SELECT * FROM tags ORDER BY name');
  res.json(rows(result));
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { name, color } = req.body;
  db.run('INSERT OR IGNORE INTO tags (name, color) VALUES (?, ?)', [name, color || '#3b82f6']);
  saveDb(db);
  const result = db.exec('SELECT * FROM tags WHERE name = ?', [name]);
  res.status(201).json(rows(result)[0]);
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  db.run('DELETE FROM tags WHERE id = ?', [req.params.id]);
  db.run('DELETE FROM contact_tags WHERE tag_id = ?', [req.params.id]);
  db.run('DELETE FROM company_tags WHERE tag_id = ?', [req.params.id]);
  saveDb(db);
  res.json({ success: true });
});

export default router;
