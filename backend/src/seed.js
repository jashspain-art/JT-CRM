import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data.db');

async function seed() {
  const SQL = await initSqlJs();
  const db = new SQL.Database();

  db.run(`CREATE TABLE IF NOT EXISTS goals (id INTEGER PRIMARY KEY AUTOINCREMENT, new_leads_per_day INTEGER DEFAULT 5, outreach_per_day INTEGER DEFAULT 20, followups_per_day INTEGER DEFAULT 10, meetings_per_week INTEGER DEFAULT 4)`);
  db.run(`CREATE TABLE IF NOT EXISTS leads (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT, phone TEXT, job_title TEXT, company_name TEXT, contact_type TEXT DEFAULT 'lead', status TEXT DEFAULT 'new', source TEXT, pipeline_stage TEXT DEFAULT 'lead', notes TEXT, archive_status TEXT DEFAULT 'active', deleted_at TEXT, created_at TEXT DEFAULT (datetime('now','localtime')), updated_at TEXT DEFAULT (datetime('now','localtime')))`);
  db.run(`CREATE TABLE IF NOT EXISTS companies (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, website TEXT, industry TEXT, city TEXT, state TEXT, country TEXT, notes TEXT, status TEXT DEFAULT 'active', lead_score INTEGER DEFAULT 0, archive_status TEXT DEFAULT 'active', deleted_at TEXT, created_at TEXT DEFAULT (datetime('now','localtime')), updated_at TEXT DEFAULT (datetime('now','localtime')))`);
  db.run(`CREATE TABLE IF NOT EXISTS interactions (id INTEGER PRIMARY KEY AUTOINCREMENT, lead_id INTEGER REFERENCES leads(id), company_id INTEGER REFERENCES companies(id), type TEXT NOT NULL, outcome TEXT, notes TEXT, created_at TEXT DEFAULT (datetime('now','localtime')))`);
  db.run(`CREATE TABLE IF NOT EXISTS daily_performance (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL UNIQUE, new_leads INTEGER DEFAULT 0, outreach_count INTEGER DEFAULT 0, followup_count INTEGER DEFAULT 0, meetings_count INTEGER DEFAULT 0, replies_received INTEGER DEFAULT 0, leads_converted INTEGER DEFAULT 0, score REAL DEFAULT 0)`);
  db.run(`CREATE TABLE IF NOT EXISTS tags (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, color TEXT DEFAULT '#3b82f6')`);
  db.run(`CREATE TABLE IF NOT EXISTS contact_tags (contact_id INTEGER REFERENCES leads(id), tag_id INTEGER REFERENCES tags(id), PRIMARY KEY (contact_id, tag_id))`);
  db.run(`CREATE TABLE IF NOT EXISTS company_tags (company_id INTEGER REFERENCES companies(id), tag_id INTEGER REFERENCES tags(id), PRIMARY KEY (company_id, tag_id))`);
  db.run(`CREATE TABLE IF NOT EXISTS activity_log (id INTEGER PRIMARY KEY AUTOINCREMENT, entity_type TEXT NOT NULL, entity_id INTEGER NOT NULL, action TEXT NOT NULL, details TEXT, created_at TEXT DEFAULT (datetime('now','localtime')))`);

  db.run(`INSERT OR IGNORE INTO goals VALUES (1, 5, 20, 10, 4)`);

  const leadData = [
    ['Sarah Johnson', 'sarah@techcorp.com', '555-0101', 'CEO', 'TechCorp', 'lead', 'hot', 'LinkedIn', 'proposal', 'Interested in enterprise plan'],
    ['Michael Chen', 'michael@startup.io', '555-0102', 'CTO', 'StartupIO', 'lead', 'warm', 'Referral', 'qualified', 'Budget approved'],
    ['Emily Rodriguez', 'emily@finance.co', '555-0103', 'VP Sales', 'FinanceCo', 'lead', 'new', 'Website', 'lead', 'Downloaded whitepaper'],
    ['James Wilson', 'james@realty.com', '555-0104', 'Broker', 'RealtyPro', 'lead', 'cold', 'Cold Call', 'lead', 'Not interested right now'],
    ['Lisa Thompson', 'lisa@healthcare.org', '555-0105', 'Director', 'HealthCare Org', 'lead', 'hot', 'Conference', 'negotiation', 'Ready to sign'],
    ['David Kim', 'david@retailplus.com', '555-0106', 'Manager', 'RetailPlus', 'lead', 'warm', 'LinkedIn', 'qualified', 'Demo scheduled'],
    ['Anna Martinez', 'anna@eduhub.edu', '555-0107', 'Professor', 'EduHub', 'lead', 'new', 'Webinar', 'lead', 'Attended webinar'],
    ['Robert Taylor', 'robert@mfgcorp.com', '555-0108', 'Owner', 'MfgCorp', 'lead', 'converted', 'Referral', 'closed', 'Signed annual contract'],
    ['Jennifer Brown', 'jennifer@agency.io', '555-0109', 'Strategist', 'AgencyIO', 'lead', 'warm', 'Website', 'qualified', 'Requested custom pricing'],
    ['Thomas Anderson', 'thomas@matrix.dev', '555-0110', 'Developer', 'MatrixDev', 'lead', 'new', 'LinkedIn', 'lead', 'Connected at event'],
  ];

  const insertLead = db.prepare(`INSERT INTO leads (name, email, phone, job_title, company_name, contact_type, status, source, pipeline_stage, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  leadData.forEach(l => insertLead.run(l));

  const companyData = [
    ['TechCorp', 'https://techcorp.com', 'Technology', 'San Francisco', 'CA', 'USA', 'Enterprise software company', 'active', 85],
    ['StartupIO', 'https://startup.io', 'Technology', 'Austin', 'TX', 'USA', 'Fast-growing startup', 'active', 70],
    ['FinanceCo', 'https://finance.co', 'Finance', 'New York', 'NY', 'USA', 'Financial services firm', 'active', 45],
    ['RealtyPro', 'https://realtypro.com', 'Real Estate', 'Miami', 'FL', 'USA', 'Real estate brokerage', 'active', 20],
    ['HealthCare Org', 'https://healthcare.org', 'Healthcare', 'Boston', 'MA', 'USA', 'Healthcare provider', 'active', 90],
    ['RetailPlus', 'https://retailplus.com', 'Retail', 'Chicago', 'IL', 'USA', 'Retail chain', 'active', 55],
    ['EduHub', 'https://eduhub.edu', 'Education', 'Seattle', 'WA', 'USA', 'Educational institution', 'active', 35],
    ['MfgCorp', 'https://mfgcorp.com', 'Manufacturing', 'Detroit', 'MI', 'USA', 'Manufacturing company', 'active', 60],
    ['AgencyIO', 'https://agency.io', 'Marketing', 'Los Angeles', 'CA', 'USA', 'Creative agency', 'active', 50],
    ['MatrixDev', 'https://matrix.dev', 'Technology', 'Denver', 'CO', 'USA', 'Dev shop', 'active', 40],
  ];

  const insertCompany = db.prepare(`INSERT INTO companies (name, website, industry, city, state, country, notes, status, lead_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  companyData.forEach(c => insertCompany.run(c));

  // Tags
  const tagData = [['VIP', '#f59e0b'], ['Hot Lead', '#ef4444'], ['Tech', '#3b82f6'], ['Finance', '#10b981'], ['Follow-up', '#8b5cf6']];
  const insertTag = db.prepare('INSERT OR IGNORE INTO tags (name, color) VALUES (?, ?)');
  tagData.forEach(t => insertTag.run(t));

  // Daily performance for 14 days
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const bl = isWeekend ? 0 : Math.floor(Math.random() * 8) + 2;
    const bo = isWeekend ? 0 : Math.floor(Math.random() * 25) + 10;
    const bf = isWeekend ? 0 : Math.floor(Math.random() * 12) + 5;
    const meetings = isWeekend ? 0 : Math.floor(Math.random() * 3);
    const replies = Math.floor(bo * (Math.random() * 0.4 + 0.1));
    const converted = bl > 0 ? Math.floor(Math.random() * Math.min(bl, 3)) : 0;
    const score = Math.round(((bl / 5) * 100 + (bo / 20) * 100 + (bf / 10) * 100) / 3);
    db.run(`INSERT OR IGNORE INTO daily_performance (date, new_leads, outreach_count, followup_count, meetings_count, replies_received, leads_converted, score) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [dateStr, Math.min(bl, 10), Math.min(bo, 35), Math.min(bf, 18), meetings, replies, converted, Math.min(score, 100)]);
  }

  // Interactions
  const types = ['outreach', 'followup', 'outreach', 'outreach', 'followup', 'meeting'];
  const outcomes = ['no_reply', 'interested', 'not_interested', 'no_reply', 'meeting_scheduled', 'completed'];
  for (let i = 1; i <= 10; i++) {
    const num = Math.floor(Math.random() * 4) + 1;
    for (let j = 0; j < num; j++) {
      const daysAgo = Math.floor(Math.random() * 14) + 1;
      const type = types[Math.floor(Math.random() * types.length)];
      const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];
      const d = new Date(); d.setDate(d.getDate() - daysAgo);
      db.run('INSERT INTO interactions (lead_id, type, outcome, notes, created_at) VALUES (?, ?, ?, ?, ?)',
        [i, type, outcome, `Sample ${type} note`, d.toISOString().slice(0, 19).replace('T', ' ')]);
    }
  }

  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
  console.log('Database seeded successfully!');
  console.log('- 10 contacts, 10 companies, 5 tags, 14 days of KPI data, sample interactions');
}

seed().catch(console.error);
