import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data.db');
let db = null;

export async function getDb() {
  if (db) return db;
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }
  initSchema(db);
  return db;
}

function initSchema(db) {
  db.run(`CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    new_leads_per_day INTEGER DEFAULT 5,
    outreach_per_day INTEGER DEFAULT 20,
    followups_per_day INTEGER DEFAULT 10,
    meetings_per_week INTEGER DEFAULT 4
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    job_title TEXT,
    company_name TEXT,
    contact_type TEXT DEFAULT 'lead',
    status TEXT DEFAULT 'new',
    source TEXT,
    pipeline_stage TEXT DEFAULT 'lead',
    notes TEXT,
    archive_status TEXT DEFAULT 'active',
    deleted_at TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    website TEXT,
    industry TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    notes TEXT,
    status TEXT DEFAULT 'active',
    lead_score INTEGER DEFAULT 0,
    archive_status TEXT DEFAULT 'active',
    deleted_at TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER REFERENCES leads(id),
    company_id INTEGER REFERENCES companies(id),
    type TEXT NOT NULL,
    outcome TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS daily_performance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    new_leads INTEGER DEFAULT 0,
    outreach_count INTEGER DEFAULT 0,
    followup_count INTEGER DEFAULT 0,
    meetings_count INTEGER DEFAULT 0,
    replies_received INTEGER DEFAULT 0,
    leads_converted INTEGER DEFAULT 0,
    score REAL DEFAULT 0
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#3b82f6'
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS contact_tags (
    contact_id INTEGER REFERENCES leads(id),
    tag_id INTEGER REFERENCES tags(id),
    PRIMARY KEY (contact_id, tag_id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS company_tags (
    company_id INTEGER REFERENCES companies(id),
    tag_id INTEGER REFERENCES tags(id),
    PRIMARY KEY (company_id, tag_id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,
    entity_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  )`);

  // Add columns if they don't exist (migration for existing DBs)
  const tableInfo = db.exec("PRAGMA table_info(leads)");
  if (tableInfo.length > 0) {
    const cols = tableInfo[0].values.map(v => v[1]);
    if (!cols.includes('job_title')) {
      db.run("ALTER TABLE leads ADD COLUMN job_title TEXT");
      db.run("ALTER TABLE leads ADD COLUMN company_name TEXT");
      db.run("ALTER TABLE leads ADD COLUMN contact_type TEXT DEFAULT 'lead'");
      db.run("ALTER TABLE leads ADD COLUMN archive_status TEXT DEFAULT 'active'");
      db.run("ALTER TABLE leads ADD COLUMN deleted_at TEXT");
    }
  }

  db.run(`INSERT OR IGNORE INTO goals (id) VALUES (1)`);
  saveDb(db);
}

export function saveDb(db) {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

export function rows(result) {
  if (!result || result.length === 0 || result[0].values.length === 0) return [];
  const cols = result[0].columns;
  return result[0].values.map(v => {
    const obj = {};
    cols.forEach((c, i) => obj[c] = v[i]);
    return obj;
  });
}

export function firstRow(result) {
  const r = rows(result);
  return r.length > 0 ? r[0] : null;
}
