import { useState } from 'react';
import { useIndexFunds } from '../../../shared/hooks/useIndexFunds';
import { WINDOWS, DATE_PRESETS, FUND_COLORS } from '../../../shared/utils/chartUtils';

const ToggleBtn = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-5 py-3 rounded-xl font-semibold text-sm transition-all ${
      active ? 'bg-violet-600 text-white shadow-md' : 'bg-white border-2 border-violet-100 text-slate-500 hover:border-violet-300'
    }`}
  >
    {children}
  </button>
);

const Step2Configure = ({
  selectedFunds, selectedBenchmark, windows, datePreset, startDate, endDate,
  onBenchmarkSelect, onWindowsChange, onDatePresetChange, onStartDateChange, onEndDateChange,
  onBack, onNext,
}) => {
  const { funds: indexFunds, loading: indexLoading } = useIndexFunds();
  const [benchFilter, setBenchFilter] = useState('');
  const filtered = indexFunds.filter((f) => !benchFilter || f.scheme_name.toLowerCase().includes(benchFilter.toLowerCase()));

  const toggleWindow = (id) =>
    onWindowsChange(windows.includes(id) ? windows.filter((w) => w !== id) : [...windows, id]);

  const canNext = selectedBenchmark && windows.length > 0;

  return (
    <div className="animate-fade-up space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">② Configure Analysis</h2>
        <p className="text-slate-500">Choose a benchmark index, rolling windows, and date range.</p>
      </div>

      {/* Fund summary */}
      <div className="bg-white rounded-xl border border-violet-100 p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Comparing</p>
        <div className="flex flex-wrap gap-2">
          {selectedFunds.map((f, i) => (
            <span key={f.scheme_code} className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 border border-violet-100 rounded-full text-xs text-violet-700 font-medium">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: FUND_COLORS[i % FUND_COLORS.length] }} />
              {f.scheme_name.split(' ').slice(0, 4).join(' ')}…
            </span>
          ))}
        </div>
      </div>

      {/* Benchmark */}
      <div>
        <p className="text-sm font-semibold text-slate-700 mb-3">Benchmark Index</p>
        <div className="relative mb-2">
          <input
            type="text"
            value={benchFilter}
            onChange={(e) => setBenchFilter(e.target.value)}
            placeholder="Filter benchmarks…"
            className="w-full px-4 py-3 border-2 border-violet-100 rounded-xl focus:border-violet-400 outline-none text-sm"
          />
        </div>
        <div className="bg-white border border-violet-100 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
          {indexLoading && <p className="text-xs text-slate-400 p-3">Loading…</p>}
          {filtered.map((f) => (
            <button
              key={f.scheme_code}
              onClick={() => { onBenchmarkSelect(f); setBenchFilter(''); }}
              className={`w-full text-left px-4 py-3 text-sm transition-colors border-b border-violet-50 last:border-0 ${
                selectedBenchmark?.scheme_code === f.scheme_code
                  ? 'bg-violet-50 text-violet-700 font-semibold'
                  : 'text-slate-600 hover:bg-violet-50'
              }`}
            >
              <div className="flex items-center gap-2">
                {selectedBenchmark?.scheme_code === f.scheme_code && (
                  <svg className="w-4 h-4 text-violet-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {f.scheme_name}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Rolling windows */}
      <div>
        <p className="text-sm font-semibold text-slate-700 mb-3">Rolling Windows</p>
        <div className="flex flex-wrap gap-3">
          {WINDOWS.map((w) => (
            <ToggleBtn key={w.id} active={windows.includes(w.id)} onClick={() => toggleWindow(w.id)}>
              {w.label}
            </ToggleBtn>
          ))}
        </div>
      </div>

      {/* Date range */}
      <div>
        <p className="text-sm font-semibold text-slate-700 mb-3">Date Range</p>
        <div className="flex flex-wrap gap-3 mb-4">
          {DATE_PRESETS.map((p) => (
            <ToggleBtn key={p.id} active={datePreset === p.id} onClick={() => onDatePresetChange(p.id)}>
              {p.label}
            </ToggleBtn>
          ))}
        </div>
        {datePreset === 'custom' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 font-medium mb-1.5 block">From</label>
              <input type="date" value={startDate ?? ''} onChange={(e) => onStartDateChange(e.target.value || null)}
                className="w-full px-4 py-3 border-2 border-violet-100 rounded-xl focus:border-violet-400 outline-none text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-medium mb-1.5 block">To</label>
              <input type="date" value={endDate ?? ''} onChange={(e) => onEndDateChange(e.target.value || null)}
                className="w-full px-4 py-3 border-2 border-violet-100 rounded-xl focus:border-violet-400 outline-none text-sm" />
            </div>
          </div>
        )}
      </div>

      {/* Nav buttons */}
      <div className="flex gap-4 pt-2">
        <button onClick={onBack} className="flex-1 py-4 rounded-xl border-2 border-violet-200 text-violet-600 font-semibold hover:border-violet-400 transition-colors">
          ← Back
        </button>
        <button
          onClick={onNext}
          disabled={!canNext}
          className={`flex-1 py-4 rounded-xl font-bold text-base transition-all ${
            canNext ? 'bg-violet-600 text-white hover:bg-violet-700 shadow-lg hover:shadow-violet-200' : 'bg-slate-100 text-slate-300 cursor-not-allowed'
          }`}
        >
          Run Analysis →
        </button>
      </div>
    </div>
  );
};

export default Step2Configure;
