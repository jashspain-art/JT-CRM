import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import type { Contact } from '../types'
import { useToast } from './Toast'
import ConfirmModal from './ConfirmModal'
import ImportModal from './ImportModal'
import MergeModal from './MergeModal'
import ExportModal from './ExportModal'
import { LoadingSpinner, EmptyState } from './Shared'

interface Props { onSelect: (id: number) => void }

export default function ContactList({ onSelect }: Props) {
  const { addToast } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [deleteBulk, setDeleteBulk] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showMerge, setShowMerge] = useState(false);
  const [mergeDups, setMergeDups] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (showArchived) params.set('archive', 'archived');
    if (search) params.set('search', search);
    const data = await api.getContacts(params.toString() ? `?${params.toString()}` : '');
    setContacts(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [showArchived, search]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => { setSelectAll(false); setSelected(new Set()); }, [contacts]);

  const toggleSelect = (id: number) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const toggleSelectAll = () => {
    if (selectAll) { setSelected(new Set()); setSelectAll(false); }
    else { setSelected(new Set(contacts.map(c => c.id))); setSelectAll(true); }
  };

  const handleDelete = async (id: number) => {
    try { await api.deleteContact(id); addToast('Contact deleted'); load(); }
    catch { addToast('Delete failed', 'error'); }
    setDeleteTarget(null);
  };

  const handleBulkDelete = async () => {
    try { await api.bulkDeleteContacts([...selected]); addToast(`${selected.size} contacts deleted`); setSelected(new Set()); load(); }
    catch { addToast('Bulk delete failed', 'error'); }
    setDeleteBulk(false);
  };

  const handleBulkArchive = async () => {
    try { await api.bulkArchiveContacts([...selected]); addToast(`${selected.size} contacts archived`); setSelected(new Set()); load(); }
    catch { addToast('Archive failed', 'error'); }
  };

  const handleBulkRestore = async () => {
    try { await api.bulkRestoreContacts([...selected]); addToast(`${selected.size} contacts restored`); setSelected(new Set()); load(); }
    catch { addToast('Restore failed', 'error'); }
  };

  const handleFindDuplicates = async () => {
    try {
      const first = contacts[0];
      if (!first || !first.email) { addToast('Select contacts with email to check duplicates', 'error'); return; }
      const result = await api.checkContactDuplicates(first.email, undefined, undefined);
      if (result.duplicates?.length) {
        setMergeDups(result.duplicates);
        setShowMerge(true);
      } else {
        addToast('No duplicates found');
      }
    } catch { addToast('Duplicate check failed', 'error'); }
  };

  const statusColor = (s: string) =>
    s === 'hot' ? 'text-red-600 bg-red-50' : s === 'warm' ? 'text-yellow-600 bg-yellow-50' :
    s === 'converted' ? 'text-green-600 bg-green-50' : s === 'cold' ? 'text-gray-500 bg-gray-100' : 'text-blue-600 bg-blue-50';

  const healthIcon = (h?: string) =>
    h === 'healthy' ? '🟢' : h === 'needs_attention' ? '🟡' : h === 'stale' ? '🔴' : '⚪';

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900">Contacts</h1>
          <span className="text-sm text-gray-400">{contacts.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <input type="text" placeholder="Search contacts..." value={search} onChange={e => setSearch(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm w-48" />
          <button onClick={() => { setShowArchived(!showArchived); setSelected(new Set()); }}
            className={`px-3 py-1.5 text-sm rounded-lg border ${showArchived ? 'bg-purple-50 border-purple-300 text-purple-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
            {showArchived ? 'Showing Archived' : 'Show Archived'}
          </button>
          <button onClick={handleFindDuplicates} className="px-3 py-1.5 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50">Find Duplicates</button>
          <button onClick={() => setShowExport(true)} className="px-3 py-1.5 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50">Export</button>
          <button onClick={() => onSelect(0)} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">+ Add</button>
          <button onClick={() => setShowImport(true)} className="px-3 py-1.5 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50">Import</button>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
          <span className="text-sm font-medium text-blue-800">{selected.size} Contact{selected.size > 1 ? 's' : ''} Selected</span>
          <div className="flex gap-2">
            <button onClick={handleBulkArchive} className="px-3 py-1 text-xs bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200">Archive</button>
            <button onClick={handleBulkRestore} className="px-3 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200">Restore</button>
            <button onClick={() => setShowExport(true)} className="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200">Export</button>
            <button onClick={() => setDeleteBulk(true)} className="px-3 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200">Delete</button>
          </div>
        </div>
      )}

      {loading ? <LoadingSpinner /> : contacts.length === 0 ? (
        <EmptyState message={showArchived ? 'No archived contacts' : 'No contacts yet'} actionLabel="Add Contact" action={() => onSelect(0)} />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left"><input type="checkbox" checked={selectAll} onChange={toggleSelectAll} className="rounded" /></th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Company</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Health</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contacts.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => onSelect(c.id)}>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}><input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} className="rounded" /></td>
                  <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="px-4 py-3 text-gray-500">{c.email || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{c.company_name || '-'}</td>
                  <td className="px-4 py-3"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(c.status)}`}>{c.status}</span></td>
                  <td className="px-4 py-3">{healthIcon(c.relationship_health)}</td>
                  <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setDeleteTarget(c.id)} className="text-xs text-red-600 hover:text-red-800">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal open={!!deleteTarget} title="Delete Contact" message="Are you sure you want to delete this contact?" onConfirm={() => handleDelete(deleteTarget!)} onCancel={() => setDeleteTarget(null)} />
      <ConfirmModal open={deleteBulk} title="Delete Contacts" message={`Are you sure you want to delete ${selected.size} contacts?`} onConfirm={handleBulkDelete} onCancel={() => setDeleteBulk(false)} />
      <ImportModal open={showImport} entity="contacts" onClose={() => setShowImport(false)} onImported={load} />
      <ExportModal open={showExport} entity="contacts" selectedIds={selected.size ? [...selected] : undefined} availableCount={contacts.length} onClose={() => setShowExport(false)} />
      <MergeModal open={showMerge} entity="contacts" potentialDuplicates={mergeDups} onClose={() => setShowMerge(false)} onMerged={load} />
    </div>
  );
}
