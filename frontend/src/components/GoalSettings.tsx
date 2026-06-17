import { useState, useEffect } from 'react'
import { api } from '../api'
import type { Goals } from '../types'

interface Props {
  onUpdate: () => void
}

export default function GoalSettings({ onUpdate }: Props) {
  const [goals, setGoals] = useState<Goals | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Partial<Goals>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.getGoals().then(setGoals)
  }, [])

  const handleSave = async () => {
    setSaving(true)
    const updated = await api.updateGoals(form)
    setGoals(updated)
    setEditing(false)
    setSaving(false)
    onUpdate()
  }

  if (!goals) return null

  const fields = [
    { key: 'new_leads_per_day', label: 'New Leads Per Day', value: goals.new_leads_per_day },
    { key: 'outreach_per_day', label: 'Outreach Per Day', value: goals.outreach_per_day },
    { key: 'followups_per_day', label: 'Follow-Ups Per Day', value: goals.followups_per_day },
    { key: 'meetings_per_week', label: 'Meetings Per Week', value: goals.meetings_per_week },
  ] as const

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Goals</h3>
        <button
          onClick={() => { setEditing(!editing); if (!editing) setForm(goals) }}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
        >
          {editing ? 'Cancel' : 'Edit'}
        </button>
      </div>
      <div className="space-y-3">
        {fields.map(({ key, label, value }) => (
          <div key={key}>
            <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
            {editing ? (
              <input
                type="number" min="0"
                value={(form as any)[key] ?? value}
                onChange={e => setForm({ ...form, [key]: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            ) : (
              <span className="text-lg font-bold text-gray-800">{value}</span>
            )}
          </div>
        ))}
      </div>
      {editing && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-4 w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Goals'}
        </button>
      )}
    </div>
  )
}
