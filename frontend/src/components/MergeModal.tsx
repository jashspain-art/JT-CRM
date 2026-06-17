import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import { useToast } from './Toast'
import type { Contact, Company } from '../types'

interface Props {
  open: boolean
  entity: 'contacts' | 'companies'
  primaryId?: number
  secondaryId?: number
  potentialDuplicates?: any[]
  onClose: () => void
  onMerged: () => void
}

export default function MergeModal({ open, entity, primaryId, secondaryId, potentialDuplicates, onClose, onMerged }: Props) {
  const { addToast } = useToast();
  const [primary, setPrimary] = useState<any>(null);
  const [secondary, setSecondary] = useState<any>(null);
  const [selectedPrimary, setSelectedPrimary] = useState<number | null>(primaryId || null);
  const [selectedSecondary, setSelectedSecondary] = useState<number | null>(secondaryId || null);
  const [mergeNotes, setMergeNotes] = useState(true);
  const [mergeActivities, setMergeActivities] = useState(true);
  const [mergeTags, setMergeTags] = useState(true);
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<any[]>([]);

  useEffect(() => {
    if (!open) return;
    if (potentialDuplicates?.length) {
      setList(potentialDuplicates);
    } else {
      loadList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function loadList() {
    const data = entity === 'contacts' ? await api.getContacts() : await api.getCompanies();
    setList(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    if (!selectedPrimary || !selectedSecondary) { setPrimary(null); setSecondary(null); return; }
    const p = list.find((i: any) => i.id === selectedPrimary);
    const s = list.find((i: any) => i.id === selectedSecondary);
    setPrimary(p);
    setSecondary(s);
  }, [selectedPrimary, selectedSecondary, list]);

  async function handleMerge() {
    if (!selectedPrimary || !selectedSecondary) return;
    setLoading(true);
    try {
      if (entity === 'contacts') {
        await api.mergeContacts(selectedPrimary, selectedSecondary, { merge_notes: mergeNotes, merge_activities: mergeActivities, merge_tags: mergeTags });
      } else {
        await api.mergeCompanies(selectedPrimary, selectedSecondary, { merge_notes: mergeNotes, merge_activities: mergeActivities, merge_tags: mergeTags });
      }
      addToast('Records merged successfully');
      onMerged();
      onClose();
    } catch { addToast('Merge failed', 'error'); }
    setLoading(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Merge {entity === 'contacts' ? 'Contacts' : 'Companies'}</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Primary Record (keeps this data)</label>
            <select value={selectedPrimary || ''} onChange={e => setSelectedPrimary(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="">Select...</option>
              {list.map((i: any) => <option key={i.id} value={i.id}>{i.name} {entity === 'contacts' ? `(${i.email})` : `- ${i.industry || ''}`}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Record (will be merged and removed)</label>
            <select value={selectedSecondary || ''} onChange={e => setSelectedSecondary(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="">Select...</option>
              {list.filter((i: any) => i.id !== selectedPrimary).map((i: any) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>

          {primary && secondary && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs font-medium text-gray-500 mb-2">Merge Preview</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.keys(primary).filter(k => typeof primary[k] === 'string' && k !== 'id' && k !== 'created_at' && k !== 'updated_at').slice(0, 6).map(k => (
                  <div key={k}>
                    <span className="text-gray-400">{k}: </span>
                    <span className={primary[k] ? 'text-gray-800' : 'text-gray-300'}>{primary[k] || '(empty)'}</span>
                    {!primary[k] && secondary[k] && <span className="text-green-600 ml-1">&larr; {secondary[k]}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={mergeNotes} onChange={e => setMergeNotes(e.target.checked)} className="rounded" /> Merge Notes</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={mergeActivities} onChange={e => setMergeActivities(e.target.checked)} className="rounded" /> Merge Activities</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={mergeTags} onChange={e => setMergeTags(e.target.checked)} className="rounded" /> Merge Tags</label>
          </div>
        </div>
        <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg">Cancel</button>
          <button onClick={handleMerge} disabled={!selectedPrimary || !selectedSecondary || loading} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Merging...' : 'Merge Records'}
          </button>
        </div>
      </div>
    </div>
  );
}
