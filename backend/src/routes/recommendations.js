import { Router } from 'express';
import { getDb } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const today = new Date().toISOString().slice(0, 10);

  const dp = getDailyPerf(db, today);
  const goals = getGoals(db);
  const hotLeads = getHotLeads(db);
  const overdueLeads = getOverdueFollowups(db);
  const pipeline = getPipelineStages(db);

  const gaps = [];
  const priorities = [];

  if (dp.new_leads < goals.new_leads_per_day) {
    gaps.push({ metric: 'New Leads', current: dp.new_leads, target: goals.new_leads_per_day, gap: goals.new_leads_per_day - dp.new_leads });
  }
  if (dp.outreach_count < goals.outreach_per_day) {
    gaps.push({ metric: 'Outreach', current: dp.outreach_count, target: goals.outreach_per_day, gap: goals.outreach_per_day - dp.outreach_count });
  }
  if (dp.followup_count < goals.followups_per_day) {
    gaps.push({ metric: 'Follow-ups', current: dp.followup_count, target: goals.followups_per_day, gap: goals.followups_per_day - dp.followup_count });
  }

  const messages = [];

  if (overdueLeads.length > 0) {
    messages.push(`🔴 You have ${overdueLeads.length} overdue follow-up${overdueLeads.length > 1 ? 's' : ''}.`);
    priorities.push({ task: `Follow up with ${overdueLeads[0].name}${overdueLeads.length > 1 ? ` and ${overdueLeads.length - 1} others` : ''}`, reason: 'Overdue follow-up', priority: 'high' });
  }

  if (hotLeads.length > 0) {
    messages.push(`🟡 ${hotLeads.length} hot lead${hotLeads.length > 1 ? 's are' : ' is'} waiting for attention.`);
    priorities.push({ task: `Contact hot lead: ${hotLeads[0].name}${hotLeads.length > 1 ? ` (and ${hotLeads.length - 1} more)` : ''}`, reason: 'Hot lead in pipeline', priority: 'high' });
  }

  const gapMetrics = gaps.map(g => g.metric);
  if (gapMetrics.length > 0) {
    messages.push(`📊 Close the gap on: ${gapMetrics.join(', ')}.`);
    gaps.forEach(g => {
      priorities.push({ task: `Generate ${g.gap} more ${g.metric.toLowerCase()}`, reason: `KPI gap: ${g.current}/${g.target}`, priority: 'medium' });
    });
  }

  if (pipeline.length > 0) {
    const earlyStage = pipeline.filter(s => s.pipeline_stage === 'lead' || s.pipeline_stage === 'qualified');
    if (earlyStage.length > 0) {
      const total = earlyStage.reduce((sum, s) => sum + s.count, 0);
      priorities.push({ task: `Advance ${total} lead${total > 1 ? 's' : ''} to next pipeline stage`, reason: `${total} in early pipeline stages`, priority: 'medium' });
    }
  }

  if (messages.length === 0) {
    messages.push('✅ You\'re on track! Maintain momentum and review your pipeline for opportunities.');
    priorities.push({ task: 'Review pipeline for upselling opportunities', reason: 'All KPIs on track', priority: 'low' });
    priorities.push({ task: 'Update lead notes and clean up records', reason: 'Administrative maintenance', priority: 'low' });
  }

  const focusArea = messages[0];

  res.json({ focusArea, messages, priorities, gaps, hotLeads: hotLeads.length, overdue: overdueLeads.length });
});

function getDailyPerf(db, date) {
  const row = db.exec('SELECT * FROM daily_performance WHERE date = ?', [date]);
  if (row.length > 0 && row[0].values.length > 0) {
    const cols = row[0].columns;
    const vals = row[0].values[0];
    const obj = {};
    cols.forEach((c, i) => obj[c] = vals[i]);
    return obj;
  }
  return { id: null, new_leads: 0, outreach_count: 0, followup_count: 0, meetings_count: 0 };
}

function getGoals(db) {
  const row = db.exec('SELECT * FROM goals WHERE id = 1');
  if (row.length > 0 && row[0].values.length > 0) {
    const cols = row[0].columns;
    const vals = row[0].values[0];
    const goal = {};
    cols.forEach((c, i) => goal[c] = vals[i]);
    return goal;
  }
  return { new_leads_per_day: 5, outreach_per_day: 20, followups_per_day: 10, meetings_per_week: 4 };
}

function getHotLeads(db) {
  const result = db.exec(`SELECT id, name, status, pipeline_stage FROM leads WHERE status IN ('hot','warm') OR pipeline_stage IN ('proposal','negotiation') ORDER BY updated_at DESC`);
  if (result.length === 0) return [];
  const cols = result[0].columns;
  return result[0].values.map(v => {
    const obj = {};
    cols.forEach((c, i) => obj[c] = v[i]);
    return obj;
  });
}

function getOverdueFollowups(db) {
  const result = db.exec(`
    SELECT l.id, l.name, MAX(i.created_at) as last_interaction
    FROM leads l LEFT JOIN interactions i ON l.id = i.lead_id
    GROUP BY l.id
    HAVING last_interaction IS NULL OR datetime(last_interaction) < datetime('now', '-3 days')
    ORDER BY last_interaction ASC
  `);
  if (result.length === 0) return [];
  const cols = result[0].columns;
  return result[0].values.map(v => {
    const obj = {};
    cols.forEach((c, i) => obj[c] = v[i]);
    return obj;
  });
}

function getPipelineStages(db) {
  const result = db.exec(`
    SELECT pipeline_stage, COUNT(*) as count FROM leads
    GROUP BY pipeline_stage
    ORDER BY CASE pipeline_stage WHEN 'lead' THEN 1 WHEN 'qualified' THEN 2 WHEN 'proposal' THEN 3 WHEN 'negotiation' THEN 4 WHEN 'closed' THEN 5 ELSE 6 END
  `);
  if (result.length === 0) return [];
  const cols = result[0].columns;
  return result[0].values.map(v => {
    const obj = {};
    cols.forEach((c, i) => obj[c] = v[i]);
    return obj;
  });
}

export default router;
