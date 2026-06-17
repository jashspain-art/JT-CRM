import { Router } from 'express';
import { getDb } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const allDays = db.exec('SELECT date, outreach_count, followup_count, score FROM daily_performance ORDER BY date DESC');
  
  const streaks = {
    prospecting: calcStreak(allDays, d => d.outreach_count > 0),
    followup: calcStreak(allDays, d => d.followup_count > 0),
    kpiTarget: calcStreak(allDays, d => (d.score || 0) >= 80)
  };

  res.json(streaks);
});

function calcStreak(allDays, predicate) {
  if (allDays.length === 0 || allDays[0].values.length === 0) {
    return { current: 0, longest: 0, todayCompleted: false };
  }

  const cols = allDays[0].columns;
  const days = allDays[0].values.map(v => {
    const obj = {};
    cols.forEach((c, i) => obj[c] = v[i]);
    return obj;
  });

  let current = 0;
  let longest = 0;
  let tempStreak = 0;
  let todayCompleted = false;

  for (let i = 0; i < days.length; i++) {
    if (predicate(days[i])) {
      tempStreak++;
      if (i === 0) todayCompleted = true;
      if (tempStreak > longest) longest = tempStreak;
    } else {
      if (i === 0 && tempStreak === 0) current = 0;
      tempStreak = 0;
    }
  }
  current = tempStreak;

  return { current, longest, todayCompleted };
}

export default router;
