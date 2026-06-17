import { Router } from 'express';
import { getDb, saveDb, rows } from '../db.js';

const router = Router();

router.post('/contacts', async (req, res) => {
  const db = await getDb();
  const { records } = req.body;
  let imported = 0, skipped = 0, failed = 0;

  for (const r of records) {
    try {
      const exists = db.exec("SELECT id FROM leads WHERE email = ? AND deleted_at IS NULL", [r.email]);
      if (exists.length > 0 && exists[0].values.length > 0) { skipped++; continue; }
      db.run(`INSERT INTO leads (name, email, phone, job_title, company_name, contact_type, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [r.name, r.email, r.phone, r.job_title, r.company, r.contact_type || 'lead', r.notes]);
      imported++;
    } catch { failed++; }
  }
  saveDb(db);
  res.json({ imported, skipped, failed, total: records.length });
});

router.post('/companies', async (req, res) => {
  const db = await getDb();
  const { records } = req.body;
  let imported = 0, skipped = 0, failed = 0;

  for (const r of records) {
    try {
      const exists = db.exec("SELECT id FROM companies WHERE name = ? AND deleted_at IS NULL", [r.name]);
      if (exists.length > 0 && exists[0].values.length > 0) { skipped++; continue; }
      db.run(`INSERT INTO companies (name, website, industry, city, state, country, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [r.name, r.website, r.industry, r.city, r.state, r.country, r.notes]);
      imported++;
    } catch { failed++; }
  }
  saveDb(db);
  res.json({ imported, skipped, failed, total: records.length });
});

router.post('/export', async (req, res) => {
  const db = await getDb();
  const { entity, ids, format } = req.body;
  let data = [];
  if (entity === 'contacts') {
    const sql = ids && ids.length ? `SELECT * FROM leads WHERE id IN (${ids.join(',')}) AND deleted_at IS NULL` : "SELECT * FROM leads WHERE deleted_at IS NULL";
    data = rows(db.exec(sql));
  } else if (entity === 'companies') {
    const sql = ids && ids.length ? `SELECT * FROM companies WHERE id IN (${ids.join(',')}) AND deleted_at IS NULL` : "SELECT * FROM companies WHERE deleted_at IS NULL";
    data = rows(db.exec(sql));
  } else if (entity === 'followups') {
    data = rows(db.exec(`SELECT i.*, l.name as lead_name FROM interactions i LEFT JOIN leads l ON i.lead_id = l.id WHERE i.type = 'followup' ORDER BY i.created_at DESC`));
  }
  res.json({ data, format: format || 'csv' });
});

router.post('/validate', async (req, res) => {
  const { records, entity } = req.body;
  const errors = [];
  const duplicates = [];
  const db = await getDb();

  records.forEach((r, i) => {
    const rowErrors = [];
    if (entity === 'contacts') {
      if (!r.name?.trim()) rowErrors.push('Name is required');
      if (r.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)) rowErrors.push('Invalid email format');
      if (r.email) {
        const dup = db.exec("SELECT id, name, email FROM leads WHERE email = ? AND deleted_at IS NULL", [r.email]);
        if (dup.length > 0 && dup[0].values.length > 0) {
          const d = rows(dup)[0];
          duplicates.push({ row: i + 1, field: 'email', value: r.email, existingId: d.id, existingName: d.name });
        }
      }
    } else if (entity === 'companies') {
      if (!r.name?.trim()) rowErrors.push('Company name is required');
      if (r.name) {
        const dup = db.exec("SELECT id, name FROM companies WHERE name = ? AND deleted_at IS NULL", [r.name.trim()]);
        if (dup.length > 0 && dup[0].values.length > 0) {
          const d = rows(dup)[0];
          duplicates.push({ row: i + 1, field: 'name', value: r.name, existingId: d.id, existingName: d.name });
        }
      }
    }
    if (rowErrors.length) errors.push({ row: i + 1, errors: rowErrors });
  });

  res.json({ errors, duplicates, validCount: records.length - errors.length });
});

export default router;
