/**
 * ControlsBar — neutral slate-800 sticky header shared by concepts 2-7.
 * Same popovers/logic as TerminalHeader, different colour palette.
 */
import { useState, useRef, useEffect } from 'react';
import { useFundSearch } from '../hooks/useFundSearch';
import { useIndexFunds } from '../hooks/useIndexFunds';
import { WINDOWS, DATE_PRESETS, FUND_COLORS } from '../utils/chartUtils';

// ── Icons ──────────────────────────────────────────────────────────────────────
const Icon = ({ d, className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
  </svg>
);
const CLOSE   = 'M6 18L18 6M6 6l12 12';
const CHEVRON = 'M19 9l-7 7-7-7';
const SEARCH  = 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0';
const SPIN    = 'M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z';

// ── Popover ────────────────────────────────────────────────────────────────────
const Popover = ({ trigger, children, align = 'left' }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen((v) => !v)}>{trigger}</div>
      {open && (
        <div
          className={`absolute top-full mt-1 z-50 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl ${align === 'right' ? 'right-0' : 'left-0'}`}
          style={{ minWidth: 260 }}
        >
          <div onClick={(e) => { if (e.target.closest('[data-close]')) setOpen(false); }}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Fund popover ───────────────────────────────────────────────────────────────
const FundPopover = ({ selectedFunds, onAdd, onRemove, accentColor }) => {
  const { query, results, loading, search, clear } = useFundSearch();
  const accent = accentColor ?? '#6366f1';
  return (
    <Popover
      trigger={
        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-md text-xs text-slate-200 hover:border-slate-400 transition-colors">
          <span className="text-slate-400">FUNDS</span>
          <span className="font-semibold" style={{ color: accent }}>[{selectedFunds.length}]</span>
          <Icon d={CHEVRON} className="w-3 h-3 text-slate-500" />
        </button>
      }
    >
      <div className="p-3 w-80">
        <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-2">Selected Funds</p>
        {selectedFunds.length === 0 && <p className="text-xs text-slate-500 italic mb-2">None selected</p>}
        {selectedFunds.map((f, i) => (
          <div key={f.scheme_code} className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: FUND_COLORS[i % FUND_COLORS.length] }} />
            <span className="flex-1 text-xs text-slate-200 truncate">{f.scheme_name}</span>
            <button onClick={() => onRemove(f.scheme_code)} data-close className="text-slate-500 hover:text-red-400 transition-colors">
              <Icon d={CLOSE} className="w-3 h-3" />
            </button>
          </div>
        ))}
        {selectedFunds.length < 5 && (
          <div className="mt-2 relative">
            <Icon d={SEARCH} className="absolute left-2 top-2 w-3 h-3 text-slate-500 pointer-events-none" />
            <input
              type="text" value={query} onChange={(e) => search(e.target.value)} placeholder="Search fund…"
              className="w-full pl-6 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-600 rounded text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500"
            />
            {results.length > 0 && (
              <ul className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-md max-h-48 overflow-y-auto z-50">
                {results.map((r) => {
                  const already = selectedFunds.some((s) => s.scheme_code === r.scheme_code);
                  return (
                    <li key={r.scheme_code} onClick={() => { if (!already) { onAdd(r); clear(); } }}
                      className={`px-3 py-2 text-xs cursor-pointer ${already ? 'text-slate-600 cursor-default' : 'text-slate-200 hover:bg-slate-700 hover:text-indigo-300'}`}>
                      {r.scheme_name}
                    </li>
                  );
                })}
              </ul>
            )}
            {loading && <p className="text-[10px] text-slate-500 mt-1">Searching…</p>}
          </div>
        )}
      </div>
    </Popover>
  );
};

// ── Benchmark popover ──────────────────────────────────────────────────────────
const BenchmarkPopover = ({ selectedBenchmark, onSelect }) => {
  const { funds, loading } = useIndexFunds();
  const [filter, setFilter] = useState('');
  const filtered = funds.filter((f) => !filter || f.scheme_name.toLowerCase().includes(filter.toLowerCase()));
  return (
    <Popover
      trigger={
        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-md text-xs hover:border-slate-400 transition-colors">
          <span className="text-slate-400">BM</span>
          <span className="text-emerald-400 font-semibold truncate max-w-[120px]">
            {selectedBenchmark ? selectedBenchmark.scheme_name.split(' ').slice(0, 3).join(' ') : 'SELECT'}
          </span>
          <Icon d={CHEVRON} className="w-3 h-3 text-slate-500" />
        </button>
      }
    >
      <div className="p-3 w-72">
        <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-2">Benchmark Index</p>
        <input autoFocus type="text" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter…"
          className="w-full px-2 py-1.5 text-xs bg-slate-900 border border-slate-600 rounded text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500 mb-2" />
        <ul className="max-h-48 overflow-y-auto">
          {loading && <li className="text-xs text-slate-500 p-2">Loading…</li>}
          {filtered.map((f) => (
            <li key={f.scheme_code} data-close onClick={() => { onSelect(f); setFilter(''); }}
              className="px-2 py-2 text-xs text-slate-200 hover:bg-slate-700 hover:text-emerald-300 cursor-pointer rounded">
              {f.scheme_name}
            </li>
          ))}
        </ul>
      </div>
    </Popover>
  );
};

// ── Windows toggle ─────────────────────────────────────────────────────────────
const WindowsToggle = ({ windows, onChange, accentColor }) => {
  const accent = accentColor ?? '#6366f1';
  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] text-slate-400 uppercase tracking-widest mr-1">WIN</span>
      {WINDOWS.map((w) => (
        <button key={w.id}
          onClick={() => onChange(windows.includes(w.id) ? windows.filter((x) => x !== w.id) : [...windows, w.id])}
          style={windows.includes(w.id) ? { backgroundColor: accent, color: '#0f172a' } : {}}
          className={`px-2 py-1 text-xs rounded transition-colors ${windows.includes(w.id) ? 'font-bold' : 'text-slate-400 border border-slate-600 hover:text-slate-200'}`}
        >
          {w.label}
        </button>
      ))}
    </div>
  );
};

