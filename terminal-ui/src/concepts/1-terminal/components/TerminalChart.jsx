import { useState, useMemo } from 'react';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter, ReferenceLine, ReferenceArea, BarChart, Bar, Cell,
} from 'recharts';
import {
  FUND_COLORS, BENCHMARK_COLOR, WINDOWS,
  fmt2, fmt1, fmtRatio, fmtLakh, shortName, shortNameMd, tickFormatter,
  buildChartData, computeAllStats, rfPeriodPct, computeFreefincalCaptureStats,
  computeFundScores, scoreGrade, scoreColor, extractReturnDist, computeGoalProjections, goalProbability,
  computeKPIs,
  requiredMonthlySIP, computeReverseSipScenarios, sipSensitivity,
  computeRetirementCorpus, runRetirementMonteCarlo, findSafeWithdrawalRate,
} from '../../../shared/utils/chartUtils';

// ── Dark theme chart styles ────────────────────────────────────────────────────
const GRID = '#30363d';
const TICK_STYLE = { fontSize: 11, fill: '#8b949e' };
const TICK_SM = { fontSize: 11, fill: '#8b949e' };
const TOOLTIP_STYLE = { backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: 6, fontSize: 12 };

const SECTIONS = [
  { id: 'returns', label: '01 RETURNS' },
  { id: 'risk', label: '02 RISK' },
  { id: 'capture', label: '03 CAPTURE' },
  { id: 'drawdown', label: '04 DRAWDOWN' },
  { id: 'scorecard', label: '05 SCORE' },
  { id: 'dist', label: '06 DIST' },
  { id: 'sip', label: '07 SIP' },
  { id: 'monthly', label: '08 MONTHLY' },
  { id: 'reverse-sip', label: '09 REV SIP' },
  { id: 'retirement', label: '10 RETIRE' },
  { id: 'lumpsum-sip', label: '11 L vs SIP' },
  { id: 'entry-heatmap', label: '12 ENTRY' },
  { id: 'ter-impact', label: '13 TER' },
  { id: 'ranking', label: '14 RANK' },
];

// ── Shared table primitives ────────────────────────────────────────────────────
const Th = ({ children, right }) => (
  <th className={`px-3 py-1.5 text-[9px] font-semibold uppercase tracking-widest text-terminal-muted border-b border-terminal-border ${right ? 'text-right' : 'text-left'}`}>{children}</th>
);
const Td = ({ children, right, accent }) => (
  <td className={`px-3 py-2 text-xs tabular-mono border-b border-terminal-border/40 ${right ? 'text-right' : ''} ${accent ?? 'text-terminal-text'}`}>{children}</td>
);

const colorCls = (v) => {
  if (v == null || isNaN(v)) return 'text-terminal-muted';
  return v >= 0 ? 'text-terminal-green' : 'text-terminal-red';
};

const FundDot = ({ color, name }) => (
  <div className="flex items-center gap-1.5 min-w-0">
    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
    <span className="text-terminal-text text-xs truncate">{shortName(name)}</span>
  </div>
);

const SectionLabel = ({ children }) => (
  <p className="text-[10px] text-terminal-muted uppercase tracking-widest mb-2 flex items-center gap-2">
    <span className="flex-1 h-px bg-terminal-border/50" />
    {children}
    <span className="flex-1 h-px bg-terminal-border/50" />
  </p>
);

