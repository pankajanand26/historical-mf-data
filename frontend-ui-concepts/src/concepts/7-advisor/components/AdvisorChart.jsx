/**
 * AdvisorChart — Concept 7: Switch Advisor (Fund Switcher)
 * Pick your current fund → ranked alternatives with Δ-improvements + Switch Score.
 */
import { useState, useMemo } from 'react';
import {
  buildChartData, computeAllStats, computeFundScores,
  fmt2, fmtRatio, shortName, FUND_COLORS,
} from '../../../shared/utils/chartUtils';

const DIMS = [
  { id: 'returns',     label: 'Returns',     format: (s) => fmt2(s?.raw?.raw?.returns),   unit: '' },
  { id: 'risk',        label: 'Risk-Adj.',   format: (s) => fmtRatio(s?.raw?.raw?.risk),  unit: '' },
  { id: 'consistency', label: 'Consistency', format: (s) => s?.raw?.raw?.consistency != null ? `${s.raw.raw.consistency.toFixed(1)}%` : 'N/A', unit: '' },
  { id: 'capture',     label: 'Capture',     format: (s) => fmtRatio(s?.raw?.raw?.capture), unit: '' },
  { id: 'drawdown',    label: 'Drawdown',    format: (s) => s?.raw?.raw?.drawdown != null ? `${s.raw.raw.drawdown.toFixed(1)}%` : 'N/A', unit: '' },
];

