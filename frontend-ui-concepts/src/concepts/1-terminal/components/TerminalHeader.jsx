import { useState, useRef, useEffect } from 'react';
import { useFundSearch } from '../../../shared/hooks/useFundSearch';
import { useIndexFunds } from '../../../shared/hooks/useIndexFunds';
import { WINDOWS, DATE_PRESETS, FUND_COLORS } from '../../../shared/utils/chartUtils';

// ── Mini icon ──────────────────────────────────────────────────────────────────
const Icon = ({ d, className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
  </svg>
);

const CLOSE = 'M6 18L18 6M6 6l12 12';
const CHEVRON = 'M19 9l-7 7-7-7';
const SEARCH = 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0';

// ── Popover wrapper ────────────────────────────────────────────────────────────
const Popover = ({ trigger, children, align = 'left' }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen((v) => !v)}>{trigger}</div>
      {open && (
        <div className={`absolute top-full mt-1 z-50 bg-terminal-surface border border-terminal-border rounded shadow-xl ${align === 'right' ? 'right-0' : 'left-0'}`} style={{ minWidth: 260 }}>
          <div onClick={(e) => { if (e.target.closest('[data-close]')) setOpen(false); }}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Fund search popover ────────────────────────────────────────────────────────
const FundPopover = ({ selectedFunds, onAdd, onRemove }) => {
  const { query, results, loading, search, clear } = useFundSearch();

  return (
    <Popover
      trigger={
        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-terminal-surface border border-terminal-border rounded text-xs text-terminal-amber hover:border-terminal-amber transition-colors">
          <span className="text-terminal-muted">FUNDS</span>
          <span className="text-terminal-amber font-semibold">[{selectedFunds.length}]</span>
          <Icon d={CHEVRON} className="w-3 h-3 text-terminal-muted" />
        </button>
      }
    >
      <div className="p-3 w-80">
        <p className="text-[10px] text-terminal-muted uppercase tracking-widest mb-2">Selected Funds</p>
        {selectedFunds.length === 0 && <p className="text-xs text-terminal-muted italic mb-2">None selected</p>}
        {selectedFunds.map((f, i) => (
          <div key={f.scheme_code} className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: FUND_COLORS[i % FUND_COLORS.length] }} />
            <span className="flex-1 text-xs text-terminal-text truncate">{f.scheme_name}</span>
            <button onClick={() => onRemove(f.scheme_code)} data-close className="text-terminal-muted hover:text-terminal-red transition-colors">
              <Icon d={CLOSE} className="w-3 h-3" />
            </button>
          </div>
        ))}
        {selectedFunds.length < 5 && (
          <div className="mt-2 relative">
            <Icon d={SEARCH} className="absolute left-2 top-2 w-3 h-3 text-terminal-muted pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => search(e.target.value)}
              placeholder="Search fund…"
              className="w-full pl-6 pr-3 py-1.5 text-xs bg-terminal-bg border border-terminal-border rounded text-terminal-text placeholder-terminal-muted outline-none focus:border-terminal-amber"
            />
            {results.length > 0 && (
              <ul className="absolute top-full left-0 right-0 mt-1 bg-terminal-surface border border-terminal-border rounded max-h-48 overflow-y-auto terminal-scrollbar z-50">
                {results.map((r) => {
                  const already = selectedFunds.some((s) => s.scheme_code === r.scheme_code);
                  return (
                    <li key={r.scheme_code} onClick={() => { if (!already) { onAdd(r); clear(); } }}
                      className={`px-3 py-2 text-xs cursor-pointer ${already ? 'text-terminal-muted cursor-default' : 'text-terminal-text hover:bg-terminal-bg hover:text-terminal-amber'}`}>
                      {r.scheme_name}
                    </li>
                  );
                })}
              </ul>
            )}
            {loading && <p className="text-[10px] text-terminal-muted mt-1">Searching…</p>}
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
        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-terminal-surface border border-terminal-border rounded text-xs hover:border-terminal-green transition-colors">
          <span className="text-terminal-muted">BM</span>
          <span className="text-terminal-green font-semibold truncate max-w-[120px]">
            {selectedBenchmark ? selectedBenchmark.scheme_name.split(' ').slice(0, 3).join(' ') : 'SELECT'}
          </span>
          <Icon d={CHEVRON} className="w-3 h-3 text-terminal-muted" />
        </button>
      }
    >
      <div className="p-3 w-72">
        <p className="text-[10px] text-terminal-muted uppercase tracking-widest mb-2">Benchmark Index</p>
        <input
          autoFocus
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter…"
          className="w-full px-2 py-1.5 text-xs bg-terminal-bg border border-terminal-border rounded text-terminal-text placeholder-terminal-muted outline-none focus:border-terminal-green mb-2"
        />
        <ul className="max-h-48 overflow-y-auto terminal-scrollbar">
          {loading && <li className="text-xs text-terminal-muted p-2">Loading…</li>}
          {filtered.map((f) => (
            <li key={f.scheme_code} data-close onClick={() => { onSelect(f); setFilter(''); }}
              className="px-2 py-2 text-xs text-terminal-text hover:bg-terminal-bg hover:text-terminal-green cursor-pointer rounded">
              {f.scheme_name}
            </li>
          ))}
        </ul>
      </div>
    </Popover>
  );
};

// ── Windows toggle ─────────────────────────────────────────────────────────────
const WindowsToggle = ({ windows, onChange }) => (
  <div className="flex items-center gap-1">
    <span className="text-[10px] text-terminal-muted uppercase tracking-widest mr-1">WIN</span>
    {WINDOWS.map((w) => (
      <button
        key={w.id}
        onClick={() => onChange(windows.includes(w.id) ? windows.filter((x) => x !== w.id) : [...windows, w.id])}
        className={`px-2 py-1 text-xs rounded transition-colors ${windows.includes(w.id) ? 'bg-terminal-amber text-terminal-bg font-bold' : 'text-terminal-muted hover:text-terminal-text border border-terminal-border'}`}
      >
        {w.label}
      </button>
    ))}
  </div>
);

// ── Date preset ────────────────────────────────────────────────────────────────
const DatePopover = ({ datePreset, startDate, endDate, onPreset, onStart, onEnd }) => (
  <Popover
    trigger={
      <button className="flex items-center gap-1.5 px-3 py-1.5 bg-terminal-surface border border-terminal-border rounded text-xs hover:border-terminal-blue transition-colors">
        <span className="text-terminal-muted">DATE</span>
        <span className="text-terminal-blue font-semibold">{datePreset.toUpperCase()}</span>
        <Icon d={CHEVRON} className="w-3 h-3 text-terminal-muted" />
      </button>
    }
  >
    <div className="p-3 w-56">
      <p className="text-[10px] text-terminal-muted uppercase tracking-widest mb-2">Date Range</p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {DATE_PRESETS.map((p) => (
          <button
            key={p.id}
            data-close={p.id !== 'custom' ? true : undefined}
            onClick={() => onPreset(p.id)}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${datePreset === p.id ? 'bg-terminal-blue text-terminal-bg' : 'text-terminal-muted border border-terminal-border hover:border-terminal-blue'}`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {datePreset === 'custom' && (
        <div className="space-y-2">
          <div>
            <label className="text-[10px] text-terminal-muted block mb-1">FROM</label>
            <input type="date" value={startDate ?? ''} onChange={(e) => onStart(e.target.value || null)}
              className="w-full px-2 py-1.5 text-xs bg-terminal-bg border border-terminal-border rounded text-terminal-text outline-none focus:border-terminal-blue" />
          </div>
          <div>
            <label className="text-[10px] text-terminal-muted block mb-1">TO</label>
            <input type="date" value={endDate ?? ''} onChange={(e) => onEnd(e.target.value || null)}
              className="w-full px-2 py-1.5 text-xs bg-terminal-bg border border-terminal-border rounded text-terminal-text outline-none focus:border-terminal-blue" />
          </div>
        </div>
      )}
    </div>
  </Popover>
);

// ── Main header ────────────────────────────────────────────────────────────────
const TerminalHeader = ({
  selectedFunds, selectedBenchmark, windows, datePreset, startDate, endDate,
  canAnalyze, loading,
  onFundAdd, onFundRemove, onBenchmarkSelect, onWindowsChange,
  onDatePresetChange, onStartDateChange, onEndDateChange, onAnalyze,
}) => (
  <header className="sticky top-0 z-40 bg-terminal-surface border-b border-terminal-border flex items-center gap-3 px-4 py-2 flex-wrap">
    {/* Brand */}
    <span className="text-terminal-amber font-bold text-sm tracking-tight mr-2">▸ MF<span className="text-terminal-green">TERM</span></span>

    {/* Controls */}
    <FundPopover selectedFunds={selectedFunds} onAdd={onFundAdd} onRemove={onFundRemove} />
    <BenchmarkPopover selectedBenchmark={selectedBenchmark} onSelect={onBenchmarkSelect} />
    <WindowsToggle windows={windows} onChange={onWindowsChange} />
    <DatePopover datePreset={datePreset} startDate={startDate} endDate={endDate} onPreset={onDatePresetChange} onStart={onStartDateChange} onEnd={onEndDateChange} />

    {/* Run */}
    <button
      onClick={onAnalyze}
      disabled={!canAnalyze}
      className={`ml-auto flex items-center gap-2 px-4 py-1.5 rounded text-xs font-bold transition-all ${canAnalyze ? 'bg-terminal-amber text-terminal-bg hover:brightness-110' : 'bg-terminal-surface border border-terminal-border text-terminal-muted cursor-not-allowed'}`}
    >
      {loading ? (
        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : <span>▶</span>}
      {loading ? 'LOADING…' : 'RUN'}
    </button>
  </header>
);

export default TerminalHeader;
