import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts'
import { api } from '../api'
import type { WeeklyReport as WeeklyReportType } from '../types'

export default function WeeklyReport() {
  const [report, setReport] = useState<WeeklyReportType | null>(null)

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    api.getWeeklyReport(today).then(setReport)
    const interval = setInterval(() => {
      const d = new Date().toISOString().slice(0, 10)
      api.getWeeklyReport(d).then(setReport)
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  if (!report) return null

  const chartData = report.dailyData.map(d => ({
    day: new Date(d.date).toLocaleDateString('en', { weekday: 'short' }),
    Leads: d.new_leads,
    Outreach: d.outreach_count,
    FollowUps: d.followup_count,
    Meetings: d.meetings_count,
  }))

  const trendIcon = (t: string) => t === 'up' ? '↑' : t === 'down' ? '↓' : '→'
  const trendColor = (t: string) => t === 'up' ? 'text-green-600' : t === 'down' ? 'text-red-600' : 'text-gray-500'

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">
        Weekly Performance Report
        <span className="ml-2 text-xs text-gray-400 font-normal normal-case">
          {report.weekStart} – {report.weekEnd}
        </span>
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-gray-50 p-3 rounded-lg text-center">
          <div className="text-xl font-bold text-gray-800">{report.totals.new_leads}</div>
          <div className="text-xs text-gray-500">New Leads</div>
          <div className={`text-xs font-medium ${trendColor(report.trends.leadTrend)}`}>
            {trendIcon(report.trends.leadTrend)} {report.trends.leadTrend}
          </div>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg text-center">
          <div className="text-xl font-bold text-gray-800">{report.totals.outreach_count}</div>
          <div className="text-xs text-gray-500">Outreach</div>
          <div className={`text-xs font-medium ${trendColor(report.trends.outreachTrend)}`}>
            {trendIcon(report.trends.outreachTrend)} {report.trends.outreachTrend}
          </div>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg text-center">
          <div className="text-xl font-bold text-gray-800">{report.totals.followup_count}</div>
          <div className="text-xs text-gray-500">Follow-Ups</div>
          <div className={`text-xs font-medium ${trendColor(report.trends.followupTrend)}`}>
            {trendIcon(report.trends.followupTrend)} {report.trends.followupTrend}
          </div>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg text-center">
          <div className="text-xl font-bold text-gray-800">{report.totals.meetings_count}</div>
          <div className="text-xs text-gray-500">Meetings</div>
        </div>
      </div>

      <div className="mb-6">
        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Daily Trends</h4>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
            <Bar dataKey="Leads" fill="#3b82f6" radius={[2, 2, 0, 0]} />
            <Bar dataKey="Outreach" fill="#10b981" radius={[2, 2, 0, 0]} />
            <Bar dataKey="FollowUps" fill="#f59e0b" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Conversion Metrics</h4>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-lg font-bold text-blue-700">{report.rates.replyRate}%</div>
            <div className="text-xs text-blue-600">Reply Rate</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-lg font-bold text-purple-700">{report.rates.meetingRate}%</div>
            <div className="text-xs text-purple-600">Meeting Rate</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-lg font-bold text-green-700">{report.rates.conversionRate}%</div>
            <div className="text-xs text-green-600">Conversion Rate</div>
          </div>
        </div>
      </div>
    </div>
  )
}
