import { useState, useEffect, useRef } from 'react'

interface Command {
  id: string
  label: string
  category: string
  action: () => void
}

interface Props {
  open: boolean
  onClose: () => void
  commands: Command[]
}

export default function CommandPalette({ open, onClose, commands }: Props) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query
    ? commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()) || c.category.toLowerCase().includes(query.toLowerCase()))
    : commands;

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && filtered[selectedIndex]) {
      filtered[selectedIndex].action();
      onClose();
    }
    if (e.key === 'Escape') onClose();
  };

  if (!open) return null;

  const categories = [...new Set(filtered.map(c => c.category))];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="fixed inset-0 bg-black/40" />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-3 border-b border-gray-200">
          <input ref={inputRef} type="text" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="Type a command or search..." className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-400" />
        </div>
        <div className="max-h-72 overflow-y-auto">
          {categories.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-400">No results</div>
          ) : (
            categories.map(cat => (
              <div key={cat}>
                <div className="px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide bg-gray-50">{cat}</div>
                {filtered.filter(c => c.category === cat).map((cmd, i) => {
                  const globalIndex = filtered.indexOf(cmd);
                  return (
                    <button key={cmd.id} onClick={() => { cmd.action(); onClose(); }}
                      className={`w-full px-4 py-2.5 text-sm text-left flex items-center justify-between hover:bg-blue-50 ${globalIndex === selectedIndex ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}>
                      <span>{cmd.label}</span>
                      <span className="text-xs text-gray-400">{cmd.category}</span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
        <div className="p-3 border-t border-gray-200 text-xs text-gray-400 flex gap-4">
          <span><kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">&uarr;</kbd><kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs ml-0.5">&darr;</kbd> Navigate</span>
          <span><kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Enter</kbd> Select</span>
          <span><kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Esc</kbd> Close</span>
        </div>
      </div>
    </div>
  );
}
