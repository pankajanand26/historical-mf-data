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

const TABS = [
  { id: 'returns', label: 'Returns', toc: ['Chart', 'Outperformance'] },
  { id: 'risk', label: 'Risk', toc: ['Volatility', 'Sharpe/Sortino', 'Risk-Return'] },
  { id: 'capture', label: 'Capture', toc: ['Ratios', 'Scatter', 'Alpha'] },
  { id: 'drawdown', label: 'Drawdown', toc: ['Table'] },
];

// ── Theming helpers ────────────────────────────────────────────────────────────
const G = (dark) => ({
  grid: dark ? '#313244' : '#f1f5f9',
  tick: dark ? '#6c7086' : '#94a3b8',
  tip: { backgroundColor: dark ? '#181825' : '#fff', border: `1px solid ${dark ? '#45475a' : '#e2e8f0'}`, borderRadius: 6, fontSize: 10 },
  accent: dark ? '#cba6f7' : '#4f46e5',
  th: dark ? 'text-[#6c7086]' : 'text-slate-400',
  td: dark ? 'text-[#cdd6f4]' : 'text-slate-600',
  rowHover: dark ? 'hover:bg-[#313244]/50' : 'hover:bg-slate-50',
  border: dark ? 'border-[#313244]/50' : 'border-slate-100',
  card: dark ? 'bg-[#181825] border-[#313244]' : 'bg-white border-slate-200',
});

const colorCls = (v, dark) => {
  if (v == null || isNaN(v)) return dark ? 'text-[#45475a]' : 'text-slate-300';
  return v >= 0 ? (dark ? 'text-[#a6e3a1]' : 'text-emerald-600') : (dark ? 'text-[#f38ba8]' : 'text-red-500');
};

const Th = ({ children, right, dark }) => {
  const g = G(dark);
  return <th className={`px-3 py-2 text-[9px] font-semibold uppercase tracking-widest ${g.th} border-b ${g.border} ${right ? 'text-right' : 'text-left'}`}>{children}</th>;
};
const Td = ({ children, right, accent, dark }) => {
  const g = G(dark);
  return <td className={`px-3 py-2 text-xs tabular-mono border-b ${g.border} ${right ? 'text-right' : ''} ${accent ?? g.td}`}>{children}</td>;
};
const FundDot = ({ color, name }) => (
  <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} /><span className="truncate max-w-[160px]">{shortName(name)}</span></div>
);

