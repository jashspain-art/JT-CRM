import { useState } from 'react'
import { api } from '../api'
import { useToast } from './Toast'

interface Props {
  open: boolean
  entity: 'contacts' | 'companies'
  selectedIds?: number[]
  availableCount: number
  onClose: () => void
}

export default function ExportModal({ open, entity, selectedIds, availableCount, onClose }: Props) {
  const { addToast } = useToast();
  const [scope, setScope] = useState<'selected' | 'all'>(selectedIds?.length ? 'selected' : 'all');
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleExport = async () => {
    setLoading(true);
    try {
      const ids = scope === 'selected' ? selectedIds : undefined;
      const result = await api.exportData(entity, ids, format);
      if (format === 'csv') {
        const blob = new Blob([result], { type: 'text/csv' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${entity}_export.csv`; a.click();
      } else {
        const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${entity}_export.json`; a.click();
      }
      addToast('Export complete');
      onClose();
    } catch { addToast('Export failed', 'error'); }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Export {entity === 'contacts' ? 'Contacts' : 'Companies'}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Scope</label>
            <div className="space-y-2">
              {selectedIds?.length ? (
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" name="scope" checked={scope === 'selected'} onChange={() => setScope('selected')} className="accent-blue-600" />
                  Selected ({selectedIds.length} records)
                </label>
              ) : null}
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="scope" checked={scope === 'all'} onChange={() => setScope('all')} className="accent-blue-600" />
                All ({availableCount} records)
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="format" checked={format === 'csv'} onChange={() => setFormat('csv')} className="accent-blue-600" />
                CSV
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="format" checked={format === 'json'} onChange={() => setFormat('json')} className="accent-blue-600" />
                JSON
              </label>
            </div>
          </div>
        </div>
        <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg">Cancel</button>
          <button onClick={handleExport} disabled={loading} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Exporting...' : `Export ${scope === 'selected' ? `(${selectedIds?.length})` : 'All'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
