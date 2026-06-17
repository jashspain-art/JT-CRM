import { Router } from 'express';
import { getDb, saveDb } from '../db.js';

const router = Router();

router.get('/today', async (req, res) => {
  const db = await getDb();
  const today = new Date().toISOString().slice(0, 10);
  const dp = getDailyPerf(db, today);
  const goals = getGoals(db);
  const scores = calculateScores(dp, goals);
  res.json({ date: today, ...dp, ...scores, goals });
});

router.get('/daily/:date', async (req, res) => {
  const db = await getDb();
  const dp = getDailyPerf(db, req.params.date);
  const goals = getGoals(db);
  const scores = calculateScores(dp, goals);
  res.json({ date: req.params.date, ...dp, ...scores, goals });
});

router.get('/weekly/:date', async (req, res) => {
  const db = await getDb();
  const date = new Date(req.params.date);
  const dayOfWeek = date.getDay();
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((dayOfWeek + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const days = [];
  let totalLeads = 0, totalOutreach = 0, totalFollowups = 0, totalMeetings = 0;
  let totalReplies = 0, totalConverted = 0;
  let totalScore = 0;
  let dayCount = 0;

  for (let d = new Date(monday); d <= sunday; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10);
    const dp = getDailyPerf(db, dateStr);
    const goals = getGoals(db);
    const scores = calculateScores(dp, goals);
    days.push({ date: dateStr, ...dp, ...scores });
    totalLeads += dp.new_leads;
    totalOutreach += dp.outreach_count;
    totalFollowups += dp.followup_count;
    totalMeetings += dp.meetings_count;
    totalReplies += dp.replies_received;
    totalConverted += dp.leads_converted;
    totalScore += scores.score || 0;
    dayCount++;
  }

  const goals = getGoals(db);
  const weeklyGoal = goals.meetings_per_week || 4;
  const outreachGoal = goals.outreach_per_day || 20;
  const followupGoal = goals.followups_per_day || 10;
  const leadsGoal = goals.new_leads_per_day || 5;

  const weeklyScore = Math.min(100, Math.round(
    ((totalLeads / (leadsGoal * Math.min(dayCount, 5))) * 100 +
     (totalOutreach / (outreachGoal * Math.min(dayCount, 5))) * 100 +
     (totalFollowups / (followupGoal * Math.min(dayCount, 5))) * 100 +
     (totalMeetings / weeklyGoal) * 100) / 4
  ));

  const replyRate = totalOutreach > 0 ? Math.round((totalReplies / totalOutreach) * 100) : 0;
  const meetingRate = totalOutreach > 0 ? Math.round((totalMeetings / totalOutreach) * 100) : 0;
  const conversionRate = totalLeads > 0 ? Math.round((totalConverted / totalLeads) * 100) : 0;

  res.json({
    weekStart: monday.toISOString().slice(0, 10),
    weekEnd: sunday.toISOString().slice(0, 10),
    days,
    totals: {
      new_leads: totalLeads,
      outreach_count: totalOutreach,
      followup_count: totalFollowups,
      meetings_count: totalMeetings,
      replies_received: totalReplies,
      leads_converted: totalConverted
    },
    score: weeklyScore,
    goals,
    rates: { replyRate, meetingRate, conversionRate }
  });
});

router.get('/monthly/:date', async (req, res) => {
  const db = await getDb();
  const date = new Date(req.params.date);
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  let totalLeads = 0, totalOutreach = 0, totalFollowups = 0, totalMeetings = 0;
  let totalReplies = 0, totalConverted = 0;
  const weeks = [];
  let weekDays = [];

  for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10);
    const dp = getDailyPerf(db, dateStr);
    const goals = getGoals(db);
    const scores = calculateScores(dp, goals);
    weekDays.push({ date: dateStr, ...dp, ...scores });
    totalLeads += dp.new_leads;
    totalOutreach += dp.outreach_count;
    totalFollowups += dp.followup_count;
    totalMeetings += dp.meetings_count;
    totalReplies += dp.replies_received;
    totalConverted += dp.leads_converted;

    if (d.getDay() === 0 || d.getTime() === lastDay.getTime()) {
      weeks.push({ days: weekDays });
      weekDays = [];
    }
  }

  const goals = getGoals(db);
  const totalWorkDays = weeks.reduce((acc, w) => acc + w.days.length, 0);
  const monthlyScore = Math.min(100, Math.round(
    ((totalLeads / (goals.new_leads_per_day * totalWorkDays)) * 100 +
     (totalOutreach / (goals.outreach_per_day * totalWorkDays)) * 100 +
     (totalFollowups / (goals.followups_per_day * totalWorkDays)) * 100 +
     (totalMeetings / (goals.meetings_per_week * 4)) * 100) / 4
  ));

  const replyRate = totalOutreach > 0 ? Math.round((totalReplies / totalOutreach) * 100) : 0;
  const meetingRate = totalOutreach > 0 ? Math.round((totalMeetings / totalOutreach) * 100) : 0;
  const conversionRate = totalLeads > 0 ? Math.round((totalConverted / totalLeads) * 100) : 0;

  res.json({
    month: `${year}-${String(month + 1).padStart(2, '0')}`,
    weeks,
    totals: {
      new_leads: totalLeads,
      outreach_count: totalOutreach,
      followup_count: totalFollowups,
      meetings_count: totalMeetings,
      replies_received: totalReplies,
      leads_converted: totalConverted
    },
    score: monthlyScore,
    goals,
    rates: { replyRate, meetingRate, conversionRate }
  });
});

// Log a KPI entry (called when actions happen)
router.post('/log', async (req, res) => {
  const db = await getDb();
  const { type } = req.body;
  const today = new Date().toISOString().slice(0, 10);

  let dp = getDailyPerf(db, today);
  if (!dp.id) {
    db.run(`INSERT INTO daily_performance (date, new_leads, outreach_count, followup_count, meetings_count, replies_received, leads_converted)
      VALUES (?, 0, 0, 0, 0, 0, 0)`, [today]);
    dp = getDailyPerf(db, today);
  }

  const updates = {
    new_lead: 'new_leads',
    outreach: 'outreach_count',
    followup: 'followup_count',
    meeting: 'meetings_count',
    reply: 'replies_received',
    conversion: 'leads_converted'
  };

  const col = updates[type];
  if (col) {
    db.run(`UPDATE daily_performance SET ${col} = ${col} + 1 WHERE date = ?`, [today]);
  }
  saveDb(db);
  res.json({ success: true });
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
  return { id: null, new_leads: 0, outreach_count: 0, followup_count: 0, meetings_count: 0, replies_received: 0, leads_converted: 0 };
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

function calculateScores(dp, goals) {
  const leadsScore = goals.new_leads_per_day > 0 ? Math.min(100, Math.round((dp.new_leads / goals.new_leads_per_day) * 100)) : 0;
  const outreachScore = goals.outreach_per_day > 0 ? Math.min(100, Math.round((dp.outreach_count / goals.outreach_per_day) * 100)) : 0;
  const followupScore = goals.followups_per_day > 0 ? Math.min(100, Math.round((dp.followup_count / goals.followups_per_day) * 100)) : 0;
  const score = Math.round((leadsScore + outreachScore + followupScore) / 3);
  return { leadsScore, outreachScore, followupScore, score };
}

export default router;
