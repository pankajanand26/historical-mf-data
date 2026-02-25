import { useState, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter, ReferenceLine, ReferenceArea,
} from 'recharts';
import {
  FUND_COLORS, BENCHMARK_COLOR, WINDOWS,
  fmt2, fmt1, fmtRatio, shortName, tickFormatter,
  buildChartData, computeAllStats, rfPeriodPct,
} from '../../../shared/utils/chartUtils';

const SECTIONS = [
  { id: 'returns', label: 'Returns' },
  { id: 'risk', label: 'Risk' },
  { id: 'capture', label: 'Capture' },
  { id: 'drawdown', label: 'Drawdown' },
];

const TICK = { fontSize: 11, fill: '#1e3a5f80' };
const TIP = { backgroundColor: '#fff', border: '1px solid #1e3a5f25', borderRadius: 6, fontSize: 12 };

const Th = ({ children, right }) => (
  <th className={`px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-editorial-navy/40 border-b border-editorial-navy/10 ${right ? 'text-right' : 'text-left'}`}>{children}</th>
);
const Td = ({ children, right, accent }) => (
  <td className={`px-4 py-2.5 text-sm border-b border-editorial-navy/5 ${right ? 'text-right' : ''} ${accent ?? 'text-editorial-ink'}`}>{children}</td>
);

const colorCls = (v) => {
  if (v == null || isNaN(v)) return 'text-editorial-navy/30';
  return v >= 0 ? 'text-emerald-700' : 'text-red-600';
};

const SectionHeader = ({ children }) => (
  <h2 className="font-serif text-xl text-editorial-navy font-bold border-b border-editorial-navy/10 pb-3 mb-5">{children}</h2>
);

const Card = ({ children, accent = false, className = '' }) => (
  <div className={`bg-white rounded-lg border border-editorial-navy/10 overflow-hidden ${accent ? 'border-l-[3px] border-l-editorial-navy/70' : ''} ${className}`}>
    {children}
  </div>
);

const CardHead = ({ children }) => (
  <div className="px-5 py-3 border-b border-editorial-navy/10 bg-editorial-cream/30">
    <p className="font-serif text-base text-editorial-navy font-semibold">{children}</p>
  </div>
);

const WinTabs = ({ avail, current, onChange }) => (
  <div className="flex gap-2 mb-5">
    {avail.map((w) => (
      <button key={w} onClick={() => onChange(w)}
        className={`px-3.5 py-1.5 rounded text-sm font-medium transition-colors ${current === w ? 'bg-editorial-navy text-white' : 'border border-editorial-navy/20 text-editorial-navy hover:border-editorial-navy'}`}>
        {WINDOWS.find((x) => x.id === w)?.label ?? w.toUpperCase()}
      </button>
    ))}
  </div>
);

