interface Props {
  title: string
  score: number
  subtitle?: string
  children?: React.ReactNode
}

export default function KPIScoreCard({ title, score, subtitle, children }: Props) {
  const getScoreColor = (s: number) => {
    if (s >= 80) return { bg: 'bg-green-100', text: 'text-green-800', ring: 'ring-green-500' }
    if (s >= 50) return { bg: 'bg-yellow-100', text: 'text-yellow-800', ring: 'ring-yellow-500' }
    return { bg: 'bg-red-100', text: 'text-red-800', ring: 'ring-red-500' }
  }

  const scoreColor = getScoreColor(score)
  const circumference = 2 * Math.PI * 40

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">{title}</h3>
        {subtitle && <span className="text-xs text-gray-400">{subtitle}</span>}
      </div>
      <div className="flex items-center justify-center">
        <div className="relative w-24 h-24">
          <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8" />
            <circle
              cx="50" cy="50" r="40" fill="none"
              stroke="currentColor" strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - (score / 100) * circumference}
              strokeLinecap="round"
              className={`${scoreColor.text} transition-all duration-700`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-2xl font-bold ${scoreColor.text}`}>{score}</span>
          </div>
        </div>
      </div>
      {children && <div className="mt-3 space-y-2">{children}</div>}
    </div>
  )
}
