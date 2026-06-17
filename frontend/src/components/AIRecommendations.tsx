import { useState, useEffect } from 'react'
import { api } from '../api'
import type { Recommendation } from '../types'

export default function AIRecommendations() {
  const [rec, setRec] = useState<Recommendation | null>(null)

  useEffect(() => {
    api.getRecommendations().then(setRec)
    const interval = setInterval(() => api.getRecommendations().then(setRec), 30000)
    return () => clearInterval(interval)
  }, [])

  if (!rec) return null

  return (
    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl shadow-sm p-5 text-white">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🤖</span>
        <h3 className="text-sm font-semibold uppercase tracking-wide opacity-90">AI Recommendation</h3>
      </div>

      <div className="mb-4 bg-white/10 rounded-lg p-3">
        <p className="text-sm font-medium opacity-90">What should you focus on today?</p>
        <p className="text-base font-bold mt-1">{rec.focusArea}</p>
      </div>

      {rec.messages.length > 0 && (
        <div className="mb-4 space-y-1.5">
          {rec.messages.map((msg, i) => (
            <p key={i} className="text-sm text-white/90">{msg}</p>
          ))}
        </div>
      )}

      {rec.priorities.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide opacity-80 mb-2">Prioritized Tasks</h4>
          <div className="space-y-2">
            {rec.priorities.map((p, i) => (
              <div key={i} className="flex items-start gap-2 bg-white/10 rounded-lg p-2.5">
                <span className={`mt-0.5 text-xs font-bold px-1.5 py-0.5 rounded ${
                  p.priority === 'high' ? 'bg-red-400 text-white' :
                  p.priority === 'medium' ? 'bg-yellow-400 text-gray-900' :
                  'bg-green-400 text-gray-900'
                }`}>
                  {p.priority === 'high' ? 'H' : p.priority === 'medium' ? 'M' : 'L'}
                </span>
                <div>
                  <p className="text-sm font-medium">{p.task}</p>
                  <p className="text-xs text-white/70">{p.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 flex gap-3 text-xs text-white/70">
        <span>🔥 {rec.hotLeads} hot leads</span>
        <span>⏰ {rec.overdue} overdue</span>
      </div>
    </div>
  )
}
