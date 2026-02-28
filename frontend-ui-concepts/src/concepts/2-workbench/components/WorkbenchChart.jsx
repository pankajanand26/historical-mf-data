/**
 * WorkbenchChart — Concept 2: Analyst Workbench (DIY)
 * Progressive disclosure: score gauges first, full metrics on expand.
 */
import { useState, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  buildChartData, computeAllStats, computeFundScores, scoreGrade,
  fmt2, fmtRatio, shortName, tickFormatter, FUND_COLORS, BENCHMARK_COLOR,
} from '../../../shared/utils/chartUtils';

// ── Circular gauge ─────────────────────────────────────────────────────────────
const Gauge = ({ score, label }) => {
  const r = 22; const cx = 28; const cy = 28;
  const circ = 2 * Math.PI * r;
  const valid = score != null && !isNaN(score);
  const pct = valid ? Math.max(0, Math.min(100, score)) : 0;
  const offset = circ - (pct / 100) * circ;
  const { grade, color } = scoreGrade(valid ? score : null);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="56" height="56">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e293b" strokeWidth="5" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`} />
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize="11" fontWeight="bold" fill={color}>
          {grade}
        </text>
      </svg>
      <span className="text-[10px] text-slate-400 text-center leading-tight">{label}</span>
    </div>
  );
};

