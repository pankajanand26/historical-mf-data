/**
 * ProjectorChart — Concept 4: Goal Projector (Goal-Based)
 * Fan chart (P10/P25/P50/P75/P90) + per-fund probability of reaching target.
 */
import { useState, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Legend,
} from 'recharts';
import {
  extractReturnDist, computeGoalProjections, goalProbability, fmtLakh,
  shortName, FUND_COLORS, BENCHMARK_COLOR,
} from '../../../shared/utils/chartUtils';

const WINDOW_ORDER = ['10y', '5y', '3y', '1y'];

const ProjectorChart = ({ data, loading, error, monthlySIP, horizonYears, targetCorpus, selectedFunds, windows }) => {
  const [selectedFundIdx, setSelectedFundIdx] = useState(0);

  // Pick the best available window for the projection horizon
  const bestWindow = useMemo(() => {
    if (!data?.benchmark) return null;
    const available = (data.benchmark.windows ?? []).map((w) => w.window);
    for (const w of WINDOW_ORDER) {
      if (available.includes(w)) return w;
    }
    return available[0] ?? null;
  }, [data]);

  // Get return distribution for selected fund
  const funds = data?.funds ?? [];
  const fund = funds[selectedFundIdx] ?? null;

  const returnDists = useMemo(() => {
    if (!fund || !bestWindow) return {};
    const result = {};
    funds.forEach((f, i) => {
      const dist = extractReturnDist(data, f.scheme_code, bestWindow);
      result[f.scheme_code] = dist;
    });
    return result;
  }, [data, funds, bestWindow]);

  const projections = useMemo(() => {
    if (!fund || !returnDists[fund.scheme_code]?.length) return [];
    return computeGoalProjections(returnDists[fund.scheme_code], monthlySIP, horizonYears);
  }, [fund, returnDists, monthlySIP, horizonYears]);

  const probabilities = useMemo(() => {
    return funds.map((f) => {
      const dist = returnDists[f.scheme_code] ?? [];
      if (!dist.length) return null;
      return goalProbability(dist, monthlySIP, horizonYears * 12, targetCorpus);
    });
  }, [funds, returnDists, monthlySIP, horizonYears, targetCorpus]);

  const medianAtHorizon = projections.find((p) => p.year === horizonYears)?.p50;

  const fmtYAxis = (v) => {
    if (v >= 1e7) return `${(v / 1e7).toFixed(0)}Cr`;
    if (v >= 1e5) return `${(v / 1e5).toFixed(0)}L`;
    return `${(v / 1000).toFixed(0)}K`;
  };

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Computing projections…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex-1 flex items-center justify-center bg-slate-50">
      <div className="bg-red-50 border border-red-200 rounded-xl px-6 py-4 text-center">
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    </div>
  );

  if (!data || !funds.length) return (
    <div className="flex-1 flex items-center justify-center bg-slate-50 flex-col gap-3">
      <svg className="w-16 h-16 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
      <p className="text-slate-400 text-sm">Configure your goal and run analysis to see projections.</p>
    </div>
  );

  return (
    <div className="flex-1 overflow-auto p-6 bg-slate-50">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Fund selector tabs */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 mr-2">Showing projection for:</span>
          {funds.map((f, i) => (
            <button key={f.scheme_code} onClick={() => setSelectedFundIdx(i)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${selectedFundIdx === i ? 'text-white' : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'}`}
              style={selectedFundIdx === i ? { backgroundColor: FUND_COLORS[i] } : {}}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedFundIdx === i ? '#fff' : FUND_COLORS[i] }} />
              {shortName(f.scheme_name, 25)}
            </button>
          ))}
        </div>

        {/* Fan chart */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {horizonYears}-Year SIP Projection
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                ₹{monthlySIP.toLocaleString('en-IN')}/month · Based on {bestWindow?.toUpperCase()} rolling return distribution
              </p>
            </div>
            {medianAtHorizon && (
              <div className="text-right">
                <p className="text-xs text-slate-400">Median outcome</p>
                <p className="text-xl font-bold text-emerald-600">{fmtLakh(medianAtHorizon)}</p>
              </div>
            )}
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={projections} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
              <defs>
                <linearGradient id="fillP90" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.07} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="fillP75" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="fillP25" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.08} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" />
              <XAxis dataKey="year" tickFormatter={(v) => `Y${v}`} tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis tickFormatter={fmtYAxis} tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <Tooltip
                formatter={(v, name) => [fmtLakh(v), name]}
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 11 }} />
              {/* Target line */}
              {targetCorpus > 0 && (
                <ReferenceLine y={targetCorpus} stroke="#ef4444" strokeDasharray="6 3" strokeWidth={1.5}
                  label={{ value: `Target: ${fmtLakh(targetCorpus)}`, position: 'insideTopRight', fill: '#ef4444', fontSize: 10 }} />
              )}
              {/* Invested capital */}
              <Area type="monotone" dataKey="invested" stroke="#94a3b8" strokeWidth={1} fill="none" strokeDasharray="4 2" name="Invested" dot={false} />
              {/* Fan bands */}
              <Area type="monotone" dataKey="p90" stroke="#10b981" strokeWidth={1} fill="url(#fillP90)" name="P90 (Best)" dot={false} strokeDasharray="4 2" />
              <Area type="monotone" dataKey="p75" stroke="#10b981" strokeWidth={1.5} fill="url(#fillP75)" name="P75" dot={false} />
              <Area type="monotone" dataKey="p50" stroke="#10b981" strokeWidth={2.5} fill="none" name="Median" dot={false} />
              <Area type="monotone" dataKey="p25" stroke="#f59e0b" strokeWidth={1.5} fill="url(#fillP25)" name="P25" dot={false} />
              <Area type="monotone" dataKey="p10" stroke="#ef4444" strokeWidth={1} fill="none" name="P10 (Worst)" dot={false} strokeDasharray="4 2" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-6 mt-3 justify-center flex-wrap text-[10px] text-slate-400">
            <div className="flex items-center gap-1"><span className="w-4 h-px bg-emerald-500 inline-block" style={{height:2}} /> P90 (top 10%)</div>
            <div className="flex items-center gap-1"><span className="w-4 h-px bg-emerald-500 inline-block" style={{height:2.5}} /> Median (P50)</div>
            <div className="flex items-center gap-1"><span className="w-4 h-px bg-amber-500 inline-block" style={{height:2}} /> P25</div>
            <div className="flex items-center gap-1"><span className="w-4 h-px bg-red-400 inline-block" style={{height:2}} /> P10 (bottom 10%)</div>
            <div className="flex items-center gap-1"><span className="w-4 border-t border-slate-400 inline-block" style={{borderStyle:'dashed',width:16}} /> Invested Capital</div>
          </div>
        </div>

        {/* Probability comparison table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800">Goal Probability Comparison</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Probability of reaching {fmtLakh(targetCorpus)} with ₹{monthlySIP.toLocaleString('en-IN')}/month over {horizonYears} years
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {funds.map((f, i) => {
              const prob = probabilities[i];
              const probPct = prob != null ? Math.round(prob) : null;
              return (
                <div key={f.scheme_code} className="flex items-center gap-4 px-6 py-4">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: FUND_COLORS[i] }} />
                  <span className="flex-1 text-sm text-slate-700 truncate">{shortName(f.scheme_name, 40)}</span>
                  {/* Progress bar */}
                  <div className="w-48 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${probPct ?? 0}%`,
                        backgroundColor: probPct >= 70 ? '#10b981' : probPct >= 40 ? '#f59e0b' : '#ef4444',
                      }} />
                  </div>
                  <span className={`text-base font-bold w-16 text-right ${probPct >= 70 ? 'text-emerald-600' : probPct >= 40 ? 'text-amber-500' : 'text-red-500'}`}>
                    {probPct != null ? `${probPct}%` : 'N/A'}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-100">
            <p className="text-[10px] text-slate-400">
              Based on historical {bestWindow?.toUpperCase()} rolling return distribution. Past performance does not guarantee future results.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectorChart;