// ── Returns section ────────────────────────────────────────────────────────────
const ReturnsSection = ({ data, dark }) => {
  const g = G(dark);
  const [activeWindow, setActiveWindow] = useState('3y');
  const [returnType, setReturnType] = useState('absolute');
  const avail = useMemo(() => data?.benchmark_windows?.map((bw) => bw.window) ?? [], [data]);
  const curWin = avail.includes(activeWindow) ? activeWindow : (avail[0] ?? '3y');
  const benchWin = data?.benchmark_windows?.find((bw) => bw.window === curWin);
  const rfPct = rfPeriodPct(data?.risk_free_rate ?? 0.065, benchWin?.window_days ?? 365, returnType);
  const chartData = useMemo(() => buildChartData(data?.funds ?? [], benchWin, returnType), [data, benchWin, returnType]);
  const allStats = useMemo(() => computeAllStats(data?.funds ?? [], chartData, rfPct), [data, chartData, rfPct]);

  const btnCls = (active) => `px-2.5 py-1 rounded text-xs font-medium transition-colors ${
    active
      ? dark ? 'bg-[#cba6f7] text-[#1e1e2e]' : 'bg-indigo-600 text-white'
      : dark ? 'text-[#6c7086] border border-[#313244] hover:border-[#cba6f7]' : 'text-slate-500 border border-slate-200 hover:border-indigo-300'
  }`;

  return (
    <div className="space-y-6">
      <div id="wb-chart">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <div className="flex gap-1">
            {avail.map((w) => <button key={w} onClick={() => setActiveWindow(w)} className={btnCls(curWin === w)}>{WINDOWS.find((x) => x.id === w)?.label ?? w.toUpperCase()}</button>)}
          </div>
          <div className="ml-auto flex gap-1">
            {['absolute', 'cagr'].map((rt) => <button key={rt} onClick={() => setReturnType(rt)} className={btnCls(returnType === rt)}>{rt === 'absolute' ? 'Abs' : 'CAGR'}</button>)}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="2 4" stroke={g.grid} />
            <XAxis dataKey="date" tickFormatter={tickFormatter} tick={{ fontSize: 9, fill: g.tick }} tickLine={false} />
            <YAxis tickFormatter={(v) => `${v.toFixed(1)}%`} tick={{ fontSize: 9, fill: g.tick }} tickLine={false} axisLine={false} />
            <Tooltip formatter={(v) => fmt2(v)} contentStyle={g.tip} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <ReferenceLine y={0} stroke={g.grid} strokeDasharray="4 2" />
            <Line type="monotone" dataKey="benchmark" name={data?.benchmark_name ?? 'Benchmark'} stroke={BENCHMARK_COLOR} dot={false} strokeWidth={1.5} />
            {(data?.funds ?? []).map((f, i) => <Line key={f.scheme_code} type="monotone" dataKey={`fund_${f.scheme_code}`} name={f.scheme_name} stroke={FUND_COLORS[i % FUND_COLORS.length]} dot={false} strokeWidth={1.5} />)}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div id="wb-outperf">
        <p className={`text-[10px] font-semibold uppercase tracking-widest mb-2 ${g.th}`}>Outperformance</p>
        <table className="w-full">
          <thead><tr><Th dark={dark}>Fund</Th><Th dark={dark} right>Periods</Th><Th dark={dark} right>Out%</Th><Th dark={dark} right>Under%</Th><Th dark={dark} right>Avg Alpha</Th></tr></thead>
          <tbody>{allStats.map(({ fund, color, outperf }) => (
            <tr key={fund.scheme_code} className={g.rowHover}>
              <Td dark={dark}><FundDot color={color} name={fund.scheme_name} /></Td>
              <Td dark={dark} right>{outperf.total}</Td>
              <Td dark={dark} right accent={dark ? 'text-[#a6e3a1]' : 'text-emerald-600'}>{fmt1(outperf.outperformedPct)}</Td>
              <Td dark={dark} right accent={dark ? 'text-[#f38ba8]' : 'text-red-500'}>{fmt1(outperf.underperformedPct)}</Td>
              <Td dark={dark} right accent={colorCls(outperf.avgAlpha, dark)}>{fmt2(outperf.avgAlpha)}</Td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
};

// ── Risk section ───────────────────────────────────────────────────────────────
const RiskSection = ({ data, dark }) => {
  const g = G(dark);
  const [activeWindow, setActiveWindow] = useState('3y');
  const avail = useMemo(() => data?.benchmark_windows?.map((bw) => bw.window) ?? [], [data]);
  const curWin = avail.includes(activeWindow) ? activeWindow : (avail[0] ?? '3y');
  const benchWin = data?.benchmark_windows?.find((bw) => bw.window === curWin);
  const rfPct = rfPeriodPct(data?.risk_free_rate ?? 0.065, benchWin?.window_days ?? 365, 'absolute');
  const chartData = useMemo(() => buildChartData(data?.funds ?? [], benchWin, 'absolute'), [data, benchWin]);
  const allStats = useMemo(() => computeAllStats(data?.funds ?? [], chartData, rfPct), [data, chartData, rfPct]);
  const scatter = allStats.map(({ fund, color, vol }) => ({ name: fund.scheme_name, color, x: vol.stdDevFund, y: vol.meanFund })).filter((d) => !isNaN(d.x) && !isNaN(d.y));
  const btnCls = (active) => `px-2.5 py-1 rounded text-xs font-medium transition-colors ${active ? (dark ? 'bg-[#cba6f7] text-[#1e1e2e]' : 'bg-indigo-600 text-white') : (dark ? 'text-[#6c7086] border border-[#313244]' : 'text-slate-500 border border-slate-200')}`;

  return (
    <div className="space-y-6">
      <div className="flex gap-1 mb-1">{avail.map((w) => <button key={w} onClick={() => setActiveWindow(w)} className={btnCls(curWin === w)}>{WINDOWS.find((x) => x.id === w)?.label ?? w.toUpperCase()}</button>)}</div>
      <div id="wb-vol">
        <p className={`text-[10px] font-semibold uppercase tracking-widest mb-2 ${g.th}`}>Volatility & Tracking</p>
        <table className="w-full"><thead><tr><Th dark={dark}>Fund</Th><Th dark={dark} right>Std Dev</Th><Th dark={dark} right>Beta</Th><Th dark={dark} right>TE</Th></tr></thead>
          <tbody>{allStats.map(({ fund, color, vol }) => (
            <tr key={fund.scheme_code} className={g.rowHover}>
              <Td dark={dark}><FundDot color={color} name={fund.scheme_name} /></Td>
              <Td dark={dark} right>{fmtRatio(vol.stdDevFund)}</Td><Td dark={dark} right>{fmtRatio(vol.beta)}</Td><Td dark={dark} right>{fmtRatio(vol.trackingError)}</Td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div id="wb-sharpe">
        <p className={`text-[10px] font-semibold uppercase tracking-widest mb-2 ${g.th}`}>Sharpe / Sortino / IR</p>
        <table className="w-full"><thead><tr><Th dark={dark}>Fund</Th><Th dark={dark} right>Sharpe</Th><Th dark={dark} right>Sortino</Th><Th dark={dark} right>IR</Th></tr></thead>
          <tbody>{allStats.map(({ fund, color, vol }) => (
            <tr key={fund.scheme_code} className={g.rowHover}>
              <Td dark={dark}><FundDot color={color} name={fund.scheme_name} /></Td>
              <Td dark={dark} right accent={colorCls(vol.sharpeFund, dark)}>{fmtRatio(vol.sharpeFund)}</Td>
              <Td dark={dark} right accent={colorCls(vol.sortinoFund, dark)}>{fmtRatio(vol.sortinoFund)}</Td>
              <Td dark={dark} right accent={colorCls(vol.infoRatio, dark)}>{fmtRatio(vol.infoRatio)}</Td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div id="wb-scatter">
        <p className={`text-[10px] font-semibold uppercase tracking-widest mb-2 ${g.th}`}>Risk vs Return</p>
        <ResponsiveContainer width="100%" height={220}>
          <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
            <CartesianGrid strokeDasharray="2 4" stroke={g.grid} />
            <XAxis type="number" dataKey="x" tickFormatter={(v) => `${v.toFixed(1)}%`} tick={{ fontSize: 9, fill: g.tick }} label={{ value: 'Std Dev', position: 'insideBottom', offset: -10, fontSize: 9, fill: g.tick }} />
            <YAxis type="number" dataKey="y" tickFormatter={(v) => `${v.toFixed(1)}%`} tick={{ fontSize: 9, fill: g.tick }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={g.tip} content={({ payload }) => { if (!payload?.length) return null; const p = payload[0].payload; return <div style={g.tip} className="p-2 text-xs"><p className="font-medium mb-0.5">{p.name}</p><p>Risk: {fmtRatio(p.x)}</p><p>Ret: {fmt2(p.y)}</p></div>; }} />
            {scatter.map((d, i) => <Scatter key={i} name={d.name} data={[d]} fill={d.color} />)}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// ── Capture section ────────────────────────────────────────────────────────────
const CaptureSection = ({ data, dark }) => {
  const g = G(dark);
  const [activeWindow, setActiveWindow] = useState('3y');
  const avail = useMemo(() => data?.benchmark_windows?.map((bw) => bw.window) ?? [], [data]);
  const curWin = avail.includes(activeWindow) ? activeWindow : (avail[0] ?? '3y');
  const benchWin = data?.benchmark_windows?.find((bw) => bw.window === curWin);
  const rfPct = rfPeriodPct(data?.risk_free_rate ?? 0.065, benchWin?.window_days ?? 365, 'absolute');
  const chartData = useMemo(() => buildChartData(data?.funds ?? [], benchWin, 'absolute'), [data, benchWin]);
  const allStats = useMemo(() => computeAllStats(data?.funds ?? [], chartData, rfPct), [data, chartData, rfPct]);
  const allXY = allStats.flatMap((s) => s.scatterData);
  const xs = allXY.map((d) => d.x), ys = allXY.map((d) => d.y);
  const domain = xs.length ? [Math.min(...xs, ...ys) - 3, Math.max(...xs, ...ys) + 3] : [-20, 20];
  const btnCls = (active) => `px-2.5 py-1 rounded text-xs font-medium transition-colors ${active ? (dark ? 'bg-[#cba6f7] text-[#1e1e2e]' : 'bg-indigo-600 text-white') : (dark ? 'text-[#6c7086] border border-[#313244]' : 'text-slate-500 border border-slate-200')}`;

  return (
    <div className="space-y-6">
      <div className="flex gap-1">{avail.map((w) => <button key={w} onClick={() => setActiveWindow(w)} className={btnCls(curWin === w)}>{WINDOWS.find((x) => x.id === w)?.label ?? w.toUpperCase()}</button>)}</div>
      <div id="wb-capture">
        <p className={`text-[10px] font-semibold uppercase tracking-widest mb-2 ${g.th}`}>Capture Ratios</p>
        <table className="w-full"><thead><tr><Th dark={dark}>Fund</Th><Th dark={dark} right>UCR</Th><Th dark={dark} right>DCR</Th><Th dark={dark} right>Ratio</Th><Th dark={dark} right>Up%</Th><Th dark={dark} right>Dn%</Th></tr></thead>
          <tbody>{allStats.map(({ fund, color, capture }) => (
            <tr key={fund.scheme_code} className={g.rowHover}>
              <Td dark={dark}><FundDot color={color} name={fund.scheme_name} /></Td>
              <Td dark={dark} right accent={colorCls(capture.ucr != null ? capture.ucr - 100 : null, dark)}>{fmtRatio(capture.ucr)}</Td>
              <Td dark={dark} right accent={colorCls(capture.dcr != null ? 100 - capture.dcr : null, dark)}>{fmtRatio(capture.dcr)}</Td>
              <Td dark={dark} right accent={colorCls(capture.captureRatio != null ? capture.captureRatio - 1 : null, dark)}>{fmtRatio(capture.captureRatio)}</Td>
              <Td dark={dark} right>{fmt1(capture.upConsistPct)}</Td><Td dark={dark} right>{fmt1(capture.downConsistPct)}</Td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div id="wb-scatter2">
        <p className={`text-[10px] font-semibold uppercase tracking-widest mb-2 ${g.th}`}>Benchmark vs Fund</p>
        <ResponsiveContainer width="100%" height={200}>
          <ScatterChart margin={{ top: 10, right: 10, bottom: 18, left: 0 }}>
            <CartesianGrid strokeDasharray="2 4" stroke={g.grid} />
            <XAxis type="number" dataKey="x" domain={domain} tickFormatter={(v) => `${v.toFixed(0)}%`} tick={{ fontSize: 9, fill: g.tick }} label={{ value: 'Benchmark', position: 'insideBottom', offset: -8, fontSize: 9, fill: g.tick }} />
            <YAxis type="number" dataKey="y" domain={domain} tickFormatter={(v) => `${v.toFixed(0)}%`} tick={{ fontSize: 9, fill: g.tick }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={g.tip} formatter={(v) => fmt2(v)} />
            <ReferenceArea x1={domain[0]} x2={0} y1={domain[0]} y2={0} fill={dark ? '#f38ba810' : '#fef2f2'} fillOpacity={0.5} />
            <ReferenceArea x1={0} x2={domain[1]} y1={0} y2={domain[1]} fill={dark ? '#a6e3a110' : '#f0fdf4'} fillOpacity={0.5} />
            <ReferenceLine segment={[{ x: domain[0], y: domain[0] }, { x: domain[1], y: domain[1] }]} stroke={g.grid} strokeDasharray="4 2" />
            {allStats.map(({ fund, color, scatterData }) => <Scatter key={fund.scheme_code} name={fund.scheme_name} data={scatterData} fill={color} opacity={0.7} r={3} />)}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div id="wb-alpha">
        <p className={`text-[10px] font-semibold uppercase tracking-widest mb-2 ${g.th}`}>Rolling Alpha</p>
        {allStats.map(({ fund, color, alphaData }) => {
          const vals = alphaData.map((d) => d.alpha);
          const yMax = vals.length ? Math.max(...vals, 0) : 1;
          const yMin = vals.length ? Math.min(...vals, 0) : -1;
          const split = yMax !== yMin ? `${((yMax / (yMax - yMin)) * 100).toFixed(1)}%` : '50%';
          return (
            <div key={fund.scheme_code} className="mb-4">
              <p className={`text-[9px] mb-1 ${g.th}`}>{shortName(fund.scheme_name)}</p>
              <svg width="0" height="0" style={{ position: 'absolute' }}>
                <defs>
                  <linearGradient id={`wbgrad-${fund.scheme_code}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset={split} stopColor={dark ? '#a6e3a1' : '#10b981'} stopOpacity={0.3} />
                    <stop offset={split} stopColor={dark ? '#f38ba8' : '#ef4444'} stopOpacity={0.3} />
                  </linearGradient>
                </defs>
              </svg>
              <ResponsiveContainer width="100%" height={100}>
                <AreaChart data={alphaData} margin={{ top: 2, right: 5, bottom: 2, left: 0 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke={g.grid} />
                  <XAxis dataKey="date" tickFormatter={tickFormatter} tick={{ fontSize: 8, fill: g.tick }} tickLine={false} />
                  <YAxis tickFormatter={(v) => `${v.toFixed(0)}%`} tick={{ fontSize: 8, fill: g.tick }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={g.tip} formatter={(v) => fmt2(v)} />
                  <ReferenceLine y={0} stroke={g.grid} strokeDasharray="3 2" />
                  <Area type="monotone" dataKey="alpha" stroke={color} fill={`url(#wbgrad-${fund.scheme_code})`} strokeWidth={1} dot={false} />
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
const DrawdownSection = ({ analyticsData, analyticsLoading, dark }) => {
  const g = G(dark);
  if (analyticsLoading) return <p className={`text-xs ${g.th}`}>Loading…</p>;
  if (!analyticsData) return <p className={`text-xs ${g.th}`}>No data.</p>;
  const allFunds = analyticsData.funds ?? [];
  const bench = analyticsData.benchmark_drawdown;
  const worst = Math.min(bench?.max_drawdown ?? 0, ...allFunds.map((f) => f.drawdown.max_drawdown));

  return (
    <div id="wb-dd">
      <p className={`text-[10px] font-semibold uppercase tracking-widest mb-2 ${g.th}`}>Drawdown Table</p>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead><tr><Th dark={dark}>Fund</Th><Th dark={dark} right>Max DD</Th><Th dark={dark} right>Peak</Th><Th dark={dark} right>Trough</Th><Th dark={dark} right>Days</Th><Th dark={dark} right>Recovery</Th><Th dark={dark}>Severity</Th></tr></thead>
          <tbody>
            {bench && (
              <tr className={g.rowHover}>
                <Td dark={dark}><FundDot color={BENCHMARK_COLOR} name={analyticsData.benchmark_name ?? 'Benchmark'} /></Td>
                <Td dark={dark} right accent={dark ? 'text-[#f38ba8]' : 'text-red-500'}>{fmt1(bench.max_drawdown)}</Td>
                <Td dark={dark} right>{bench.peak_date ?? '—'}</Td><Td dark={dark} right>{bench.trough_date ?? '—'}</Td>
                <Td dark={dark} right>{bench.drawdown_duration_days ?? '—'}</Td>
                <Td dark={dark} right>{bench.recovery_date ?? 'N/R'}</Td>
                <Td dark={dark}><div className={`w-20 h-1.5 rounded-full ${dark ? 'bg-[#313244]' : 'bg-slate-100'}`}><div className={`h-1.5 rounded-full ${dark ? 'bg-[#f38ba8]' : 'bg-red-400'}`} style={{ width: `${Math.min(100, (bench.max_drawdown / worst) * 100)}%` }} /></div></Td>
              </tr>
            )}
            {allFunds.map((f, i) => {
              const dd = f.drawdown;
              return (
                <tr key={f.scheme_code} className={g.rowHover}>
                  <Td dark={dark}><FundDot color={FUND_COLORS[i % FUND_COLORS.length]} name={f.scheme_name} /></Td>
                  <Td dark={dark} right accent={dark ? 'text-[#f38ba8]' : 'text-red-500'}>{fmt1(dd.max_drawdown)}</Td>
                  <Td dark={dark} right>{dd.peak_date ?? '—'}</Td><Td dark={dark} right>{dd.trough_date ?? '—'}</Td>
                  <Td dark={dark} right>{dd.drawdown_duration_days ?? '—'}</Td>
                  <Td dark={dark} right>{dd.recovery_date ?? 'N/R'}</Td>
                  <Td dark={dark}><div className={`w-20 h-1.5 rounded-full ${dark ? 'bg-[#313244]' : 'bg-slate-100'}`}><div className={`h-1.5 rounded-full ${dark ? 'bg-[#f38ba8]' : 'bg-red-500'}`} style={{ width: `${Math.min(100, (dd.max_drawdown / worst) * 100)}%` }} /></div></Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── Root ───────────────────────────────────────────────────────────────────────
const AnalysisTabs = ({ data, analyticsData, analyticsLoading, loading, error, activeTab, onTabChange, darkMode }) => {
  const g = G(darkMode);
  const currentTabMeta = TABS.find((t) => t.id === activeTab);

  const scrollTo = (anchor) => {
    const el = document.getElementById(anchor);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tab bar + mini TOC */}
      <div className={`flex-shrink-0 flex items-center px-5 border-b gap-1 ${darkMode ? 'bg-[#181825] border-[#313244]' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-1 py-2">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => onTabChange(t.id)}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                activeTab === t.id
                  ? darkMode ? 'bg-[#313244] text-[#cba6f7]' : 'bg-indigo-50 text-indigo-700'
                  : darkMode ? 'text-[#6c7086] hover:text-[#cdd6f4]' : 'text-slate-500 hover:text-slate-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
        {/* Mini TOC */}
        {data && currentTabMeta?.toc?.length > 0 && (
          <div className={`ml-auto flex items-center gap-3 text-[10px] ${darkMode ? 'text-[#6c7086]' : 'text-slate-400'}`}>
            <span className="opacity-50">Jump:</span>
            {currentTabMeta.toc.map((label, i) => {
              const anchors = {
                'Chart': 'wb-chart', 'Outperformance': 'wb-outperf',
                'Volatility': 'wb-vol', 'Sharpe/Sortino': 'wb-sharpe', 'Risk-Return': 'wb-scatter',
                'Ratios': 'wb-capture', 'Scatter': 'wb-scatter2', 'Alpha': 'wb-alpha',
                'Table': 'wb-dd',
              };
              return (
                <button key={i} onClick={() => scrollTo(anchors[label] ?? '')}
                  className={`hover:underline transition-colors ${darkMode ? 'hover:text-[#cba6f7]' : 'hover:text-indigo-600'}`}>
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto thin-scrollbar px-6 py-5">
        {error && <p className={`text-sm ${darkMode ? 'text-[#f38ba8]' : 'text-red-500'}`}>Error: {error}</p>}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <svg className={`w-8 h-8 animate-spin ${darkMode ? 'text-[#cba6f7]' : 'text-indigo-400'}`} fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}
        {!loading && !error && !data && (
          <div className={`flex flex-col items-center justify-center min-h-[400px] ${darkMode ? 'text-[#45475a]' : 'text-slate-300'}`}>
            <svg className="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className={`text-sm font-medium ${darkMode ? 'text-[#6c7086]' : 'text-slate-400'}`}>Configure funds and run analysis</p>
          </div>
        )}
        {!loading && !error && data && (
          <>
            {activeTab === 'returns' && <ReturnsSection data={data} dark={darkMode} />}
            {activeTab === 'risk' && <RiskSection data={data} dark={darkMode} />}
            {activeTab === 'capture' && <CaptureSection data={data} dark={darkMode} />}
            {activeTab === 'drawdown' && <DrawdownSection analyticsData={analyticsData} analyticsLoading={analyticsLoading} dark={darkMode} />}
          </>
        )}
      </div>
    </div>
  );
};

export default AnalysisTabs;
