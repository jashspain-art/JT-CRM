import { useState, useEffect } from 'react'
import { api } from '../api'
import type { Streaks } from '../types'

export default function StreakTracker() {
  const [streaks, setStreaks] = useState<Streaks | null>(null)

  useEffect(() => {
    api.getStreaks().then(setStreaks)
    const interval = setInterval(() => api.getStreaks().then(setStreaks), 30000)
    return () => clearInterval(interval)
  }, [])

  if (!streaks) return null

  const items = [
    { key: 'prospecting', label: 'Prospecting Days', streak: streaks.prospecting, icon: '📞' },
    { key: 'followup', label: 'Follow-Up Days', streak: streaks.followup, icon: '🔄' },
    { key: 'kpiTarget', label: 'KPI Target Days', streak: streaks.kpiTarget, icon: '🎯' },
  ]

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">Streaks</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {items.map(({ key, label, streak, icon }) => (
          <div key={key} className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl mb-1">{icon}</div>
            <div className="text-2xl font-bold text-gray-800">{streak.current}</div>
            <div className="text-xs text-gray-500">day{streak.current !== 1 ? 's' : ''}</div>
            <div className="text-xs font-medium text-gray-600 mt-1">{label}</div>
            <div className="text-xs text-gray-400 mt-1">
              Best: {streak.longest} days
            </div>
            {streak.todayCompleted && (
              <div className="text-xs text-green-600 font-medium mt-1">✓ Today active</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