// ── Returns section ────────────────────────────────────────────────────────────
const ReturnsSection = ({ data, rfRate, activeWindow, setActiveWindow }) => {
  const [returnType, setReturnType] = useState('absolute');
  const avail = useMemo(() => data?.benchmark_windows?.map((bw) => bw.window) ?? [], [data]);
  const curWin = avail.includes(activeWindow) ? activeWindow : (avail[0] ?? '3y');
  const benchWin = data?.benchmark_windows?.find((bw) => bw.window === curWin);
  const rfPct = rfPeriodPct(rfRate, benchWin?.window_days ?? 365, returnType);
  const chartData = useMemo(() => buildChartData(data?.funds ?? [], benchWin, returnType), [data, benchWin, returnType]);
  const allStats = useMemo(() => computeAllStats(data?.funds ?? [], chartData, rfPct), [data, chartData, rfPct]);

  return (
    <div className="space-y-4">
      {/* Controls row */}
      <div className="flex items-center gap-3">
        <div className="flex gap-1">
          {avail.map((w) => (
            <button key={w} onClick={() => setActiveWindow(w)}
              className={`px-2.5 py-1 text-xs font-mono rounded transition-colors ${curWin === w ? 'bg-terminal-amber text-terminal-bg font-bold' : 'text-terminal-muted border border-terminal-border hover:border-terminal-amber'}`}>
              {WINDOWS.find((x) => x.id === w)?.label ?? w.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-1">
          {['absolute', 'cagr'].map((rt) => (
            <button key={rt} onClick={() => setReturnType(rt)}
              className={`px-2.5 py-1 text-xs font-mono rounded transition-colors ${returnType === rt ? 'bg-terminal-surface border border-terminal-amber text-terminal-amber' : 'text-terminal-muted border border-terminal-border hover:border-terminal-amber'}`}>
              {rt.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Chart + outperformance table side-by-side on XL */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5 items-start">
        <div className="xl:col-span-3">
          <ResponsiveContainer width="100%" height={380}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 12 }}>
              <defs>
                <linearGradient id="benchGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={BENCHMARK_COLOR} stopOpacity={0.12} />
                  <stop offset="95%" stopColor={BENCHMARK_COLOR} stopOpacity={0.01} />
                </linearGradient>
                {(data?.funds ?? []).map((f, i) => (
                  <linearGradient key={f.scheme_code} id={`fGrad-${f.scheme_code}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={FUND_COLORS[i % FUND_COLORS.length]} stopOpacity={0.12} />
                    <stop offset="95%" stopColor={FUND_COLORS[i % FUND_COLORS.length]} stopOpacity={0.01} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke={GRID} />
              <XAxis dataKey="date" tickFormatter={tickFormatter} tick={TICK_STYLE} tickLine={false} axisLine={{ stroke: GRID }} />
              <YAxis tickFormatter={(v) => `${v.toFixed(1)}%`} tick={TICK_STYLE} tickLine={false} axisLine={false} width={42} />
              <Tooltip formatter={(v) => fmt2(v)} contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#8b949e' }} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#8b949e' }} />
              <ReferenceLine y={0} stroke={GRID} strokeDasharray="4 2" />
              <Area type="monotone" dataKey="benchmark" name={data?.benchmark_name ?? 'Benchmark'} stroke={BENCHMARK_COLOR} fill="url(#benchGrad)" dot={false} strokeWidth={2} />
              {(data?.funds ?? []).map((f, i) => (
                <Area key={f.scheme_code} type="monotone" dataKey={`fund_${f.scheme_code}`} name={f.scheme_name} stroke={FUND_COLORS[i % FUND_COLORS.length]} fill={`url(#fGrad-${f.scheme_code})`} dot={false} strokeWidth={2} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="xl:col-span-2">
          <p className="text-[10px] text-terminal-muted uppercase tracking-widest mb-2 mt-1">Outperformance</p>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <Th>Fund</Th>
                  <Th right>Periods</Th>
                  <Th right>Out%</Th>
                  <Th right>Under%</Th>
                  <Th right>Avg α</Th>
                </tr>
              </thead>
              <tbody>
                {allStats.map(({ fund, color, outperf }) => (
                  <tr key={fund.scheme_code} className="hover:bg-terminal-surface/60">
                    <Td><FundDot color={color} name={fund.scheme_name} /></Td>
                    <Td right>{outperf.total}</Td>
                    <Td right accent="text-terminal-green">{fmt1(outperf.outperformedPct)}</Td>
                    <Td right accent="text-terminal-red">{fmt1(outperf.underperformedPct)}</Td>
                    <Td right accent={colorCls(outperf.avgAlpha)}>{fmt2(outperf.avgAlpha)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Risk section ───────────────────────────────────────────────────────────────
const RiskSection = ({ data, rfRate, activeWindow }) => {
  const avail = useMemo(() => data?.benchmark_windows?.map((bw) => bw.window) ?? [], [data]);
  const curWin = avail.includes(activeWindow) ? activeWindow : (avail[0] ?? '3y');
  const benchWin = data?.benchmark_windows?.find((bw) => bw.window === curWin);
  const rfPct = rfPeriodPct(rfRate, benchWin?.window_days ?? 365, 'absolute');
  const chartData = useMemo(() => buildChartData(data?.funds ?? [], benchWin, 'absolute'), [data, benchWin]);
  const allStats = useMemo(() => computeAllStats(data?.funds ?? [], chartData, rfPct), [data, chartData, rfPct]);

  // Get benchmark stats from the first fund's vol computation (they all use the same benchmark data)
  const benchStats = allStats.length > 0 ? allStats[0].vol : null;
  const scatterAll = allStats.map(({ fund, color, vol }) => ({ name: fund.scheme_name, color, x: vol.stdDevFund, y: vol.meanFund })).filter((d) => !isNaN(d.x) && !isNaN(d.y));

  return (
    <div className="space-y-4">

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div>
          <SectionLabel>Volatility · Beta · Tracking Error</SectionLabel>
          <table className="w-full">
            <thead><tr><Th>Fund</Th><Th right>Std Dev</Th><Th right>Beta</Th><Th right>TE</Th><Th right>IR</Th></tr></thead>
            <tbody>
              {/* Benchmark row */}
              {benchStats && (
                <tr className="bg-terminal-surface/40">
                  <Td><FundDot color={BENCHMARK_COLOR} name={data?.benchmark_name ?? 'Benchmark'} /></Td>
                  <Td right>{fmtRatio(benchStats.stdDevBench)}</Td>
                  <Td right>1.00</Td>
                  <Td right>0.00</Td>
                  <Td right accent="text-terminal-muted">—</Td>
                </tr>
              )}
              {allStats.map(({ fund, color, vol }) => (
                <tr key={fund.scheme_code} className="hover:bg-terminal-surface/60">
                  <Td><FundDot color={color} name={fund.scheme_name} /></Td>
                  <Td right>{fmtRatio(vol.stdDevFund)}</Td>
                  <Td right>{fmtRatio(vol.beta)}</Td>
                  <Td right>{fmtRatio(vol.trackingError)}</Td>
                  <Td right accent={colorCls(vol.infoRatio)}>{fmtRatio(vol.infoRatio)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <SectionLabel>Sharpe · Sortino</SectionLabel>
          <table className="w-full">
            <thead><tr><Th>Fund</Th><Th right>Sharpe</Th><Th right>Sortino</Th></tr></thead>
            <tbody>
              {/* Benchmark row */}
              {benchStats && (
                <tr className="bg-terminal-surface/40">
                  <Td><FundDot color={BENCHMARK_COLOR} name={data?.benchmark_name ?? 'Benchmark'} /></Td>
                  <Td right accent={colorCls(benchStats.sharpeBench)}>{fmtRatio(benchStats.sharpeBench)}</Td>
                  <Td right accent={colorCls(benchStats.sortinoBench)}>{fmtRatio(benchStats.sortinoBench)}</Td>
                </tr>
              )}
              {allStats.map(({ fund, color, vol }) => (
                <tr key={fund.scheme_code} className="hover:bg-terminal-surface/60">
                  <Td><FundDot color={color} name={fund.scheme_name} /></Td>
                  <Td right accent={colorCls(vol.sharpeFund)}>{fmtRatio(vol.sharpeFund)}</Td>
                  <Td right accent={colorCls(vol.sortinoFund)}>{fmtRatio(vol.sortinoFund)}</Td>
                </tr>
              ))}
            </tbody>
          </table>

          <SectionLabel>Risk vs Return</SectionLabel>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 5, right: 10, bottom: 20, left: 12 }}>
              <CartesianGrid strokeDasharray="2 4" stroke={GRID} />
              <XAxis type="number" dataKey="x" tickFormatter={(v) => `${v.toFixed(1)}`} tick={TICK_STYLE} label={{ value: 'Std Dev', position: 'insideBottom', offset: -10, fontSize: 11, fill: '#8b949e' }} />
              <YAxis type="number" dataKey="y" tickFormatter={(v) => `${v.toFixed(1)}`} tick={TICK_STYLE} tickLine={false} axisLine={false} width={38} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => fmt2(v)} />
              {scatterAll.map((d, i) => <Scatter key={i} name={d.name} data={[d]} fill={d.color} />)}
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// ── Capture section ────────────────────────────────────────────────────────────
const CaptureSection = ({ data, rfRate, activeWindow }) => {
  const avail = useMemo(() => data?.benchmark_windows?.map((bw) => bw.window) ?? [], [data]);
  const curWin = avail.includes(activeWindow) ? activeWindow : (avail[0] ?? '3y');
  const benchWin = data?.benchmark_windows?.find((bw) => bw.window === curWin);
  const rfPct = rfPeriodPct(rfRate, benchWin?.window_days ?? 365, 'absolute');
  const chartData = useMemo(() => buildChartData(data?.funds ?? [], benchWin, 'absolute'), [data, benchWin]);
  const allStats = useMemo(() => computeAllStats(data?.funds ?? [], chartData, rfPct), [data, chartData, rfPct]);

  return (
    <div className="space-y-5">

      {/* ── Upside / Downside Capture (monthly CAGR method) ───────── */}
      <SectionLabel>Upside / Downside Capture</SectionLabel>
      <p className="text-[10px] text-terminal-muted -mt-3">
        Monthly CAGR method · non-overlapping month-end NAV returns · window-independent
      </p>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <Th>Fund</Th>
              <Th right>UCR</Th>
              <Th right>DCR</Th>
              <Th right>Ratio</Th>
              <Th right>Up Mo.</Th>
              <Th right>Dn Mo.</Th>
            </tr>
          </thead>
          <tbody>
            {allStats.map(({ fund, color }) => {
              const ff = computeFreefincalCaptureStats(data?.monthly_returns, fund);
              return (
                <tr key={fund.scheme_code} className="hover:bg-terminal-surface/60">
                  <Td><FundDot color={color} name={fund.scheme_name} /></Td>
                  <Td right accent={ff && !isNaN(ff.ucr) ? colorCls(ff.ucr - 100) : 'text-terminal-muted'}>
                    {ff && !isNaN(ff.ucr) ? ff.ucr.toFixed(1) : '—'}
                  </Td>
                  <Td right accent={ff && !isNaN(ff.dcr) ? colorCls(100 - ff.dcr) : 'text-terminal-muted'}>
                    {ff && !isNaN(ff.dcr) ? ff.dcr.toFixed(1) : '—'}
                  </Td>
                  <Td right accent={ff && !isNaN(ff.captureRatio) ? colorCls(ff.captureRatio - 1) : 'text-terminal-muted'}>
                    {ff && !isNaN(ff.captureRatio) ? `${ff.captureRatio.toFixed(2)}x` : '—'}
                  </Td>
                  <Td right accent="text-blue-400">{ff ? ff.upMonths : '—'}</Td>
                  <Td right accent="text-rose-400">{ff ? ff.downMonths : '—'}</Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <SectionLabel>Benchmark vs Fund Returns (per fund)</SectionLabel>
      <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
        {allStats.map(({ fund, color, scatterData }) => {
          const xs = scatterData.map((d) => d.x), ys = scatterData.map((d) => d.y);
          const allVals = [...xs, ...ys];
          const pad = 3;
          const dMin = allVals.length ? Math.min(...allVals) - pad : -20;
          const dMax = allVals.length ? Math.max(...allVals) + pad : 20;
          const greenDots = scatterData.filter((d) => d.outperf);
          const redDots = scatterData.filter((d) => !d.outperf);
          return (
            <div key={fund.scheme_code}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <p className="text-[10px] text-terminal-muted truncate">{shortName(fund.scheme_name)}</p>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <ScatterChart margin={{ top: 5, right: 5, bottom: 20, left: 12 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke={GRID} />
                  <XAxis type="number" dataKey="x" domain={[dMin, dMax]} tickFormatter={(v) => `${v.toFixed(0)}%`} tick={TICK_SM} label={{ value: 'Benchmark', position: 'insideBottom', offset: -10, fontSize: 11, fill: '#8b949e' }} />
                  <YAxis type="number" dataKey="y" domain={[dMin, dMax]} tickFormatter={(v) => `${v.toFixed(0)}%`} tick={TICK_SM} tickLine={false} axisLine={false} width={38} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => fmt2(v)} />
                  {dMin < 0 && dMax > 0 && <ReferenceArea x1={dMin} x2={0} y1={dMin} y2={0} fill="#ef444420" />}
                  {dMin < 0 && dMax > 0 && <ReferenceArea x1={0} x2={dMax} y1={0} y2={dMax} fill="#22c55e20" />}
                  <ReferenceLine segment={[{ x: dMin, y: dMin }, { x: dMax, y: dMax }]} stroke={GRID} strokeDasharray="4 2" />
                  {greenDots.length > 0 && <Scatter name="Outperform" data={greenDots} fill="#22c55e" opacity={0.8} r={3} />}
                  {redDots.length > 0 && <Scatter name="Underperform" data={redDots} fill="#ef4444" opacity={0.8} r={3} />}
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          );
        })}
      </div>

      <SectionLabel>Rolling Alpha (per fund)</SectionLabel>
      <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
        {allStats.map(({ fund, color, alphaData }) => {
          const vals = alphaData.map((d) => d.alpha);
          const yMax = vals.length ? Math.max(...vals, 0) : 1;
          const yMin = vals.length ? Math.min(...vals, 0) : -1;
          const split = yMax !== yMin ? `${((yMax / (yMax - yMin)) * 100).toFixed(1)}%` : '50%';
          return (
            <div key={fund.scheme_code}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <p className="text-[10px] text-terminal-muted truncate">α — {shortName(fund.scheme_name)}</p>
              </div>
              <svg width="0" height="0" style={{ position: 'absolute' }}>
                <defs>
                  <linearGradient id={`tgrad-${fund.scheme_code}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset={split} stopColor="#22c55e" stopOpacity={0.35} />
                    <stop offset={split} stopColor="#ef4444" stopOpacity={0.35} />
                  </linearGradient>
                </defs>
              </svg>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={alphaData} margin={{ top: 2, right: 5, bottom: 2, left: 12 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke={GRID} />
                  <XAxis dataKey="date" tickFormatter={tickFormatter} tick={TICK_SM} tickLine={false} />
                  <YAxis tickFormatter={(v) => `${v.toFixed(0)}%`} tick={TICK_SM} tickLine={false} axisLine={false} width={38} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => fmt2(v)} />
                  <ReferenceLine y={0} stroke={GRID} strokeDasharray="3 2" />
                  <Area type="monotone" dataKey="alpha" stroke={color} fill={`url(#tgrad-${fund.scheme_code})`} strokeWidth={1.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Drawdown section ───────────────────────────────────────────────────────────
const DrawdownSection = ({ data, analyticsData, analyticsLoading, rfRate, activeWindow }) => {
  const avail = useMemo(() => data?.benchmark_windows?.map((bw) => bw.window) ?? [], [data]);
  const curWin = avail.includes(activeWindow) ? activeWindow : (avail[0] ?? '3y');
  const benchWin = data?.benchmark_windows?.find((bw) => bw.window === curWin);
  const rfPct = rfPeriodPct(rfRate, benchWin?.window_days ?? 365, 'absolute');
  const chartData = useMemo(() => buildChartData(data?.funds ?? [], benchWin, 'absolute'), [data, benchWin]);
  const allStats = useMemo(() => computeAllStats(data?.funds ?? [], chartData, rfPct), [data, chartData, rfPct]);

  // Build combined drawdown data for underwater chart
  const ddChartData = useMemo(() => {
    if (!allStats.length) return [];
    const refSeries = allStats[0]?.ddSeries ?? [];
    if (!refSeries.length) return [];
    return refSeries.map((row, idx) => {
      const combined = { date: row.date, benchmarkDD: row.benchmarkDD };
      allStats.forEach((stat) => {
        const ddRow = stat.ddSeries[idx];
        if (ddRow) combined[`fund_${stat.fund.scheme_code}_dd`] = ddRow.fundDD;
      });
      return combined;
    });
  }, [allStats]);

  // Calculate underwater statistics
  const underwaterStats = useMemo(() => allStats.map((stat) => {
    const series = stat.ddSeries ?? [];
    const total = series.length;
    const underwater = series.filter((d) => d.fundDD < -1).length;
    const deep = series.filter((d) => d.fundDD < -10).length;
    const avgDD = total > 0 ? series.reduce((s, d) => s + d.fundDD, 0) / total : 0;
    let maxStretch = 0, streak = 0;
    for (const d of series) {
      if (d.fundDD < -1) { streak++; maxStretch = Math.max(maxStretch, streak); }
      else streak = 0;
    }
    return {
      fund: stat.fund, color: stat.color,
      underwaterPct: total ? (underwater / total) * 100 : 0,
      deepPct: total ? (deep / total) * 100 : 0,
      avgDD, maxStretch,
    };
  }), [allStats]);

  if (analyticsLoading) return <p className="text-terminal-muted text-xs">Loading drawdown data…</p>;
  if (!analyticsData) return <p className="text-terminal-muted text-xs">No drawdown data available.</p>;

  const allFunds = analyticsData.funds ?? [];
  const benchDD = analyticsData.benchmark_drawdown;
  const allDD = [benchDD?.max_drawdown ?? 0, ...allFunds.map((f) => f.drawdown.max_drawdown)];
  const worst = Math.min(...allDD);

  return (
    <div className="space-y-5">
      {/* Underwater Chart */}
      {ddChartData.length > 0 && (
        <>
          <SectionLabel>Underwater Chart</SectionLabel>
          <p className="text-[10px] text-terminal-muted -mt-3 mb-2">
            Shows when NAV is below its all-time high. Red area = drawdown from peak.
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={ddChartData} margin={{ top: 5, right: 10, bottom: 5, left: 12 }}>
              <defs>
                <linearGradient id="uwGradT" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0.15} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke={GRID} />
              <XAxis dataKey="date" tickFormatter={tickFormatter} tick={TICK_SM} tickLine={false} />
              <YAxis domain={['auto', 0]} tickFormatter={(v) => `${v.toFixed(0)}%`} tick={TICK_SM} tickLine={false} axisLine={false} width={38} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => `${v?.toFixed(2)}%`} />
              <ReferenceLine y={0} stroke="#22c55e" strokeWidth={2} />
              {allStats.slice(0, 1).map((stat) => (
                <Area key={stat.fund.scheme_code} type="monotone" dataKey={`fund_${stat.fund.scheme_code}_dd`}
                  name={shortName(stat.fund.scheme_name)} stroke="#ef4444" fill="url(#uwGradT)" strokeWidth={1} dot={false} baseValue={0} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </>
      )}

      {/* Underwater Statistics */}
      {underwaterStats.length > 0 && (
        <>
          <SectionLabel>Time Underwater</SectionLabel>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <Th>Fund</Th>
                  <Th right>Underwater</Th>
                  <Th right>Deep (&gt;10%)</Th>
                  <Th right>Avg DD</Th>
                  <Th right>Max Streak</Th>
                </tr>
              </thead>
              <tbody>
                {underwaterStats.map(({ fund, color, underwaterPct, deepPct, avgDD, maxStretch }) => (
                  <tr key={fund.scheme_code} className="hover:bg-terminal-surface/60">
                    <Td><FundDot color={color} name={fund.scheme_name} /></Td>
                    <Td right>
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-12 bg-terminal-border rounded-full h-1">
                          <div className="bg-terminal-red h-1 rounded-full" style={{ width: `${Math.min(100, underwaterPct)}%` }} />
                        </div>
                        <span className="text-xs">{underwaterPct.toFixed(0)}%</span>
                      </div>
                    </Td>
                    <Td right accent="text-terminal-red">{deepPct.toFixed(0)}%</Td>
                    <Td right>{avgDD.toFixed(1)}%</Td>
                    <Td right accent="text-terminal-muted">{maxStretch}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <SectionLabel>Drawdown Statistics</SectionLabel>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <Th>Fund / Benchmark</Th>
              <Th right>Max DD</Th>
              <Th right>Peak</Th>
              <Th right>Trough</Th>
              <Th right>Duration</Th>
              <Th right>Recovery Date</Th>
              <Th right>Rec. Days</Th>
              <Th>Severity</Th>
            </tr>
          </thead>
          <tbody>
            {benchDD && (
              <tr className="bg-terminal-surface/60">
                <Td><FundDot color="#16a34a" name={analyticsData.benchmark_name ?? 'Benchmark'} /></Td>
                <Td right accent="text-terminal-red">{fmt1(benchDD.max_drawdown)}</Td>
                <Td right>{benchDD.peak_date ?? '—'}</Td>
                <Td right>{benchDD.trough_date ?? '—'}</Td>
                <Td right>{benchDD.drawdown_duration_days ?? '—'}</Td>
                <Td right>{benchDD.recovery_date ?? 'N/R'}</Td>
                <Td right>{benchDD.recovery_days ?? '—'}</Td>
                <Td>
                  <div className="w-24 bg-terminal-border rounded-full h-1.5">
                    <div className="bg-terminal-red h-1.5 rounded-full" style={{ width: `${Math.min(100, (benchDD.max_drawdown / worst) * 100)}%` }} />
                  </div>
                </Td>
              </tr>
            )}
            {allFunds.map((f, i) => {
              const dd = f.drawdown;
              return (
                <tr key={f.scheme_code} className="hover:bg-terminal-surface/60">
                  <Td><FundDot color={FUND_COLORS[i % FUND_COLORS.length]} name={f.scheme_name} /></Td>
                  <Td right accent="text-terminal-red">{fmt1(dd.max_drawdown)}</Td>
                  <Td right>{dd.peak_date ?? '—'}</Td>
                  <Td right>{dd.trough_date ?? '—'}</Td>
                  <Td right>{dd.drawdown_duration_days ?? '—'}</Td>
                  <Td right>{dd.recovery_date ?? 'N/R'}</Td>
                  <Td right>{dd.recovery_days ?? '—'}</Td>
                  <Td>
                    <div className="w-24 bg-terminal-border rounded-full h-1.5">
                      <div className="bg-terminal-red h-1.5 rounded-full" style={{ width: `${Math.min(100, (dd.max_drawdown / worst) * 100)}%` }} />
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Per-fund drawdown charts */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <SectionLabel>Drawdown Charts</SectionLabel>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
          {allStats.map(({ fund, color, ddSeries }) => (
            <div key={fund.scheme_code}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <p className="text-[10px] text-terminal-muted truncate">{shortName(fund.scheme_name)}</p>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={ddSeries} margin={{ top: 5, right: 5, bottom: 5, left: 12 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke={GRID} />
                  <XAxis dataKey="date" tickFormatter={tickFormatter} tick={TICK_SM} tickLine={false} />
                  <YAxis domain={['auto', 0]} tickFormatter={(v) => `${v.toFixed(0)}%`} tick={TICK_SM} tickLine={false} axisLine={false} width={38} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => fmt2(v)} />
                  <ReferenceLine y={0} stroke={GRID} strokeDasharray="3 2" />
                  <Area type="monotone" dataKey="benchmarkDD" name="Benchmark" stroke={BENCHMARK_COLOR} fill={BENCHMARK_COLOR} fillOpacity={0.1} strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
                  <Area type="monotone" dataKey="fundDD" name={shortName(fund.scheme_name)} stroke={color} fill={color} fillOpacity={0.25} strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Scorecard section ──────────────────────────────────────────────────────────
const ScorecardSection = ({ data, analyticsData, rfRate, activeWindow }) => {
  const avail = useMemo(() => data?.benchmark_windows?.map((bw) => bw.window) ?? [], [data]);
  const curWin = avail.includes(activeWindow) ? activeWindow : (avail[0] ?? '3y');
  const benchWin = data?.benchmark_windows?.find((bw) => bw.window === curWin);
  const rfPct = rfPeriodPct(rfRate, benchWin?.window_days ?? 365, 'absolute');
  const chartData = useMemo(() => buildChartData(data?.funds ?? [], benchWin, 'absolute'), [data, benchWin]);
  const allStats = useMemo(() => computeAllStats(data?.funds ?? [], chartData, rfPct), [data, chartData, rfPct]);
  const fundScores = useMemo(() => computeFundScores(allStats, analyticsData), [allStats, analyticsData]);

  const dims = ['returns', 'risk', 'consistency', 'capture', 'drawdown'];
  const dimLabels = { returns: 'Returns', risk: 'Risk', consistency: 'Consistency', capture: 'Capture', drawdown: 'Drawdown' };

  return (
    <div className="space-y-4">

      <SectionLabel>Fund Scorecard (0-100 scale)</SectionLabel>
      <p className="text-[10px] text-terminal-muted -mt-3 mb-3">
        Min-max normalized within comparison set. Returns = avg alpha, Risk = Sharpe, Consistency = outperformance %, Capture = UCR/DCR ratio, Drawdown = max DD (less negative = better).
      </p>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <Th>Fund</Th>
              {dims.map((d) => <Th key={d} right>{dimLabels[d]}</Th>)}
              <Th right>Overall</Th>
              <Th right>Grade</Th>
            </tr>
          </thead>
          <tbody>
            {fundScores.map(({ fund, color, scores, overall }) => {
              const { grade, color: gradeColor } = scoreGrade(overall);
              return (
                <tr key={fund.scheme_code} className="hover:bg-terminal-surface/60">
                  <Td><FundDot color={color} name={fund.scheme_name} /></Td>
                  {dims.map((d) => (
                    <Td key={d} right>
                      <span className="inline-block px-2 py-0.5 rounded text-xs" style={{ backgroundColor: scoreColor(scores[d]), color: scores[d] != null ? '#fff' : '#8b949e' }}>
                        {scores[d] != null ? scores[d].toFixed(0) : '—'}
                      </span>
                    </Td>
                  ))}
                  <Td right>
                    <span className="font-bold text-terminal-amber">{overall != null ? overall.toFixed(0) : '—'}</span>
                  </Td>
                  <Td right>
                    <span className="font-bold" style={{ color: gradeColor }}>{grade}</span>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── Distribution section (histogram) ───────────────────────────────────────────
const DistributionSection = ({ data, rfRate, activeWindow }) => {
  const [activeFund, setActiveFund] = useState(null);
  const avail = useMemo(() => data?.benchmark_windows?.map((bw) => bw.window) ?? [], [data]);
  const curWin = avail.includes(activeWindow) ? activeWindow : (avail[0] ?? '3y');
  const funds = data?.funds ?? [];
  
  // Default to first fund if none selected
  const selectedFundCode = activeFund ?? funds[0]?.scheme_code ?? null;
  const selectedFund = funds.find(f => f.scheme_code === selectedFundCode);
  
  const distData = useMemo(() => {
    if (!selectedFundCode) return [];
    const raw = extractReturnDist(data, selectedFundCode, curWin);
    if (raw.length === 0) return [];
    
    // Create histogram buckets
    const min = Math.min(...raw);
    const max = Math.max(...raw);
    const bucketCount = 20;
    const bucketSize = (max - min) / bucketCount || 1;
    
    const buckets = Array(bucketCount).fill(0).map((_, i) => ({
      range: `${(min + i * bucketSize).toFixed(0)}`,
      rangeEnd: min + (i + 1) * bucketSize,
      rangeStart: min + i * bucketSize,
      count: 0,
      midpoint: min + (i + 0.5) * bucketSize,
    }));
    
    for (const val of raw) {
      const idx = Math.min(Math.floor((val - min) / bucketSize), bucketCount - 1);
      buckets[idx].count++;
    }
    
    return buckets;
  }, [data, selectedFundCode, curWin]);
  
  const meanVal = useMemo(() => {
    const raw = extractReturnDist(data, selectedFundCode, curWin);
    if (raw.length === 0) return null;
    return raw.reduce((a, b) => a + b, 0) / raw.length;
  }, [data, selectedFundCode, curWin]);

  const fundColor = FUND_COLORS[funds.findIndex(f => f.scheme_code === selectedFundCode) % FUND_COLORS.length];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1">
          {funds.map((f, i) => (
            <button key={f.scheme_code} onClick={() => setActiveFund(f.scheme_code)}
              className={`px-2.5 py-1 text-xs rounded transition-colors flex items-center gap-1 ${selectedFundCode === f.scheme_code ? 'bg-terminal-surface border border-terminal-amber' : 'text-terminal-muted border border-terminal-border hover:border-terminal-amber'}`}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: FUND_COLORS[i % FUND_COLORS.length] }} />
              <span className="max-w-[80px] truncate">{shortNameMd(f.scheme_name).split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      <SectionLabel>Rolling CAGR Distribution</SectionLabel>
      {distData.length > 0 ? (
        <div>
          <p className="text-[10px] text-terminal-muted mb-2">
            {selectedFund?.scheme_name} — {curWin.toUpperCase()} window — {extractReturnDist(data, selectedFundCode, curWin).length} observations
            {meanVal != null && <span className="text-terminal-amber ml-2">Mean: {meanVal.toFixed(1)}%</span>}
          </p>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={distData} margin={{ top: 5, right: 10, bottom: 30, left: 12 }}>
              <CartesianGrid strokeDasharray="2 4" stroke={GRID} />
              <XAxis dataKey="range" tick={TICK_SM} tickLine={false} label={{ value: 'CAGR %', position: 'insideBottom', offset: -20, fontSize: 11, fill: '#8b949e' }} />
              <YAxis tick={TICK_SM} tickLine={false} axisLine={false} width={38} label={{ value: 'Count', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#8b949e' }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, name, props) => [`${v} observations`, `${props.payload.rangeStart?.toFixed(1)}% to ${props.payload.rangeEnd?.toFixed(1)}%`]} />
              {meanVal != null && <ReferenceLine x={distData.find(d => d.midpoint <= meanVal && d.rangeEnd > meanVal)?.range} stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 2" label={{ value: 'Mean', fill: '#f59e0b', fontSize: 10 }} />}
              <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                {distData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.midpoint >= 0 ? '#22c55e' : '#ef4444'} fillOpacity={0.7} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-terminal-muted text-sm">No distribution data available for selected fund/window.</p>
      )}
    </div>
  );
};

// ── SIP Planner section ────────────────────────────────────────────────────────
const SipPlannerSection = ({ data, rfRate, activeWindow }) => {
  const [sipAmount, setSipAmount] = useState(10000);
  const [horizonYears, setHorizonYears] = useState(10);
  const [targetCorpus, setTargetCorpus] = useState(2500000);
  
  const avail = useMemo(() => data?.benchmark_windows?.map((bw) => bw.window) ?? [], [data]);
  const curWin = avail.includes(activeWindow) ? activeWindow : (avail[0] ?? '3y');
  const funds = data?.funds ?? [];

  const projections = useMemo(() => {
    return funds.map((fund, i) => {
      const dist = extractReturnDist(data, fund.scheme_code, curWin);
      const proj = computeGoalProjections(dist, sipAmount, horizonYears);
      const prob = goalProbability(dist, sipAmount, horizonYears * 12, targetCorpus);
      return {
        fund,
        color: FUND_COLORS[i % FUND_COLORS.length],
        projection: proj,
        probability: prob,
        observations: dist.length,
      };
    });
  }, [data, funds, sipAmount, horizonYears, targetCorpus, curWin]);

  // Build fan chart data for first fund with projections
  const fanChartFund = projections.find(p => p.projection.length > 0);
  const fanChartData = fanChartFund?.projection ?? [];

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-terminal-muted">SIP</span>
          <input type="number" value={sipAmount} onChange={(e) => setSipAmount(Math.max(500, parseInt(e.target.value) || 500))}
            className="w-24 px-2 py-1 text-xs bg-terminal-bg border border-terminal-border rounded text-terminal-text outline-none focus:border-terminal-amber" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-terminal-muted">Years</span>
          <input type="number" value={horizonYears} onChange={(e) => setHorizonYears(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))}
            className="w-16 px-2 py-1 text-xs bg-terminal-bg border border-terminal-border rounded text-terminal-text outline-none focus:border-terminal-amber" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-terminal-muted">Target</span>
          <input type="number" value={targetCorpus} onChange={(e) => setTargetCorpus(Math.max(10000, parseInt(e.target.value) || 10000))}
            className="w-28 px-2 py-1 text-xs bg-terminal-bg border border-terminal-border rounded text-terminal-text outline-none focus:border-terminal-amber" />
        </div>
      </div>

      <SectionLabel>SIP Projection Fan Chart</SectionLabel>
      {fanChartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={fanChartData} margin={{ top: 10, right: 10, bottom: 5, left: 50 }}>
            <defs>
              <linearGradient id="fanGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 4" stroke={GRID} />
            <XAxis dataKey="year" tick={TICK_STYLE} tickLine={false} label={{ value: 'Years', position: 'insideBottom', offset: -5, fontSize: 11, fill: '#8b949e' }} />
            <YAxis tickFormatter={(v) => fmtLakh(v)} tick={TICK_STYLE} tickLine={false} axisLine={false} width={60} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => fmtLakh(v)} />
            <ReferenceLine y={targetCorpus} stroke="#ef4444" strokeWidth={2} strokeDasharray="6 3" label={{ value: `Target: ${fmtLakh(targetCorpus)}`, fill: '#ef4444', fontSize: 10, position: 'right' }} />
            <Area type="monotone" dataKey="p10" stackId="1" stroke="none" fill="#22c55e" fillOpacity={0.1} name="P10" />
            <Area type="monotone" dataKey="p25" stackId="2" stroke="none" fill="#22c55e" fillOpacity={0.15} name="P25" />
            <Area type="monotone" dataKey="p50" stackId="3" stroke="#22c55e" fill="url(#fanGrad)" strokeWidth={2} name="P50 (Median)" />
            <Area type="monotone" dataKey="p75" stackId="4" stroke="none" fill="#22c55e" fillOpacity={0.15} name="P75" />
            <Area type="monotone" dataKey="p90" stackId="5" stroke="none" fill="#22c55e" fillOpacity={0.1} name="P90" />
            <Line type="monotone" dataKey="invested" stroke="#64748b" strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="Invested" />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-terminal-muted text-sm">No projection data available.</p>
      )}

      <SectionLabel>Goal Probability per Fund</SectionLabel>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <Th>Fund</Th>
              <Th right>P10</Th>
              <Th right>P50</Th>
              <Th right>P90</Th>
              <Th right>Hit Prob.</Th>
              <Th right>Obs.</Th>
            </tr>
          </thead>
          <tbody>
            {projections.map(({ fund, color, projection, probability, observations }) => {
              const final = projection[projection.length - 1];
              return (
                <tr key={fund.scheme_code} className="hover:bg-terminal-surface/60">
                  <Td><FundDot color={color} name={fund.scheme_name} /></Td>
                  <Td right>{final ? fmtLakh(final.p10) : '—'}</Td>
                  <Td right accent="text-terminal-green">{final ? fmtLakh(final.p50) : '—'}</Td>
                  <Td right>{final ? fmtLakh(final.p90) : '—'}</Td>
                  <Td right accent={probability != null && probability >= 50 ? 'text-terminal-green' : 'text-terminal-red'}>
                    {probability != null ? `${probability.toFixed(0)}%` : '—'}
                  </Td>
                  <Td right accent="text-terminal-muted">{observations}</Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── Reverse SIP Calculator section ────────────────────────────────────────────
const ReverseSipSection = ({ data, activeWindow }) => {
  const [target, setTarget]             = useState(2500000);
  const [years, setYears]               = useState(10);
  const [sensitivitySIP, setSensitivity] = useState(8000);

  const avail   = useMemo(() => data?.benchmark_windows?.map((bw) => bw.window) ?? [], [data]);
  const curWin  = avail.includes(activeWindow) ? activeWindow : (avail[0] ?? '3y');
  const funds   = data?.funds ?? [];
  const primary = funds[0];

  const primaryDist = useMemo(
    () => (primary ? extractReturnDist(data, primary.scheme_code, curWin) : []),
    [data, primary, curWin]
  );

  const scenarios = useMemo(
    () => (primaryDist.length ? computeReverseSipScenarios(primaryDist, target, years) : []),
    [primaryDist, target, years]
  );

  const sensitivity = useMemo(
    () => (primaryDist.length ? sipSensitivity(primaryDist, sensitivitySIP, years, target) : null),
    [primaryDist, sensitivitySIP, years, target]
  );

  // Per-fund P50 comparison
  const fundP50 = useMemo(
    () =>
      funds.map((fund, i) => {
        const dist = extractReturnDist(data, fund.scheme_code, curWin);
        const rows = dist.length ? computeReverseSipScenarios(dist, target, years) : [];
        return {
          fund,
          color: FUND_COLORS[i % FUND_COLORS.length],
          p50: rows.find((r) => r.label === 'P50'),
          obs: dist.length,
        };
      }),
    [data, funds, target, years, curWin]
  );

  const hitBarWidth = sensitivity ? Math.max(2, Math.min(100, sensitivity.hitRatePct)) : 0;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-terminal-muted">Target ₹</span>
          <input type="number" value={target}
            onChange={(e) => setTarget(Math.max(10000, parseInt(e.target.value) || 10000))}
            className="w-28 px-2 py-1 text-xs bg-terminal-bg border border-terminal-border rounded text-terminal-text outline-none focus:border-terminal-amber" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-terminal-muted">Years</span>
          <input type="number" value={years}
            onChange={(e) => setYears(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))}
            className="w-16 px-2 py-1 text-xs bg-terminal-bg border border-terminal-border rounded text-terminal-text outline-none focus:border-terminal-amber" />
        </div>
        {primary && (
          <span className="text-[10px] text-terminal-muted ml-auto">
            {shortName(primary.scheme_name)} · {curWin.toUpperCase()} · {primaryDist.length} obs
          </span>
        )}
      </div>

      <SectionLabel>Required Monthly SIP by Scenario</SectionLabel>
      {scenarios.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <Th>Scenario</Th>
                <Th right>CAGR</Th>
                <Th right>SIP / month</Th>
                <Th right>Total Invested</Th>
                <Th right>Gain</Th>
                <Th right>Multiple</Th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map((row) => {
                const isBase = row.label === 'P50';
                const labelColor = row.isBear
                  ? 'text-terminal-red'
                  : row.isBull
                    ? 'text-terminal-green'
                    : 'text-terminal-amber';
                return (
                  <tr key={row.label}
                    className={`hover:bg-terminal-surface/60 ${isBase ? 'bg-terminal-surface/40' : ''}`}>
                    <Td>
                      <span className={`font-mono font-bold ${labelColor}`}>{row.label}</span>
                      {isBase && <span className="ml-2 text-[9px] text-terminal-amber">◄ BASE</span>}
                    </Td>
                    <Td right>{fmt1(row.annualReturnPct)}</Td>
                    <Td right accent={isBase ? 'text-terminal-amber font-semibold' : 'text-terminal-text'}>
                      ₹{row.requiredSIP.toLocaleString('en-IN')}
                    </Td>
                    <Td right>{fmtLakh(row.totalInvested)}</Td>
                    <Td right accent={row.totalGain >= 0 ? 'text-terminal-green' : 'text-terminal-red'}>
                      {row.totalGain >= 0 ? '+' : ''}{fmtLakh(row.totalGain)}
                    </Td>
                    <Td right accent="text-terminal-muted">{row.wealthMultiple}x</Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-terminal-muted text-sm">No data available for the selected window.</p>
      )}

      {/* Sensitivity */}
      {primaryDist.length > 0 && (
        <>
          <SectionLabel>Sensitivity — What if I can only invest…</SectionLabel>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[10px] text-terminal-muted">₹</span>
            <input type="number" value={sensitivitySIP}
              onChange={(e) => setSensitivity(Math.max(500, parseInt(e.target.value) || 500))}
              className="w-24 px-2 py-1 text-xs bg-terminal-bg border border-terminal-border rounded text-terminal-text outline-none focus:border-terminal-amber" />
            <span className="text-[10px] text-terminal-muted">/ month</span>
          </div>
          {sensitivity && (
            <div className="space-y-2">
              <p className="text-xs text-terminal-text">
                Required CAGR:{' '}
                <span className="font-mono font-bold text-terminal-amber">
                  {sensitivity.requiredReturnPct.toFixed(1)}%
                </span>
              </p>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-terminal-surface rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      sensitivity.hitRatePct >= 60
                        ? 'bg-terminal-green'
                        : sensitivity.hitRatePct >= 30
                          ? 'bg-terminal-amber'
                          : 'bg-terminal-red'
                    }`}
                    style={{ width: `${hitBarWidth}%` }}
                  />
                </div>
                <span className={`text-sm font-mono font-bold w-12 text-right ${
                  sensitivity.hitRatePct >= 60 ? 'text-terminal-green'
                    : sensitivity.hitRatePct >= 30 ? 'text-terminal-amber'
                      : 'text-terminal-red'
                }`}>
                  {sensitivity.hitRatePct.toFixed(0)}%
                </span>
                <span className="text-[10px] text-terminal-muted">of periods delivered this</span>
              </div>
            </div>
          )}
        </>
      )}

      {/* Fund comparison P50 */}
      {funds.length > 1 && (
        <>
          <SectionLabel>Fund Comparison — Base (P50) Required SIP</SectionLabel>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <Th>Fund</Th>
                  <Th right>CAGR (P50)</Th>
                  <Th right>SIP / month</Th>
                  <Th right>Total Invested</Th>
                  <Th right>Obs.</Th>
                </tr>
              </thead>
              <tbody>
                {fundP50.map(({ fund, color, p50, obs }) => (
                  <tr key={fund.scheme_code} className="hover:bg-terminal-surface/60">
                    <Td><FundDot color={color} name={fund.scheme_name} /></Td>
                    <Td right>{p50 ? fmt1(p50.annualReturnPct) : '—'}</Td>
                    <Td right accent="text-terminal-green">{p50 ? `₹${p50.requiredSIP.toLocaleString('en-IN')}` : '—'}</Td>
                    <Td right>{p50 ? fmtLakh(p50.totalInvested) : '—'}</Td>
                    <Td right accent="text-terminal-muted">{obs}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

// ── Monthly Returns Heatmap section ────────────────────────────────────────────
const MonthlyHeatmapSection = ({ data }) => {
  const [activeFund, setActiveFund] = useState('benchmark');
  const funds = data?.funds ?? [];
  const monthlyReturns = data?.monthly_returns;

  const fundOptions = [
    { key: 'benchmark', name: data?.benchmark_name ?? 'Benchmark', color: BENCHMARK_COLOR },
    ...funds.map((f, i) => ({ key: `fund_${f.scheme_code}`, name: f.scheme_name, color: FUND_COLORS[i % FUND_COLORS.length] })),
  ];

  const heatmapData = useMemo(() => {
    if (!monthlyReturns) return [];
    const series = monthlyReturns[activeFund] ?? [];
    if (!series.length) return [];

    // Group by year
    const byYear = {};
    for (const pt of series) {
      const [year, month] = pt.date.split('-');
      if (!byYear[year]) byYear[year] = {};
      byYear[year][parseInt(month)] = pt.value * 100; // Convert to percentage
    }

    // Convert to array format
    const years = Object.keys(byYear).sort();
    return years.map(year => ({
      year,
      months: byYear[year],
    }));
  }, [monthlyReturns, activeFund]);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const getColor = (val) => {
    if (val == null) return 'bg-terminal-surface';
    if (val >= 5) return 'bg-green-600';
    if (val >= 2) return 'bg-green-700';
    if (val >= 0) return 'bg-green-900';
    if (val >= -2) return 'bg-red-900';
    if (val >= -5) return 'bg-red-700';
    return 'bg-red-600';
  };

  if (!monthlyReturns) {
    return <p className="text-terminal-muted text-sm">No monthly returns data available.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 flex-wrap">
        {fundOptions.map((opt) => (
          <button key={opt.key} onClick={() => setActiveFund(opt.key)}
            className={`px-2.5 py-1 text-xs rounded transition-colors flex items-center gap-1 ${activeFund === opt.key ? 'bg-terminal-surface border border-terminal-amber' : 'text-terminal-muted border border-terminal-border hover:border-terminal-amber'}`}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} />
            <span className="max-w-[120px] truncate">{shortNameMd(opt.name)}</span>
          </button>
        ))}
      </div>

      <SectionLabel>Monthly Returns Calendar</SectionLabel>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <Th>Year</Th>
              {monthNames.map((m) => <Th key={m} right>{m}</Th>)}
            </tr>
          </thead>
          <tbody>
            {heatmapData.map(({ year, months }) => (
              <tr key={year} className="hover:bg-terminal-surface/30">
                <Td accent="text-terminal-amber font-semibold">{year}</Td>
                {monthNames.map((_, i) => {
                  const val = months[i + 1];
                  return (
                    <td key={i} className="px-1 py-1 text-center">
                      {val != null ? (
                        <span className={`inline-block w-full px-1.5 py-1 rounded text-[10px] font-mono ${getColor(val)} ${val >= 0 ? 'text-green-100' : 'text-red-100'}`} title={`${monthNames[i]} ${year}: ${val.toFixed(2)}%`}>
                          {val >= 0 ? '+' : ''}{val.toFixed(1)}
                        </span>
                      ) : (
                        <span className="inline-block w-full px-1.5 py-1 rounded text-[10px] text-terminal-muted">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Color legend */}
      <div className="flex items-center gap-2 text-[10px] text-terminal-muted">
        <span>Legend:</span>
        <span className="px-2 py-0.5 rounded bg-red-600 text-red-100">&lt;-5%</span>
        <span className="px-2 py-0.5 rounded bg-red-700 text-red-100">-5 to -2%</span>
        <span className="px-2 py-0.5 rounded bg-red-900 text-red-100">-2 to 0%</span>
        <span className="px-2 py-0.5 rounded bg-green-900 text-green-100">0 to 2%</span>
        <span className="px-2 py-0.5 rounded bg-green-700 text-green-100">2 to 5%</span>
        <span className="px-2 py-0.5 rounded bg-green-600 text-green-100">&gt;5%</span>
      </div>
    </div>
  );
};

// ── Retirement Corpus Simulator section ───────────────────────────────────────
const RetirementSection = ({ data, activeWindow }) => {
  const [monthlySIP, setMonthlySIP]       = useState(20000);
  const [yearsToRetire, setYearsToRetire] = useState(25);
  const [currentCorpus, setCurrentCorpus] = useState(0);
  const [withdrawal, setWithdrawal]       = useState(80000);
  const [retireDuration, setRetireDuration] = useState(30);
  const [inflation, setInflation]         = useState(6);
  const [equityAlloc, setEquityAlloc]     = useState(30);
  const [debtReturn, setDebtReturn]       = useState(6.5);
  const [mcRuns, setMcRuns]               = useState(300);
  const [corpusChoice, setCorpusChoice]   = useState('p50');

  const avail   = useMemo(() => data?.benchmark_windows?.map((bw) => bw.window) ?? [], [data]);
  const curWin  = avail.includes(activeWindow) ? activeWindow : (avail[0] ?? '3y');
  const primary = data?.funds?.[0];

  const dist = useMemo(
    () => (primary ? extractReturnDist(data, primary.scheme_code, curWin) : []),
    [data, primary, curWin]
  );

  const corpus = useMemo(
    () => (dist.length ? computeRetirementCorpus(dist, monthlySIP, yearsToRetire, currentCorpus) : null),
    [dist, monthlySIP, yearsToRetire, currentCorpus]
  );

  const selectedCorpus = corpus ? corpus[corpusChoice] : 0;

  const mcResult = useMemo(() => {
    if (!dist.length || !selectedCorpus) return null;
    return runRetirementMonteCarlo(
      dist, selectedCorpus, withdrawal,
      retireDuration, debtReturn, equityAlloc, inflation, mcRuns
    );
  }, [dist, selectedCorpus, withdrawal, retireDuration, debtReturn, equityAlloc, inflation, mcRuns]);

  const swr = useMemo(() => {
    if (!dist.length || !selectedCorpus) return null;
    return findSafeWithdrawalRate(
      dist, selectedCorpus, retireDuration,
      debtReturn, equityAlloc, inflation, 90, 200
    );
  }, [dist, selectedCorpus, retireDuration, debtReturn, equityAlloc, inflation]);

  const successRate  = mcResult?.successRate ?? null;
  const successColor = successRate == null ? 'text-terminal-muted'
    : successRate >= 80 ? 'text-terminal-green'
    : successRate >= 60 ? 'text-terminal-amber'
    : 'text-terminal-red';

  const requiredSWR = selectedCorpus ? +((withdrawal * 12 / selectedCorpus) * 100).toFixed(1) : 0;
  const swrDanger   = swr ? requiredSWR > swr.swrPct * 1.1 : false;

  const TInput = ({ label, value, onChange, width = 'w-24', step = 1 }) => (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-terminal-muted w-36 flex-shrink-0">{label}</span>
      <input type="number" value={value} step={step}
        onChange={(e) => onChange(step === 1 ? parseInt(e.target.value) || 0 : parseFloat(e.target.value) || 0)}
        className={`${width} px-2 py-1 text-xs bg-terminal-bg border border-terminal-border rounded text-terminal-text outline-none focus:border-terminal-amber`} />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Inputs — two column grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Accumulation */}
        <div className="space-y-2">
          <SectionLabel>Accumulation</SectionLabel>
          <TInput label="Monthly SIP (₹)" value={monthlySIP} onChange={(v) => setMonthlySIP(Math.max(500, v))} />
          <TInput label="Years to retire" value={yearsToRetire} onChange={(v) => setYearsToRetire(Math.max(1, Math.min(40, v)))} width="w-16" />
          <TInput label="Current corpus (₹)" value={currentCorpus} onChange={(v) => setCurrentCorpus(Math.max(0, v))} />
        </div>
        {/* Decumulation */}
        <div className="space-y-2">
          <SectionLabel>Decumulation</SectionLabel>
          <TInput label="Monthly withdrawal (₹)" value={withdrawal} onChange={(v) => setWithdrawal(Math.max(500, v))} />
          <TInput label="Retirement duration (yr)" value={retireDuration} onChange={(v) => setRetireDuration(Math.max(5, Math.min(50, v)))} width="w-16" />
          <TInput label="Inflation (%)" value={inflation} onChange={(v) => setInflation(Math.max(0, Math.min(20, v)))} width="w-16" />
          <TInput label="Equity allocation (%)" value={equityAlloc} onChange={(v) => setEquityAlloc(Math.max(0, Math.min(100, v)))} width="w-16" />
          <TInput label="Debt return (%)" value={debtReturn} onChange={(v) => setDebtReturn(Math.max(0, Math.min(20, v)))} width="w-16" step={0.1} />
        </div>
      </div>

      {/* MC runs + corpus choice */}
      <div className="flex items-center gap-3 flex-wrap text-[10px]">
        <span className="text-terminal-muted">MC runs</span>
        <input type="number" value={mcRuns}
          onChange={(e) => setMcRuns(Math.max(100, Math.min(1000, parseInt(e.target.value) || 300)))}
          className="w-16 px-2 py-1 text-xs bg-terminal-bg border border-terminal-border rounded text-terminal-text outline-none focus:border-terminal-amber" />
        <span className="text-terminal-muted ml-2">Corpus basis</span>
        {['p10', 'p25', 'p50', 'p75', 'p90'].map((k) => (
          <button key={k} onClick={() => setCorpusChoice(k)}
            className={`px-2 py-0.5 text-xs rounded transition-colors ${
              corpusChoice === k ? 'bg-terminal-amber text-terminal-bg font-bold' : 'text-terminal-muted border border-terminal-border hover:border-terminal-amber'
            }`}>
            {k.toUpperCase()}
          </button>
        ))}
        {primary && (
          <span className="ml-auto text-terminal-muted">{shortName(primary.scheme_name)} · {curWin.toUpperCase()} · {dist.length} obs</span>
        )}
      </div>

      {/* Accumulation result */}
      {corpus && (
        <>
          <SectionLabel>Projected Corpus at Retirement ({yearsToRetire}Y)</SectionLabel>
          <div className="grid grid-cols-5 gap-2 text-center">
            {[['P10', corpus.p10], ['P25', corpus.p25], ['P50', corpus.p50], ['P75', corpus.p75], ['P90', corpus.p90]].map(([label, val]) => (
              <div key={label}
                onClick={() => setCorpusChoice(label.toLowerCase())}
                className={`cursor-pointer rounded px-2 py-2 border transition-all ${
                  corpusChoice === label.toLowerCase()
                    ? 'border-terminal-amber bg-terminal-surface'
                    : 'border-terminal-border hover:border-terminal-amber/50'
                }`}>
                <p className={`text-[9px] font-semibold mb-1 ${corpusChoice === label.toLowerCase() ? 'text-terminal-amber' : 'text-terminal-muted'}`}>{label}</p>
                <p className="text-xs font-mono font-bold text-terminal-text">{fmtLakh(val)}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* MC results */}
      {mcResult && (
        <>
          <SectionLabel>
            Retirement Viability — {mcRuns} paths · {fmtLakh(selectedCorpus)} corpus · ₹{withdrawal.toLocaleString('en-IN')}/mo withdrawal
          </SectionLabel>
          <div className="flex items-center gap-6 flex-wrap">
            <div>
              <p className={`text-3xl font-mono font-bold ${successColor}`}>{successRate.toFixed(1)}%</p>
              <p className="text-[10px] text-terminal-muted">success rate</p>
            </div>
            <div className="text-xs text-terminal-text space-y-0.5">
              <p>
                <span className="text-terminal-green font-semibold">
                  {Math.round((successRate / 100) * mcRuns).toLocaleString('en-IN')}
                </span>
                {' / '}{mcRuns} paths survived {retireDuration} years
              </p>
              {mcResult.avgDepletionYear && (
                <p className="text-terminal-red">
                  Failed paths depleted avg year {mcResult.avgDepletionYear.toFixed(0)}
                </p>
              )}
            </div>
          </div>

          {/* Fan chart */}
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={mcResult.fanChart} margin={{ top: 5, right: 10, bottom: 5, left: 50 }}>
              <defs>
                <linearGradient id="retireGradT" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke={GRID} />
              <XAxis dataKey="year" tick={TICK_STYLE} tickLine={false}
                label={{ value: 'Year of retirement', position: 'insideBottom', offset: -5, fontSize: 11, fill: '#8b949e' }} />
              <YAxis tickFormatter={(v) => fmtLakh(v)} tick={TICK_STYLE} tickLine={false} axisLine={false} width={55} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => fmtLakh(v)} />
              <ReferenceLine y={0} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 2" />
              <Area type="monotone" dataKey="p10" stroke="none" fill="#22c55e" fillOpacity={0.08} name="P10" />
              <Area type="monotone" dataKey="p25" stroke="none" fill="#22c55e" fillOpacity={0.12} name="P25" />
              <Area type="monotone" dataKey="p50" stroke="#22c55e" fill="url(#retireGradT)" strokeWidth={2} name="P50" />
              <Area type="monotone" dataKey="p75" stroke="none" fill="#22c55e" fillOpacity={0.12} name="P75" />
              <Area type="monotone" dataKey="p90" stroke="none" fill="#22c55e" fillOpacity={0.08} name="P90" />
            </AreaChart>
          </ResponsiveContainer>

          {/* SWR */}
          {swr && (
            <>
              <SectionLabel>Safe Withdrawal Rate (90% confidence)</SectionLabel>
              <div className="flex items-center gap-6 flex-wrap">
                <div>
                  <p className="text-lg font-mono font-bold text-terminal-green">
                    {fmtLakh(swr.safeMonthlyWithdrawal)} / month
                  </p>
                  <p className="text-[10px] text-terminal-muted">{swr.swrPct}% SWR annual</p>
                </div>
                <div className={`text-xs ${swrDanger ? 'text-terminal-red' : 'text-terminal-text'}`}>
                  <p>
                    Your target: ₹{withdrawal.toLocaleString('en-IN')}/mo = {requiredSWR}% SWR
                    {swrDanger && <span className="ml-2 font-bold">⚠ ABOVE SAFE RATE</span>}
                  </p>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {!dist.length && (
        <p className="text-terminal-muted text-sm">No data available for the selected window.</p>
      )}
    </div>
  );
};

// ── Lumpsum vs SIP Comparison section ──────────────────────────────────────────
const LumpsumVsSipSection = ({ data }) => {
  const [investment, setInvestment] = useState(100000);
  const [periodYears, setPeriodYears] = useState(5);
  const [activeFund, setActiveFund] = useState(null);
  
  const funds = data?.funds ?? [];
  const monthlyReturns = data?.monthly_returns;
  
  // Default to first fund if none selected
  const selectedFundCode = activeFund ?? funds[0]?.scheme_code ?? 'benchmark';
  const selectedKey = selectedFundCode === 'benchmark' ? 'benchmark' : `fund_${selectedFundCode}`;
  
  const fundOptions = [
    { key: 'benchmark', name: data?.benchmark_name ?? 'Benchmark', color: BENCHMARK_COLOR, code: 'benchmark' },
    ...funds.map((f, i) => ({ key: `fund_${f.scheme_code}`, name: f.scheme_name, color: FUND_COLORS[i % FUND_COLORS.length], code: f.scheme_code })),
  ];

  // Compute lumpsum vs SIP comparison
  const comparison = useMemo(() => {
    if (!monthlyReturns?.[selectedKey]) return null;
    
    const monthlyData = monthlyReturns[selectedKey];
    if (!monthlyData?.length) return null;
    
    const sorted = [...monthlyData].sort((a, b) => a.date.localeCompare(b.date));
    const periodMonths = periodYears * 12;
    
    if (sorted.length < periodMonths) return null;
    
    const sipMonthly = investment / periodMonths;
    const results = [];
    
    for (let startIdx = 0; startIdx <= sorted.length - periodMonths; startIdx++) {
      const periodData = sorted.slice(startIdx, startIdx + periodMonths);
      const startDate = periodData[0].date;
      const endDate = periodData[periodMonths - 1].date;
      
      // Lumpsum: invest all at start
      let lumpsumValue = investment;
      for (const month of periodData) {
        lumpsumValue *= (1 + month.value);
      }
      
      // SIP: invest monthly
      let sipValue = 0;
      for (let m = 0; m < periodMonths; m++) {
        let monthInvestment = sipMonthly;
        for (let r = m; r < periodMonths; r++) {
          monthInvestment *= (1 + periodData[r].value);
        }
        sipValue += monthInvestment;
      }
      
      const lumpsumCAGR = (Math.pow(lumpsumValue / investment, 1 / periodYears) - 1) * 100;
      const sipCAGR = (Math.pow(sipValue / investment, 1 / periodYears) - 1) * 100;
      
      results.push({
        startDate, endDate,
        lumpsumValue: Math.round(lumpsumValue),
        sipValue: Math.round(sipValue),
        lumpsumCAGR, sipCAGR,
        winner: lumpsumValue > sipValue ? 'lumpsum' : sipValue > lumpsumValue ? 'sip' : 'tie',
      });
    }
    
    const lumpsumWins = results.filter(r => r.winner === 'lumpsum').length;
    const sipWins = results.filter(r => r.winner === 'sip').length;
    const avgLumpsum = results.reduce((s, r) => s + r.lumpsumValue, 0) / results.length;
    const avgSip = results.reduce((s, r) => s + r.sipValue, 0) / results.length;
    const avgLumpsumCAGR = results.reduce((s, r) => s + r.lumpsumCAGR, 0) / results.length;
    const avgSipCAGR = results.reduce((s, r) => s + r.sipCAGR, 0) / results.length;
    
    return {
      results,
      summary: {
        totalPeriods: results.length,
        lumpsumWins, sipWins,
        lumpsumWinPct: (lumpsumWins / results.length) * 100,
        sipWinPct: (sipWins / results.length) * 100,
        avgLumpsum: Math.round(avgLumpsum),
        avgSip: Math.round(avgSip),
        avgLumpsumCAGR, avgSipCAGR,
        overallWinner: lumpsumWins > sipWins ? 'lumpsum' : sipWins > lumpsumWins ? 'sip' : 'tie',
      },
    };
  }, [monthlyReturns, selectedKey, investment, periodYears]);

  // Build chart data by starting year
  const chartData = useMemo(() => {
    if (!comparison?.results?.length) return [];
    const byYear = {};
    for (const r of comparison.results) {
      const year = r.startDate.split('-')[0];
      if (!byYear[year]) byYear[year] = [];
      byYear[year].push(r);
    }
    return Object.entries(byYear).map(([year, periods]) => ({
      year,
      lumpsumAvg: Math.round(periods.reduce((s, p) => s + p.lumpsumValue, 0) / periods.length),
      sipAvg: Math.round(periods.reduce((s, p) => s + p.sipValue, 0) / periods.length),
      lumpsumWins: periods.filter(p => p.winner === 'lumpsum').length,
      sipWins: periods.filter(p => p.winner === 'sip').length,
    }));
  }, [comparison]);

  if (!monthlyReturns) {
    return <p className="text-terminal-muted text-sm">No monthly returns data available.</p>;
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-terminal-muted">Investment ₹</span>
          <input type="number" value={investment}
            onChange={(e) => setInvestment(Math.max(10000, parseInt(e.target.value) || 100000))}
            className="w-28 px-2 py-1 text-xs bg-terminal-bg border border-terminal-border rounded text-terminal-text outline-none focus:border-terminal-amber" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-terminal-muted">Period</span>
          <select value={periodYears} onChange={(e) => setPeriodYears(parseInt(e.target.value))}
            className="px-2 py-1 text-xs bg-terminal-bg border border-terminal-border rounded text-terminal-text outline-none focus:border-terminal-amber">
            {[1, 2, 3, 5, 7, 10].map((y) => <option key={y} value={y}>{y}Y</option>)}
          </select>
        </div>
      </div>

      {/* Fund selector */}
      <div className="flex gap-1 flex-wrap">
        {fundOptions.map((opt) => (
          <button key={opt.key} onClick={() => setActiveFund(opt.code)}
            className={`px-2.5 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
              selectedKey === opt.key ? 'bg-terminal-surface border border-terminal-amber' : 'text-terminal-muted border border-terminal-border hover:border-terminal-amber'
            }`}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} />
            <span className="max-w-[100px] truncate">{shortNameMd(opt.name)}</span>
          </button>
        ))}
      </div>

      {/* Summary Statistics */}
      {comparison?.summary && (
        <>
          <SectionLabel>Win Rate Comparison</SectionLabel>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-blue-900/30 border border-blue-700/50 rounded px-3 py-2">
              <p className="text-[9px] text-blue-400 uppercase tracking-wider font-semibold">Lumpsum Wins</p>
              <p className="text-xl font-mono font-bold text-blue-300">{comparison.summary.lumpsumWinPct.toFixed(0)}%</p>
              <p className="text-[10px] text-blue-400/70">{comparison.summary.lumpsumWins} of {comparison.summary.totalPeriods}</p>
            </div>
            <div className="bg-emerald-900/30 border border-emerald-700/50 rounded px-3 py-2">
              <p className="text-[9px] text-emerald-400 uppercase tracking-wider font-semibold">SIP Wins</p>
              <p className="text-xl font-mono font-bold text-emerald-300">{comparison.summary.sipWinPct.toFixed(0)}%</p>
              <p className="text-[10px] text-emerald-400/70">{comparison.summary.sipWins} of {comparison.summary.totalPeriods}</p>
            </div>
            <div className="bg-terminal-surface rounded px-3 py-2">
              <p className="text-[9px] text-terminal-muted uppercase tracking-wider font-semibold">Avg Lumpsum</p>
              <p className="text-lg font-mono font-bold text-terminal-text">{fmtLakh(comparison.summary.avgLumpsum)}</p>
              <p className="text-[10px] text-terminal-muted">CAGR: {comparison.summary.avgLumpsumCAGR.toFixed(1)}%</p>
            </div>
            <div className="bg-terminal-surface rounded px-3 py-2">
              <p className="text-[9px] text-terminal-muted uppercase tracking-wider font-semibold">Avg SIP</p>
              <p className="text-lg font-mono font-bold text-terminal-text">{fmtLakh(comparison.summary.avgSip)}</p>
              <p className="text-[10px] text-terminal-muted">CAGR: {comparison.summary.avgSipCAGR.toFixed(1)}%</p>
            </div>
          </div>

          {/* Winner Banner */}
          <div className={`rounded px-4 py-3 flex items-center gap-3 ${
            comparison.summary.overallWinner === 'lumpsum' 
              ? 'bg-blue-900/40 border border-blue-600/50' 
              : comparison.summary.overallWinner === 'sip'
                ? 'bg-emerald-900/40 border border-emerald-600/50'
                : 'bg-terminal-surface border border-terminal-border'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${
              comparison.summary.overallWinner === 'lumpsum' 
                ? 'bg-blue-600' 
                : comparison.summary.overallWinner === 'sip'
                  ? 'bg-emerald-600'
                  : 'bg-terminal-muted'
            }`}>
              {comparison.summary.overallWinner === 'lumpsum' ? '💰' : comparison.summary.overallWinner === 'sip' ? '📈' : '⚖️'}
            </div>
            <div>
              <p className={`font-semibold ${
                comparison.summary.overallWinner === 'lumpsum' 
                  ? 'text-blue-300' 
                  : comparison.summary.overallWinner === 'sip'
                    ? 'text-emerald-300'
                    : 'text-terminal-text'
              }`}>
                {comparison.summary.overallWinner === 'lumpsum' 
                  ? 'Lumpsum wins more often!' 
                  : comparison.summary.overallWinner === 'sip'
                    ? 'SIP wins more often!'
                    : 'It\'s a tie!'}
              </p>
              <p className="text-xs text-terminal-muted">
                Over {comparison.summary.totalPeriods} rolling {periodYears}-year periods
              </p>
            </div>
          </div>
        </>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <>
          <SectionLabel>Outcome by Entry Year</SectionLabel>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
              <CartesianGrid strokeDasharray="2 4" stroke={GRID} />
              <XAxis dataKey="year" tick={TICK_STYLE} tickLine={false} />
              <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} tick={TICK_STYLE} tickLine={false} axisLine={false} width={45} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => fmtLakh(v)} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#8b949e' }} />
              <ReferenceLine y={investment} stroke="#6b7280" strokeDasharray="4 2" />
              <Bar dataKey="lumpsumAvg" name="Lumpsum" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="sipAvg" name="SIP" fill="#10b981" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </>
      )}

      {/* Explanation */}
      <div className="bg-amber-900/20 border border-amber-700/30 rounded px-3 py-2 text-[10px] text-amber-300/80">
        <p className="font-semibold text-amber-400 mb-1">How this works:</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li><strong>Lumpsum:</strong> Entire {fmtLakh(investment)} invested at period start</li>
          <li><strong>SIP:</strong> {fmtLakh(Math.round(investment / (periodYears * 12)))}/month over {periodYears} years</li>
          <li>Lumpsum typically wins in bull markets; SIP wins in volatile/falling markets</li>
        </ul>
      </div>

      {!comparison && (
        <p className="text-terminal-muted text-sm text-center py-4">
          Insufficient data for {periodYears}-year comparison. Try a shorter period.
        </p>
      )}
    </div>
  );
};

// ── Entry Date Heatmap section ─────────────────────────────────────────────────
const EntryHeatmapSection = ({ data }) => {
  const [activeFund, setActiveFund] = useState(null);
  const funds = data?.funds ?? [];
  
  // Default to first fund if none selected
  const selectedFundCode = activeFund ?? funds[0]?.scheme_code ?? null;
  const selectedFund = funds.find(f => f.scheme_code === selectedFundCode);
  
  const fundOptions = funds.map((f, i) => ({
    code: f.scheme_code,
    name: f.scheme_name,
    color: FUND_COLORS[i % FUND_COLORS.length],
    fund: f,
  }));

  // Build entry date heatmap from rolling return windows
  const heatmapData = useMemo(() => {
    if (!selectedFund?.windows?.length) return null;
    
    const windowOrder = ['1y', '3y', '5y', '10y'];
    const availableWindows = selectedFund.windows
      .filter(w => windowOrder.includes(w.window))
      .sort((a, b) => windowOrder.indexOf(a.window) - windowOrder.indexOf(b.window));
    
    if (!availableWindows.length) return null;
    
    // Group returns by entry year
    const matrix = {};
    const allYears = new Set();
    
    for (const windowData of availableWindows) {
      const windowId = windowData.window;
      const windowDays = windowData.window_days;
      
      for (const point of windowData.data || []) {
        const year = point.date.split('-')[0];
        allYears.add(year);
        
        if (!matrix[year]) matrix[year] = {};
        
        // Convert rolling return to CAGR
        const value = point.value;
        const cagr = windowDays > 365 
          ? (Math.pow(1 + value, 365 / windowDays) - 1) * 100
          : value * 100;
        
        if (matrix[year][windowId] == null) {
          matrix[year][windowId] = { sum: cagr, count: 1 };
        } else {
          matrix[year][windowId].sum += cagr;
          matrix[year][windowId].count += 1;
        }
      }
    }
    
    // Average out the values
    for (const year of Object.keys(matrix)) {
      for (const win of Object.keys(matrix[year])) {
        const { sum, count } = matrix[year][win];
        matrix[year][win] = sum / count;
      }
    }
    
    const years = Array.from(allYears).sort();
    const windows = availableWindows.map(w => w.window);
    
    return { years, windows, matrix };
  }, [selectedFund]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (!heatmapData?.matrix) return null;
    
    const stats = {};
    for (const win of heatmapData.windows) {
      const values = heatmapData.years
        .map(y => heatmapData.matrix[y]?.[win])
        .filter(v => v != null && !isNaN(v));
      
      if (values.length) {
        const sorted = [...values].sort((a, b) => a - b);
        stats[win] = {
          min: sorted[0],
          max: sorted[sorted.length - 1],
          avg: values.reduce((s, v) => s + v, 0) / values.length,
          median: sorted[Math.floor(sorted.length / 2)],
          negative: values.filter(v => v < 0).length,
          total: values.length,
        };
      }
    }
    return stats;
  }, [heatmapData]);

  // Get heatmap color for terminal dark theme
  const getHeatmapColor = (value) => {
    if (value == null || isNaN(value)) return 'bg-terminal-surface text-terminal-muted';
    const clamped = Math.max(-20, Math.min(30, value));
    
    if (clamped < 0) {
      const intensity = Math.abs(clamped) / 20;
      if (intensity > 0.7) return 'bg-red-600 text-red-100';
      if (intensity > 0.4) return 'bg-red-700 text-red-200';
      if (intensity > 0.2) return 'bg-red-800 text-red-200';
      return 'bg-red-900 text-red-300';
    } else if (clamped < 8) {
      if (clamped < 2) return 'bg-amber-900 text-amber-300';
      if (clamped < 5) return 'bg-amber-800 text-amber-200';
      return 'bg-yellow-700 text-yellow-200';
    } else {
      if (clamped < 12) return 'bg-emerald-800 text-emerald-200';
      if (clamped < 16) return 'bg-emerald-700 text-emerald-100';
      if (clamped < 22) return 'bg-emerald-600 text-emerald-100';
      return 'bg-emerald-500 text-white';
    }
  };

  const windowLabel = (w) => {
    const labels = { '1y': '1Y', '3y': '3Y', '5y': '5Y', '10y': '10Y' };
    return labels[w] || w.toUpperCase();
  };

  if (!funds.length) {
    return <p className="text-terminal-muted text-sm">Select funds to view entry date analysis.</p>;
  }

  return (
    <div className="space-y-4">
      {/* Fund selector */}
      <div className="flex gap-1 flex-wrap">
        {fundOptions.map((opt) => (
          <button key={opt.code} onClick={() => setActiveFund(opt.code)}
            className={`px-2.5 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
              selectedFundCode === opt.code ? 'bg-terminal-surface border border-terminal-amber' : 'text-terminal-muted border border-terminal-border hover:border-terminal-amber'
            }`}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} />
            <span className="max-w-[100px] truncate">{shortNameMd(opt.name)}</span>
          </button>
        ))}
      </div>

      {/* Heatmap table */}
      {heatmapData && heatmapData.years.length > 0 ? (
        <>
          <SectionLabel>CAGR by Entry Year × Holding Period</SectionLabel>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <Th>Year</Th>
                  {heatmapData.windows.map((w) => <Th key={w} right>{windowLabel(w)}</Th>)}
                </tr>
              </thead>
              <tbody>
                {heatmapData.years.map((year) => (
                  <tr key={year} className="hover:bg-terminal-surface/30">
                    <Td accent="text-terminal-amber font-semibold">{year}</Td>
                    {heatmapData.windows.map((win) => {
                      const value = heatmapData.matrix[year]?.[win];
                      const colorClass = getHeatmapColor(value);
                      return (
                        <td key={win} className="px-1 py-1 text-center">
                          {value != null ? (
                            <span className={`inline-block w-full px-2 py-1 rounded text-[10px] font-mono ${colorClass}`}>
                              {value >= 0 ? '+' : ''}{value.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="inline-block w-full px-2 py-1 rounded text-[10px] text-terminal-muted">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="text-terminal-muted text-sm text-center py-4">No heatmap data available for selected fund.</p>
      )}

      {/* Summary statistics */}
      {summaryStats && (
        <>
          <SectionLabel>Window Summary Statistics</SectionLabel>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {heatmapData?.windows.map((win) => {
              const stats = summaryStats[win];
              if (!stats) return null;
              return (
                <div key={win} className="bg-terminal-surface rounded px-3 py-2">
                  <p className="text-[9px] text-terminal-amber uppercase tracking-wider font-semibold mb-1">{windowLabel(win)}</p>
                  <div className="space-y-0.5 text-[10px]">
                    <div className="flex justify-between">
                      <span className="text-terminal-muted">Min:</span>
                      <span className={stats.min < 0 ? 'text-terminal-red' : 'text-terminal-green'}>{stats.min.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-terminal-muted">Median:</span>
                      <span className={stats.median < 0 ? 'text-terminal-red' : 'text-terminal-green'}>{stats.median.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-terminal-muted">Max:</span>
                      <span className="text-terminal-green">{stats.max.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-terminal-muted">Neg:</span>
                      <span className={stats.negative > 0 ? 'text-terminal-red' : 'text-terminal-muted'}>{stats.negative}/{stats.total}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Legend */}
      <div className="flex items-center gap-1 text-[10px] text-terminal-muted flex-wrap">
        <span>Scale:</span>
        <span className="px-1.5 py-0.5 rounded bg-red-600 text-red-100">&lt;-10%</span>
        <span className="px-1.5 py-0.5 rounded bg-red-800 text-red-200">-5 to 0%</span>
        <span className="px-1.5 py-0.5 rounded bg-amber-800 text-amber-200">0 to 5%</span>
        <span className="px-1.5 py-0.5 rounded bg-emerald-700 text-emerald-100">8 to 15%</span>
        <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-white">&gt;15%</span>
      </div>

      {/* Explanation */}
      <div className="bg-blue-900/20 border border-blue-700/30 rounded px-3 py-2 text-[10px] text-blue-300/80">
        <p className="font-semibold text-blue-400 mb-1">How to read:</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>Rows = entry year, Columns = holding period</li>
          <li>Cell shows CAGR if you entered that year and held for that period</li>
          <li>Longer holding periods typically show less red (more consistency)</li>
        </ul>
      </div>
    </div>
  );
};

// ── KPI Summary Strip ──────────────────────────────────────────────────────────
const KpiStrip = ({ data, rfRate, activeWindow, setActiveWindow }) => {
  const avail = data?.benchmark_windows?.map((bw) => bw.window) ?? [];
  const curWin = avail.includes(activeWindow) ? activeWindow : (avail[0] ?? '3y');
  const benchWin = data?.benchmark_windows?.find((bw) => bw.window === curWin);
  const rfPct = rfPeriodPct(rfRate, benchWin?.window_days ?? 365, 'absolute');
  const chartData = buildChartData(data?.funds ?? [], benchWin, 'absolute');
  const allStats = computeAllStats(data?.funds ?? [], chartData, rfPct);
  const kpis = computeKPIs(data?.funds ?? [], allStats, data?.monthly_returns);

  if (kpis.length === 0) return null;

  return (
    <div className="flex-shrink-0 border-b border-terminal-border bg-terminal-surface/50 px-5 py-2">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-6 overflow-x-auto flex-1 min-w-0">
          <span className="text-[10px] text-terminal-muted uppercase tracking-widest flex-shrink-0">KPIs ({curWin.toUpperCase()})</span>
          {kpis.map((kpi, i) => (
            <div key={i} className="flex-shrink-0 flex items-center gap-2">
              <span className="text-[10px] text-terminal-muted">{kpi.label}:</span>
              <span className={`text-sm font-mono font-bold ${kpi.positive ? 'text-terminal-green' : 'text-terminal-red'}`}>{kpi.value}</span>
              <span className="text-[9px] text-terminal-muted max-w-[100px] truncate">{kpi.sub}</span>
            </div>
          ))}
        </div>
        {avail.length > 0 && setActiveWindow && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-[10px] text-terminal-muted uppercase tracking-widest mr-1">WIN</span>
            {avail.map((w) => (
              <button key={w} onClick={() => setActiveWindow(w)}
                className={`px-2.5 py-1 text-xs font-mono rounded transition-colors ${curWin === w ? 'bg-terminal-amber text-terminal-bg font-bold' : 'text-terminal-muted border border-terminal-border hover:border-terminal-amber'}`}>
                {WINDOWS.find((x) => x.id === w)?.label ?? w.toUpperCase()}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ── NFO Warning Banner ─────────────────────────────────────────────────────────
const NfoWarning = ({ data }) => {
  if (!data?.funds?.length) return null;

  const warnings = data.funds
    .map((fund) => {
      const windows = fund.windows ?? [];
      const threeYWindow = windows.find((w) => w.window === '3y');
      const threeYDataPoints = threeYWindow?.data?.length ?? 0;
      const hasInsufficientData = threeYDataPoints < 12;
      if (hasInsufficientData) {
        return { name: fund.scheme_name, dataPoints: threeYDataPoints };
      }
      return null;
    })
    .filter(Boolean);

  if (warnings.length === 0) return null;

  return (
    <div className="mb-4 px-4 py-3 bg-amber-900/30 border border-amber-600/50 rounded">
      <div className="flex items-start gap-3">
        <span className="text-amber-500 text-lg">⚠</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-400">Limited Historical Data</p>
          <div className="mt-1 text-xs text-amber-300/80 space-y-0.5">
            {warnings.map((w, i) => (
              <p key={i}><span className="font-medium">{shortName(w.name)}</span> has limited data for 3Y window.</p>
            ))}
          </div>
          <p className="mt-1 text-[10px] text-amber-500/70">
            Consider using 1Y windows for newer funds.
          </p>
        </div>
      </div>
    </div>
  );
};

// ── TER Impact section ─────────────────────────────────────────────────────────
const TerImpactSection = ({ data }) => {
  const funds = data?.funds ?? [];
  const firstTer = funds[0]?.ter ?? 1.0;

  const [grossReturn, setGrossReturn] = useState(12);
  const [monthlySIP, setMonthlySIP]   = useState(10000);
  const [lumpsum, setLumpsum]         = useState(0);
  const [years, setYears]             = useState(20);
  const [ter1, setTer1] = useState(parseFloat((firstTer ?? 0.5).toFixed(2)));
  const [ter2, setTer2] = useState(parseFloat(((firstTer ?? 1.0) + 0.5).toFixed(2)));
  const [ter3, setTer3] = useState(parseFloat(((firstTer ?? 1.0) + 1.0).toFixed(2)));

  // local sipFV
  const sipFV = (annualReturn, P, months) => {
    if (months <= 0) return 0;
    const r = Math.pow(1 + annualReturn, 1 / 12) - 1;
    if (Math.abs(r) < 1e-10) return P * months;
    return P * ((Math.pow(1 + r, months) - 1) / r) * (1 + r);
  };

  const computePath = (terPct) => {
    const net = (grossReturn - terPct) / 100;
    return Array.from({ length: years + 1 }, (_, y) => {
      const m = y * 12;
      const sipC = monthlySIP > 0 ? sipFV(net, monthlySIP, m) : 0;
      const lumpC = lumpsum > 0 ? lumpsum * Math.pow(1 + net, y) : 0;
      return { year: y, corpus: Math.round(sipC + lumpC), invested: monthlySIP * m + lumpsum };
    });
  };

  const TER_COLORS_LOCAL = ['#2563eb', '#dc2626', '#d97706'];

  const terLevels = useMemo(
    () => [
      { label: `TER ${ter1.toFixed(2)}%`, ter: ter1, color: TER_COLORS_LOCAL[0] },
      { label: `TER ${ter2.toFixed(2)}%`, ter: ter2, color: TER_COLORS_LOCAL[1] },
      { label: `TER ${ter3.toFixed(2)}%`, ter: ter3, color: TER_COLORS_LOCAL[2] },
    ].filter((t) => t.ter >= 0 && t.ter < grossReturn),
    [ter1, ter2, ter3, grossReturn]
  );

  const paths = useMemo(() => terLevels.map((tl) => computePath(tl.ter)), [terLevels, grossReturn, monthlySIP, lumpsum, years]);

  const chartData = useMemo(() => {
    return Array.from({ length: years + 1 }, (_, y) => {
      const row = { year: y };
      terLevels.forEach((tl, i) => { row[tl.label] = paths[i][y]?.corpus ?? 0; });
      row['Invested'] = paths[0]?.[y]?.invested ?? 0;
      return row;
    });
  }, [years, terLevels, paths]);

  const finalCorpus = terLevels.map((tl, i) => ({ ...tl, corpus: paths[i][years]?.corpus ?? 0 }));
  const baseLine = finalCorpus[0];
  const invested = chartData[years]?.Invested ?? 0;

  return (
    <div className="space-y-5">
      <SectionLabel>13 TER IMPACT</SectionLabel>

      {/* Fund TER badges */}
      {funds.some((f) => f.ter != null) && (
        <div className="flex flex-wrap gap-2">
          {funds.map((f, i) =>
            f.ter != null ? (
              <span key={f.scheme_code} className="text-[10px] font-mono px-2 py-0.5 rounded border"
                style={{ borderColor: FUND_COLORS[i % FUND_COLORS.length], color: FUND_COLORS[i % FUND_COLORS.length] }}>
                {shortName(f.scheme_name)} — {f.ter.toFixed(2)}%
              </span>
            ) : null
          )}
        </div>
      )}

      {/* Controls */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Gross Ret %', val: grossReturn, set: setGrossReturn, step: 0.5 },
          { label: 'SIP ₹/mo', val: monthlySIP, set: setMonthlySIP, step: 1000 },
          { label: 'Lumpsum ₹', val: lumpsum, set: setLumpsum, step: 10000 },
          { label: 'Years', val: years, set: setYears, step: 1 },
        ].map(({ label, val, set, step }) => (
          <label key={label} className="flex flex-col gap-1">
            <span className="text-[9px] text-terminal-muted uppercase tracking-widest">{label}</span>
            <input type="number" step={step} value={val}
              onChange={(e) => set(parseFloat(e.target.value) || 0)}
              className="bg-terminal-surface border border-terminal-border text-terminal-text text-xs font-mono px-2 py-1.5 rounded w-full focus:outline-none focus:border-terminal-amber" />
          </label>
        ))}
      </div>

      {/* TER level inputs */}
      <div className="flex flex-wrap gap-4 items-end">
        {[
          { val: ter1, set: setTer1, color: TER_COLORS_LOCAL[0], label: 'TER 1 %' },
          { val: ter2, set: setTer2, color: TER_COLORS_LOCAL[1], label: 'TER 2 %' },
          { val: ter3, set: setTer3, color: TER_COLORS_LOCAL[2], label: 'TER 3 %' },
        ].map(({ val, set, color, label }) => (
          <label key={label} className="flex flex-col gap-1 w-28">
            <span className="text-[9px] uppercase tracking-widest" style={{ color }}>{label}</span>
            <input type="number" step={0.05} min={0} max={5} value={val}
              onChange={(e) => set(parseFloat(e.target.value) || 0)}
              className="bg-terminal-surface border text-xs font-mono px-2 py-1.5 rounded w-full focus:outline-none"
              style={{ borderColor: color, color }} />
          </label>
        ))}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 16 }}>
          <CartesianGrid strokeDasharray="2 4" stroke={GRID} />
          <XAxis dataKey="year" tickFormatter={(v) => `${v}Y`} tick={TICK_STYLE} tickLine={false} axisLine={{ stroke: GRID }} />
          <YAxis tickFormatter={(v) => fmtLakh(v)} tick={TICK_STYLE} tickLine={false} axisLine={false} width={56} />
          <Tooltip formatter={(v, n) => [fmtLakh(v), n]} contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#8b949e' }} />
          <Line type="monotone" dataKey="Invested" stroke="#4b5563" strokeDasharray="5 3" dot={false} strokeWidth={1.5} />
          {terLevels.map((tl) => (
            <Line key={tl.label} type="monotone" dataKey={tl.label} stroke={tl.color} dot={false} strokeWidth={2} />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* Drag table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              {['TER Level', 'Final Corpus', 'vs Lowest TER', 'Wealth Ratio'].map((h, i) => (
                <Th key={h} right={i > 0}>{h}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td accent="text-terminal-muted italic">Invested</Td>
              <Td right accent="text-terminal-muted">{fmtLakh(invested)}</Td>
              <Td right />
              <Td right />
            </tr>
            {finalCorpus.map((tl, i) => {
              const drag = i === 0 ? 0 : (baseLine?.corpus ?? 0) - tl.corpus;
              const ratio = invested > 0 ? tl.corpus / invested : null;
              return (
                <tr key={tl.label}>
                  <Td><span className="font-semibold font-mono" style={{ color: tl.color }}>{tl.label}</span></Td>
                  <Td right accent="text-terminal-text tabular-mono">{fmtLakh(tl.corpus)}</Td>
                  <Td right accent={i === 0 ? 'text-terminal-muted' : 'text-terminal-red'}>
                    {i === 0 ? '—' : `−${fmtLakh(drag)}`}
                  </Td>
                  <Td right accent="text-terminal-text tabular-mono">
                    {ratio != null ? `${ratio.toFixed(2)}x` : '—'}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {finalCorpus.length >= 2 && (
        <p className="text-[10px] text-terminal-amber font-mono px-3 py-2 border border-terminal-amber/30 rounded bg-terminal-amber/5">
          DRAG: {finalCorpus[0].ter.toFixed(2)}% → {finalCorpus[finalCorpus.length - 1].ter.toFixed(2)}% TER costs{' '}
          {fmtLakh((finalCorpus[0].corpus ?? 0) - (finalCorpus[finalCorpus.length - 1]?.corpus ?? 0))} over {years}Y
          at {grossReturn}% gross return.
        </p>
      )}
    </div>
  );
};

// ── Risk-Adjusted Ranking section ─────────────────────────────────────────────
const RankingSection = ({ data, analyticsData, rfRate, activeWindow }) => {
  const avail = useMemo(() => data?.benchmark_windows?.map((bw) => bw.window) ?? [], [data]);
  const curWin = avail.includes(activeWindow) ? activeWindow : avail[0] ?? '3y';
  const benchWin = data?.benchmark_windows?.find((bw) => bw.window === curWin);
  const rfPct = rfPeriodPct(rfRate, benchWin?.window_days ?? 365, 'absolute');
  const chartData = useMemo(() => buildChartData(data?.funds ?? [], benchWin, 'absolute'), [data, benchWin]);
  const allStats = useMemo(
    () => computeAllStats(data?.funds ?? [], chartData, rfPct, data?.monthly_returns),
    [data, chartData, rfPct]
  );
  const funds = data?.funds ?? [];

  // Rank helper: returns rank array (0-based), null for NaN
  const rankVals = (vals, higherIsBetter = true) => {
    const idx = vals.map((v, i) => ({ v, i })).filter((x) => !isNaN(x.v) && x.v != null);
    idx.sort((a, b) => (higherIsBetter ? b.v - a.v : a.v - b.v));
    const rm = {};
    idx.forEach(({ i }, r) => { rm[i] = r; });
    return vals.map((_, i) => rm[i] != null ? rm[i] : null);
  };

  const metrics = useMemo(() => allStats.map((s) => {
    const fc = s.freefincal;
    const dd = analyticsData?.funds?.find((f) => f.scheme_code === s.fund.scheme_code);
    return {
      scheme_code: s.fund.scheme_code,
      scheme_name: s.fund.scheme_name,
      color: s.color,
      ter: s.fund.ter,
      sharpe: s.vol.sharpeFund,
      sortino: s.vol.sortinoFund,
      avgAlpha: s.outperf.avgAlpha,
      infoRatio: s.vol.infoRatio,
      beta: s.vol.beta,
      captureRatio: fc?.captureRatio ?? NaN,
      ucr: fc?.ucr ?? NaN,
      dcr: fc?.dcr ?? NaN,
      outperformedPct: s.outperf.outperformedPct,
      maxDrawdown: dd?.drawdown?.max_drawdown ?? NaN,
    };
  }), [allStats, analyticsData]);

  if (!metrics.length) return null;

  const rSharpe    = rankVals(metrics.map((m) => m.sharpe),         true);
  const rSortino   = rankVals(metrics.map((m) => m.sortino),        true);
  const rAlpha     = rankVals(metrics.map((m) => m.avgAlpha),       true);
  const rInfo      = rankVals(metrics.map((m) => m.infoRatio),      true);
  const rBeta      = rankVals(metrics.map((m) => m.beta),           false);
  const rCapture   = rankVals(metrics.map((m) => m.captureRatio),   true);
  const rOutperf   = rankVals(metrics.map((m) => m.outperformedPct), true);
  const rDD        = rankVals(metrics.map((m) => m.maxDrawdown),    true);

  const compositeRanks = metrics.map((_, i) => {
    const rs = [rSharpe[i], rSortino[i], rAlpha[i], rInfo[i], rCapture[i], rOutperf[i], rDD[i]].filter((r) => r != null);
    return rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : null;
  });
  const rComposite = rankVals(compositeRanks.map((v) => v != null ? -v : NaN), true);

  const medal = (r) => {
    if (r == null) return <span className="text-terminal-muted">—</span>;
    const colors = ['text-yellow-400', 'text-gray-300', 'text-amber-600'];
    if (r < 3) return <span className={`${colors[r]} font-bold`}>#{r + 1}</span>;
    return <span className="text-terminal-muted">#{r + 1}</span>;
  };

  const signCls = (v, hib = true) => {
    if (v == null || isNaN(v)) return 'text-terminal-muted';
    return (hib ? v > 0 : v < 0) ? 'text-terminal-green' : 'text-terminal-red';
  };

  return (
    <div className="space-y-5">
      <SectionLabel>14 RANKING</SectionLabel>
      <p className="text-[10px] text-terminal-muted">
        Risk-adjusted metrics for {curWin.toUpperCase()} rolling window · absolute returns · Rf = {(rfRate * 100).toFixed(1)}%
      </p>

      {/* Main table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[680px]">
          <thead>
            <tr>
              <Th>Fund</Th>
              <Th right>Sharpe</Th>
              <Th right>Sortino</Th>
              <Th right>Avg α</Th>
              <Th right>Info R</Th>
              <Th right>Beta</Th>
              <Th right>Capture</Th>
              <Th right>Hit%</Th>
              {analyticsData && <Th right>Max DD</Th>}
              {funds.some((f) => f.ter != null) && <Th right>TER</Th>}
              <Th right>Overall</Th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((m, i) => (
              <tr key={m.scheme_code}>
                <Td>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: m.color }} />
                    <span className="truncate max-w-[160px]">{shortName(m.scheme_name)}</span>
                  </div>
                </Td>
                <Td right accent={signCls(m.sharpe)}>
                  {medal(rSharpe[i])} {isNaN(m.sharpe) ? '—' : m.sharpe.toFixed(2)}
                </Td>
                <Td right accent={signCls(m.sortino)}>
                  {medal(rSortino[i])} {isNaN(m.sortino) ? '—' : m.sortino.toFixed(2)}
                </Td>
                <Td right accent={signCls(m.avgAlpha)}>
                  {medal(rAlpha[i])} {isNaN(m.avgAlpha) ? '—' : `${m.avgAlpha.toFixed(2)}%`}
                </Td>
                <Td right accent={signCls(m.infoRatio)}>
                  {medal(rInfo[i])} {isNaN(m.infoRatio) ? '—' : m.infoRatio.toFixed(2)}
                </Td>
                <Td right>
                  {medal(rBeta[i])} {isNaN(m.beta) ? '—' : m.beta.toFixed(2)}
                </Td>
                <Td right accent={signCls(m.captureRatio - 1)}>
                  {medal(rCapture[i])} {isNaN(m.captureRatio) ? '—' : `${m.captureRatio.toFixed(2)}x`}
                </Td>
                <Td right accent={signCls(m.outperformedPct - 50)}>
                  {medal(rOutperf[i])} {m.outperformedPct.toFixed(0)}%
                </Td>
                {analyticsData && (
                  <Td right accent="text-terminal-red">
                    {medal(rDD[i])} {isNaN(m.maxDrawdown) ? '—' : `${m.maxDrawdown.toFixed(1)}%`}
                  </Td>
                )}
                {funds.some((f) => f.ter != null) && (
                  <Td right>{m.ter != null ? `${m.ter.toFixed(2)}%` : '—'}</Td>
                )}
                <Td right accent="text-terminal-amber font-bold">
                  {medal(rComposite[i])}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Capture detail */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {metrics.map((m) => (
          <div key={m.scheme_code} className="border border-terminal-border rounded p-3 space-y-1">
            <p className="text-[10px] font-semibold truncate" style={{ color: m.color }}>{shortName(m.scheme_name)}</p>
            {[
              { label: 'UCR', val: m.ucr, good: (v) => v >= 100 },
              { label: 'DCR', val: m.dcr, good: (v) => v <= 100 },
              { label: 'Capture', val: m.captureRatio, good: (v) => v >= 1, suffix: 'x' },
            ].map(({ label, val, good, suffix = '%' }) => (
              <div key={label} className="flex justify-between text-[10px]">
                <span className="text-terminal-muted">{label}</span>
                <span className={isNaN(val) ? 'text-terminal-muted' : good(val) ? 'text-terminal-green font-mono' : 'text-terminal-red font-mono'}>
                  {isNaN(val) ? '—' : label === 'Capture' ? `${val.toFixed(2)}x` : `${val.toFixed(1)}%`}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Main chart component ───────────────────────────────────────────────────────
const TerminalChart = ({ data, analyticsData, analyticsLoading, loading, error, activeSection, onSectionChange, hasData, rfRate }) => {
  const [activeWindow, setActiveWindow] = useState('3y');
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* KPI strip - only show when data is loaded */}
      {!loading && !error && data && (
        <KpiStrip data={data} rfRate={rfRate} activeWindow={activeWindow} setActiveWindow={setActiveWindow} />
      )}

      {/* Main content area */}
      <div className="flex-1 overflow-y-auto terminal-scrollbar px-5 py-5">
        {error && <p className="text-terminal-red text-sm">ERROR: {error}</p>}
        {loading && (
          <div className="flex items-center gap-3 text-terminal-amber">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm">Fetching data…</span>
          </div>
        )}
        {!loading && !error && !data && (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-terminal-muted">
            <p className="text-lg font-mono text-terminal-amber mb-2">▸ MF<span className="text-terminal-green">TERM</span> v1.0</p>
            <p className="text-sm mb-1">SELECT funds and benchmark</p>
            <p className="text-sm mb-1">CHOOSE rolling windows</p>
            <p className="text-sm">PRESS RUN to analyze</p>
          </div>
        )}
        {!loading && !error && data && (
          <>
            <NfoWarning data={data} />
            {activeSection === 'returns' && <ReturnsSection data={data} rfRate={rfRate} activeWindow={activeWindow} setActiveWindow={setActiveWindow} />}
            {activeSection === 'risk' && <RiskSection data={data} rfRate={rfRate} activeWindow={activeWindow} />}
            {activeSection === 'capture' && <CaptureSection data={data} rfRate={rfRate} activeWindow={activeWindow} />}
            {activeSection === 'drawdown' && <DrawdownSection data={data} analyticsData={analyticsData} analyticsLoading={analyticsLoading} rfRate={rfRate} activeWindow={activeWindow} />}
            {activeSection === 'scorecard' && <ScorecardSection data={data} analyticsData={analyticsData} rfRate={rfRate} activeWindow={activeWindow} />}
            {activeSection === 'dist' && <DistributionSection data={data} rfRate={rfRate} activeWindow={activeWindow} />}
            {activeSection === 'sip' && <SipPlannerSection data={data} rfRate={rfRate} activeWindow={activeWindow} />}
            {activeSection === 'monthly' && <MonthlyHeatmapSection data={data} />}
            {activeSection === 'reverse-sip' && <ReverseSipSection data={data} activeWindow={activeWindow} />}
            {activeSection === 'retirement' && <RetirementSection data={data} activeWindow={activeWindow} />}
            {activeSection === 'lumpsum-sip' && <LumpsumVsSipSection data={data} />}
            {activeSection === 'entry-heatmap' && <EntryHeatmapSection data={data} />}
            {activeSection === 'ter-impact' && <TerImpactSection data={data} />}
            {activeSection === 'ranking' && <RankingSection data={data} analyticsData={analyticsData} rfRate={rfRate} activeWindow={activeWindow} />}
          </>
        )}
      </div>

      {/* Bottom section tabs */}
      {(hasData || loading) && (
        <nav className="flex-shrink-0 border-t border-terminal-border bg-terminal-surface flex items-center">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => onSectionChange(s.id)}
              className={`flex-1 py-3 text-[10px] font-mono font-semibold tracking-wider transition-colors border-t-[3px] ${
                activeSection === s.id
                  ? 'border-terminal-amber text-terminal-amber bg-terminal-bg'
                  : 'border-transparent text-terminal-muted hover:text-terminal-text'
              }`}
            >
              {s.label}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
};

export default TerminalChart;
