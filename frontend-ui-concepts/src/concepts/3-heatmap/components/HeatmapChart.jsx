/**
 * HeatmapChart — Concept 3: Heatmap Scorecard (DIY)
 * Color-coded grid for instant cross-fund comparison.
 * Crown badge on winner per column. Click cell to expand full details.
 */
import { useState, useMemo } from 'react';
import {
  buildChartData, computeAllStats, computeFundScores,
  fmt2, fmtRatio, shortName, FUND_COLORS,
} from '../../../shared/utils/chartUtils';

const DIMS = [
  { id: 'returns',     label: 'Returns',     desc: 'Avg Alpha vs Benchmark', format: (r) => fmt2(r?.raw?.returns) },
  { id: 'risk',        label: 'Risk-Adj.',   desc: 'Sharpe Ratio',           format: (r) => fmtRatio(r?.raw?.risk) },
  { id: 'consistency', label: 'Consistency', desc: 'Beat Rate %',            format: (r) => r?.raw?.consistency != null ? `${r.raw.consistency.toFixed(1)}%` : 'N/A' },
  { id: 'capture',     label: 'Capture',     desc: 'UCR / DCR Ratio',        format: (r) => fmtRatio(r?.raw?.capture) },
  { id: 'drawdown',    label: 'Drawdown',    desc: 'Max Drawdown (less neg = better)', format: (r) => r?.raw?.drawdown != null ? `${r.raw.drawdown.toFixed(1)}%` : 'N/A' },
];

const scoreToHsl = (score) => {
  if (score == null || isNaN(score)) return 'hsl(220, 15%, 25%)';
  const hue = (score / 100) * 120; // 0 = red, 120 = green
  return `hsl(${hue}, 70%, ${score >= 50 ? 18 : 16}%)`;
};

const scoreToTextColor = (score) => {
  if (score == null || isNaN(score)) return '#64748b';
  if (score >= 70) return '#4ade80';
  if (score >= 40) return '#fcd34d';
  return '#f87171';
};

