import { useState, useEffect } from 'react'
import { api } from '../api'
import type { DailyReview as DailyReviewType } from '../types'

export default function DailyReview() {
  const [review, setReview] = useState<DailyReviewType | null>(null)

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    api.getDailyReview(today).then(setReview)
    const interval = setInterval(() => {
      const d = new Date().toISOString().slice(0, 10)
      api.getDailyReview(d).then(setReview)
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  if (!review) return null

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">
        Daily Performance Review
        <span className="ml-2 text-xs text-gray-400 font-normal normal-case">{review.date}</span>
      </h3>

      <div className="mb-4">
        <div className="text-lg font-bold text-gray-800">
          Score: <span className={review.score >= 80 ? 'text-green-600' : review.score >= 50 ? 'text-yellow-600' : 'text-red-600'}>{review.score}/100</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <h4 className="text-xs font-semibold text-green-700 uppercase mb-2 flex items-center gap-1">
            <span>✓</span> What Went Well
          </h4>
          <ul className="space-y-1.5">
            {review.wentWell.map((item, i) => (
              <li key={i} className="text-sm text-green-800 bg-green-50 rounded px-2 py-1">{item}</li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-red-700 uppercase mb-2 flex items-center gap-1">
            <span>!</span> Needs Attention
          </h4>
          <ul className="space-y-1.5">
            {review.needsAttention.map((item, i) => (
              <li key={i} className="text-sm text-red-800 bg-red-50 rounded px-2 py-1">{item}</li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-blue-700 uppercase mb-2 flex items-center gap-1">
            <span>→</span> Recommended Actions
          </h4>
          <ul className="space-y-1.5">
            {review.recommendedActions.map((item, i) => (
              <li key={i} className="text-sm text-blue-800 bg-blue-50 rounded px-2 py-1">{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