// ── Returns ────────────────────────────────────────────────────────────────────
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
    <div>
      <SectionHeader>Rolling Returns</SectionHeader>
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <WinTabs avail={avail} current={curWin} onChange={setActiveWindow} />
        <div className="ml-auto flex gap-2">
          {['absolute', 'cagr'].map((rt) => (
            <button key={rt} onClick={() => setReturnType(rt)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${returnType === rt ? 'bg-editorial-gold text-white' : 'border border-editorial-navy/20 text-editorial-navy hover:border-editorial-gold'}`}>
              {rt === 'absolute' ? 'Absolute' : 'CAGR'}
            </button>
          ))}
        </div>
      </div>

      <Card accent className="mb-7">
        <div className="p-5">
          <ResponsiveContainer width="100%" height={380}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 12 }}>
              <defs>
                <linearGradient id="edBenchGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={BENCHMARK_COLOR} stopOpacity={0.1} />
                  <stop offset="95%" stopColor={BENCHMARK_COLOR} stopOpacity={0.01} />
                </linearGradient>
                {(data?.funds ?? []).map((f, i) => (
                  <linearGradient key={f.scheme_code} id={`edFGrad-${f.scheme_code}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={FUND_COLORS[i % FUND_COLORS.length]} stopOpacity={0.1} />
                    <stop offset="95%" stopColor={FUND_COLORS[i % FUND_COLORS.length]} stopOpacity={0.01} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f10" />
              <XAxis dataKey="date" tickFormatter={tickFormatter} tick={TICK} tickLine={false} />
              <YAxis tickFormatter={(v) => `${v.toFixed(1)}%`} tick={TICK} tickLine={false} axisLine={false} width={44} />
              <Tooltip formatter={(v) => fmt2(v)} contentStyle={TIP} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <ReferenceLine y={0} stroke="#1e3a5f20" strokeDasharray="4 2" />
              <Area type="monotone" dataKey="benchmark" name={data?.benchmark_name ?? 'Benchmark'} stroke={BENCHMARK_COLOR} fill="url(#edBenchGrad)" dot={false} strokeWidth={2} />
              {(data?.funds ?? []).map((f, i) => (
                <Area key={f.scheme_code} type="monotone" dataKey={`fund_${f.scheme_code}`} name={f.scheme_name} stroke={FUND_COLORS[i % FUND_COLORS.length]} fill={`url(#edFGrad-${f.scheme_code})`} dot={false} strokeWidth={2} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <SectionHeader>Outperformance Statistics</SectionHeader>
      <Card>
        <table className="w-full">
          <thead><tr><Th>Fund</Th><Th right>Periods</Th><Th right>Outperf %</Th><Th right>Underperf %</Th><Th right>Avg Alpha</Th></tr></thead>
          <tbody>
            {allStats.map(({ fund, color, outperf }) => (
              <tr key={fund.scheme_code} className="hover:bg-editorial-cream/50">
                <Td><div className="flex items-center gap-2.5"><span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} /><span className="text-editorial-ink">{shortName(fund.scheme_name)}</span></div></Td>
                <Td right>{outperf.total}</Td>
                <Td right accent="text-emerald-700">{fmt1(outperf.outperformedPct)}</Td>
                <Td right accent="text-red-600">{fmt1(outperf.underperformedPct)}</Td>
                <Td right accent={colorCls(outperf.avgAlpha)}>{fmt2(outperf.avgAlpha)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

// ── Risk ───────────────────────────────────────────────────────────────────────
const RiskSection = ({ data }) => {
  const [activeWindow, setActiveWindow] = useState('3y');
  const avail = useMemo(() => data?.benchmark_windows?.map((bw) => bw.window) ?? [], [data]);
  const curWin = avail.includes(activeWindow) ? activeWindow : (avail[0] ?? '3y');
  const benchWin = data?.benchmark_windows?.find((bw) => bw.window === curWin);
  const rfPct = rfPeriodPct(data?.risk_free_rate ?? 0.065, benchWin?.window_days ?? 365, 'absolute');
  const chartData = useMemo(() => buildChartData(data?.funds ?? [], benchWin, 'absolute'), [data, benchWin]);
  const allStats = useMemo(() => computeAllStats(data?.funds ?? [], chartData, rfPct), [data, chartData, rfPct]);
  const scatter = allStats.map(({ fund, color, vol }) => ({ name: fund.scheme_name, color, x: vol.stdDevFund, y: vol.meanFund })).filter((d) => !isNaN(d.x) && !isNaN(d.y));

  return (
    <div className="space-y-8">
      <div>
        <SectionHeader>Risk Metrics</SectionHeader>
        <WinTabs avail={avail} current={curWin} onChange={setActiveWindow} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card accent>
            <CardHead>Volatility & Tracking</CardHead>
            <table className="w-full"><thead><tr><Th>Fund</Th><Th right>Std Dev</Th><Th right>Beta</Th><Th right>TE</Th></tr></thead>
              <tbody>{allStats.map(({ fund, color, vol }) => (
                <tr key={fund.scheme_code} className="hover:bg-editorial-cream/50">
                  <Td><div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} /><span className="text-sm">{shortName(fund.scheme_name)}</span></div></Td>
                  <Td right>{fmtRatio(vol.stdDevFund)}</Td><Td right>{fmtRatio(vol.beta)}</Td><Td right>{fmtRatio(vol.trackingError)}</Td>
                </tr>
              ))}</tbody>
            </table>
          </Card>
          <Card accent>
            <CardHead>Risk-Adjusted Returns</CardHead>
            <table className="w-full"><thead><tr><Th>Fund</Th><Th right>Sharpe</Th><Th right>Sortino</Th><Th right>IR</Th></tr></thead>
              <tbody>{allStats.map(({ fund, color, vol }) => (
                <tr key={fund.scheme_code} className="hover:bg-editorial-cream/50">
                  <Td><div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} /><span className="text-sm">{shortName(fund.scheme_name)}</span></div></Td>
                  <Td right accent={colorCls(vol.sharpeFund)}>{fmtRatio(vol.sharpeFund)}</Td>
                  <Td right accent={colorCls(vol.sortinoFund)}>{fmtRatio(vol.sortinoFund)}</Td>
                  <Td right accent={colorCls(vol.infoRatio)}>{fmtRatio(vol.infoRatio)}</Td>
                </tr>
              ))}</tbody>
            </table>
          </Card>
        </div>
      </div>
      <div>
        <SectionHeader>Risk vs Return</SectionHeader>
        <Card accent>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f10" />
                <XAxis type="number" dataKey="x" tickFormatter={(v) => `${v.toFixed(1)}%`} tick={TICK} label={{ value: 'Std Dev', position: 'insideBottom', offset: -10, fontSize: 11, fill: '#1e3a5f60' }} />
                <YAxis type="number" dataKey="y" tickFormatter={(v) => `${v.toFixed(1)}%`} tick={TICK} tickLine={false} axisLine={false} width={44} />
                <Tooltip contentStyle={TIP} content={({ payload }) => { if (!payload?.length) return null; const p = payload[0].payload; return <div className="bg-white border border-editorial-navy/10 rounded p-2 text-xs"><p className="font-medium">{p.name}</p><p>Risk: {fmtRatio(p.x)}</p><p>Return: {fmt2(p.y)}</p></div>; }} />
                {scatter.map((d, i) => <Scatter key={i} name={d.name} data={[d]} fill={d.color} />)}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
};

// ── Capture ────────────────────────────────────────────────────────────────────
const CaptureSection = ({ data }) => {
  const [activeWindow, setActiveWindow] = useState('3y');
  const avail = useMemo(() => data?.benchmark_windows?.map((bw) => bw.window) ?? [], [data]);
  const curWin = avail.includes(activeWindow) ? activeWindow : (avail[0] ?? '3y');
  const benchWin = data?.benchmark_windows?.find((bw) => bw.window === curWin);
  const rfPct = rfPeriodPct(data?.risk_free_rate ?? 0.065, benchWin?.window_days ?? 365, 'absolute');
  const chartData = useMemo(() => buildChartData(data?.funds ?? [], benchWin, 'absolute'), [data, benchWin]);
  const allStats = useMemo(() => computeAllStats(data?.funds ?? [], chartData, rfPct), [data, chartData, rfPct]);

  return (
    <div className="space-y-8">
      <div>
        <SectionHeader>Capture Ratios</SectionHeader>
        <WinTabs avail={avail} current={curWin} onChange={setActiveWindow} />
        <Card>
          <table className="w-full"><thead><tr><Th>Fund</Th><Th right>UCR</Th><Th right>DCR</Th><Th right>Ratio</Th><Th right>Up Cons%</Th><Th right>Dn Cons%</Th></tr></thead>
            <tbody>{allStats.map(({ fund, color, capture }) => (
              <tr key={fund.scheme_code} className="hover:bg-editorial-cream/50">
                <Td><div className="flex items-center gap-2.5"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} /><span>{shortName(fund.scheme_name)}</span></div></Td>
                <Td right accent={colorCls(capture.ucr != null ? capture.ucr - 100 : null)}>{fmtRatio(capture.ucr)}</Td>
                <Td right accent={colorCls(capture.dcr != null ? 100 - capture.dcr : null)}>{fmtRatio(capture.dcr)}</Td>
                <Td right accent={colorCls(capture.captureRatio != null ? capture.captureRatio - 1 : null)}>{fmtRatio(capture.captureRatio)}</Td>
                <Td right>{fmt1(capture.upConsistPct)}</Td><Td right>{fmt1(capture.downConsistPct)}</Td>
              </tr>
            ))}</tbody>
          </table>
        </Card>
      </div>

      <div>
        <SectionHeader>Benchmark vs Fund Scatter</SectionHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5">
          {allStats.map(({ fund, color, scatterData }) => {
            const xs = scatterData.map((d) => d.x), ys = scatterData.map((d) => d.y);
            const allVals = [...xs, ...ys];
            const pad = 3;
            const dMin = allVals.length ? Math.min(...allVals) - pad : -20;
            const dMax = allVals.length ? Math.max(...allVals) + pad : 20;
            const greenDots = scatterData.filter((d) => d.outperf);
            const redDots = scatterData.filter((d) => !d.outperf);
            return (
              <Card key={fund.scheme_code} accent>
                <div className="px-4 pt-3 pb-1 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                  <p className="font-serif text-sm text-editorial-navy font-semibold truncate">{shortName(fund.scheme_name)}</p>
                </div>
                <div className="p-4 pt-1">
                  <ResponsiveContainer width="100%" height={240}>
                    <ScatterChart margin={{ top: 5, right: 5, bottom: 20, left: 12 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f10" />
                      <XAxis type="number" dataKey="x" domain={[dMin, dMax]} tickFormatter={(v) => `${v.toFixed(0)}%`} tick={TICK} label={{ value: 'Benchmark', position: 'insideBottom', offset: -10, fontSize: 11, fill: '#1e3a5f60' }} />
                      <YAxis type="number" dataKey="y" domain={[dMin, dMax]} tickFormatter={(v) => `${v.toFixed(0)}%`} tick={TICK} tickLine={false} axisLine={false} width={38} />
                      <Tooltip contentStyle={TIP} formatter={(v) => fmt2(v)} />
                      {dMin < 0 && dMax > 0 && <ReferenceArea x1={dMin} x2={0} y1={dMin} y2={0} fill="#fef2f2" fillOpacity={0.6} />}
                      {dMin < 0 && dMax > 0 && <ReferenceArea x1={0} x2={dMax} y1={0} y2={dMax} fill="#f0fdf4" fillOpacity={0.6} />}
                      <ReferenceLine segment={[{ x: dMin, y: dMin }, { x: dMax, y: dMax }]} stroke="#1e3a5f20" strokeDasharray="4 2" />
                      {greenDots.length > 0 && <Scatter name="Outperform" data={greenDots} fill="#22c55e" opacity={0.75} r={3.5} />}
                      {redDots.length > 0 && <Scatter name="Underperform" data={redDots} fill="#ef4444" opacity={0.75} r={3.5} />}
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <div>
        <SectionHeader>Rolling Alpha</SectionHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5">
          {allStats.map(({ fund, color, alphaData }) => {
            const vals = alphaData.map((d) => d.alpha);
            const yMax = vals.length ? Math.max(...vals, 0) : 1;
            const yMin = vals.length ? Math.min(...vals, 0) : -1;
            const split = yMax !== yMin ? `${((yMax / (yMax - yMin)) * 100).toFixed(1)}%` : '50%';
            return (
              <Card key={fund.scheme_code} accent>
                <div className="px-4 pt-3 pb-1 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                  <p className="font-serif text-sm text-editorial-navy font-semibold truncate">{shortName(fund.scheme_name)}</p>
                </div>
                <div className="p-4 pt-1">
                  <svg width="0" height="0" style={{ position: 'absolute' }}>
                    <defs>
                      <linearGradient id={`egrad-${fund.scheme_code}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset={split} stopColor="#059669" stopOpacity={0.3} />
                        <stop offset={split} stopColor="#dc2626" stopOpacity={0.3} />
                      </linearGradient>
                    </defs>
                  </svg>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={alphaData} margin={{ top: 3, right: 5, bottom: 3, left: 12 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f10" />
                      <XAxis dataKey="date" tickFormatter={tickFormatter} tick={TICK} tickLine={false} />
                      <YAxis tickFormatter={(v) => `${v.toFixed(0)}%`} tick={TICK} tickLine={false} axisLine={false} width={38} />
                      <Tooltip contentStyle={TIP} formatter={(v) => fmt2(v)} />
                      <ReferenceLine y={0} stroke="#1e3a5f20" strokeDasharray="4 2" />
                      <Area type="monotone" dataKey="alpha" stroke={color} fill={`url(#egrad-${fund.scheme_code})`} strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ── Drawdown ───────────────────────────────────────────────────────────────────
const DrawdownSection = ({ data, analyticsData, analyticsLoading }) => {
  const [activeWindow, setActiveWindow] = useState('3y');
  const avail = useMemo(() => data?.benchmark_windows?.map((bw) => bw.window) ?? [], [data]);
  const curWin = avail.includes(activeWindow) ? activeWindow : (avail[0] ?? '3y');
  const benchWin = data?.benchmark_windows?.find((bw) => bw.window === curWin);
  const rfPct = rfPeriodPct(data?.risk_free_rate ?? 0.065, benchWin?.window_days ?? 365, 'absolute');
  const chartData = useMemo(() => buildChartData(data?.funds ?? [], benchWin, 'absolute'), [data, benchWin]);
  const allStats = useMemo(() => computeAllStats(data?.funds ?? [], chartData, rfPct), [data, chartData, rfPct]);

  if (analyticsLoading) return <p className="text-editorial-navy/50 text-sm">Loading drawdown data…</p>;
  if (!analyticsData) return <p className="text-editorial-navy/40 text-sm">No drawdown data available.</p>;
  const allFunds = analyticsData.funds ?? [];
  const bench = analyticsData.benchmark_drawdown;
  const worst = Math.min(bench?.max_drawdown ?? 0, ...allFunds.map((f) => f.drawdown.max_drawdown));

  return (
    <div className="space-y-8">
      <div>
        <SectionHeader>Drawdown Analysis</SectionHeader>
        <Card>
          <table className="w-full">
            <thead><tr><Th>Fund / Benchmark</Th><Th right>Max DD</Th><Th right>Peak Date</Th><Th right>Trough Date</Th><Th right>Duration</Th><Th right>Recovery</Th><Th right>Rec. Days</Th><Th>Severity</Th></tr></thead>
            <tbody>
              {bench && (
                <tr className="bg-emerald-50/30 hover:bg-emerald-50/50">
                  <Td><div className="flex items-center gap-2.5"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: BENCHMARK_COLOR }} /><span className="font-medium">{analyticsData.benchmark_name ?? 'Benchmark'}</span></div></Td>
                  <Td right accent="text-red-600">{fmt1(bench.max_drawdown)}</Td>
                  <Td right>{bench.peak_date ?? '—'}</Td><Td right>{bench.trough_date ?? '—'}</Td>
                  <Td right>{bench.drawdown_duration_days ?? '—'}</Td>
                  <Td right>{bench.recovery_date ?? 'Not recovered'}</Td>
                  <Td right>{bench.recovery_days ?? '—'}</Td>
                  <Td><div className="w-20 bg-gray-100 rounded-full h-2"><div className="bg-red-400 h-2 rounded-full" style={{ width: `${Math.min(100, (bench.max_drawdown / worst) * 100)}%` }} /></div></Td>
                </tr>
              )}
              {allFunds.map((f, i) => {
                const dd = f.drawdown;
                return (
                  <tr key={f.scheme_code} className="hover:bg-editorial-cream/50">
                    <Td><div className="flex items-center gap-2.5"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: FUND_COLORS[i % FUND_COLORS.length] }} /><span>{shortName(f.scheme_name)}</span></div></Td>
                    <Td right accent="text-red-600">{fmt1(dd.max_drawdown)}</Td>
                    <Td right>{dd.peak_date ?? '—'}</Td><Td right>{dd.trough_date ?? '—'}</Td>
                    <Td right>{dd.drawdown_duration_days ?? '—'}</Td>
                    <Td right>{dd.recovery_date ?? 'Not recovered'}</Td>
                    <Td right>{dd.recovery_days ?? '—'}</Td>
                    <Td><div className="w-20 bg-gray-100 rounded-full h-2"><div className="bg-red-500 h-2 rounded-full" style={{ width: `${Math.min(100, (dd.max_drawdown / worst) * 100)}%` }} /></div></Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>

      <div>
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <SectionHeader>Drawdown Charts</SectionHeader>
          <WinTabs avail={avail} current={curWin} onChange={setActiveWindow} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5">
          {allStats.map(({ fund, color, ddSeries }) => (
            <Card key={fund.scheme_code} accent>
              <div className="px-4 pt-3 pb-1 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <p className="font-serif text-sm text-editorial-navy font-semibold truncate">{shortName(fund.scheme_name)}</p>
              </div>
              <div className="p-4 pt-1">
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={ddSeries} margin={{ top: 3, right: 5, bottom: 3, left: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f10" />
                    <XAxis dataKey="date" tickFormatter={tickFormatter} tick={TICK} tickLine={false} />
                    <YAxis domain={['auto', 0]} tickFormatter={(v) => `${v.toFixed(0)}%`} tick={TICK} tickLine={false} axisLine={false} width={38} />
                    <Tooltip contentStyle={TIP} formatter={(v) => fmt2(v)} />
                    <ReferenceLine y={0} stroke="#1e3a5f20" strokeDasharray="4 2" />
                    <Area type="monotone" dataKey="benchmarkDD" name="Benchmark" stroke={BENCHMARK_COLOR} fill={BENCHMARK_COLOR} fillOpacity={0.08} strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
                    <Area type="monotone" dataKey="fundDD" name={shortName(fund.scheme_name)} stroke={color} fill={color} fillOpacity={0.2} strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Root ───────────────────────────────────────────────────────────────────────
const EditorialChart = ({ data, analyticsData, analyticsLoading, loading, error, activeSection, onSectionChange, onOpenDrawer }) => {
  if (error) return <div className="text-center py-16"><p className="text-red-600 font-medium">{error}</p></div>;

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-editorial-gold border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-editorial-navy/50 text-sm">Analyzing…</p>
      </div>
    </div>
  );

  if (!data) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
      <div className="w-16 h-16 border-2 border-editorial-navy/10 rounded-full flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-editorial-navy/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
      <h2 className="font-serif text-xl text-editorial-navy font-bold mb-2">No Analysis Yet</h2>
      <p className="text-editorial-navy/50 mb-5">Click Configure to select funds and run your first analysis.</p>
      <button onClick={onOpenDrawer} className="px-6 py-2.5 bg-editorial-navy text-white font-serif font-semibold rounded hover:bg-editorial-ink transition-colors">
        Configure →
      </button>
    </div>
  );

  return (
    <div>
      {/* Section tabs */}
      <div className="flex gap-1 mb-8 border-b border-editorial-navy/10">
        {SECTIONS.map((s) => (
          <button key={s.id} onClick={() => onSectionChange(s.id)}
            className={`px-5 py-2.5 font-serif font-semibold text-sm transition-colors border-b-2 -mb-px ${activeSection === s.id ? 'border-editorial-gold text-editorial-navy' : 'border-transparent text-editorial-navy/40 hover:text-editorial-navy'}`}>
            {s.label}
          </button>
        ))}
      </div>

      {activeSection === 'returns' && <ReturnsSection data={data} />}
      {activeSection === 'risk' && <RiskSection data={data} />}
      {activeSection === 'capture' && <CaptureSection data={data} />}
      {activeSection === 'drawdown' && <DrawdownSection data={data} analyticsData={analyticsData} analyticsLoading={analyticsLoading} />}
    </div>
  );
};

export default EditorialChart;
