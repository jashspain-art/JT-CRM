import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import type { DailyKPI, WeeklyKPI, MonthlyKPI } from '../types'
import GoalSettings from './GoalSettings'
import ProgressBar from './ProgressBar'
import KPIScoreCard from './KPIScoreCard'
import StreakTracker from './StreakTracker'
import DailyReview from './DailyReview'
import WeeklyReport from './WeeklyReport'
import AIRecommendations from './AIRecommendations'

export default function Dashboard() {
  const [daily, setDaily] = useState<DailyKPI | null>(null)
  const [weekly, setWeekly] = useState<WeeklyKPI | null>(null)
  const [monthly, setMonthly] = useState<MonthlyKPI | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const loadData = useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10)
    try {
      const [d, w, m] = await Promise.all([
        api.getDailyKPI(today),
        api.getWeeklyKPI(today),
        api.getMonthlyKPI(today),
      ])
      setDaily(d)
      setWeekly(w)
      setMonthly(m)
    } catch (e) {
      console.error('Failed to load KPI data', e)
    }
  }, [])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 60000)
    return () => clearInterval(interval)
  }, [loadData, refreshKey])

  const handleGoalUpdate = () => {
    setRefreshKey(k => k + 1)
  }

  if (!daily || !weekly || !monthly) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KPIScoreCard title="Daily Score" score={daily.score} subtitle={daily.date}>
              <ProgressBar current={daily.new_leads} target={daily.goals.new_leads_per_day} label="New Leads" color="blue" />
              <ProgressBar current={daily.outreach_count} target={daily.goals.outreach_per_day} label="Outreach" color="green" />
              <ProgressBar current={daily.followup_count} target={daily.goals.followups_per_day} label="Follow-Ups" color="yellow" />
            </KPIScoreCard>
            <KPIScoreCard title="Weekly Score" score={weekly.score} subtitle={`${weekly.weekStart.slice(5)}–${weekly.weekEnd.slice(5)}`}>
              <ProgressBar current={weekly.totals.new_leads} target={daily.goals.new_leads_per_day * 5} label="Total Leads" color="blue" />
              <ProgressBar current={weekly.totals.outreach_count} target={daily.goals.outreach_per_day * 5} label="Total Outreach" color="green" />
              <ProgressBar current={weekly.totals.followup_count} target={daily.goals.followups_per_day * 5} label="Total Follow-Ups" color="yellow" />
              <ProgressBar current={weekly.totals.meetings_count} target={daily.goals.meetings_per_week} label="Meetings" color="purple" />
            </KPIScoreCard>
            <KPIScoreCard title="Monthly Score" score={monthly.score} subtitle={monthly.month}>
              <ProgressBar current={monthly.totals.new_leads} target={daily.goals.new_leads_per_day * 22} label="Total Leads" color="blue" showDetails={false} />
              <ProgressBar current={monthly.totals.outreach_count} target={daily.goals.outreach_per_day * 22} label="Total Outreach" color="green" showDetails={false} />
              <ProgressBar current={monthly.totals.followup_count} target={daily.goals.followups_per_day * 22} label="Total Follow-Ups" color="yellow" showDetails={false} />
              <ProgressBar current={monthly.totals.meetings_count} target={daily.goals.meetings_per_week * 4} label="Meetings" color="purple" showDetails={false} />
            </KPIScoreCard>
          </div>
          <DailyReview />
          <WeeklyReport />
          <StreakTracker />
        </div>

        <div className="lg:col-span-1 space-y-6">
          <GoalSettings onUpdate={handleGoalUpdate} />
          <AIRecommendations />
        </div>
      </div>
    </div>
  )
}
