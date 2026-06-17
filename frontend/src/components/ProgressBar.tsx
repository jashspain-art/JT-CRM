interface Props {
  current: number
  target: number
  label: string
  color?: string
  showDetails?: boolean
}

export default function ProgressBar({ current, target, label, color = 'blue', showDetails = true }: Props) {
  const pct = Math.min(100, Math.round((current / (target || 1)) * 100))
  const colors: Record<string, string> = {
    blue: 'bg-blue-600',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        {showDetails && (
          <span className="text-sm text-gray-500">
            {current} / {target}
          </span>
        )}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full transition-all duration-500 ${colors[color] || colors.blue}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      {showDetails && (
        <span className="text-xs text-gray-400 mt-0.5 block">{pct}%</span>
      )}
    </div>
  )
}
