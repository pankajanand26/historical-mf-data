import { useRef, useCallback, useState } from 'react';
import { useFundSearch } from '../../../shared/hooks/useFundSearch';
import { useIndexFunds } from '../../../shared/hooks/useIndexFunds';
import { WINDOWS, DATE_PRESETS, FUND_COLORS } from '../../../shared/utils/chartUtils';

const MIN_W = 180;
const MAX_W = 480;

// ── Styled primitives ──────────────────────────────────────────────────────────
const SectionLabel = ({ children, dark }) => (
  <p className={`text-[9px] font-bold uppercase tracking-widest mb-2 ${dark ? 'text-[#6c7086]' : 'text-slate-400'}`}>{children}</p>
);

const Pill = ({ active, onClick, children, dark }) => (
  <button
    onClick={onClick}
    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
      active
        ? dark ? 'bg-[#cba6f7] text-[#1e1e2e]' : 'bg-indigo-600 text-white'
        : dark ? 'bg-[#313244] text-[#a6adc8] hover:bg-[#45475a]' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
    }`}
  >
    {children}
  </button>
);

const InputBase = ({ dark, ...props }) => (
  <input
    {...props}
    className={`w-full px-2.5 py-2 text-xs rounded-lg outline-none transition-colors ${
      dark
        ? 'bg-[#313244] border border-[#45475a] text-[#cdd6f4] placeholder-[#6c7086] focus:border-[#cba6f7]'
        : 'bg-slate-50 border border-slate-200 text-slate-700 placeholder-slate-400 focus:border-indigo-400'
    }`}
  />
);

// ── Fund search ────────────────────────────────────────────────────────────────
const FundSearch = ({ selectedFunds, onAdd, dark }) => {
  const { query, results, loading, search, clear } = useFundSearch();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <InputBase
        dark={dark}
        type="text"
        value={query}
        onChange={(e) => { search(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search funds…"
      />
      {open && results.length > 0 && (
        <ul className={`absolute top-full left-0 right-0 mt-1 z-50 rounded-lg shadow-xl max-h-48 overflow-y-auto thin-scrollbar border ${dark ? 'bg-[#1e1e2e] border-[#45475a]' : 'bg-white border-slate-200'}`}>
          {results.map((r) => {
            const already = selectedFunds.some((s) => s.scheme_code === r.scheme_code);
            return (
              <li key={r.scheme_code} onMouseDown={() => !already && (onAdd(r), clear(), setOpen(false))}
                className={`px-3 py-2 text-xs cursor-pointer ${already
                  ? dark ? 'text-[#45475a] cursor-default' : 'text-slate-300 cursor-default'
                  : dark ? 'text-[#cdd6f4] hover:bg-[#313244] hover:text-[#cba6f7]' : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-700'}`}>
                {r.scheme_name}
              </li>
            );
          })}
        </ul>
      )}
      {open && loading && (
        <div className={`absolute top-full left-0 right-0 mt-1 p-2 text-xs rounded-lg border ${dark ? 'bg-[#1e1e2e] border-[#45475a] text-[#6c7086]' : 'bg-white border-slate-200 text-slate-400'}`}>Searching…</div>
      )}
    </div>
  );
};

