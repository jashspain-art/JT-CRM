import express from 'express';
import cors from 'cors';
import { getDb, saveDb } from './db.js';
import goalsRouter from './routes/goals.js';
import kpiRouter from './routes/kpi.js';
import contactsRouter from './routes/contacts.js';
import companiesRouter from './routes/companies.js';
import streaksRouter from './routes/streaks.js';
import recommendationsRouter from './routes/recommendations.js';
import reportsRouter from './routes/reports.js';
import activityRouter from './routes/activity.js';
import tagsRouter from './routes/tags.js';
import importExportRouter from './routes/importExport.js';
import mergeRouter from './routes/merge.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.use('/api/goals', goalsRouter);
app.use('/api/kpi', kpiRouter);
app.use('/api/contacts', contactsRouter);
app.use('/api/companies', companiesRouter);
app.use('/api/leads', contactsRouter);
app.use('/api/streaks', streaksRouter);
app.use('/api/recommendations', recommendationsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/activity', activityRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/import', importExportRouter);
app.use('/api/export', importExportRouter);
app.use('/api/merge', mergeRouter);

setInterval(async () => {
  const db = await getDb();
  saveDb(db);
}, 300000);

app.listen(PORT, () => {
  console.log(`JT CRM API running on http://localhost:${PORT}`);
});
