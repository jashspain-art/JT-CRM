import { useState } from 'react'
import { api } from '../api'
import { useToast } from './Toast'
import { LoadingSpinner } from './Shared'

export default function LeadResearch() {
  const { addToast } = useToast();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[] | null>(null);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const data = await api.searchLeads(query);
      setResults(data.results || []);
      setAnswer(data.answer || '');
    } catch { addToast('Search failed', 'error'); }
    setLoading(false);
  };

  const extractCompanyInfo = (r: any) => {
    const snippet = (r.content || '').toLowerCase();
    const words = (r.title || '').split(/[\s-]+/);
    return {
      name: words.slice(0, 2).join(' '),
      industry: snippet.includes('software') ? 'Technology' :
                snippet.includes('health') ? 'Healthcare' :
                snippet.includes('finance') || snippet.includes('bank') ? 'Finance' :
                snippet.includes('consult') ? 'Consulting' : '',
      website: r.url || '',
    };
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Lead Research</h1>
        <p className="text-sm text-gray-500 mt-1">Search for potential leads using AI-powered web research</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
        <div className="flex gap-3">
          <input type="text" value={query} onChange={e => setQuery(e.target.value)}
            placeholder='e.g. "SaaS companies in Austin hiring sales managers"'
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-400"
            onKeyDown={e => e.key === 'Enter' && handleSearch()} />
          <button onClick={handleSearch} disabled={loading || !query.trim()}
            className="px-5 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {loading && <LoadingSpinner />}

      {searched && !loading && results?.length === 0 && (
        <div className="text-center py-12 text-gray-400">No results found</div>
      )}

      {answer && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-5 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🤖</span>
            <h3 className="text-sm font-semibold text-blue-800">AI Summary</h3>
          </div>
          <p className="text-sm text-blue-900">{answer}</p>
        </div>
      )}

      {results && results.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">{results.length} results found</p>
          {results.map((r, i) => {
            const info = extractCompanyInfo(r);
            return (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-700 hover:underline truncate block">{r.title}</a>
                    {r.url && <p className="text-xs text-gray-400 truncate mt-0.5">{r.url}</p>}
                    <p className="text-sm text-gray-600 mt-2 line-clamp-3">{r.content}</p>
                    <div className="flex gap-2 mt-2">
                      {info.industry && <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{info.industry}</span>}
                      <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">{r.score ? `${Math.round(r.score * 100)}% relevance` : ''}</span>
                    </div>
                  </div>
                  <div className="ml-3 flex flex-col gap-1 shrink-0">
                    <button onClick={async () => {
                      try {
                        await api.createCompany(info);
                        addToast(`Company "${info.name}" added`);
                      } catch { addToast('Failed to add company', 'error'); }
                    }} className="px-2.5 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100">+ Company</button>
                    <button onClick={() => {
                      navigator.clipboard.writeText(r.content || '');
                      addToast('Copied to clipboard');
                    }} className="px-2.5 py-1 text-xs bg-gray-50 text-gray-600 rounded hover:bg-gray-100">Copy</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