// ── Benchmark selector ─────────────────────────────────────────────────────────
const BenchmarkSelect = ({ selectedBenchmark, onSelect, dark }) => {
  const { funds, loading } = useIndexFunds();
  const [filter, setFilter] = useState('');
  const [open, setOpen] = useState(false);
  const filtered = funds.filter((f) => !filter || f.scheme_name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors border ${
          dark ? 'bg-[#313244] border-[#45475a] text-[#cdd6f4] hover:border-[#cba6f7]' : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-indigo-300'
        }`}>
        <span className={selectedBenchmark ? '' : dark ? 'text-[#6c7086]' : 'text-slate-400'}>
          {selectedBenchmark ? selectedBenchmark.scheme_name.slice(0, 28) + '…' : loading ? 'Loading…' : 'Select…'}
        </span>
        <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <div className={`absolute top-full left-0 right-0 mt-1 z-50 rounded-lg shadow-xl border ${dark ? 'bg-[#1e1e2e] border-[#45475a]' : 'bg-white border-slate-200'}`}>
          <div className="p-2 border-b border-current border-opacity-10">
            <InputBase dark={dark} autoFocus type="text" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter…" />
          </div>
          <ul className="max-h-48 overflow-y-auto thin-scrollbar">
            {filtered.map((f) => (
              <li key={f.scheme_code} onMouseDown={() => { onSelect(f); setOpen(false); setFilter(''); }}
                className={`px-3 py-2 text-xs cursor-pointer ${dark ? 'text-[#cdd6f4] hover:bg-[#313244] hover:text-[#a6e3a1]' : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-700'}`}>
                {f.scheme_name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// ── Main sidebar ───────────────────────────────────────────────────────────────
const WorkbenchSidebar = ({
  width, onWidthChange,
  selectedFunds, selectedBenchmark, windows, datePreset, startDate, endDate,
  canAnalyze, loading,
  onFundAdd, onFundRemove, onBenchmarkSelect,
  onWindowsChange, onDatePresetChange, onStartDateChange, onEndDateChange,
  onAnalyze, darkMode,
}) => {
  const dragging = useRef(false);
  const startX = useRef(0);
  const startW = useRef(0);

  const onMouseDown = useCallback((e) => {
    dragging.current = true;
    startX.current = e.clientX;
    startW.current = width;
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';

    const onMove = (ev) => {
      if (!dragging.current) return;
      const newW = Math.min(MAX_W, Math.max(MIN_W, startW.current + ev.clientX - startX.current));
      onWidthChange(newW);
    };
    const onUp = () => {
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [width, onWidthChange]);

  const bg = darkMode ? 'bg-[#181825] border-[#313244]' : 'bg-white border-slate-200';
  const toggleWindow = (id) =>
    onWindowsChange(windows.includes(id) ? windows.filter((w) => w !== id) : [...windows, id]);

  return (
    <aside className={`flex-shrink-0 border-r flex flex-col overflow-hidden relative ${bg}`} style={{ width }}>
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto thin-scrollbar px-4 py-4 space-y-5">
        {/* Funds */}
        <div>
          <SectionLabel dark={darkMode}>Funds (max 5)</SectionLabel>
          {selectedFunds.length > 0 && (
            <ul className="mb-2 space-y-1">
              {selectedFunds.map((f, i) => (
                <li key={f.scheme_code} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: FUND_COLORS[i % FUND_COLORS.length] }} />
                  <span className={`flex-1 text-xs truncate ${darkMode ? 'text-[#cdd6f4]' : 'text-slate-700'}`}>{f.scheme_name}</span>
                  <button onClick={() => onFundRemove(f.scheme_code)} className={`flex-shrink-0 text-xs transition-colors ${darkMode ? 'text-[#45475a] hover:text-[#f38ba8]' : 'text-slate-300 hover:text-red-500'}`}>✕</button>
                </li>
              ))}
            </ul>
          )}
          {selectedFunds.length < 5 && <FundSearch selectedFunds={selectedFunds} onAdd={onFundAdd} dark={darkMode} />}
        </div>

        {/* Benchmark */}
        <div>
          <SectionLabel dark={darkMode}>Benchmark</SectionLabel>
          <BenchmarkSelect selectedBenchmark={selectedBenchmark} onSelect={onBenchmarkSelect} dark={darkMode} />
        </div>

        {/* Windows */}
        <div>
          <SectionLabel dark={darkMode}>Rolling Windows</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {WINDOWS.map((w) => <Pill key={w.id} active={windows.includes(w.id)} onClick={() => toggleWindow(w.id)} dark={darkMode}>{w.label}</Pill>)}
          </div>
        </div>

        {/* Date */}
        <div>
          <SectionLabel dark={darkMode}>Date Range</SectionLabel>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {DATE_PRESETS.map((p) => <Pill key={p.id} active={datePreset === p.id} onClick={() => onDatePresetChange(p.id)} dark={darkMode}>{p.label}</Pill>)}
          </div>
          {datePreset === 'custom' && (
            <div className="space-y-2">
              <div>
                <p className={`text-[9px] uppercase tracking-widest mb-1 ${darkMode ? 'text-[#6c7086]' : 'text-slate-400'}`}>From</p>
                <InputBase dark={darkMode} type="date" value={startDate ?? ''} onChange={(e) => onStartDateChange(e.target.value || null)} />
              </div>
              <div>
                <p className={`text-[9px] uppercase tracking-widest mb-1 ${darkMode ? 'text-[#6c7086]' : 'text-slate-400'}`}>To</p>
                <InputBase dark={darkMode} type="date" value={endDate ?? ''} onChange={(e) => onEndDateChange(e.target.value || null)} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Run button */}
      <div className={`flex-shrink-0 p-4 border-t ${darkMode ? 'border-[#313244]' : 'border-slate-100'}`}>
        <button
          onClick={onAnalyze}
          disabled={!canAnalyze}
          className={`w-full py-2.5 rounded-lg font-semibold text-xs flex items-center justify-center gap-2 transition-all ${
            canAnalyze
              ? darkMode ? 'bg-[#cba6f7] text-[#1e1e2e] hover:bg-[#d4b8f8]' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
              : darkMode ? 'bg-[#313244] text-[#45475a] cursor-not-allowed' : 'bg-slate-100 text-slate-300 cursor-not-allowed'
          }`}
        >
          {loading ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : '▶'}
          {loading ? 'Running…' : 'Run Analysis'}
        </button>
      </div>

      {/* Drag handle */}
      <div
        onMouseDown={onMouseDown}
        className={`absolute top-0 right-0 w-1 h-full cursor-ew-resize transition-colors ${darkMode ? 'hover:bg-[#cba6f7]/40' : 'hover:bg-indigo-300/40'}`}
        title="Drag to resize"
      />
    </aside>
  );
};

export default WorkbenchSidebar;
