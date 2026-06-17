import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import type { Company, ActivityLog } from '../types'
import { useToast } from './Toast'
import ConfirmModal from './ConfirmModal'
import { LoadingSpinner } from './Shared'

interface Props { companyId: number; onBack: () => void }

export default function CompanyDetail({ companyId, onBack }: Props) {
  const { addToast } = useToast();
  const [company, setCompany] = useState<Company | null>(null);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Company>>({});
  const [showDelete, setShowDelete] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [newFollowup, setNewFollowup] = useState('');

  const isNew = companyId === 0;

  const load = useCallback(async () => {
    if (isNew) { setCompany(null); setLoading(false); return; }
    setLoading(true);
    try {
      const c = await api.getCompany(companyId);
      setCompany(c);
      const a = await api.getEntityActivity('company', companyId);
      setActivity(a);
    } catch { addToast('Failed to load company', 'error'); }
    setLoading(false);
  }, [companyId, isNew, addToast]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (isNew) { setForm({ name: '', website: '', industry: '', city: '', state: '', country: '', notes: '', status: 'active' }); setEditing(true); }
  }, [isNew]);

  const handleSave = async () => {
    try {
      if (isNew) {
        await api.createCompany(form);
        addToast('Company created');
        onBack();
      } else {
        await api.updateCompany(companyId, form);
        addToast('Company updated');
        setEditing(false);
        load();
      }
    } catch { addToast('Save failed', 'error'); }
  };

  const handleDelete = async () => {
    try { await api.deleteCompany(companyId); addToast('Company deleted'); onBack(); }
    catch { addToast('Delete failed', 'error'); }
  };

  const handleArchive = async () => {
    try { await api.archiveCompany(companyId, showArchive ? 'restore' : 'archive'); addToast(showArchive ? 'Company restored' : 'Company archived'); load(); }
    catch { addToast('Failed', 'error'); }
    setShowArchive(false);
  };

  const handleLogInteraction = async (type: string, notes: string) => {
    try {
      await fetch('/api/kpi/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, company_id: companyId }) });
      addToast(`${type} logged`);
      if (type === 'followup') setNewFollowup('');
      load();
    } catch { addToast('Failed to log', 'error'); }
  };

  if (loading) return <LoadingSpinner />;

  const fields = [
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'website', label: 'Website', type: 'text' },
    { key: 'industry', label: 'Industry', type: 'text' },
    { key: 'city', label: 'City', type: 'text' },
    { key: 'state', label: 'State', type: 'text' },
    { key: 'country', label: 'Country', type: 'text' },
    { key: 'status', label: 'Status', type: 'select', options: ['active', 'inactive', 'lead', 'partner', 'customer'] },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600">&larr; Back</button>
        <h1 className="text-xl font-bold text-gray-900">{isNew ? 'New Company' : company?.name}</h1>
        {company?.lead_score != null && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            company.lead_score >= 70 ? 'text-green-600 bg-green-50' :
            company.lead_score >= 40 ? 'text-yellow-600 bg-yellow-50' :
            'text-gray-500 bg-gray-100'
          }`}>{company.lead_score}</span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">{isNew ? 'New Company' : 'Company Details'}</h2>
              {!isNew && <button onClick={() => setEditing(!editing)} className="text-xs text-blue-600 hover:text-blue-800">{editing ? 'Cancel' : 'Edit'}</button>}
            </div>
            <div className="space-y-4">
              {fields.map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{f.label}</label>
                  {editing ? (
                    f.type === 'textarea' ? (
                      <textarea value={(form as any)[f.key] ?? (company as any)?.[f.key] ?? ''} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm h-20" />
                    ) : f.type === 'select' ? (
                      <select value={(form as any)[f.key] ?? (company as any)?.[f.key] ?? ''} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm">
                        {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input type={f.type} value={(form as any)[f.key] ?? (company as any)?.[f.key] ?? ''} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
                    )
                  ) : (
                    <p className="text-sm text-gray-800">{(company as any)?.[f.key] || '-'}</p>
                  )}
                </div>
              ))}
              {editing && <button onClick={handleSave} className="w-full py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Save</button>}
            </div>
          </div>

          {!isNew && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <textarea value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Add a note..." className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm h-16" />
                  <button onClick={() => { if (newNote.trim()) handleLogInteraction('note', newNote); }} disabled={!newNote.trim()} className="mt-1 px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50">Add Note</button>
                </div>
                <div>
                  <textarea value={newFollowup} onChange={e => setNewFollowup(e.target.value)} placeholder="Follow-up task..." className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm h-16" />
                  <button onClick={() => { if (newFollowup.trim()) handleLogInteraction('followup', newFollowup); }} disabled={!newFollowup.trim()} className="mt-1 px-3 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 disabled:opacity-50">Add Follow-Up</button>
                </div>
                <button onClick={() => handleLogInteraction('outreach', '')} className="px-3 py-2 bg-green-50 text-green-700 text-sm rounded-lg hover:bg-green-100">Log Call</button>
                <button onClick={() => handleLogInteraction('meeting', '')} className="px-3 py-2 bg-purple-50 text-purple-700 text-sm rounded-lg hover:bg-purple-100">Log Meeting</button>
              </div>
            </div>
          )}

          {!isNew && company?.contacts && company.contacts.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">Contacts ({company.contacts.length})</h2>
              <div className="space-y-2">
                {company.contacts.map(c => (
                  <div key={c.id} className="flex items-center justify-between py-1">
                    <div>
                      <span className="text-sm text-gray-800">{c.name}</span>
                      {c.email && <span className="text-xs text-gray-400 ml-2">{c.email}</span>}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      c.status === 'hot' ? 'text-red-600 bg-red-50' :
                      c.status === 'warm' ? 'text-yellow-600 bg-yellow-50' :
                      c.status === 'converted' ? 'text-green-600 bg-green-50' : 'text-blue-600 bg-blue-50'
                    }`}>{c.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isNew && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">Activity History</h2>
              {activity.length === 0 ? (
                <p className="text-sm text-gray-400">No activity recorded</p>
              ) : (
                <div className="space-y-2">
                  {activity.map(a => (
                    <div key={a.id} className="flex items-start gap-2 text-sm">
                      <span className="text-gray-400 w-24 shrink-0 text-xs">{a.created_at?.slice(0, 10)}</span>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        a.action === 'created' ? 'bg-green-100 text-green-700' :
                        a.action === 'deleted' ? 'bg-red-100 text-red-700' :
                        a.action === 'archived' ? 'bg-yellow-100 text-yellow-700' :
                        a.action === 'restored' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                      }`}>{a.action}</span>
                      <span className="text-gray-500">{a.details}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {!isNew && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">Insights</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center"><span className="text-sm text-gray-500">Lead Score</span><span className="text-sm font-semibold">{company?.lead_score ?? 'N/A'}</span></div>
                <div className="flex justify-between items-center"><span className="text-sm text-gray-500">Contacts</span><span className="text-sm font-semibold">{company?.contact_count || 0}</span></div>
                <div className="flex justify-between items-center"><span className="text-sm text-gray-500">Open Follow-Ups</span><span className="text-sm font-semibold">{company?.open_followups || 0}</span></div>
                <div className="flex justify-between items-center"><span className="text-sm text-gray-500">Last Activity</span><span className="text-sm font-semibold">{company?.last_activity ? company.last_activity.slice(0, 10) : '-'}</span></div>
                {company?.tags?.length ? (
                  <div><span className="text-sm text-gray-500 block mb-1">Tags</span>
                    <div className="flex flex-wrap gap-1">
                      {company.tags.map(t => <span key={t.id} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: t.color + '20', color: t.color }}>{t.name}</span>)}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">Actions</h2>
              <div className="space-y-2">
                <button onClick={() => setShowArchive(true)} className="w-full px-3 py-2 text-sm bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100">
                  {company?.archive_status === 'archived' ? 'Restore Company' : 'Archive Company'}
                </button>
                <button onClick={() => setShowDelete(true)} className="w-full px-3 py-2 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100">Delete Company</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal open={showDelete} title="Delete Company" message="Are you sure you want to delete this company?" onConfirm={handleDelete} onCancel={() => setShowDelete(false)} />
      <ConfirmModal open={showArchive} title={company?.archive_status === 'archived' ? 'Restore Company' : 'Archive Company'}
        message={company?.archive_status === 'archived' ? 'Are you sure you want to restore this company?' : 'Are you sure you want to archive this company?'}
        confirmLabel={company?.archive_status === 'archived' ? 'Restore' : 'Archive'} variant="default" onConfirm={handleArchive} onCancel={() => setShowArchive(false)} />
    </div>
  );
}
