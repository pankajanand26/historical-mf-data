import { useState } from 'react';
import { useFundSearch } from '../../../shared/hooks/useFundSearch';
import { useIndexFunds } from '../../../shared/hooks/useIndexFunds';
import { WINDOWS, DATE_PRESETS, FUND_COLORS } from '../../../shared/utils/chartUtils';

// ── Icon helper ────────────────────────────────────────────────────────────────
const Icon = ({ path, className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} />
  </svg>
);

const ICONS = {
  funds: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
  benchmark: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  windows: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  date: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  run: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  collapse: 'M11 19l-7-7 7-7m8 14l-7-7 7-7',
  expand: 'M13 5l7 7-7 7M5 5l7 7-7 7',
  x: 'M6 18L18 6M6 6l12 12',
  search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0',
  chevronDown: 'M19 9l-7 7-7-7',
};

// ── Fund search combo ──────────────────────────────────────────────────────────
const FundSearchBox = ({ selectedFunds, onAdd, placeholder = 'Search mutual funds…', chipColor = null }) => {
  const { query, results, loading, search, clear } = useFundSearch();
  const [open, setOpen] = useState(false);

  const handleSelect = (fund) => {
    onAdd(fund);
    clear();
    setOpen(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Icon path={ICONS.search} className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => { search(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-400 focus:bg-white transition-colors"
        />
      </div>
      {open && results.length > 0 && (
        <ul className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-52 overflow-y-auto thin-scrollbar">
          {results.map((f) => {
            const already = selectedFunds.some((s) => s.scheme_code === f.scheme_code);
            return (
              <li
                key={f.scheme_code}
                onMouseDown={() => !already && handleSelect(f)}
                className={`px-3 py-2 text-xs cursor-pointer ${already ? 'text-slate-300 cursor-default' : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-700'}`}
              >
                {f.scheme_name}
              </li>
            );
          })}
        </ul>
      )}
      {open && loading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow p-2 text-xs text-slate-400 z-50">Searching…</div>
      )}
    </div>
  );
};

// ── Benchmark selector ─────────────────────────────────────────────────────────
const BenchmarkSelector = ({ selectedBenchmark, onSelect }) => {
  const { funds: indexFunds, loading } = useIndexFunds();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = indexFunds.filter((f) =>
    !query || f.scheme_name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg hover:border-indigo-300 transition-colors"
      >
        <span className={selectedBenchmark ? 'text-slate-700 font-medium' : 'text-slate-400'}>
          {selectedBenchmark
            ? selectedBenchmark.scheme_name.length > 30
              ? selectedBenchmark.scheme_name.slice(0, 27) + '…'
              : selectedBenchmark.scheme_name
            : loading ? 'Loading…' : 'Select index…'}
        </span>
        <Icon path={ICONS.chevronDown} className="w-3 h-3 text-slate-400 flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
          <div className="p-2 border-b border-slate-100">
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter…"
              className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded outline-none focus:border-indigo-400"
            />
          </div>
          <ul className="max-h-48 overflow-y-auto thin-scrollbar">
            {filtered.map((f) => (
              <li
                key={f.scheme_code}
                onMouseDown={() => { onSelect(f); setOpen(false); setQuery(''); }}
                className="px-3 py-2 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer"
              >
                {f.scheme_name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// ── Section wrapper ────────────────────────────────────────────────────────────
const Section = ({ icon, label, collapsed, children }) => (
  <div className="border-b border-slate-100 last:border-0">
    {collapsed ? (
      <div className="flex justify-center py-3">
        <Icon path={icon} className="w-5 h-5 text-slate-400" />
      </div>
    ) : (
      <div className="p-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">{label}</p>
        {children}
      </div>
    )}
  </div>
);

// ── Main sidebar ───────────────────────────────────────────────────────────────
const SaasSidebar = ({
  collapsed, onToggle,
  selectedFunds, selectedBenchmark,
  windows, datePreset, startDate, endDate,
  canAnalyze, loading,
  onFundAdd, onFundRemove, onBenchmarkSelect,
  onWindowsChange, onDatePresetChange, onStartDateChange, onEndDateChange,
  onAnalyze,
}) => {
  const toggleWindow = (id) =>
    onWindowsChange(
      windows.includes(id) ? windows.filter((w) => w !== id) : [...windows, id]
    );

  const width = collapsed ? 56 : 260;

  return (
    <aside
      className="flex-shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-hidden transition-all duration-200"
      style={{ width }}
    >
      {/* Collapse toggle */}
      <div className={`flex items-center border-b border-slate-100 flex-shrink-0 ${collapsed ? 'justify-center py-3' : 'justify-between px-4 py-3'}`}>
        {!collapsed && <span className="text-xs font-semibold text-slate-600">Configuration</span>}
        <button onClick={onToggle} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
          <Icon path={collapsed ? ICONS.expand : ICONS.collapse} className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto thin-scrollbar">
        {/* Funds */}
        <Section icon={ICONS.funds} label="Funds (max 5)" collapsed={collapsed}>
          {selectedFunds.length > 0 && (
            <ul className="mb-2 space-y-1">
              {selectedFunds.map((f, i) => (
                <li key={f.scheme_code} className="flex items-center gap-2 py-1">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: FUND_COLORS[i % FUND_COLORS.length] }} />
                  <span className="flex-1 text-xs text-slate-700 truncate min-w-0">{f.scheme_name}</span>
                  <button onClick={() => onFundRemove(f.scheme_code)} className="flex-shrink-0 text-slate-300 hover:text-red-500 transition-colors">
                    <Icon path={ICONS.x} className="w-3 h-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {selectedFunds.length < 5 && (
            <FundSearchBox selectedFunds={selectedFunds} onAdd={onFundAdd} />
          )}
        </Section>

        {/* Benchmark */}
        <Section icon={ICONS.benchmark} label="Benchmark" collapsed={collapsed}>
          <BenchmarkSelector selectedBenchmark={selectedBenchmark} onSelect={onBenchmarkSelect} />
        </Section>

        {/* Rolling windows */}
        <Section icon={ICONS.windows} label="Rolling Windows" collapsed={collapsed}>
          <div className="flex flex-wrap gap-1.5">
            {WINDOWS.map((w) => (
              <button
                key={w.id}
                onClick={() => toggleWindow(w.id)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  windows.includes(w.id)
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </Section>

        {/* Date range */}
        <Section icon={ICONS.date} label="Date Range" collapsed={collapsed}>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {DATE_PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => onDatePresetChange(p.id)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  datePreset === p.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {datePreset === 'custom' && (
            <div className="space-y-2">
              <div>
                <label className="text-[10px] text-slate-400 mb-1 block">From</label>
                <input
                  type="date"
                  value={startDate ?? ''}
                  onChange={(e) => onStartDateChange(e.target.value || null)}
                  className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded outline-none focus:border-indigo-400"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 mb-1 block">To</label>
                <input
                  type="date"
                  value={endDate ?? ''}
                  onChange={(e) => onEndDateChange(e.target.value || null)}
                  className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded outline-none focus:border-indigo-400"
                />
              </div>
            </div>
          )}
        </Section>
      </div>

      {/* Run analysis button */}
      <div className={`flex-shrink-0 border-t border-slate-100 ${collapsed ? 'p-2' : 'p-4'}`}>
        <button
          onClick={onAnalyze}
          disabled={!canAnalyze}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-xs transition-all ${
            canAnalyze
              ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow-md'
              : 'bg-slate-100 text-slate-300 cursor-not-allowed'
          }`}
        >
          {loading ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <Icon path={ICONS.run} className="w-4 h-4" />
          )}
          {!collapsed && (loading ? 'Running…' : 'Run Analysis')}
        </button>
      </div>
    </aside>
  );
};

export default SaasSidebar;
