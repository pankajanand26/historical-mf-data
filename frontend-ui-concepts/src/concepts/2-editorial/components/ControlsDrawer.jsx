import { useEffect } from 'react';
import { useFundSearch } from '../../../shared/hooks/useFundSearch';
import { useIndexFunds } from '../../../shared/hooks/useIndexFunds';
import { WINDOWS, DATE_PRESETS, FUND_COLORS } from '../../../shared/utils/chartUtils';

const Label = ({ children }) => (
  <p className="text-[10px] font-semibold uppercase tracking-widest text-editorial-navy/50 mb-2">{children}</p>
);

const ControlsDrawer = ({
  open, onClose,
  selectedFunds, selectedBenchmark, windows, datePreset, startDate, endDate,
  canAnalyze, loading,
  onFundAdd, onFundRemove, onBenchmarkSelect,
  onWindowsChange, onDatePresetChange, onStartDateChange, onEndDateChange,
  onAnalyze,
}) => {
  const { query, results, loading: searchLoading, search, clear } = useFundSearch();
  const { funds: indexFunds } = useIndexFunds();

  // Close on Escape
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const toggleWindow = (id) =>
    onWindowsChange(windows.includes(id) ? windows.filter((w) => w !== id) : [...windows, id]);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 z-40 bg-editorial-ink/20 backdrop-blur-sm" onClick={onClose} />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-[360px] z-50 bg-white shadow-2xl border-l-2 border-editorial-navy flex flex-col transform transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-editorial-navy/10">
          <h2 className="font-serif text-xl text-editorial-navy font-bold">Configure Analysis</h2>
          <button onClick={onClose} className="text-editorial-navy/40 hover:text-editorial-navy transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-7">
          {/* Funds */}
          <div>
            <Label>Funds (up to 5)</Label>
            {selectedFunds.length > 0 && (
              <ul className="space-y-1.5 mb-3">
                {selectedFunds.map((f, i) => (
                  <li key={f.scheme_code} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: FUND_COLORS[i % FUND_COLORS.length] }} />
                    <span className="flex-1 text-sm text-editorial-ink truncate">{f.scheme_name}</span>
                    <button onClick={() => onFundRemove(f.scheme_code)} className="text-editorial-navy/30 hover:text-red-500 transition-colors flex-shrink-0">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {selectedFunds.length < 5 && (
              <div className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => search(e.target.value)}
                  placeholder="Search funds…"
                  className="w-full px-3 py-2.5 text-sm border border-editorial-navy/20 rounded focus:border-editorial-gold outline-none"
                />
                {results.length > 0 && (
                  <ul className="absolute top-full left-0 right-0 mt-1 bg-white border border-editorial-navy/20 rounded shadow-lg z-10 max-h-48 overflow-y-auto">
                    {results.map((r) => {
                      const already = selectedFunds.some((s) => s.scheme_code === r.scheme_code);
                      return (
                        <li key={r.scheme_code}
                          onClick={() => { if (!already) { onFundAdd(r); clear(); } }}
                          className={`px-3 py-2 text-sm cursor-pointer ${already ? 'text-gray-300 cursor-default' : 'text-editorial-ink hover:bg-editorial-gold/10'}`}>
                          {r.scheme_name}
                        </li>
                      );
                    })}
                  </ul>
                )}
                {searchLoading && <p className="text-xs text-editorial-navy/40 mt-1">Searching…</p>}
              </div>
            )}
          </div>

          {/* Benchmark */}
          <div>
            <Label>Benchmark Index</Label>
            <select
              value={selectedBenchmark?.scheme_code ?? ''}
              onChange={(e) => {
                const f = indexFunds.find((x) => x.scheme_code === parseInt(e.target.value));
                if (f) onBenchmarkSelect(f);
              }}
              className="w-full px-3 py-2.5 text-sm border border-editorial-navy/20 rounded focus:border-editorial-gold outline-none bg-white text-editorial-ink"
            >
              <option value="">Select index…</option>
              {indexFunds.map((f) => (
                <option key={f.scheme_code} value={f.scheme_code}>{f.scheme_name}</option>
              ))}
            </select>
          </div>

          {/* Rolling windows */}
          <div>
            <Label>Rolling Windows</Label>
            <div className="flex flex-wrap gap-2">
              {WINDOWS.map((w) => (
                <button key={w.id} onClick={() => toggleWindow(w.id)}
                  className={`px-3.5 py-1.5 rounded text-sm font-medium transition-colors ${windows.includes(w.id) ? 'bg-editorial-navy text-white' : 'border border-editorial-navy/20 text-editorial-navy hover:border-editorial-navy'}`}>
                  {w.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date range */}
          <div>
            <Label>Date Range</Label>
            <div className="flex flex-wrap gap-2 mb-3">
              {DATE_PRESETS.map((p) => (
                <button key={p.id} onClick={() => onDatePresetChange(p.id)}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${datePreset === p.id ? 'bg-editorial-gold text-white' : 'border border-editorial-navy/20 text-editorial-navy hover:border-editorial-gold'}`}>
                  {p.label}
                </button>
              ))}
            </div>
            {datePreset === 'custom' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-editorial-navy/50 mb-1">From</p>
                  <input type="date" value={startDate ?? ''} onChange={(e) => onStartDateChange(e.target.value || null)}
                    className="w-full px-2 py-2 text-sm border border-editorial-navy/20 rounded focus:border-editorial-gold outline-none" />
                </div>
                <div>
                  <p className="text-xs text-editorial-navy/50 mb-1">To</p>
                  <input type="date" value={endDate ?? ''} onChange={(e) => onEndDateChange(e.target.value || null)}
                    className="w-full px-2 py-2 text-sm border border-editorial-navy/20 rounded focus:border-editorial-gold outline-none" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer CTA */}
        <div className="px-6 py-5 border-t border-editorial-navy/10">
          <button
            onClick={onAnalyze}
            disabled={!canAnalyze}
            className={`w-full py-3 font-serif font-bold text-base rounded transition-colors ${canAnalyze ? 'bg-editorial-navy text-white hover:bg-editorial-ink' : 'bg-gray-100 text-gray-300 cursor-not-allowed'}`}
          >
            {loading ? 'Analyzing…' : 'Run Analysis'}
          </button>
        </div>
      </div>
    </>
  );
};

export default ControlsDrawer;
