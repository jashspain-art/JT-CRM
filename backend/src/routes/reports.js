import { Router } from 'express';
import { getDb } from '../db.js';

const router = Router();

router.get('/daily/:date', async (req, res) => {
  const db = await getDb();
  const date = req.params.date;
  const dp = getDailyPerf(db, date);
  const goals = getGoals(db);

  const wentWell = [];
  const needsAttention = [];
  const recommendedActions = [];

  if (dp.new_leads >= goals.new_leads_per_day) {
    wentWell.push(`Met new lead target: ${dp.new_leads} leads (goal: ${goals.new_leads_per_day})`);
  } else {
    needsAttention.push(`New leads below target: ${dp.new_leads}/${goals.new_leads_per_day}`);
    recommendedActions.push(`Generate ${goals.new_leads_per_day - dp.new_leads} more leads`);
  }

  if (dp.outreach_count >= goals.outreach_per_day) {
    wentWell.push(`Met outreach target: ${dp.outreach_count} outreaches (goal: ${goals.outreach_per_day})`);
  } else {
    needsAttention.push(`Outreach below target: ${dp.outreach_count}/${goals.outreach_per_day}`);
    recommendedActions.push(`Complete ${goals.outreach_per_day - dp.outreach_count} more outreaches`);
  }

  if (dp.followup_count >= goals.followups_per_day) {
    wentWell.push(`Met follow-up target: ${dp.followup_count} follow-ups (goal: ${goals.followups_per_day})`);
  } else {
    needsAttention.push(`Follow-ups below target: ${dp.followup_count}/${goals.followups_per_day}`);
    recommendedActions.push(`Do ${goals.followups_per_day - dp.followup_count} more follow-ups`);
  }

  if (dp.replies_received > 0) {
    wentWell.push(`Received ${dp.replies_received} repl${dp.replies_received > 1 ? 'ies' : 'y'} to outreach`);
  }

  if (dp.leads_converted > 0) {
    wentWell.push(`Converted ${dp.leads_converted} lead${dp.leads_converted > 1 ? 's' : ''}`);
  }

  if (needsAttention.length === 0) {
    needsAttention.push('All targets met — great work!');
    recommendedActions.push('Review pipeline for advancement opportunities');
    recommendedActions.push('Prepare for tomorrow\'s outreach');
  }

  const overallScore = calculateScore(dp, goals);

  res.json({ date, ...dp, goals, wentWell, needsAttention, recommendedActions, score: overallScore });
});

router.get('/weekly/:date', async (req, res) => {
  const db = await getDb();
  const date = new Date(req.params.date);
  const dayOfWeek = date.getDay();
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((dayOfWeek + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const dailyData = [];
  let totalLeads = 0, totalOutreach = 0, totalFollowups = 0, totalMeetings = 0;
  let totalReplies = 0, totalConverted = 0;

  for (let d = new Date(monday); d <= sunday; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10);
    const dp = getDailyPerf(db, dateStr);
    dailyData.push({ date: dateStr, new_leads: dp.new_leads, outreach_count: dp.outreach_count, followup_count: dp.followup_count, meetings_count: dp.meetings_count });
    totalLeads += dp.new_leads;
    totalOutreach += dp.outreach_count;
    totalFollowups += dp.followup_count;
    totalMeetings += dp.meetings_count;
    totalReplies += dp.replies_received;
    totalConverted += dp.leads_converted;
  }

  const goals = getGoals(db);
  const replyRate = totalOutreach > 0 ? Math.round((totalReplies / totalOutreach) * 100) : 0;
  const meetingRate = totalOutreach > 0 ? Math.round((totalMeetings / totalOutreach) * 100) : 0;
  const conversionRate = totalLeads > 0 ? Math.round((totalConverted / totalLeads) * 100) : 0;

  res.json({
    weekStart: monday.toISOString().slice(0, 10),
    weekEnd: sunday.toISOString().slice(0, 10),
    dailyData,
    totals: {
      new_leads: totalLeads,
      outreach_count: totalOutreach,
      followup_count: totalFollowups,
      meetings_count: totalMeetings
    },
    goals,
    rates: { replyRate, meetingRate, conversionRate },
    trends: {
      leadTrend: calcTrend(dailyData, 'new_leads'),
      outreachTrend: calcTrend(dailyData, 'outreach_count'),
      followupTrend: calcTrend(dailyData, 'followup_count')
    }
  });
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

function calculateScore(dp, goals) {
  const leadsScore = goals.new_leads_per_day > 0 ? Math.min(100, Math.round((dp.new_leads / goals.new_leads_per_day) * 100)) : 0;
  const outreachScore = goals.outreach_per_day > 0 ? Math.min(100, Math.round((dp.outreach_count / goals.outreach_per_day) * 100)) : 0;
  const followupScore = goals.followups_per_day > 0 ? Math.min(100, Math.round((dp.followup_count / goals.followups_per_day) * 100)) : 0;
  return Math.round((leadsScore + outreachScore + followupScore) / 3);
}

function calcTrend(dailyData, field) {
  if (dailyData.length < 2) return 'stable';
  const firstHalf = dailyData.slice(0, Math.ceil(dailyData.length / 2));
  const secondHalf = dailyData.slice(Math.ceil(dailyData.length / 2));
  const firstAvg = firstHalf.reduce((s, d) => s + d[field], 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((s, d) => s + d[field], 0) / secondHalf.length;
  if (secondAvg > firstAvg * 1.1) return 'up';
  if (secondAvg < firstAvg * 0.9) return 'down';
  return 'stable';
}

export default router;
