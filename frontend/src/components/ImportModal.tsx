import { useState, useEffect } from 'react'
import { api } from '../api'
import type { Contact, ValidationResult, ImportResult } from '../types'
import { useToast } from './Toast'

interface Props {
  open: boolean
  entity: 'contacts' | 'companies'
  onClose: () => void
  onImported: () => void
}

const CONTACT_FIELDS = ['name', 'email', 'phone', 'job_title', 'company', 'contact_type', 'notes'];
const COMPANY_FIELDS = ['name', 'website', 'industry', 'city', 'state', 'country', 'notes'];

export default function ImportModal({ open, entity, onClose, onImported }: Props) {
  const { addToast } = useToast();
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'result'>('upload');
  const [records, setRecords] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => { if (open) { setStep('upload'); setRecords([]); setValidation(null); setResult(null); } }, [open]);

  function handleFile(file: File) {
    if (!file.name.endsWith('.csv')) { addToast('Please upload a CSV file', 'error'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.trim().split('\n');
      if (lines.length < 2) { addToast('CSV must have a header row and at least one data row', 'error'); return; }
      const h = lines[0].split(',').map(s => s.trim().replace(/^"(.*)"$/, '$1'));
      setHeaders(h);
      const data = lines.slice(1).map(line => {
        const vals = line.split(',').map(s => s.trim().replace(/^"(.*)"$/, '$1'));
        const obj: any = {};
        h.forEach((field, i) => { obj[field] = vals[i] || ''; });
        return obj;
      });
      setRecords(data);
      const suggested: Record<string, string> = {};
      const fields = entity === 'contacts' ? CONTACT_FIELDS : COMPANY_FIELDS;
      fields.forEach(f => { const match = h.find(hh => hh.toLowerCase().includes(f.toLowerCase())); if (match) suggested[match] = f; });
      setMapping(suggested);
      setStep('mapping');
    };
    reader.readAsText(file);
  }

  async function handleValidate() {
    setLoading(true);
    const mappedRecords = records.map(r => {
      const obj: any = {};
      Object.entries(mapping).forEach(([csvField, dbField]) => { if (dbField) obj[dbField] = r[csvField]; });
      return obj;
    });
    try {
      const v = await api.validateImport(mappedRecords, entity);
      setValidation(v);
      setStep('preview');
    } catch { addToast('Validation failed', 'error'); }
    setLoading(false);
  }

  async function handleImport() {
    setLoading(true);
    const mappedRecords = records.map(r => {
      const obj: any = {};
      Object.entries(mapping).forEach(([csvField, dbField]) => { if (dbField) obj[dbField] = r[csvField]; });
      return obj;
    });
    try {
      const res = entity === 'contacts' ? await api.importContacts(mappedRecords) : await api.importCompanies(mappedRecords);
      setResult(res);
      setStep('result');
      addToast(`Import complete: ${res.imported} imported, ${res.skipped} skipped, ${res.failed} failed`);
      onImported();
    } catch { addToast('Import failed', 'error'); }
    setLoading(false);
  }

  if (!open) return null;

  const fields = entity === 'contacts' ? CONTACT_FIELDS : COMPANY_FIELDS;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Import {entity === 'contacts' ? 'Contacts' : 'Companies'}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
          </div>
          <div className="flex gap-2 mt-3">
            {['upload', 'mapping', 'preview', 'result'].map((s, i) => (
              <div key={s} className={`flex items-center gap-1 text-xs ${step === s ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${step === s ? 'bg-blue-100 text-blue-600' : 'bg-gray-100'}`}>{i + 1}</span>
                <span>{s.charAt(0).toUpperCase() + s.slice(1)}</span>
                {i < 3 && <span className="mx-1">-</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="p-6">
          {step === 'upload' && (
            <div className={`border-2 border-dashed rounded-xl p-12 text-center ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300'}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}>
              <p className="text-gray-500 mb-2">Drag & drop a CSV file here, or</p>
              <label className="inline-block px-4 py-2 bg-blue-600 text-white text-sm rounded-lg cursor-pointer hover:bg-blue-700">
                Browse Files
                <input type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              </label>
              <p className="text-xs text-gray-400 mt-2">Supported fields: {fields.join(', ')}</p>
            </div>
          )}

          {step === 'mapping' && (
            <div>
              <p className="text-sm text-gray-600 mb-4">Map CSV columns to database fields:</p>
              <div className="space-y-3">
                {headers.map(h => (
                  <div key={h} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700 w-40">{h}</span>
                    <span className="text-gray-400">&rarr;</span>
                    <select value={mapping[h] || ''} onChange={e => setMapping({ ...mapping, [h]: e.target.value })}
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm">
                      <option value="">-- Skip --</option>
                      {fields.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">{records.length} records found</p>
              <div className="flex gap-3 justify-end mt-6">
                <button onClick={() => setStep('upload')} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg">Back</button>
                <button onClick={handleValidate} disabled={loading} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {loading ? 'Validating...' : 'Continue'}
                </button>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div>
              <p className="text-sm text-gray-600 mb-3">
                {validation?.validCount || 0} valid records
                {validation?.duplicates?.length ? `, ${validation.duplicates.length} duplicates found` : ''}
                {validation?.errors?.length ? `, ${validation.errors.length} with errors` : ''}
              </p>
              {validation?.duplicates?.length ? (
                <div className="mb-4 p-3 bg-yellow-50 rounded-lg">
                  <p className="text-sm font-medium text-yellow-800 mb-2">Potential Duplicates:</p>
                  {validation.duplicates.map((d, i) => (
                    <p key={i} className="text-xs text-yellow-700">Row {d.row}: {d.field} "{d.value}" matches existing record #{d.existingId} ({d.existingName})</p>
                  ))}
                </div>
              ) : null}
              {validation?.errors?.length ? (
                <div className="mb-4 p-3 bg-red-50 rounded-lg">
                  {validation.errors.map((e, i) => (
                    <p key={i} className="text-xs text-red-700">Row {e.row}: {e.errors.join(', ')}</p>
                  ))}
                </div>
              ) : null}
              <div className="flex gap-3 justify-end mt-4">
                <button onClick={() => setStep('mapping')} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg">Back</button>
                <button onClick={handleImport} disabled={loading} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {loading ? 'Importing...' : `Import ${validation?.validCount || 0} Records`}
                </button>
              </div>
            </div>
          )}

          {step === 'result' && result && (
            <div className="text-center py-6">
              <div className="text-4xl mb-3">{result.failed > 0 ? '⚠️' : '✅'}</div>
              <p className="text-lg font-semibold text-gray-800">Import Complete</p>
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="bg-green-50 p-4 rounded-lg"><div className="text-2xl font-bold text-green-700">{result.imported}</div><div className="text-xs text-green-600">Imported</div></div>
                <div className="bg-yellow-50 p-4 rounded-lg"><div className="text-2xl font-bold text-yellow-700">{result.skipped}</div><div className="text-xs text-yellow-600">Skipped</div></div>
                <div className="bg-red-50 p-4 rounded-lg"><div className="text-2xl font-bold text-red-700">{result.failed}</div><div className="text-xs text-red-600">Failed</div></div>
              </div>
              <button onClick={onClose} className="mt-6 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
