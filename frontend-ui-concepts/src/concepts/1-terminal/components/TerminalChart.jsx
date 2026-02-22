import { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter, ReferenceLine, ReferenceArea,
  AreaChart, Area,
} from 'recharts';
import {
  FUND_COLORS, BENCHMARK_COLOR, WINDOWS,
  fmt2, fmt1, fmtRatio, shortName, tickFormatter,
  buildChartData, computeAllStats, rfPeriodPct,
} from '../../../shared/utils/chartUtils';

// ── Dark theme chart styles ────────────────────────────────────────────────────
const GRID = '#30363d';
const TICK_STYLE = { fontSize: 9, fill: '#8b949e' };
const TOOLTIP_STYLE = { backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: 6, fontSize: 10 };

const SECTIONS = [
  { id: 'returns', label: '01 RETURNS' },
  { id: 'risk', label: '02 RISK' },
  { id: 'capture', label: '03 CAPTURE' },
  { id: 'drawdown', label: '04 DRAWDOWN' },
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

// ── Returns section ────────────────────────────────────────────────────────────
const ReturnsSection = ({ data }) => {
  const [activeWindow, setActiveWindow] = useState('3y');
  const [returnType, setReturnType] = useState('absolute');
  const avail = useMemo(() => data?.benchmark_windows?.map((bw) => bw.window) ?? [], [data]);
  const curWin = avail.includes(activeWindow) ? activeWindow : (avail[0] ?? '3y');
  const benchWin = data?.benchmark_windows?.find((bw) => bw.window === curWin);
  const rfPct = rfPeriodPct(data?.risk_free_rate ?? 0.065, benchWin?.window_days ?? 365, returnType);
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

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke={GRID} />
          <XAxis dataKey="date" tickFormatter={tickFormatter} tick={TICK_STYLE} tickLine={false} axisLine={{ stroke: GRID }} />
          <YAxis tickFormatter={(v) => `${v.toFixed(1)}%`} tick={TICK_STYLE} tickLine={false} axisLine={false} />
          <Tooltip formatter={(v) => fmt2(v)} contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#8b949e' }} />
          <Legend wrapperStyle={{ fontSize: 10, color: '#8b949e' }} />
          <ReferenceLine y={0} stroke={GRID} strokeDasharray="4 2" />
          <Line type="monotone" dataKey="benchmark" name={data?.benchmark_name ?? 'Benchmark'} stroke={BENCHMARK_COLOR} dot={false} strokeWidth={1.5} />
          {(data?.funds ?? []).map((f, i) => (
            <Line key={f.scheme_code} type="monotone" dataKey={`fund_${f.scheme_code}`} name={f.scheme_name} stroke={FUND_COLORS[i % FUND_COLORS.length]} dot={false} strokeWidth={1.5} />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* Outperformance table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <Th>Fund</Th>
              <Th right>Periods</Th>
              <Th right>Out%</Th>
              <Th right>Under%</Th>
              <Th right>Avg Alpha</Th>
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
  );
};

// ── Risk section ───────────────────────────────────────────────────────────────
const RiskSection = ({ data }) => {
  const [activeWindow, setActiveWindow] = useState('3y');
  const avail = useMemo(() => data?.benchmark_windows?.map((bw) => bw.window) ?? [], [data]);
  const curWin = avail.includes(activeWindow) ? activeWindow : (avail[0] ?? '3y');
  const benchWin = data?.benchmark_windows?.find((bw) => bw.window === curWin);
  const rfPct = rfPeriodPct(data?.risk_free_rate ?? 0.065, benchWin?.window_days ?? 365, 'absolute');
  const chartData = useMemo(() => buildChartData(data?.funds ?? [], benchWin, 'absolute'), [data, benchWin]);
  const allStats = useMemo(() => computeAllStats(data?.funds ?? [], chartData, rfPct), [data, chartData, rfPct]);

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

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] text-terminal-muted uppercase tracking-widest mb-2">Volatility · Beta · Tracking Error</p>
          <table className="w-full">
            <thead><tr><Th>Fund</Th><Th right>Std Dev</Th><Th right>Beta</Th><Th right>TE</Th><Th right>IR</Th></tr></thead>
            <tbody>
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
          <p className="text-[10px] text-terminal-muted uppercase tracking-widest mb-2">Sharpe · Sortino</p>
          <table className="w-full">
            <thead><tr><Th>Fund</Th><Th right>Sharpe</Th><Th right>Sortino</Th></tr></thead>
            <tbody>
              {allStats.map(({ fund, color, vol }) => (
                <tr key={fund.scheme_code} className="hover:bg-terminal-surface/60">
                  <Td><FundDot color={color} name={fund.scheme_name} /></Td>
                  <Td right accent={colorCls(vol.sharpeFund)}>{fmtRatio(vol.sharpeFund)}</Td>
                  <Td right accent={colorCls(vol.sortinoFund)}>{fmtRatio(vol.sortinoFund)}</Td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="text-[10px] text-terminal-muted uppercase tracking-widest mt-4 mb-2">Risk vs Return Scatter</p>
          <ResponsiveContainer width="100%" height={200}>
            <ScatterChart margin={{ top: 5, right: 10, bottom: 15, left: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke={GRID} />
              <XAxis type="number" dataKey="x" tickFormatter={(v) => `${v.toFixed(1)}`} tick={TICK_STYLE} label={{ value: 'Std Dev', position: 'insideBottom', offset: -8, fontSize: 9, fill: '#8b949e' }} />
              <YAxis type="number" dataKey="y" tickFormatter={(v) => `${v.toFixed(1)}`} tick={TICK_STYLE} tickLine={false} axisLine={false} />
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
const CaptureSection = ({ data }) => {
  const [activeWindow, setActiveWindow] = useState('3y');
  const avail = useMemo(() => data?.benchmark_windows?.map((bw) => bw.window) ?? [], [data]);
  const curWin = avail.includes(activeWindow) ? activeWindow : (avail[0] ?? '3y');
  const benchWin = data?.benchmark_windows?.find((bw) => bw.window === curWin);
  const rfPct = rfPeriodPct(data?.risk_free_rate ?? 0.065, benchWin?.window_days ?? 365, 'absolute');
  const chartData = useMemo(() => buildChartData(data?.funds ?? [], benchWin, 'absolute'), [data, benchWin]);
  const allStats = useMemo(() => computeAllStats(data?.funds ?? [], chartData, rfPct), [data, chartData, rfPct]);

  const allXY = allStats.flatMap((s) => s.scatterData);
  const xs = allXY.map((d) => d.x), ys = allXY.map((d) => d.y);
  const pad = 3;
  const domain = xs.length ? [Math.min(...xs, ...ys) - pad, Math.max(...xs, ...ys) + pad] : [-20, 20];

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

      {/* Capture ratios table */}
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

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Scatter */}
        <div>
          <p className="text-[10px] text-terminal-muted uppercase tracking-widest mb-2">Benchmark vs Fund Returns</p>
          <ResponsiveContainer width="100%" height={220}>
            <ScatterChart margin={{ top: 5, right: 10, bottom: 15, left: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke={GRID} />
              <XAxis type="number" dataKey="x" domain={domain} tickFormatter={(v) => `${v.toFixed(0)}%`} tick={TICK_STYLE} label={{ value: 'Benchmark', position: 'insideBottom', offset: -8, fontSize: 9, fill: '#8b949e' }} />
              <YAxis type="number" dataKey="y" domain={domain} tickFormatter={(v) => `${v.toFixed(0)}%`} tick={TICK_STYLE} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => fmt2(v)} />
              <ReferenceArea x1={domain[0]} x2={0} y1={domain[0]} y2={0} fill="#ef444420" />
              <ReferenceArea x1={0} x2={domain[1]} y1={0} y2={domain[1]} fill="#22c55e20" />
              <ReferenceLine segment={[{ x: domain[0], y: domain[0] }, { x: domain[1], y: domain[1] }]} stroke={GRID} strokeDasharray="4 2" />
              {allStats.map(({ fund, color, scatterData }) => <Scatter key={fund.scheme_code} name={fund.scheme_name} data={scatterData} fill={color} opacity={0.75} r={3} />)}
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Alpha areas */}
        <div className="space-y-3">
          {allStats.map(({ fund, color, alphaData }) => {
            const vals = alphaData.map((d) => d.alpha);
            const yMax = vals.length ? Math.max(...vals, 0) : 1;
            const yMin = vals.length ? Math.min(...vals, 0) : -1;
            const split = yMax !== yMin ? `${((yMax / (yMax - yMin)) * 100).toFixed(1)}%` : '50%';
            return (
              <div key={fund.scheme_code}>
                <p className="text-[9px] text-terminal-muted uppercase tracking-widest mb-1">Alpha — {shortName(fund.scheme_name)}</p>
                <svg width="0" height="0" style={{ position: 'absolute' }}>
                  <defs>
                    <linearGradient id={`tgrad-${fund.scheme_code}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset={split} stopColor="#22c55e" stopOpacity={0.35} />
                      <stop offset={split} stopColor="#ef4444" stopOpacity={0.35} />
                    </linearGradient>
                  </defs>
                </svg>
                <ResponsiveContainer width="100%" height={100}>
                  <AreaChart data={alphaData} margin={{ top: 2, right: 5, bottom: 2, left: 0 }}>
                    <CartesianGrid strokeDasharray="2 4" stroke={GRID} />
                    <XAxis dataKey="date" tickFormatter={tickFormatter} tick={{ fontSize: 8, fill: '#8b949e' }} tickLine={false} />
                    <YAxis tickFormatter={(v) => `${v.toFixed(0)}%`} tick={{ fontSize: 8, fill: '#8b949e' }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => fmt2(v)} />
                    <ReferenceLine y={0} stroke={GRID} strokeDasharray="3 2" />
                    <Area type="monotone" dataKey="alpha" stroke={color} fill={`url(#tgrad-${fund.scheme_code})`} strokeWidth={1} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ── Drawdown section ───────────────────────────────────────────────────────────
const DrawdownSection = ({ analyticsData, analyticsLoading }) => {
  if (analyticsLoading) return <p className="text-terminal-muted text-xs">Loading drawdown data…</p>;
  if (!analyticsData) return <p className="text-terminal-muted text-xs">No drawdown data available.</p>;

  const allFunds = analyticsData.funds ?? [];
  const benchDD = analyticsData.benchmark_drawdown;
  const allDD = [benchDD?.max_drawdown ?? 0, ...allFunds.map((f) => f.drawdown.max_drawdown)];
  const worst = Math.min(...allDD);

  return (
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
  );
};

// ── Main chart component ───────────────────────────────────────────────────────
const TerminalChart = ({ data, analyticsData, analyticsLoading, loading, error, activeSection, onSectionChange, hasData }) => {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
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
            {activeSection === 'returns' && <ReturnsSection data={data} />}
            {activeSection === 'risk' && <RiskSection data={data} />}
            {activeSection === 'capture' && <CaptureSection data={data} />}
            {activeSection === 'drawdown' && <DrawdownSection analyticsData={analyticsData} analyticsLoading={analyticsLoading} />}
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
              className={`flex-1 py-2.5 text-xs font-mono font-semibold tracking-wider transition-colors border-t-2 ${
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
