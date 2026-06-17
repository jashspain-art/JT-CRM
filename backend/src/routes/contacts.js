import { Router } from 'express';
import { getDb, saveDb, rows } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { status, stage, archive, search } = req.query;
  const conditions = ["l.archive_status = 'active'", "l.deleted_at IS NULL"];
  if (status) conditions.push(`l.status = '${status}'`);
  if (stage) conditions.push(`l.pipeline_stage = '${stage}'`);
  if (archive === 'archived') conditions[0] = "l.archive_status = 'archived'";
  if (search) conditions.push(`(l.name LIKE '%${search}%' OR l.email LIKE '%${search}%' OR l.company_name LIKE '%${search}%')`);
  const result = db.exec(`SELECT l.* FROM leads l WHERE ${conditions.join(' AND ')} ORDER BY l.updated_at DESC`);
  res.json(rows(result));
});

router.get('/:id', async (req, res) => {
  const db = await getDb();
  const result = db.exec('SELECT * FROM leads WHERE id = ?', [req.params.id]);
  const lead = rows(result)[0];
  if (!lead) return res.status(404).json({ error: 'Not found' });

  const intResult = db.exec('SELECT * FROM interactions WHERE lead_id = ? ORDER BY created_at DESC', [req.params.id]);
  lead.interactions = rows(intResult);

  const tagResult = db.exec(`SELECT t.* FROM tags t JOIN contact_tags ct ON t.id = ct.tag_id WHERE ct.contact_id = ?`, [req.params.id]);
  lead.tags = rows(tagResult);

  const lastContact = db.exec("SELECT MAX(created_at) as last_date FROM interactions WHERE lead_id = ?", [req.params.id]);
  const lastContactDate = rows(lastContact)[0]?.last_date;
  if (lastContactDate) {
    const daysSince = Math.floor((Date.now() - new Date(lastContactDate).getTime()) / (1000 * 60 * 60 * 24));
    lead.days_since_last_contact = daysSince;
    lead.relationship_health = daysSince <= 7 ? 'healthy' : daysSince <= 30 ? 'needs_attention' : 'stale';
  } else {
    lead.days_since_last_contact = null;
    lead.relationship_health = 'stale';
  }

  lead.interaction_count = lead.interactions.length;
  lead.followup_count = lead.interactions.filter(i => i.type === 'followup').length;
  lead.open_followups = lead.interactions.filter(i => i.type === 'followup' && i.outcome !== 'completed').length;

  res.json(lead);
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { name, email, phone, job_title, company_name, contact_type, status, source, pipeline_stage, notes } = req.body;
  db.run(`INSERT INTO leads (name, email, phone, job_title, company_name, contact_type, status, source, pipeline_stage, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, email, phone, job_title, company_name, contact_type || 'lead', status || 'new', source, pipeline_stage || 'lead', notes]);
  const id = db.exec("SELECT last_insert_rowid() as id");
  const newId = rows(id)[0].id;
  db.run(`INSERT INTO activity_log (entity_type, entity_id, action, details) VALUES (?, ?, ?, ?)`,
    ['contact', newId, 'created', `Contact "${name}" created`]);
  saveDb(db);
  const result = db.exec('SELECT * FROM leads WHERE id = ?', [newId]);
  res.status(201).json(rows(result)[0]);
});

router.put('/:id', async (req, res) => {
  const db = await getDb();
  const fields = ['name','email','phone','job_title','company_name','contact_type','status','source','pipeline_stage','notes'];
  const sets = fields.filter(f => req.body[f] !== undefined).map(f => `${f} = ?`).join(', ');
  const vals = fields.filter(f => req.body[f] !== undefined).map(f => req.body[f]);
  if (!sets) return res.status(400).json({ error: 'No fields to update' });
  db.run(`UPDATE leads SET ${sets}, updated_at = datetime('now','localtime') WHERE id = ?`, [...vals, req.params.id]);
  db.run(`INSERT INTO activity_log (entity_type, entity_id, action, details) VALUES (?, ?, ?, ?)`,
    ['contact', req.params.id, 'updated', `Contact updated`]);
  saveDb(db);
  const result = db.exec('SELECT * FROM leads WHERE id = ?', [req.params.id]);
  res.json(rows(result)[0]);
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  const lead = rows(db.exec('SELECT name FROM leads WHERE id = ?', [req.params.id]))[0];
  if (!lead) return res.status(404).json({ error: 'Not found' });
  db.run("UPDATE leads SET deleted_at = datetime('now','localtime'), archive_status = 'deleted' WHERE id = ?", [req.params.id]);
  db.run(`INSERT INTO activity_log (entity_type, entity_id, action, details) VALUES (?, ?, ?, ?)`,
    ['contact', req.params.id, 'deleted', `Contact "${lead.name}" deleted`]);
  saveDb(db);
  res.json({ success: true });
});

router.post('/:id/archive', async (req, res) => {
  const db = await getDb();
  const { action } = req.body; // 'archive' or 'restore'
  const newStatus = action === 'archive' ? 'archived' : 'active';
  db.run("UPDATE leads SET archive_status = ?, updated_at = datetime('now','localtime') WHERE id = ?", [newStatus, req.params.id]);
  const lead = rows(db.exec('SELECT name FROM leads WHERE id = ?', [req.params.id]))[0];
  db.run(`INSERT INTO activity_log (entity_type, entity_id, action, details) VALUES (?, ?, ?, ?)`,
    ['contact', req.params.id, action === 'archive' ? 'archived' : 'restored', `Contact "${lead?.name}" ${action === 'archive' ? 'archived' : 'restored'}`]);
  saveDb(db);
  res.json({ success: true, archive_status: newStatus });
});

// Bulk actions
router.post('/bulk/delete', async (req, res) => {
  const db = await getDb();
  const { ids } = req.body;
  if (!ids || !ids.length) return res.status(400).json({ error: 'No IDs provided' });
  ids.forEach(id => {
    db.run("UPDATE leads SET deleted_at = datetime('now','localtime'), archive_status = 'deleted' WHERE id = ?", [id]);
    db.run(`INSERT INTO activity_log (entity_type, entity_id, action, details) VALUES (?, ?, ?, ?)`, ['contact', id, 'deleted', `Contact deleted (bulk)`]);
  });
  saveDb(db);
  res.json({ success: true, count: ids.length });
});

router.post('/bulk/archive', async (req, res) => {
  const db = await getDb();
  const { ids } = req.body;
  if (!ids || !ids.length) return res.status(400).json({ error: 'No IDs provided' });
  ids.forEach(id => {
    db.run("UPDATE leads SET archive_status = 'archived', updated_at = datetime('now','localtime') WHERE id = ?", [id]);
    db.run(`INSERT INTO activity_log (entity_type, entity_id, action, details) VALUES (?, ?, ?, ?)`, ['contact', id, 'archived', `Contact archived (bulk)`]);
  });
  saveDb(db);
  res.json({ success: true, count: ids.length });
});

router.post('/bulk/restore', async (req, res) => {
  const db = await getDb();
  const { ids } = req.body;
  if (!ids || !ids.length) return res.status(400).json({ error: 'No IDs provided' });
  ids.forEach(id => {
    db.run("UPDATE leads SET archive_status = 'active', updated_at = datetime('now','localtime') WHERE id = ?", [id]);
    db.run(`INSERT INTO activity_log (entity_type, entity_id, action, details) VALUES (?, ?, ?, ?)`, ['contact', id, 'restored', `Contact restored (bulk)`]);
  });
  saveDb(db);
  res.json({ success: true, count: ids.length });
});

router.post('/bulk/change-type', async (req, res) => {
  const db = await getDb();
  const { ids, contact_type } = req.body;
  ids.forEach(id => db.run("UPDATE leads SET contact_type = ?, updated_at = datetime('now','localtime') WHERE id = ?", [contact_type, id]));
  saveDb(db);
  res.json({ success: true });
});

router.post('/bulk/add-tags', async (req, res) => {
  const db = await getDb();
  const { ids, tag_id } = req.body;
  ids.forEach(id => db.run("INSERT OR IGNORE INTO contact_tags (contact_id, tag_id) VALUES (?, ?)", [id, tag_id]));
  saveDb(db);
  res.json({ success: true });
});

// Tags
router.post('/:id/tags', async (req, res) => {
  const db = await getDb();
  db.run("INSERT OR IGNORE INTO contact_tags (contact_id, tag_id) VALUES (?, ?)", [req.params.id, req.body.tag_id]);
  saveDb(db);
  res.json({ success: true });
});

router.delete('/:id/tags/:tagId', async (req, res) => {
  const db = await getDb();
  db.run("DELETE FROM contact_tags WHERE contact_id = ? AND tag_id = ?", [req.params.id, req.params.tagId]);
  saveDb(db);
  res.json({ success: true });
});

// Duplicate check
router.get('/duplicates/check', async (req, res) => {
  const db = await getDb();
  const { email, phone, name } = req.query;
  const conditions = [];
  if (email) conditions.push(`email = '${email}'`);
  if (phone) conditions.push(`phone = '${phone}'`);
  if (name) conditions.push(`name LIKE '%${name}%'`);
  if (!conditions.length) return res.json({ duplicates: [] });
  const result = db.exec(`SELECT * FROM leads WHERE (${conditions.join(' OR ')}) AND deleted_at IS NULL`);
  res.json({ duplicates: rows(result) });
});

export default router;
