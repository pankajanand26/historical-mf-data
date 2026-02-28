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
const ReturnsSection = ({ data, rfRate }) => {
  const [activeWindow, setActiveWindow] = useState('3y');
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
const RiskSection = ({ data, rfRate }) => {
  const [activeWindow, setActiveWindow] = useState('3y');
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
      <div className="flex gap-1">
        {avail.map((w) => (
          <button key={w} onClick={() => setActiveWindow(w)}
            className={`px-2.5 py-1 text-xs rounded transition-colors ${curWin === w ? 'bg-terminal-amber text-terminal-bg font-bold' : 'text-terminal-muted border border-terminal-border hover:border-terminal-amber'}`}>
            {WINDOWS.find((x) => x.id === w)?.label ?? w.toUpperCase()}
          </button>
        ))}
      </div>

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
const CaptureSection = ({ data, rfRate }) => {
  const [activeWindow, setActiveWindow] = useState('3y');
  const avail = useMemo(() => data?.benchmark_windows?.map((bw) => bw.window) ?? [], [data]);
  const curWin = avail.includes(activeWindow) ? activeWindow : (avail[0] ?? '3y');
  const benchWin = data?.benchmark_windows?.find((bw) => bw.window === curWin);
  const rfPct = rfPeriodPct(rfRate, benchWin?.window_days ?? 365, 'absolute');
  const chartData = useMemo(() => buildChartData(data?.funds ?? [], benchWin, 'absolute'), [data, benchWin]);
  const allStats = useMemo(() => computeAllStats(data?.funds ?? [], chartData, rfPct), [data, chartData, rfPct]);

  return (
    <div className="space-y-5">
      <div className="flex gap-1">
        {avail.map((w) => (
          <button key={w} onClick={() => setActiveWindow(w)}
            className={`px-2.5 py-1 text-xs rounded transition-colors ${curWin === w ? 'bg-terminal-amber text-terminal-bg font-bold' : 'text-terminal-muted border border-terminal-border hover:border-terminal-amber'}`}>
            {WINDOWS.find((x) => x.id === w)?.label ?? w.toUpperCase()}
          </button>
        ))}
      </div>

      <SectionLabel>Capture Ratios</SectionLabel>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead><tr><Th>Fund</Th><Th right>UCR</Th><Th right>DCR</Th><Th right>Ratio</Th><Th right>Up Cons%</Th><Th right>Dn Cons%</Th></tr></thead>
          <tbody>
            {allStats.map(({ fund, color, capture }) => (
              <tr key={fund.scheme_code} className="hover:bg-terminal-surface/60">
                <Td><FundDot color={color} name={fund.scheme_name} /></Td>
                <Td right accent={colorCls(capture.ucr != null ? capture.ucr - 100 : null)}>{fmtRatio(capture.ucr)}</Td>
                <Td right accent={colorCls(capture.dcr != null ? 100 - capture.dcr : null)}>{fmtRatio(capture.dcr)}</Td>
                <Td right accent={colorCls(capture.captureRatio != null ? capture.captureRatio - 1 : null)}>{fmtRatio(capture.captureRatio)}</Td>
                <Td right>{fmt1(capture.upConsistPct)}</Td>
                <Td right>{fmt1(capture.downConsistPct)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Observation Period Breakdown ──────────────────────────── */}
      <SectionLabel>Observation Period Breakdown</SectionLabel>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <Th>Fund</Th>
              <Th right>Total Obs</Th>
              <Th right>Up-Market</Th>
              <Th right>Down-Market</Th>
            </tr>
          </thead>
          <tbody>
            {allStats.map(({ fund, color, capture }) => (
              <tr key={fund.scheme_code} className="hover:bg-terminal-surface/60">
                <Td><FundDot color={color} name={fund.scheme_name} /></Td>
                <Td right>{capture.totalPeriods}</Td>
                <Td right accent="text-blue-400">{capture.upPeriods}</Td>
                <Td right accent="text-rose-400">{capture.downPeriods}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Down Market Alpha ─────────────────────────────────────── */}
      <SectionLabel>Down Market Alpha</SectionLabel>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <Th>Fund</Th>
              <Th right>Down Mkt Alpha</Th>
              <Th right>Down Periods</Th>
            </tr>
          </thead>
          <tbody>
            {allStats.map(({ fund, color, capture }) => (
              <tr key={fund.scheme_code} className="hover:bg-terminal-surface/60">
                <Td><FundDot color={color} name={fund.scheme_name} /></Td>
                <Td right accent={isNaN(capture.downAlpha) ? 'text-terminal-muted' : capture.downAlpha >= 0 ? 'text-terminal-green' : 'text-terminal-red'}>
                  {isNaN(capture.downAlpha) ? '—' : `${capture.downAlpha >= 0 ? '+' : ''}${capture.downAlpha.toFixed(2)}%`}
                </Td>
                <Td right>
                  {capture.downPeriods > 0 ? capture.downPeriods : <span className="text-terminal-muted">—</span>}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Freefincal-style Capture Ratios ───────────────────────── */}
      {allStats.some(({ fund }) => computeFreefincalCaptureStats(data?.monthly_returns, fund) !== null) && (
        <>
          <SectionLabel>Freefincal-style Capture Ratios</SectionLabel>
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
        </>
      )}

      <SectionLabel>Benchmark vs Fund Returns (per fund)</SectionLabel>      <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
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
const DrawdownSection = ({ data, analyticsData, analyticsLoading, rfRate }) => {
  const [activeWindow, setActiveWindow] = useState('3y');
  const avail = useMemo(() => data?.benchmark_windows?.map((bw) => bw.window) ?? [], [data]);
  const curWin = avail.includes(activeWindow) ? activeWindow : (avail[0] ?? '3y');
  const benchWin = data?.benchmark_windows?.find((bw) => bw.window === curWin);
  const rfPct = rfPeriodPct(rfRate, benchWin?.window_days ?? 365, 'absolute');
  const chartData = useMemo(() => buildChartData(data?.funds ?? [], benchWin, 'absolute'), [data, benchWin]);
  const allStats = useMemo(() => computeAllStats(data?.funds ?? [], chartData, rfPct), [data, chartData, rfPct]);

  if (analyticsLoading) return <p className="text-terminal-muted text-xs">Loading drawdown data…</p>;
  if (!analyticsData) return <p className="text-terminal-muted text-xs">No drawdown data available.</p>;

  const allFunds = analyticsData.funds ?? [];
  const benchDD = analyticsData.benchmark_drawdown;
  const allDD = [benchDD?.max_drawdown ?? 0, ...allFunds.map((f) => f.drawdown.max_drawdown)];
  const worst = Math.min(...allDD);

  return (
    <div className="space-y-5">
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
          <div className="flex gap-1">
            {avail.map((w) => (
              <button key={w} onClick={() => setActiveWindow(w)}
                className={`px-2.5 py-1 text-xs rounded transition-colors ${curWin === w ? 'bg-terminal-amber text-terminal-bg font-bold' : 'text-terminal-muted border border-terminal-border hover:border-terminal-amber'}`}>
                {WINDOWS.find((x) => x.id === w)?.label ?? w.toUpperCase()}
              </button>
            ))}
          </div>
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
const ScorecardSection = ({ data, analyticsData, rfRate }) => {
  const [activeWindow, setActiveWindow] = useState('3y');
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
      <div className="flex gap-1">
        {avail.map((w) => (
          <button key={w} onClick={() => setActiveWindow(w)}
            className={`px-2.5 py-1 text-xs rounded transition-colors ${curWin === w ? 'bg-terminal-amber text-terminal-bg font-bold' : 'text-terminal-muted border border-terminal-border hover:border-terminal-amber'}`}>
            {WINDOWS.find((x) => x.id === w)?.label ?? w.toUpperCase()}
          </button>
        ))}
      </div>

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
const DistributionSection = ({ data, rfRate }) => {
  const [activeWindow, setActiveWindow] = useState('3y');
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
          {avail.map((w) => (
            <button key={w} onClick={() => setActiveWindow(w)}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${curWin === w ? 'bg-terminal-amber text-terminal-bg font-bold' : 'text-terminal-muted border border-terminal-border hover:border-terminal-amber'}`}>
              {WINDOWS.find((x) => x.id === w)?.label ?? w.toUpperCase()}
            </button>
          ))}
        </div>
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
const SipPlannerSection = ({ data, rfRate }) => {
  const [activeWindow, setActiveWindow] = useState('3y');
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
        <div className="flex gap-1">
          {avail.map((w) => (
            <button key={w} onClick={() => setActiveWindow(w)}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${curWin === w ? 'bg-terminal-amber text-terminal-bg font-bold' : 'text-terminal-muted border border-terminal-border hover:border-terminal-amber'}`}>
              {WINDOWS.find((x) => x.id === w)?.label ?? w.toUpperCase()}
            </button>
          ))}
        </div>
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

// ── KPI Summary Strip ──────────────────────────────────────────────────────────
const KpiStrip = ({ data, analyticsData, rfRate }) => {
  const avail = data?.benchmark_windows?.map((bw) => bw.window) ?? [];
  const curWin = avail.includes('3y') ? '3y' : (avail[0] ?? '3y');
  const benchWin = data?.benchmark_windows?.find((bw) => bw.window === curWin);
  const rfPct = rfPeriodPct(rfRate, benchWin?.window_days ?? 365, 'absolute');
  const chartData = buildChartData(data?.funds ?? [], benchWin, 'absolute');
  const allStats = computeAllStats(data?.funds ?? [], chartData, rfPct);
  const kpis = computeKPIs(data?.funds ?? [], allStats, analyticsData);

  if (kpis.length === 0) return null;

  return (
    <div className="flex-shrink-0 border-b border-terminal-border bg-terminal-surface/50 px-5 py-2">
      <div className="flex items-center gap-6 overflow-x-auto">
        <span className="text-[10px] text-terminal-muted uppercase tracking-widest flex-shrink-0">KPIs ({curWin.toUpperCase()})</span>
        {kpis.map((kpi, i) => (
          <div key={i} className="flex-shrink-0 flex items-center gap-2">
            <span className="text-[10px] text-terminal-muted">{kpi.label}:</span>
            <span className={`text-sm font-mono font-bold ${kpi.positive ? 'text-terminal-green' : 'text-terminal-red'}`}>{kpi.value}</span>
            <span className="text-[9px] text-terminal-muted max-w-[100px] truncate">{kpi.sub}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Main chart component ───────────────────────────────────────────────────────
const TerminalChart = ({ data, analyticsData, analyticsLoading, loading, error, activeSection, onSectionChange, hasData, rfRate }) => {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* KPI strip - only show when data is loaded */}
      {!loading && !error && data && (
        <KpiStrip data={data} analyticsData={analyticsData} rfRate={rfRate} />
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
            {activeSection === 'returns' && <ReturnsSection data={data} rfRate={rfRate} />}
            {activeSection === 'risk' && <RiskSection data={data} rfRate={rfRate} />}
            {activeSection === 'capture' && <CaptureSection data={data} rfRate={rfRate} />}
            {activeSection === 'drawdown' && <DrawdownSection data={data} analyticsData={analyticsData} analyticsLoading={analyticsLoading} rfRate={rfRate} />}
            {activeSection === 'scorecard' && <ScorecardSection data={data} analyticsData={analyticsData} rfRate={rfRate} />}
            {activeSection === 'dist' && <DistributionSection data={data} rfRate={rfRate} />}
            {activeSection === 'sip' && <SipPlannerSection data={data} rfRate={rfRate} />}
            {activeSection === 'monthly' && <MonthlyHeatmapSection data={data} />}
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