// ── Score card per fund ────────────────────────────────────────────────────────
const FundScoreCard = ({ scored, idx, expanded, onToggle }) => {
  const { fund, color, scores, overall, raw } = scored;
  const { grade, color: overallColor } = scoreGrade(overall);
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      {/* Card header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-700">
        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <span className="flex-1 text-sm font-semibold text-slate-100 truncate">{shortName(fund.scheme_name)}</span>
        {/* Overall grade pill */}
        <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: overallColor + '22', color: overallColor, border: `1px solid ${overallColor}44` }}>
          {grade} · {overall != null ? Math.round(overall) : 'N/A'}
        </span>
        <button onClick={onToggle} className="text-slate-500 hover:text-slate-300 transition-colors ml-2">
          <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
      {/* Gauge row */}
      <div className="flex justify-around px-4 py-5">
        <Gauge score={scores.returns}     label="Returns" />
        <Gauge score={scores.risk}        label="Risk Adj." />
        <Gauge score={scores.consistency} label="Consistency" />
        <Gauge score={scores.capture}     label="Capture" />
        <Gauge score={scores.drawdown}    label="Drawdown" />
      </div>
      {/* Expanded metrics */}
      {expanded && (
        <div className="border-t border-slate-700 px-5 py-4 grid grid-cols-2 gap-x-8 gap-y-3 text-xs">
          <div className="flex justify-between"><span className="text-slate-400">Avg Alpha</span><span className="text-slate-100 font-mono">{fmt2(raw.raw.returns)}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Sharpe</span><span className="text-slate-100 font-mono">{fmtRatio(raw.raw.risk)}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Beat Rate</span><span className="text-slate-100 font-mono">{raw.raw.consistency != null ? `${raw.raw.consistency.toFixed(1)}%` : 'N/A'}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Capture Ratio</span><span className="text-slate-100 font-mono">{fmtRatio(raw.raw.capture)}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Max Drawdown</span><span className="text-slate-100 font-mono">{raw.raw.drawdown != null ? `${raw.raw.drawdown.toFixed(1)}%` : 'N/A'}</span></div>
        </div>
      )}
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────
const WorkbenchChart = ({ data, analyticsData, loading, error }) => {
  const [activeTab, setActiveTab] = useState('summary');
  const [expanded, setExpanded] = useState({});
  const [activeWindow, setActiveWindow] = useState(null);

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

  const toggleExpand = (code) => setExpanded((prev) => ({ ...prev, [code]: !prev[code] }));

  const TABS = [
    { id: 'summary', label: 'Summary' },
    { id: 'returns', label: 'Returns' },
    { id: 'risk', label: 'Risk' },
    { id: 'capture', label: 'Capture' },
    { id: 'drawdown', label: 'Drawdown' },
  ];

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Running analysis…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="bg-red-900/20 border border-red-700 rounded-xl px-6 py-4 max-w-md text-center">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    </div>
  );

  if (!data) return (
    <div className="flex-1 flex items-center justify-center flex-col gap-3">
      <svg className="w-16 h-16 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
      <p className="text-slate-500 text-sm">Select funds and run analysis to see the workbench.</p>
    </div>
  );

  const windows = data.benchmark?.windows ?? [];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Tab bar + window selector */}
      <div className="flex items-center gap-6 px-6 border-b border-slate-700 bg-slate-900/50">
        <div className="flex">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-4 py-3 text-xs font-semibold transition-colors border-b-2 -mb-px ${activeTab === t.id ? 'text-indigo-400 border-indigo-500' : 'text-slate-500 border-transparent hover:text-slate-300'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1">
          {windows.map((w) => (
            <button key={w.window} onClick={() => setActiveWindow(w.window)}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${activeWin?.window === w.window ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
              {w.window.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {/* ── Summary Tab ── */}
        {activeTab === 'summary' && (
          <div className="space-y-4 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-slate-300">Fund Scores — {activeWin?.window?.toUpperCase()} Rolling Returns</h2>
              <p className="text-[10px] text-slate-500">Scores are relative within this comparison set · 0–100</p>
            </div>
            {scored.map((s, i) => (
              <FundScoreCard key={s.fund.scheme_code} scored={s} idx={i}
                expanded={!!expanded[s.fund.scheme_code]}
                onToggle={() => toggleExpand(s.fund.scheme_code)} />
            ))}
          </div>
        )}

        {/* ── Returns Tab ── */}
        {activeTab === 'returns' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Rolling Returns — {activeWin?.window?.toUpperCase()} CAGR</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <defs>
                    {allStats.map((s, i) => (
                      <linearGradient key={s.fund.scheme_code} id={`fill_${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={FUND_COLORS[i]} stopOpacity={0.15} />
                        <stop offset="95%" stopColor={FUND_COLORS[i]} stopOpacity={0.01} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={tickFormatter} tick={{ fill: '#64748b', fontSize: 10 }} />
                  <YAxis tickFormatter={(v) => `${v.toFixed(0)}%`} tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Tooltip formatter={(v, name) => [`${v?.toFixed(2)}%`, name]} contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', fontSize: 11 }} />
                  <Area type="monotone" dataKey="benchmark" stroke={BENCHMARK_COLOR} strokeWidth={1.5} fill="none" strokeDasharray="5 3" dot={false} name="Benchmark" />
                  {allStats.map((s, i) => (
                    <Area key={s.fund.scheme_code} type="monotone" dataKey={`fund_${s.fund.scheme_code}`}
                      stroke={FUND_COLORS[i]} strokeWidth={2} fill={`url(#fill_${i})`} dot={false}
                      name={shortName(s.fund.scheme_name, 30)} />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {/* Outperformance table */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-700">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Outperformance vs Benchmark</h3>
              </div>
              <table className="w-full text-xs">
                <thead><tr className="text-slate-500 text-[10px] uppercase tracking-wider">
                  <th className="text-left px-5 py-2">Fund</th>
                  <th className="text-right px-4 py-2">Beat Rate</th>
                  <th className="text-right px-4 py-2">Under Rate</th>
                  <th className="text-right px-4 py-2">Avg Alpha</th>
                  <th className="text-right px-4 py-2">Observations</th>
                </tr></thead>
                <tbody>
                  {allStats.map((s, i) => (
                    <tr key={s.fund.scheme_code} className="border-t border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                      <td className="px-5 py-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: FUND_COLORS[i] }} />
                        {shortName(s.fund.scheme_name, 35)}
                      </td>
                      <td className="px-4 py-2 text-right text-green-400">{s.outperf.outperformedPct?.toFixed(1)}%</td>
                      <td className="px-4 py-2 text-right text-red-400">{s.outperf.underperformedPct?.toFixed(1)}%</td>
                      <td className={`px-4 py-2 text-right font-mono ${s.outperf.avgAlpha >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmt2(s.outperf.avgAlpha)}</td>
                      <td className="px-4 py-2 text-right text-slate-400">{s.outperf.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Risk Tab ── */}
        {activeTab === 'risk' && (
          <div className="max-w-5xl mx-auto space-y-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-700">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Risk-Adjusted Metrics</h3>
              </div>
              <table className="w-full text-xs">
                <thead><tr className="text-slate-500 text-[10px] uppercase tracking-wider">
                  <th className="text-left px-5 py-2">Fund</th>
                  <th className="text-right px-4 py-2">Std Dev</th>
                  <th className="text-right px-4 py-2">Beta</th>
                  <th className="text-right px-4 py-2">Sharpe</th>
                  <th className="text-right px-4 py-2">Sortino</th>
                  <th className="text-right px-4 py-2">Track Err</th>
                  <th className="text-right px-4 py-2">Info Ratio</th>
                </tr></thead>
                <tbody>
                  {allStats.map((s, i) => (
                    <tr key={s.fund.scheme_code} className="border-t border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                      <td className="px-5 py-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: FUND_COLORS[i] }} />
                        {shortName(s.fund.scheme_name, 30)}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-slate-300">{fmt2(s.vol.stdDevFund)}</td>
                      <td className="px-4 py-2 text-right font-mono text-slate-300">{fmtRatio(s.vol.beta)}</td>
                      <td className={`px-4 py-2 text-right font-mono ${(s.vol.sharpeFund ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmtRatio(s.vol.sharpeFund)}</td>
                      <td className={`px-4 py-2 text-right font-mono ${(s.vol.sortinoFund ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmtRatio(s.vol.sortinoFund)}</td>
                      <td className="px-4 py-2 text-right font-mono text-slate-300">{fmt2(s.vol.trackingError)}</td>
                      <td className={`px-4 py-2 text-right font-mono ${(s.vol.infoRatio ?? 0) >= 0 ? 'text-indigo-400' : 'text-red-400'}`}>{fmtRatio(s.vol.infoRatio)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Capture Tab ── */}
        {activeTab === 'capture' && (
          <div className="max-w-5xl mx-auto space-y-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-700">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Market Capture Ratios</h3>
              </div>
              <table className="w-full text-xs">
                <thead><tr className="text-slate-500 text-[10px] uppercase tracking-wider">
                  <th className="text-left px-5 py-2">Fund</th>
                  <th className="text-right px-4 py-2">UCR</th>
                  <th className="text-right px-4 py-2">DCR</th>
                  <th className="text-right px-4 py-2">Ratio (UCR/DCR)</th>
                  <th className="text-right px-4 py-2">Up Periods</th>
                  <th className="text-right px-4 py-2">Down Periods</th>
                  <th className="text-right px-4 py-2">Down Alpha</th>
                </tr></thead>
                <tbody>
                  {allStats.map((s, i) => (
                    <tr key={s.fund.scheme_code} className="border-t border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                      <td className="px-5 py-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: FUND_COLORS[i] }} />
                        {shortName(s.fund.scheme_name, 30)}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-slate-300">{fmtRatio(s.capture.ucr)}</td>
                      <td className="px-4 py-2 text-right font-mono text-slate-300">{fmtRatio(s.capture.dcr)}</td>
                      <td className={`px-4 py-2 text-right font-mono font-bold ${(s.capture.captureRatio ?? 0) >= 1 ? 'text-green-400' : 'text-red-400'}`}>{fmtRatio(s.capture.captureRatio)}</td>
                      <td className="px-4 py-2 text-right text-slate-400">{s.capture.upPeriods}</td>
                      <td className="px-4 py-2 text-right text-slate-400">{s.capture.downPeriods}</td>
                      <td className={`px-4 py-2 text-right font-mono ${(s.capture.downAlpha ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmt2(s.capture.downAlpha)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Drawdown Tab ── */}
        {activeTab === 'drawdown' && (
          <div className="max-w-5xl mx-auto space-y-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-700">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Drawdown Profile</h3>
              </div>
              {analyticsData?.funds?.length ? (
                <table className="w-full text-xs">
                  <thead><tr className="text-slate-500 text-[10px] uppercase tracking-wider">
                    <th className="text-left px-5 py-2">Fund</th>
                    <th className="text-right px-4 py-2">Max DD</th>
                    <th className="text-right px-4 py-2">Peak Date</th>
                    <th className="text-right px-4 py-2">Trough Date</th>
                    <th className="text-right px-4 py-2">Duration (days)</th>
                    <th className="text-right px-4 py-2">Recovery</th>
                  </tr></thead>
                  <tbody>
                    {analyticsData.funds.map((f, i) => (
                      <tr key={f.scheme_code} className="border-t border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                        <td className="px-5 py-2 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: FUND_COLORS[i % FUND_COLORS.length] }} />
                          {shortName(f.scheme_name, 30)}
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-red-400">{fmt2(f.drawdown?.max_drawdown)}</td>
                        <td className="px-4 py-2 text-right text-slate-400">{f.drawdown?.peak_date ?? 'N/A'}</td>
                        <td className="px-4 py-2 text-right text-slate-400">{f.drawdown?.trough_date ?? 'N/A'}</td>
                        <td className="px-4 py-2 text-right text-slate-400">{f.drawdown?.duration_days ?? 'N/A'}</td>
                        <td className="px-4 py-2 text-right text-slate-400">{f.drawdown?.recovery_date ?? 'Recovering'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="text-slate-500 text-xs px-5 py-4">Drawdown data not available.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkbenchChart;
