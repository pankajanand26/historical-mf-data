import { useState, useRef, useEffect, useMemo } from 'react';
import Fuse from 'fuse.js';
import { useFundSearch } from '../../../shared/hooks/useFundSearch';
import { useIndexFunds } from '../../../shared/hooks/useIndexFunds';
import { WINDOWS, DATE_PRESETS, FUND_COLORS } from '../../../shared/utils/chartUtils';

// Fuse.js config — tuned for short fund-name tokens
const FUSE_OPTIONS = {
  keys: ['scheme_name'],
  threshold: 0.35,
  distance: 200,
  minMatchCharLength: 2,
  shouldSort: true,
};

// ── Mini icon ──────────────────────────────────────────────────────────────────
const Icon = ({ d, className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
  </svg>
);

const CLOSE = 'M6 18L18 6M6 6l12 12';
const CHEVRON = 'M19 9l-7 7-7-7';
const SEARCH = 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0';
const DOWNLOAD = 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4';

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

  // Build Fuse index once when funds list changes
  const fuse = useMemo(() => new Fuse(funds, FUSE_OPTIONS), [funds]);

  const filtered = useMemo(() => {
    if (!filter.trim()) return funds;
    return fuse.search(filter.trim()).map((r) => r.item);
  }, [fuse, funds, filter]);

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
          placeholder="Search (fuzzy)…"
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

// ── Risk-free rate inline input ────────────────────────────────────────────────
const RfRateInput = ({ rfRate, onChange }) => {
  const [editing, setEditing] = useState(false);
  const [temp, setTemp] = useState((rfRate * 100).toFixed(1));
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.select();
  }, [editing]);

  const handleSubmit = () => {
    const val = parseFloat(temp);
    if (!isNaN(val) && val >= 0 && val <= 20) {
      onChange(val / 100);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-terminal-muted uppercase tracking-widest">RF</span>
        <input
          ref={inputRef}
          type="number"
          step="0.1"
          min="0"
          max="20"
          value={temp}
          onChange={(e) => setTemp(e.target.value)}
          onBlur={handleSubmit}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') setEditing(false); }}
          className="w-12 px-1.5 py-1 text-xs bg-terminal-bg border border-terminal-amber rounded text-terminal-amber text-center outline-none"
        />
        <span className="text-[10px] text-terminal-muted">%</span>
      </div>
    );
  }

  return (
    <button
      onClick={() => { setTemp((rfRate * 100).toFixed(1)); setEditing(true); }}
      className="flex items-center gap-1 px-2 py-1 bg-terminal-surface border border-terminal-border rounded text-xs hover:border-terminal-amber transition-colors"
      title="Risk-free rate for Sharpe/Sortino calculations"
    >
      <span className="text-terminal-muted">RF</span>
      <span className="text-terminal-amber font-semibold">{(rfRate * 100).toFixed(1)}%</span>
    </button>
  );
};