const HeatmapChart = ({ data, analyticsData, loading, error }) => {
  const [activeWindow, setActiveWindow] = useState(null);
  const [tooltip, setTooltip] = useState(null); // {fundIdx, dimId, x, y}
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

  // Find winner for each dimension
  const winners = useMemo(() => {
    const result = {};
    for (const dim of DIMS) {
      let bestIdx = -1, bestScore = -Infinity;
      scored.forEach((s, i) => {
        const sc = s.scores[dim.id];
        if (sc != null && sc > bestScore) { bestScore = sc; bestIdx = i; }
      });
      result[dim.id] = bestIdx;
    }
    return result;
  }, [scored]);

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Running analysis…</p>
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

  if (!data) return (
    <div className="flex-1 flex items-center justify-center bg-white flex-col gap-3">
      <svg className="w-16 h-16 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
      <p className="text-slate-400 text-sm">Select funds and run analysis to see the scorecard.</p>
    </div>
  );

  const windows = data.benchmark?.windows ?? [];

  return (
    <div className="flex-1 bg-slate-50 overflow-auto">
      {/* Window selector */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-2 flex items-center gap-4">
        <span className="text-xs text-slate-500 font-semibold uppercase tracking-widest">Rolling Window:</span>
        <div className="flex gap-1">
          {windows.map((w) => (
            <button key={w.window} onClick={() => setActiveWindow(w.window)}
              className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${activeWin?.window === w.window ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
              {w.window.toUpperCase()}
            </button>
          ))}
        </div>
        <span className="ml-auto text-[10px] text-slate-400">Click any cell for details · Crown = best in column</span>
      </div>

      <div className="p-6">
        {/* Legend row */}
        <div className="flex items-center gap-6 mb-4 text-xs">
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded" style={{ backgroundColor: scoreToHsl(85) }} /><span className="text-slate-500">High score (≥70)</span></div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded" style={{ backgroundColor: scoreToHsl(50) }} /><span className="text-slate-500">Mid score (40–70)</span></div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded" style={{ backgroundColor: scoreToHsl(15) }} /><span className="text-slate-500">Low score (&lt;40)</span></div>
        </div>

        {/* Grid */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
          <table className="w-full border-collapse bg-white">
            <thead>
              <tr>
                <th className="text-left px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest bg-slate-50 border-b border-slate-200 min-w-[200px]">
                  Fund
                </th>
                {DIMS.map((dim) => (
                  <th key={dim.id} className="px-4 py-4 text-center bg-slate-50 border-b border-slate-200 min-w-[120px]">
                    <span className="text-xs font-bold text-slate-700 block">{dim.label}</span>
                    <span className="text-[10px] text-slate-400 font-normal">{dim.desc}</span>
                  </th>
                ))}
                <th className="px-4 py-4 text-center bg-slate-50 border-b border-slate-200 min-w-[100px]">
                  <span className="text-xs font-bold text-slate-700 block">Overall</span>
                  <span className="text-[10px] text-slate-400 font-normal">Composite</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {scored.map((s, fi) => (
                <>
                  <tr key={s.fund.scheme_code}
                    className="border-b border-slate-100 hover:bg-slate-50/50 cursor-pointer transition-colors"
                    onClick={() => setExpandedFund(expandedFund === fi ? null : fi)}>
                    {/* Fund name */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: FUND_COLORS[fi % FUND_COLORS.length] }} />
                        <span className="text-sm font-medium text-slate-700 truncate max-w-[180px]">{shortName(s.fund.scheme_name)}</span>
                        <svg className={`w-3.5 h-3.5 text-slate-400 flex-shrink-0 transition-transform ml-auto ${expandedFund === fi ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </td>
                    {/* Metric cells */}
                    {DIMS.map((dim) => {
                      const sc = s.scores[dim.id];
                      const isWinner = winners[dim.id] === fi;
                      return (
                        <td key={dim.id} className="px-3 py-2 text-center relative"
                          onClick={(e) => { e.stopPropagation(); setTooltip(tooltip?.dimId === dim.id && tooltip?.fundIdx === fi ? null : { fundIdx: fi, dimId: dim.id }); }}>
                          <div className="rounded-lg px-3 py-2.5 mx-1 transition-transform hover:scale-105" style={{ backgroundColor: scoreToHsl(sc) }}>
                            <div className="flex items-center justify-center gap-1">
                              {isWinner && <span className="text-xs">👑</span>}
                              <span className="text-xs font-bold font-mono" style={{ color: scoreToTextColor(sc) }}>
                                {dim.format(s)}
                              </span>
                            </div>
                            <div className="text-[10px] mt-0.5" style={{ color: scoreToTextColor(sc) + 'aa' }}>
                              {sc != null ? Math.round(sc) : 'N/A'}
                            </div>
                          </div>
                        </td>
                      );
                    })}
                    {/* Overall */}
                    <td className="px-3 py-2 text-center">
                      <div className="rounded-lg px-3 py-2.5 mx-1" style={{ backgroundColor: scoreToHsl(s.overall) }}>
                        <span className="text-sm font-bold" style={{ color: scoreToTextColor(s.overall) }}>
                          {s.overall != null ? Math.round(s.overall) : 'N/A'}
                        </span>
                      </div>
                    </td>
                  </tr>
                  {/* Expanded detail row */}
                  {expandedFund === fi && (
                    <tr key={`exp_${fi}`} className="bg-slate-50 border-b border-slate-200">
                      <td colSpan={DIMS.length + 2} className="px-6 py-4">
                        <div className="grid grid-cols-3 gap-4 text-xs">
                          <div>
                            <p className="font-bold text-slate-600 mb-2">Returns</p>
                            <div className="space-y-1 text-slate-500">
                              <div className="flex justify-between"><span>Avg Alpha</span><span className="font-mono text-slate-700">{fmt2(s.raw?.raw?.returns)}</span></div>
                              <div className="flex justify-between"><span>Beat Rate</span><span className="font-mono text-slate-700">{s.raw?.raw?.consistency != null ? `${s.raw.raw.consistency.toFixed(1)}%` : 'N/A'}</span></div>
                            </div>
                          </div>
                          <div>
                            <p className="font-bold text-slate-600 mb-2">Risk</p>
                            <div className="space-y-1 text-slate-500">
                              <div className="flex justify-between"><span>Sharpe</span><span className="font-mono text-slate-700">{fmtRatio(s.raw?.raw?.risk)}</span></div>
                              <div className="flex justify-between"><span>Capture Ratio</span><span className="font-mono text-slate-700">{fmtRatio(s.raw?.raw?.capture)}</span></div>
                            </div>
                          </div>
                          <div>
                            <p className="font-bold text-slate-600 mb-2">Drawdown</p>
                            <div className="space-y-1 text-slate-500">
                              <div className="flex justify-between"><span>Max DD</span><span className="font-mono text-red-600">{s.raw?.raw?.drawdown != null ? `${s.raw.raw.drawdown.toFixed(1)}%` : 'N/A'}</span></div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HeatmapChart;
