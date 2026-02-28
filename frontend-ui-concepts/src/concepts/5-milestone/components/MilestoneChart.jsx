/**
 * MilestoneChart — Concept 5: Milestone Tracker (Goal-Based)
 * Timeline view + hit-rate matrix per fund per milestone.
 */
import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import {
  extractReturnDist, sipFV, requiredAnnualReturn, milestoneHitRate, computeGoalProjections,
  fmtLakh, shortName, FUND_COLORS,
} from '../../../shared/utils/chartUtils';

const WINDOW_ORDER = ['10y', '5y', '3y', '1y'];

const hitColor = (rate) => {
  if (rate == null) return { bg: '#f8fafc', text: '#94a3b8', border: '#e2e8f0' };
  if (rate >= 70) return { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' };
  if (rate >= 40) return { bg: '#fffbeb', text: '#d97706', border: '#fde68a' };
  return { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' };
};

const MilestoneChart = ({ data, loading, error, milestones, monthlySIP, selectedFunds, windows }) => {
  const funds = data?.funds ?? [];

  const bestWindow = useMemo(() => {
    if (!data?.benchmark) return null;
    const available = (data.benchmark.windows ?? []).map((w) => w.window);
    for (const w of WINDOW_ORDER) {
      if (available.includes(w)) return w;
    }
    return available[0] ?? null;
  }, [data]);

  const returnDists = useMemo(() => {
    if (!funds.length || !bestWindow) return {};
    const result = {};
    funds.forEach((f) => {
      result[f.scheme_code] = extractReturnDist(data, f.scheme_code, bestWindow);
    });
    return result;
  }, [data, funds, bestWindow]);

  // Hit rates: funds × milestones
  const hitRates = useMemo(() => {
    return funds.map((f) => {
      const dist = returnDists[f.scheme_code] ?? [];
      return milestones.map((m) => {
        if (!dist.length) return null;
        const req = requiredAnnualReturn(monthlySIP, m.years * 12, m.target);
        return milestoneHitRate(dist, req);
      });
    });
  }, [funds, returnDists, milestones, monthlySIP]);

  // Growth curve for chart (using median of each fund's distribution)
  const maxYears = Math.max(...milestones.map((m) => m.years), 1);
  const growthCurves = useMemo(() => {
    if (!funds.length) return [];
    return funds.map((f) => {
      const dist = returnDists[f.scheme_code] ?? [];
      const projs = computeGoalProjections(dist, monthlySIP, maxYears);
      return { fund: f, projs };
    });
  }, [funds, returnDists, monthlySIP, maxYears]);

  // Build chart data (years 0..maxYears, p50 per fund)
  const chartData = useMemo(() => {
    if (!growthCurves.length) return [];
    const years = Array.from({ length: maxYears + 1 }, (_, i) => i);
    return years.map((y) => {
      const row = { year: y };
      growthCurves.forEach((gc) => {
        const pt = gc.projs.find((p) => p.year === y);
        row[`fund_${gc.fund.scheme_code}`] = pt?.p50 ?? null;
        row.invested = pt?.invested ?? null;
      });
      return row;
    });
  }, [growthCurves, maxYears]);

  const fmtYAxis = (v) => {
    if (v >= 1e7) return `${(v / 1e7).toFixed(1)}Cr`;
    if (v >= 1e5) return `${(v / 1e5).toFixed(0)}L`;
    return `${(v / 1000).toFixed(0)}K`;
  };

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-slate-50">
      <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
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
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21h18M3 10h18M3 7l9-4 9 4M4 10h1v11H4zM11 10h2v11h-2zM19 10h1v11h-1z" />
      </svg>
      <p className="text-slate-400 text-sm">Configure milestones and run analysis to see tracking.</p>
    </div>
  );

  return (
    <div className="flex-1 overflow-auto bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Growth curve chart */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="mb-4">
            <h3 className="font-bold text-slate-800">Projected Portfolio Growth (Median)</h3>
            <p className="text-xs text-slate-400 mt-0.5">₹{monthlySIP.toLocaleString('en-IN')}/month · Median P50 based on {bestWindow?.toUpperCase()} rolling returns</p>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
              <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" />
              <XAxis dataKey="year" tickFormatter={(v) => `Y${v}`} tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis tickFormatter={fmtYAxis} tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <Tooltip formatter={(v, name) => [fmtLakh(v), name]}
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 11 }} />
              {/* Milestone target lines */}
              {milestones.map((m) => (
                <ReferenceLine key={m.id} y={m.target} stroke="#f59e0b" strokeDasharray="4 3" strokeWidth={1}
                  label={{ value: m.name, position: 'insideTopRight', fill: '#d97706', fontSize: 9 }} />
              ))}
              {/* Milestone year vertical lines */}
              {milestones.map((m) => (
                <ReferenceLine key={`v_${m.id}`} x={m.years} stroke="#94a3b8" strokeDasharray="3 3" strokeWidth={1} />
              ))}
              {/* Fund lines */}
              {funds.map((f, i) => (
                <Line key={f.scheme_code} type="monotone" dataKey={`fund_${f.scheme_code}`}
                  stroke={FUND_COLORS[i]} strokeWidth={2} dot={false} name={shortName(f.scheme_name, 25)} />
              ))}
              <Line type="monotone" dataKey="invested" stroke="#94a3b8" strokeWidth={1} strokeDasharray="4 2" dot={false} name="Invested" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Hit-rate matrix */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800">Milestone Hit Rate Matrix</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              % of historical {bestWindow?.toUpperCase()} rolling windows that would have met each milestone
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 bg-slate-50 min-w-[180px]">Fund</th>
                  {milestones.map((m) => (
                    <th key={m.id} className="px-4 py-3 text-center bg-slate-50 min-w-[130px]">
                      <span className="text-xs font-bold text-slate-700 block">{m.name}</span>
                      <span className="text-[10px] text-slate-400">{m.years}Y · {fmtLakh(m.target)}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {funds.map((f, fi) => (
                  <tr key={f.scheme_code} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: FUND_COLORS[fi] }} />
                        <span className="text-sm text-slate-700 truncate max-w-[160px]">{shortName(f.scheme_name)}</span>
                      </div>
                    </td>
                    {milestones.map((m, mi) => {
                      const rate = hitRates[fi]?.[mi];
                      const pct = rate != null ? Math.round(rate) : null;
                      const { bg, text, border } = hitColor(rate);
                      return (
                        <td key={m.id} className="px-4 py-3 text-center">
                          <div className="inline-flex flex-col items-center gap-1 px-4 py-2 rounded-xl border"
                            style={{ backgroundColor: bg, borderColor: border }}>
                            <span className="text-base font-bold" style={{ color: text }}>
                              {pct != null ? `${pct}%` : 'N/A'}
                            </span>
                            <span className="text-[10px]" style={{ color: text + 'bb' }}>
                              {pct != null ? (pct >= 70 ? 'Likely' : pct >= 40 ? 'Possible' : 'At Risk') : '—'}
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center gap-6 text-[10px] text-slate-400">
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> ≥70% Likely</div>
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> 40–70% Possible</div>
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> &lt;40% At Risk</div>
            <span className="ml-auto">Based on historical data only. Not financial advice.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MilestoneChart;
