import { Router } from 'express';
import { getDb, saveDb, rows } from '../db.js';

const router = Router();

router.post('/contacts', async (req, res) => {
  const db = await getDb();
  const { primary_id, secondary_id, merge_notes, merge_activities, merge_tags } = req.body;
  const primary = rows(db.exec('SELECT * FROM leads WHERE id = ?', [primary_id]))[0];
  const secondary = rows(db.exec('SELECT * FROM leads WHERE id = ?', [secondary_id]))[0];
  if (!primary || !secondary) return res.status(404).json({ error: 'Record not found' });

  const merged = { ...primary };
  ['email','phone','job_title','company_name','notes','source','pipeline_stage'].forEach(f => {
    if (!merged[f] && secondary[f]) merged[f] = secondary[f];
  });

  db.run(`UPDATE leads SET email=?, phone=?, job_title=?, company_name=?, notes=?, source=?, pipeline_stage=?, updated_at=datetime('now','localtime') WHERE id=?`,
    [merged.email, merged.phone, merged.job_title, merged.company_name, merged.notes, merged.source, merged.pipeline_stage, primary_id]);

  if (merge_activities !== false) {
    db.run("UPDATE interactions SET lead_id = ? WHERE lead_id = ?", [primary_id, secondary_id]);
  }

  if (merge_tags !== false) {
    const tags = rows(db.exec("SELECT tag_id FROM contact_tags WHERE contact_id = ?", [secondary_id]));
    tags.forEach(t => db.run("INSERT OR IGNORE INTO contact_tags (contact_id, tag_id) VALUES (?, ?)", [primary_id, t.tag_id]));
  }

  db.run("UPDATE leads SET deleted_at = datetime('now','localtime'), archive_status = 'deleted' WHERE id = ?", [secondary_id]);
  db.run(`INSERT INTO activity_log (entity_type, entity_id, action, details) VALUES (?, ?, ?, ?)`,
    ['contact', primary_id, 'merged', `Merged from contact #${secondary_id} into #${primary_id}`]);
  saveDb(db);

  const updated = rows(db.exec('SELECT * FROM leads WHERE id = ?', [primary_id]))[0];
  res.json(updated);
});

router.post('/companies', async (req, res) => {
  const db = await getDb();
  const { primary_id, secondary_id, merge_notes, merge_activities, merge_tags } = req.body;
  const primary = rows(db.exec('SELECT * FROM companies WHERE id = ?', [primary_id]))[0];
  const secondary = rows(db.exec('SELECT * FROM companies WHERE id = ?', [secondary_id]))[0];
  if (!primary || !secondary) return res.status(404).json({ error: 'Record not found' });

  const merged = { ...primary };
  ['website','industry','city','state','country','notes'].forEach(f => {
    if (!merged[f] && secondary[f]) merged[f] = secondary[f];
  });

  db.run(`UPDATE companies SET website=?, industry=?, city=?, state=?, country=?, notes=?, updated_at=datetime('now','localtime') WHERE id=?`,
    [merged.website, merged.industry, merged.city, merged.state, merged.country, merged.notes, primary_id]);

  if (merge_activities !== false) {
    db.run("UPDATE interactions SET company_id = ? WHERE company_id = ?", [primary_id, secondary_id]);
  }

  if (merge_tags !== false) {
    const tags = rows(db.exec("SELECT tag_id FROM company_tags WHERE company_id = ?", [secondary_id]));
    tags.forEach(t => db.run("INSERT OR IGNORE INTO company_tags (company_id, tag_id) VALUES (?, ?)", [primary_id, t.tag_id]));
  }

  db.run("UPDATE leads SET company_name = ? WHERE company_name = ?", [primary.name, secondary.name]);
  db.run("UPDATE companies SET deleted_at = datetime('now','localtime'), archive_status = 'deleted' WHERE id = ?", [secondary_id]);
  db.run(`INSERT INTO activity_log (entity_type, entity_id, action, details) VALUES (?, ?, ?, ?)`,
    ['company', primary_id, 'merged', `Merged from company #${secondary_id} into #${primary_id}`]);
  saveDb(db);

  const updated = rows(db.exec('SELECT * FROM companies WHERE id = ?', [primary_id]))[0];
  res.json(updated);
});

export default router;