// ── Export dropdown ────────────────────────────────────────────────────────────
const ExportButton = ({ data, analyticsData, activeSection }) => {
  const exportCSV = () => {
    if (!data) return;
    let csv = '';
    const funds = data.funds ?? [];
    const benchWin = data.benchmark_windows?.[0];
    
    if (activeSection === 'returns' && benchWin) {
      // Export rolling returns data
      csv = 'Date,Benchmark,' + funds.map(f => f.scheme_name.replace(/,/g, '')).join(',') + '\n';
      const map = new Map();
      for (const pt of benchWin.data) {
        map.set(pt.date, { date: pt.date, benchmark: pt.value });
      }
      for (const fund of funds) {
        const fWin = fund.windows?.find(w => w.window === benchWin.window);
        if (fWin) {
          for (const pt of fWin.data) {
            const row = map.get(pt.date) ?? { date: pt.date };
            row[`fund_${fund.scheme_code}`] = pt.value;
            map.set(pt.date, row);
          }
        }
      }
      const rows = Array.from(map.values()).sort((a, b) => a.date < b.date ? -1 : 1);
      for (const row of rows) {
        csv += `${row.date},${row.benchmark ?? ''},${funds.map(f => row[`fund_${f.scheme_code}`] ?? '').join(',')}\n`;
      }
    } else if (activeSection === 'drawdown' && analyticsData) {
      // Export drawdown data
      csv = 'Fund,Max Drawdown %,Peak Date,Trough Date,Duration Days,Recovery Date,Recovery Days\n';
      if (analyticsData.benchmark_drawdown) {
        const bd = analyticsData.benchmark_drawdown;
        csv += `${analyticsData.benchmark_name.replace(/,/g, '')},${bd.max_drawdown ?? ''},${bd.peak_date ?? ''},${bd.trough_date ?? ''},${bd.drawdown_duration_days ?? ''},${bd.recovery_date ?? ''},${bd.recovery_days ?? ''}\n`;
      }
      for (const f of analyticsData.funds ?? []) {
        const dd = f.drawdown;
        csv += `${f.scheme_name.replace(/,/g, '')},${dd.max_drawdown ?? ''},${dd.peak_date ?? ''},${dd.trough_date ?? ''},${dd.drawdown_duration_days ?? ''},${dd.recovery_date ?? ''},${dd.recovery_days ?? ''}\n`;
      }
    } else {
      // Generic export for other tabs
      csv = 'Section,Note\n';
      csv += `${activeSection},Export available for Returns and Drawdown tabs\n`;
    }
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mfterm_${activeSection}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    const exportData = { rolling_returns: data, fund_analytics: analyticsData, exported_at: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mfterm_full_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!data) return null;

  return (
    <Popover
      trigger={
        <button className="flex items-center gap-1 px-2 py-1.5 bg-terminal-surface border border-terminal-border rounded text-xs text-terminal-muted hover:border-terminal-green hover:text-terminal-green transition-colors">
          <Icon d={DOWNLOAD} className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">EXPORT</span>
        </button>
      }
      align="right"
    >
      <div className="p-2 w-44">
        <button
          data-close
          onClick={exportCSV}
          className="w-full text-left px-3 py-2 text-xs text-terminal-text hover:bg-terminal-bg hover:text-terminal-green rounded transition-colors"
        >
          Active Tab (CSV)
        </button>
        <button
          data-close
          onClick={exportJSON}
          className="w-full text-left px-3 py-2 text-xs text-terminal-text hover:bg-terminal-bg hover:text-terminal-green rounded transition-colors"
        >
          Full Data (JSON)
        </button>
      </div>
    </Popover>
  );
};

// ── Main header ────────────────────────────────────────────────────────────────
const TerminalHeader = ({
  selectedFunds, selectedBenchmark, windows, datePreset, startDate, endDate,
  canAnalyze, loading, rfRate, onRfRateChange,
  onFundAdd, onFundRemove, onBenchmarkSelect, onWindowsChange,
  onDatePresetChange, onStartDateChange, onEndDateChange, onAnalyze,
  data, analyticsData, activeSection,
}) => (
  <header className="sticky top-0 z-40 bg-terminal-surface border-b border-terminal-border flex items-center gap-3 px-4 py-2 flex-wrap">
    {/* Brand */}
    <span className="text-terminal-amber font-bold text-sm tracking-tight mr-2">▸ MF<span className="text-terminal-green">TERM</span></span>

    {/* Controls */}
    <FundPopover selectedFunds={selectedFunds} onAdd={onFundAdd} onRemove={onFundRemove} />
    <BenchmarkPopover selectedBenchmark={selectedBenchmark} onSelect={onBenchmarkSelect} />
    <WindowsToggle windows={windows} onChange={onWindowsChange} />
    <RfRateInput rfRate={rfRate} onChange={onRfRateChange} />
    <DatePopover datePreset={datePreset} startDate={startDate} endDate={endDate} onPreset={onDatePresetChange} onStart={onStartDateChange} onEnd={onEndDateChange} />

    {/* Export */}
    <ExportButton data={data} analyticsData={analyticsData} activeSection={activeSection} />

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