const DeltaChip = ({ delta }) => {
  if (delta == null || isNaN(delta)) return <span className="text-xs text-slate-400">—</span>;
  const positive = delta > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-bold ${positive ? 'text-emerald-600' : 'text-red-500'}`}>
      {positive ? '▲' : '▼'}{Math.abs(delta).toFixed(0)}
    </span>
  );
};

const SwitchScore = ({ score }) => {
  if (score == null || isNaN(score)) return null;
  const isPos = score >= 0;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${isPos ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
      {isPos ? '↑' : '↓'} {isPos ? '+' : ''}{score.toFixed(0)} pts
    </span>
  );
};

const AdvisorChart = ({ data, analyticsData, loading, error, selectedFunds }) => {
  const [activeWindow, setActiveWindow] = useState(null);
  const [currentFundIdx, setCurrentFundIdx] = useState(0);
  const [expandedFund, setExpandedFund] = useState(null);

  const activeWin = useMemo(() => {
    if (!data?.benchmark) return null;
    const wins = data.benchmark.windows;
    if (!wins?.length) return null;
    const target = activeWindow ?? wins[0].window;
    return wins.find((w) => w.window === target) ?? wins[0];
  }, [data, activeWindow]);

  const chartData = useMemo(() => {
    if (!data || !activeWin) return [];
    return buildChartData(data.funds ?? [], activeWin, 'cagr');
  }, [data, activeWin]);

  const allStats = useMemo(() => {
    if (!chartData.length || !data?.funds?.length) return [];
    return computeAllStats(data.funds, chartData, 0.065 * (activeWin?.window_days ?? 1095) / 365);
  }, [chartData, data, activeWin]);

  const scored = useMemo(() => {
    if (!allStats.length) return [];
    return computeFundScores(allStats, analyticsData);
  }, [allStats, analyticsData]);

  const currentFund = scored[currentFundIdx] ?? null;

  // Alternatives: everyone except current, sorted by Switch Score descending
  const alternatives = useMemo(() => {
    if (!currentFund || scored.length < 2) return [];
    return scored
      .filter((_, i) => i !== currentFundIdx)
      .map((alt) => {
        const dimDeltas = {};
        let totalDelta = 0; let validCount = 0;
        for (const dim of DIMS) {
          const cur = currentFund.scores[dim.id];
          const altSc = alt.scores[dim.id];
          const delta = cur != null && altSc != null ? altSc - cur : null;
          dimDeltas[dim.id] = delta;
          if (delta != null) { totalDelta += delta; validCount++; }
        }
        const switchScore = validCount ? totalDelta / validCount : null;
        return { ...alt, dimDeltas, switchScore };
      })
      .sort((a, b) => (b.switchScore ?? -Infinity) - (a.switchScore ?? -Infinity));
  }, [scored, currentFundIdx, currentFund]);

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Analysing funds…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex-1 flex items-center justify-center bg-white">
      <div className="bg-red-50 border border-red-200 rounded-xl px-6 py-4 text-center">
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    </div>
  );

  if (!data || !scored.length) return (
    <div className="flex-1 flex items-center justify-center bg-white flex-col gap-3">
      <svg className="w-16 h-16 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
      <p className="text-slate-400 text-sm">Load 2+ funds and run analysis. Select your current fund to see switch recommendations.</p>
    </div>
  );

  const windows = data.benchmark?.windows ?? [];

  return (
    <div className="flex-1 overflow-auto bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Controls row */}
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-widest">Your Current Fund:</span>
            <div className="flex gap-2 flex-wrap">
              {scored.map((s, i) => (
                <button key={s.fund.scheme_code} onClick={() => setCurrentFundIdx(i)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${currentFundIdx === i ? 'text-white' : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-400'}`}
                  style={currentFundIdx === i ? { backgroundColor: FUND_COLORS[i] } : {}}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: currentFundIdx === i ? '#fff' : FUND_COLORS[i] }} />
                  {shortName(s.fund.scheme_name, 22)}
                </button>
              ))}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-slate-400">Window:</span>
            {windows.map((w) => (
              <button key={w.window} onClick={() => setActiveWindow(w.window)}
                className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors ${activeWin?.window === w.window ? 'bg-violet-600 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                {w.window.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Current fund summary */}
        {currentFund && (
          <div className="bg-white rounded-2xl border-2 border-violet-200 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-4 h-4 rounded-full" style={{ backgroundColor: currentFund.color }} />
              <div>
                <p className="text-xs text-violet-600 font-semibold uppercase tracking-widest">Current Holding</p>
                <p className="font-bold text-slate-800">{shortName(currentFund.fund.scheme_name)}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-xs text-slate-400">Overall Score</p>
                <p className="text-2xl font-bold text-violet-600">
                  {currentFund.overall != null ? Math.round(currentFund.overall) : 'N/A'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-3">
              {DIMS.map((dim) => (
                <div key={dim.id} className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">{dim.label}</p>
                  <p className="text-sm font-bold text-slate-700">{dim.format(currentFund)}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Score: {currentFund.scores[dim.id] != null ? Math.round(currentFund.scores[dim.id]) : 'N/A'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alternatives */}
        {alternatives.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <p className="text-slate-400">Add more funds to see switch recommendations.</p>
          </div>
        )}

        {alternatives.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-slate-700">
              Switch Recommendations — ranked by net improvement
            </h2>
            {alternatives.map((alt, rank) => {
              const isExpanded = expandedFund === alt.fund.scheme_code;
              const isRecommended = rank === 0 && (alt.switchScore ?? 0) > 0;
              return (
                <div key={alt.fund.scheme_code}
                  className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${isRecommended ? 'border-emerald-300' : 'border-slate-200'}`}>
                  {isRecommended && (
                    <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-1.5">
                      <span className="text-xs font-bold text-emerald-700">⭐ TOP RECOMMENDATION</span>
                    </div>
                  )}
                  <button className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-slate-50/50 transition-colors"
                    onClick={() => setExpandedFund(isExpanded ? null : alt.fund.scheme_code)}>
                    <span className="text-sm font-bold text-slate-400 w-5">#{rank + 1}</span>
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: alt.color }} />
                    <span className="flex-1 font-medium text-slate-700 text-sm truncate">{shortName(alt.fund.scheme_name, 40)}</span>
                    <div className="flex items-center gap-4">
                      {/* Headline delta chips — show only if expanded is false */}
                      {!isExpanded && (
                        <div className="flex items-center gap-2">
                          {DIMS.slice(0, 3).map((dim) => (
                            <div key={dim.id} className="text-center hidden sm:block">
                              <div className="text-[10px] text-slate-400">{dim.label}</div>
                              <DeltaChip delta={alt.dimDeltas[dim.id]} />
                            </div>
                          ))}
                        </div>
                      )}
                      <SwitchScore score={alt.switchScore} />
                    </div>
                    <svg className={`w-4 h-4 text-slate-400 ml-2 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Expanded: full delta table */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 px-5 pb-5 pt-4">
                      <p className="text-xs text-slate-400 mb-3">Score comparison vs your current fund</p>
                      <div className="grid grid-cols-5 gap-3">
                        {DIMS.map((dim) => {
                          const delta = alt.dimDeltas[dim.id];
                          const isPos = delta != null && delta > 0;
                          const isNeg = delta != null && delta < 0;
                          return (
                            <div key={dim.id} className={`rounded-xl p-3 text-center border ${isPos ? 'bg-emerald-50 border-emerald-200' : isNeg ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{dim.label}</p>
                              <p className="text-xs font-bold text-slate-700">{dim.format(alt)}</p>
                              <div className="mt-1.5">
                                <DeltaChip delta={delta} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-3">
                        Switch Score = average delta across all dimensions. Positive = improvement over current fund.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvisorChart;
