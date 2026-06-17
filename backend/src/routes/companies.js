import { Router } from 'express';
import { getDb, saveDb, rows } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { status, archive, search } = req.query;
  const conditions = ["c.archive_status = 'active'", "c.deleted_at IS NULL"];
  if (status) conditions.push(`c.status = '${status}'`);
  if (archive === 'archived') conditions[0] = "c.archive_status = 'archived'";
  if (search) conditions.push(`(c.name LIKE '%${search}%' OR c.website LIKE '%${search}%' OR c.industry LIKE '%${search}%')`);
  const result = db.exec(`SELECT c.*, (SELECT COUNT(*) FROM leads l WHERE l.company_name = c.name AND l.deleted_at IS NULL) as contact_count FROM companies c WHERE ${conditions.join(' AND ')} ORDER BY c.updated_at DESC`);
  res.json(rows(result));
});

router.get('/:id', async (req, res) => {
  const db = await getDb();
  const result = db.exec('SELECT * FROM companies WHERE id = ?', [req.params.id]);
  const company = rows(result)[0];
  if (!company) return res.status(404).json({ error: 'Not found' });

  const contacts = db.exec("SELECT * FROM leads WHERE company_name = ? AND deleted_at IS NULL ORDER BY created_at DESC", [company.name]);
  company.contacts = rows(contacts);

  const intResult = db.exec('SELECT * FROM interactions WHERE company_id = ? ORDER BY created_at DESC', [req.params.id]);
  company.interactions = rows(intResult);

  const tagResult = db.exec(`SELECT t.* FROM tags t JOIN company_tags ct ON t.id = ct.tag_id WHERE ct.company_id = ?`, [req.params.id]);
  company.tags = rows(tagResult);

  const openFollowups = db.exec("SELECT COUNT(*) as count FROM interactions WHERE company_id = ? AND type = 'followup' AND (outcome IS NULL OR outcome != 'completed')", [req.params.id]);
  company.open_followups = rows(openFollowups)[0]?.count || 0;
  company.contact_count = company.contacts.length;

  const lastActivity = db.exec("SELECT MAX(created_at) as last FROM interactions WHERE company_id = ?", [req.params.id]);
  company.last_activity = rows(lastActivity)[0]?.last || company.created_at;

  res.json(company);
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { name, website, industry, city, state, country, notes, status } = req.body;
  db.run(`INSERT INTO companies (name, website, industry, city, state, country, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, website, industry, city, state, country, notes, status || 'active']);
  const id = rows(db.exec("SELECT last_insert_rowid() as id"))[0].id;
  db.run(`INSERT INTO activity_log (entity_type, entity_id, action, details) VALUES (?, ?, ?, ?)`,
    ['company', id, 'created', `Company "${name}" created`]);
  saveDb(db);
  const result = db.exec('SELECT * FROM companies WHERE id = ?', [id]);
  res.status(201).json(rows(result)[0]);
});

router.put('/:id', async (req, res) => {
  const db = await getDb();
  const fields = ['name','website','industry','city','state','country','notes','status'];
  const sets = fields.filter(f => req.body[f] !== undefined).map(f => `${f} = ?`).join(', ');
  const vals = fields.filter(f => req.body[f] !== undefined).map(f => req.body[f]);
  if (!sets) return res.status(400).json({ error: 'No fields to update' });
  db.run(`UPDATE companies SET ${sets}, updated_at = datetime('now','localtime') WHERE id = ?`, [...vals, req.params.id]);
  db.run(`INSERT INTO activity_log (entity_type, entity_id, action, details) VALUES (?, ?, ?, ?)`,
    ['company', req.params.id, 'updated', `Company updated`]);
  saveDb(db);
  const result = db.exec('SELECT * FROM companies WHERE id = ?', [req.params.id]);
  res.json(rows(result)[0]);
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  const company = rows(db.exec('SELECT name FROM companies WHERE id = ?', [req.params.id]))[0];
  if (!company) return res.status(404).json({ error: 'Not found' });
  db.run("UPDATE companies SET deleted_at = datetime('now','localtime'), archive_status = 'deleted' WHERE id = ?", [req.params.id]);
  db.run(`INSERT INTO activity_log (entity_type, entity_id, action, details) VALUES (?, ?, ?, ?)`,
    ['company', req.params.id, 'deleted', `Company "${company.name}" deleted`]);
  saveDb(db);
  res.json({ success: true });
});

router.post('/:id/archive', async (req, res) => {
  const db = await getDb();
  const newStatus = req.body.action === 'archive' ? 'archived' : 'active';
  db.run("UPDATE companies SET archive_status = ?, updated_at = datetime('now','localtime') WHERE id = ?", [newStatus, req.params.id]);
  const company = rows(db.exec('SELECT name FROM companies WHERE id = ?', [req.params.id]))[0];
  db.run(`INSERT INTO activity_log (entity_type, entity_id, action, details) VALUES (?, ?, ?, ?)`,
    ['company', req.params.id, req.body.action === 'archive' ? 'archived' : 'restored', `Company "${company?.name}" ${req.body.action === 'archive' ? 'archived' : 'restored'}`]);
  saveDb(db);
  res.json({ success: true, archive_status: newStatus });
});

// Bulk actions
router.post('/bulk/delete', async (req, res) => {
  const db = await getDb();
  const { ids } = req.body;
  ids.forEach(id => {
    db.run("UPDATE companies SET deleted_at = datetime('now','localtime'), archive_status = 'deleted' WHERE id = ?", [id]);
    db.run(`INSERT INTO activity_log (entity_type, entity_id, action, details) VALUES (?, ?, ?, ?)`, ['company', id, 'deleted', `Company deleted (bulk)`]);
  });
  saveDb(db);
  res.json({ success: true, count: ids.length });
});

router.post('/bulk/archive', async (req, res) => {
  const db = await getDb();
  const { ids } = req.body;
  ids.forEach(id => {
    db.run("UPDATE companies SET archive_status = 'archived', updated_at = datetime('now','localtime') WHERE id = ?", [id]);
    db.run(`INSERT INTO activity_log (entity_type, entity_id, action, details) VALUES (?, ?, ?, ?)`, ['company', id, 'archived', `Company archived (bulk)`]);
  });
  saveDb(db);
  res.json({ success: true, count: ids.length });
});

router.post('/bulk/restore', async (req, res) => {
  const db = await getDb();
  const { ids } = req.body;
  ids.forEach(id => {
    db.run("UPDATE companies SET archive_status = 'active', updated_at = datetime('now','localtime') WHERE id = ?", [id]);
    db.run(`INSERT INTO activity_log (entity_type, entity_id, action, details) VALUES (?, ?, ?, ?)`, ['company', id, 'restored', `Company restored (bulk)`]);
  });
  saveDb(db);
  res.json({ success: true, count: ids.length });
});

router.post('/bulk/change-status', async (req, res) => {
  const db = await getDb();
  const { ids, status } = req.body;
  ids.forEach(id => db.run("UPDATE companies SET status = ?, updated_at = datetime('now','localtime') WHERE id = ?", [status, id]));
  saveDb(db);
  res.json({ success: true });
});

router.post('/bulk/add-tags', async (req, res) => {
  const db = await getDb();
  const { ids, tag_id } = req.body;
  ids.forEach(id => db.run("INSERT OR IGNORE INTO company_tags (company_id, tag_id) VALUES (?, ?)", [id, tag_id]));
  saveDb(db);
  res.json({ success: true });
});

router.get('/duplicates/check', async (req, res) => {
  const db = await getDb();
  const { name, website } = req.query;
  const conditions = [];
  if (name) conditions.push(`name LIKE '%${name}%'`);
  if (website) conditions.push(`website LIKE '%${website}%'`);
  if (!conditions.length) return res.json({ duplicates: [] });
  const result = db.exec(`SELECT * FROM companies WHERE (${conditions.join(' OR ')}) AND deleted_at IS NULL`);
  res.json({ duplicates: rows(result) });
});

export default router;