// ── Date popover ───────────────────────────────────────────────────────────────
const DatePopover = ({ datePreset, startDate, endDate, onPreset, onStart, onEnd }) => (
  <Popover
    trigger={
      <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-md text-xs hover:border-slate-400 transition-colors">
        <span className="text-slate-400">DATE</span>
        <span className="text-blue-400 font-semibold">{datePreset.toUpperCase()}</span>
        <Icon d={CHEVRON} className="w-3 h-3 text-slate-500" />
      </button>
    }
  >
    <div className="p-3 w-56">
      <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-2">Date Range</p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {DATE_PRESETS.map((p) => (
          <button key={p.id}
            data-close={p.id !== 'custom' ? true : undefined}
            onClick={() => onPreset(p.id)}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${datePreset === p.id ? 'bg-blue-600 text-white' : 'text-slate-400 border border-slate-600 hover:border-blue-500 hover:text-blue-300'}`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {datePreset === 'custom' && (
        <div className="space-y-2">
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">FROM</label>
            <input type="date" value={startDate ?? ''} onChange={(e) => onStart(e.target.value || null)}
              className="w-full px-2 py-1.5 text-xs bg-slate-900 border border-slate-600 rounded text-slate-200 outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">TO</label>
            <input type="date" value={endDate ?? ''} onChange={(e) => onEnd(e.target.value || null)}
              className="w-full px-2 py-1.5 text-xs bg-slate-900 border border-slate-600 rounded text-slate-200 outline-none focus:border-blue-500" />
          </div>
        </div>
      )}
    </div>
  </Popover>
);

// ── Main ControlsBar ────────────────────────────────────────────────────────────
const ControlsBar = ({
  brand, accentColor,
  selectedFunds, selectedBenchmark, windows, datePreset, startDate, endDate,
  canAnalyze, loading,
  onFundAdd, onFundRemove, onBenchmarkSelect, onWindowsChange,
  onDatePresetChange, onStartDateChange, onEndDateChange, onAnalyze,
}) => (
  <header className="sticky top-0 z-40 bg-slate-800 border-b border-slate-700 flex items-center gap-3 px-4 py-2 flex-wrap">
    <span className="font-bold text-sm tracking-tight mr-2" style={{ color: accentColor ?? '#818cf8' }}>
      ▸ {brand ?? 'MF'}
    </span>
    <FundPopover selectedFunds={selectedFunds} onAdd={onFundAdd} onRemove={onFundRemove} accentColor={accentColor} />
    <BenchmarkPopover selectedBenchmark={selectedBenchmark} onSelect={onBenchmarkSelect} />
    <WindowsToggle windows={windows} onChange={onWindowsChange} accentColor={accentColor} />
    <DatePopover datePreset={datePreset} startDate={startDate} endDate={endDate}
      onPreset={onDatePresetChange} onStart={onStartDateChange} onEnd={onEndDateChange} />
    <button onClick={onAnalyze} disabled={!canAnalyze}
      className="ml-auto flex items-center gap-2 px-4 py-1.5 rounded text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      style={canAnalyze ? { backgroundColor: accentColor ?? '#6366f1', color: '#fff' } : { backgroundColor: '#334155', color: '#64748b' }}
    >
      {loading
        ? <><svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d={SPIN} /></svg> LOADING…</>
        : <><span>▶</span> RUN</>
      }
    </button>
  </header>
);

export default ControlsBar;
