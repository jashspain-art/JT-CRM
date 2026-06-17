import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import type { Company } from '../types'
import { useToast } from './Toast'
import ConfirmModal from './ConfirmModal'
import ImportModal from './ImportModal'
import MergeModal from './MergeModal'
import ExportModal from './ExportModal'
import { LoadingSpinner, EmptyState } from './Shared'

interface Props { onSelect: (id: number) => void }

export default function CompanyList({ onSelect }: Props) {
  const { addToast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
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
    const data = await api.getCompanies(params.toString() ? `?${params.toString()}` : '');
    setCompanies(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [showArchived, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setSelectAll(false); setSelected(new Set()); }, [companies]);

  const toggleSelect = (id: number) => { const n = new Set(selected); n.has(id) ? n.delete(id) : n.add(id); setSelected(n); };
  const toggleSelectAll = () => { if (selectAll) { setSelected(new Set()); setSelectAll(false); } else { setSelected(new Set(companies.map(c => c.id))); setSelectAll(true); } };

  const handleDelete = async (id: number) => { try { await api.deleteCompany(id); addToast('Company deleted'); load(); } catch { addToast('Delete failed', 'error'); } setDeleteTarget(null); };
  const handleBulkDelete = async () => { try { await api.bulkDeleteCompanies([...selected]); addToast(`${selected.size} companies deleted`); setSelected(new Set()); load(); } catch { addToast('Bulk delete failed', 'error'); } setDeleteBulk(false); };
  const handleBulkArchive = async () => { try { await api.bulkArchiveCompanies([...selected]); addToast(`${selected.size} companies archived`); setSelected(new Set()); load(); } catch { addToast('Archive failed', 'error'); } };
  const handleBulkRestore = async () => { try { await api.bulkRestoreCompanies([...selected]); addToast(`${selected.size} companies restored`); setSelected(new Set()); load(); } catch { addToast('Restore failed', 'error'); } };

  const handleFindDuplicates = async () => {
    try {
      const first = companies[0];
      if (!first || !first.name) { addToast('Select companies with name to check duplicates', 'error'); return; }
      const result = await api.checkCompanyDuplicates(first.name, undefined);
      if (result.duplicates?.length) {
        setMergeDups(result.duplicates);
        setShowMerge(true);
      } else {
        addToast('No duplicates found');
      }
    } catch { addToast('Duplicate check failed', 'error'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900">Companies</h1>
          <span className="text-sm text-gray-400">{companies.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <input type="text" placeholder="Search companies..." value={search} onChange={e => setSearch(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm w-48" />
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
          <span className="text-sm font-medium text-blue-800">{selected.size} Compan{selected.size > 1 ? 'ies' : 'y'} Selected</span>
          <div className="flex gap-2">
            <button onClick={handleBulkArchive} className="px-3 py-1 text-xs bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200">Archive</button>
            <button onClick={handleBulkRestore} className="px-3 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200">Restore</button>
            <button onClick={() => setShowExport(true)} className="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200">Export</button>
            <button onClick={() => setDeleteBulk(true)} className="px-3 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200">Delete</button>
          </div>
        </div>
      )}

      {loading ? <LoadingSpinner /> : companies.length === 0 ? (
        <EmptyState message={showArchived ? 'No archived companies' : 'No companies yet'} actionLabel="Add Company" action={() => onSelect(0)} />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left"><input type="checkbox" checked={selectAll} onChange={toggleSelectAll} className="rounded" /></th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Industry</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Location</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Contacts</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Score</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {companies.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => onSelect(c.id)}>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}><input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} className="rounded" /></td>
                  <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="px-4 py-3 text-gray-500">{c.industry || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{[c.city, c.state].filter(Boolean).join(', ') || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{c.contact_count || 0}</td>
                  <td className="px-4 py-3"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${(c.lead_score || 0) >= 70 ? 'text-green-600 bg-green-50' : (c.lead_score || 0) >= 40 ? 'text-yellow-600 bg-yellow-50' : 'text-gray-500 bg-gray-100'}`}>{c.lead_score || 0}</span></td>
                  <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setDeleteTarget(c.id)} className="text-xs text-red-600 hover:text-red-800">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal open={!!deleteTarget} title="Delete Company" message="Are you sure you want to delete this company?" onConfirm={() => handleDelete(deleteTarget!)} onCancel={() => setDeleteTarget(null)} />
      <ConfirmModal open={deleteBulk} title="Delete Companies" message={`Are you sure you want to delete ${selected.size} companies?`} onConfirm={handleBulkDelete} onCancel={() => setDeleteBulk(false)} />
      <ImportModal open={showImport} entity="companies" onClose={() => setShowImport(false)} onImported={load} />
      <ExportModal open={showExport} entity="companies" selectedIds={selected.size ? [...selected] : undefined} availableCount={companies.length} onClose={() => setShowExport(false)} />
      <MergeModal open={showMerge} entity="companies" potentialDuplicates={mergeDups} onClose={() => setShowMerge(false)} onMerged={load} />
    </div>
  );
}
