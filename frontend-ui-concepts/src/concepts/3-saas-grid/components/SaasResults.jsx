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

// ── Helpers ────────────────────────────────────────────────────────────────────
const Card = ({ title, children, className = '' }) => (
  <div className={`bg-white rounded-xl border border-slate-200 overflow-hidden ${className}`}>
    {title && (
      <div className="px-5 py-3 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      </div>
    )}
    <div className="p-5">{children}</div>
  </div>
);

const Td = ({ children, right, accent }) => (
  <td className={`px-3 py-2 text-xs ${right ? 'text-right tabular-mono' : 'text-left'} ${accent ? accent : 'text-slate-600'}`}>
    {children}
  </td>
);

const Th = ({ children, right }) => (
  <th className={`px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 ${right ? 'text-right' : 'text-left'}`}>
    {children}
  </th>
);

const colorClass = (v) => {
  if (v == null || typeof v !== 'number' || isNaN(v)) return 'text-slate-500';
  return v >= 0 ? 'text-emerald-600' : 'text-red-500';
};

const EmptyState = ({ message = 'Run an analysis to see results' }) => (
  <div className="flex flex-col items-center justify-center py-20 text-slate-400">
    <svg className="w-12 h-12 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
    <p className="text-sm">{message}</p>
  </div>
);

const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-20">
    <svg className="w-8 h-8 animate-spin text-indigo-400" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  </div>
);

// ── Returns tab ────────────────────────────────────────────────────────────────
const ReturnsTab = ({ data }) => {
  const [activeWindow, setActiveWindow] = useState('3y');
  const [returnType, setReturnType] = useState('absolute');

  const availableWindows = useMemo(() => {
    if (!data?.benchmark_windows) return [];
    return data.benchmark_windows.map((bw) => bw.window);
  }, [data]);

  const currentWindow = availableWindows.includes(activeWindow) ? activeWindow : (availableWindows[0] ?? '3y');
  const benchmarkWindow = data?.benchmark_windows?.find((bw) => bw.window === currentWindow);
  const rfPct = rfPeriodPct(data?.risk_free_rate ?? 0.065, benchmarkWindow?.window_days ?? 365, returnType);
  const chartData = useMemo(() => buildChartData(data?.funds ?? [], benchmarkWindow, returnType), [data, benchmarkWindow, returnType]);
  const allStats = useMemo(() => computeAllStats(data?.funds ?? [], chartData, rfPct), [data, chartData, rfPct]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
      {/* Chart card */}
      <Card title="Rolling Returns" className="xl:col-span-2">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex gap-1">
            {availableWindows.map((w) => (
              <button
                key={w}
                onClick={() => setActiveWindow(w)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  currentWindow === w ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {WINDOWS.find((x) => x.id === w)?.label ?? w.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="ml-auto flex gap-1">
            {['absolute', 'cagr'].map((rt) => (
              <button
                key={rt}
                onClick={() => setReturnType(rt)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  returnType === rt ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {rt === 'absolute' ? 'Absolute' : 'CAGR'}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tickFormatter={tickFormatter} tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} />
            <YAxis tickFormatter={(v) => `${v.toFixed(1)}%`} tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
            <Tooltip formatter={(v) => fmt2(v)} labelStyle={{ fontSize: 11 }} contentStyle={{ fontSize: 11, border: '1px solid #e2e8f0', borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="4 2" />
            <Line type="monotone" dataKey="benchmark" name={data?.benchmark_name ?? 'Benchmark'} stroke={BENCHMARK_COLOR} dot={false} strokeWidth={1.5} />
            {(data?.funds ?? []).map((f, i) => (
              <Line key={f.scheme_code} type="monotone" dataKey={`fund_${f.scheme_code}`} name={f.scheme_name} stroke={FUND_COLORS[i % FUND_COLORS.length]} dot={false} strokeWidth={1.5} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Outperformance stats */}
      <Card title="Outperformance vs Benchmark" className="xl:col-span-2">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <Th>Fund</Th>
                <Th right>Periods</Th>
                <Th right>Outperf %</Th>
                <Th right>Underperf %</Th>
                <Th right>Avg Alpha</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {allStats.map(({ fund, color, outperf }) => (
                <tr key={fund.scheme_code} className="hover:bg-slate-50">
                  <Td>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-slate-700">{shortName(fund.scheme_name)}</span>
                    </div>
                  </Td>
                  <Td right>{outperf.total}</Td>
                  <Td right accent="text-emerald-600">{fmt1(outperf.outperformedPct)}</Td>
                  <Td right accent="text-red-500">{fmt1(outperf.underperformedPct)}</Td>
                  <Td right accent={colorClass(outperf.avgAlpha)}>{fmt2(outperf.avgAlpha)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// ── Risk tab ───────────────────────────────────────────────────────────────────
const RiskTab = ({ data }) => {
  const [activeWindow, setActiveWindow] = useState('3y');
  const [returnType] = useState('absolute');

  const availableWindows = useMemo(() => data?.benchmark_windows?.map((bw) => bw.window) ?? [], [data]);
  const currentWindow = availableWindows.includes(activeWindow) ? activeWindow : (availableWindows[0] ?? '3y');
  const benchmarkWindow = data?.benchmark_windows?.find((bw) => bw.window === currentWindow);
  const rfPct = rfPeriodPct(data?.risk_free_rate ?? 0.065, benchmarkWindow?.window_days ?? 365, returnType);
  const chartData = useMemo(() => buildChartData(data?.funds ?? [], benchmarkWindow, returnType), [data, benchmarkWindow, returnType]);
  const allStats = useMemo(() => computeAllStats(data?.funds ?? [], chartData, rfPct), [data, chartData, rfPct]);

  const scatterAll = useMemo(() =>
    allStats.map(({ fund, color, vol }) => ({
      name: fund.scheme_name,
      color,
      x: vol.stdDevFund,
      y: vol.meanFund,
    })).filter((d) => !isNaN(d.x) && !isNaN(d.y)),
    [allStats]
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
      {/* Window selector */}
      <div className="xl:col-span-2 flex gap-1">
        {availableWindows.map((w) => (
          <button key={w} onClick={() => setActiveWindow(w)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${currentWindow === w ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
            {WINDOWS.find((x) => x.id === w)?.label ?? w.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Volatility & Beta */}
      <Card title="Volatility & Tracking">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <Th>Fund</Th>
              <Th right>Std Dev</Th>
              <Th right>Beta</Th>
              <Th right>Trk Error</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {allStats.map(({ fund, color, vol }) => (
              <tr key={fund.scheme_code} className="hover:bg-slate-50">
                <Td><div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} /><span className="text-slate-700 text-xs truncate max-w-[140px]">{shortName(fund.scheme_name)}</span></div></Td>
                <Td right>{fmtRatio(vol.stdDevFund)}</Td>
                <Td right>{fmtRatio(vol.beta)}</Td>
                <Td right>{fmtRatio(vol.trackingError)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Sharpe / Sortino / IR */}
      <Card title="Risk-Adjusted Returns">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <Th>Fund</Th>
              <Th right>Sharpe</Th>
              <Th right>Sortino</Th>
              <Th right>Info Ratio</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {allStats.map(({ fund, color, vol }) => (
              <tr key={fund.scheme_code} className="hover:bg-slate-50">
                <Td><div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} /><span className="text-slate-700 text-xs truncate max-w-[140px]">{shortName(fund.scheme_name)}</span></div></Td>
                <Td right accent={colorClass(vol.sharpeFund)}>{fmtRatio(vol.sharpeFund)}</Td>
                <Td right accent={colorClass(vol.sortinoFund)}>{fmtRatio(vol.sortinoFund)}</Td>
                <Td right accent={colorClass(vol.infoRatio)}>{fmtRatio(vol.infoRatio)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Risk-Return scatter */}
      <Card title="Risk vs Return" className="xl:col-span-2">
        <ResponsiveContainer width="100%" height={260}>
          <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis type="number" dataKey="x" name="Std Dev" tickFormatter={(v) => `${v.toFixed(1)}%`} tick={{ fontSize: 10, fill: '#94a3b8' }} label={{ value: 'Risk (Std Dev)', position: 'insideBottom', offset: -10, fontSize: 10, fill: '#94a3b8' }} />
            <YAxis type="number" dataKey="y" name="Return" tickFormatter={(v) => `${v.toFixed(1)}%`} tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ payload }) => {
              if (!payload?.length) return null;
              const p = payload[0].payload;
              return <div className="bg-white border border-slate-200 rounded-lg p-2.5 shadow text-xs"><p className="font-medium text-slate-700 mb-1">{p.name}</p><p className="text-slate-500">Risk: {fmtRatio(p.x)}</p><p className="text-slate-500">Return: {fmt2(p.y)}</p></div>;
            }} />
            {scatterAll.map((d, i) => (
              <Scatter key={i} name={d.name} data={[d]} fill={d.color} />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};

// ── Capture tab ────────────────────────────────────────────────────────────────
const CaptureTab = ({ data }) => {
  const [activeWindow, setActiveWindow] = useState('3y');
  const [returnType] = useState('absolute');

  const availableWindows = useMemo(() => data?.benchmark_windows?.map((bw) => bw.window) ?? [], [data]);
  const currentWindow = availableWindows.includes(activeWindow) ? activeWindow : (availableWindows[0] ?? '3y');
  const benchmarkWindow = data?.benchmark_windows?.find((bw) => bw.window === currentWindow);
  const rfPct = rfPeriodPct(data?.risk_free_rate ?? 0.065, benchmarkWindow?.window_days ?? 365, returnType);
  const chartData = useMemo(() => buildChartData(data?.funds ?? [], benchmarkWindow, returnType), [data, benchmarkWindow, returnType]);
  const allStats = useMemo(() => computeAllStats(data?.funds ?? [], chartData, rfPct), [data, chartData, rfPct]);

  // Scatter bounds
  const allXY = allStats.flatMap((s) => s.scatterData);
  const xs = allXY.map((d) => d.x), ys = allXY.map((d) => d.y);
  const xMin = xs.length ? Math.min(...xs) : -20, xMax = xs.length ? Math.max(...xs) : 20;
  const yMin = ys.length ? Math.min(...ys) : -20, yMax = ys.length ? Math.max(...ys) : 20;
  const pad = 5;
  const domain = [Math.min(xMin, yMin) - pad, Math.max(xMax, yMax) + pad];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
      {/* Window selector */}
      <div className="xl:col-span-2 flex gap-1">
        {availableWindows.map((w) => (
          <button key={w} onClick={() => setActiveWindow(w)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${currentWindow === w ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
            {WINDOWS.find((x) => x.id === w)?.label ?? w.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Capture stats table */}
      <Card title="Up/Down Capture Ratios">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <Th>Fund</Th>
              <Th right>UCR</Th>
              <Th right>DCR</Th>
              <Th right>Ratio</Th>
              <Th right>Up%</Th>
              <Th right>Down%</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {allStats.map(({ fund, color, capture }) => (
              <tr key={fund.scheme_code} className="hover:bg-slate-50">
                <Td><div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} /><span className="text-slate-700 text-xs truncate max-w-[120px]">{shortName(fund.scheme_name)}</span></div></Td>
                <Td right accent={colorClass(capture.ucr != null ? capture.ucr - 100 : null)}>{fmtRatio(capture.ucr)}</Td>
                <Td right accent={colorClass(capture.dcr != null ? 100 - capture.dcr : null)}>{fmtRatio(capture.dcr)}</Td>
                <Td right accent={colorClass(capture.captureRatio != null ? capture.captureRatio - 1 : null)}>{fmtRatio(capture.captureRatio)}</Td>
                <Td right>{fmt1(capture.upConsistPct)}</Td>
                <Td right>{fmt1(capture.downConsistPct)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Scatter */}
      <Card title="Benchmark vs Fund Returns">
        <ResponsiveContainer width="100%" height={240}>
          <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis type="number" dataKey="x" domain={domain} tickFormatter={(v) => `${v.toFixed(0)}%`} tick={{ fontSize: 9, fill: '#94a3b8' }} label={{ value: 'Benchmark', position: 'insideBottom', offset: -10, fontSize: 10, fill: '#94a3b8' }} />
            <YAxis type="number" dataKey="y" domain={domain} tickFormatter={(v) => `${v.toFixed(0)}%`} tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(v) => fmt2(v)} contentStyle={{ fontSize: 10 }} />
            <ReferenceArea x1={domain[0]} x2={0} y1={domain[0]} y2={0} fill="#fef2f2" fillOpacity={0.5} />
            <ReferenceArea x1={0} x2={domain[1]} y1={0} y2={domain[1]} fill="#f0fdf4" fillOpacity={0.5} />
            <ReferenceLine segment={[{ x: domain[0], y: domain[0] }, { x: domain[1], y: domain[1] }]} stroke="#94a3b8" strokeDasharray="4 2" />
            {allStats.map(({ fund, color, scatterData }) => (
              <Scatter key={fund.scheme_code} name={fund.scheme_name} data={scatterData} fill={color} opacity={0.7} r={3} />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </Card>

      {/* Alpha area charts */}
      {allStats.map(({ fund, color, alphaData }) => {
        const vals = alphaData.map((d) => d.alpha);
        const yMax = vals.length ? Math.max(...vals, 0) : 1;
        const yMin = vals.length ? Math.min(...vals, 0) : -1;
        const splitOffset = yMax !== yMin ? `${((yMax / (yMax - yMin)) * 100).toFixed(1)}%` : '50%';
        return (
          <Card key={fund.scheme_code} title={`Rolling Alpha — ${shortName(fund.scheme_name)}`}>
            <svg width="0" height="0" style={{ position: 'absolute' }}>
              <defs>
                <linearGradient id={`alpha-grad-${fund.scheme_code}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset={splitOffset} stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset={splitOffset} stopColor="#ef4444" stopOpacity={0.4} />
                </linearGradient>
              </defs>
            </svg>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={alphaData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tickFormatter={tickFormatter} tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} />
                <YAxis tickFormatter={(v) => `${v.toFixed(1)}%`} tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v) => fmt2(v)} contentStyle={{ fontSize: 10 }} />
                <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 2" />
                <Area type="monotone" dataKey="alpha" stroke={color} fill={`url(#alpha-grad-${fund.scheme_code})`} strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        );
      })}
    </div>
  );
};

// ── Drawdown tab ───────────────────────────────────────────────────────────────
const DrawdownTab = ({ analyticsData, analyticsLoading }) => {
  if (analyticsLoading) return <LoadingSpinner />;
  if (!analyticsData) return <EmptyState message="No drawdown data available" />;

  const allFunds = [...(analyticsData.funds ?? [])];
  const benchDD = analyticsData.benchmark_drawdown;
  const worstDD = Math.min(benchDD?.max_drawdown ?? 0, ...allFunds.map((f) => f.drawdown.max_drawdown));

  return (
    <div className="grid grid-cols-1 gap-5">
      <Card title="Drawdown Analysis">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <Th>Fund / Benchmark</Th>
                <Th right>Max Drawdown</Th>
                <Th right>Peak Date</Th>
                <Th right>Trough Date</Th>
                <Th right>Duration (days)</Th>
                <Th right>Recovery Date</Th>
                <Th right>Recovery (days)</Th>
                <Th>Severity</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {/* Benchmark row */}
              {benchDD && (
                <tr className="hover:bg-slate-50 bg-emerald-50/40">
                  <Td>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#16a34a' }} />
                      <span className="text-slate-700 font-medium">{analyticsData.benchmark_name ?? 'Benchmark'}</span>
                    </div>
                  </Td>
                  <Td right accent="text-red-500">{fmt1(benchDD.max_drawdown)}</Td>
                  <Td right>{benchDD.peak_date ?? '—'}</Td>
                  <Td right>{benchDD.trough_date ?? '—'}</Td>
                  <Td right>{benchDD.drawdown_duration_days ?? '—'}</Td>
                  <Td right>{benchDD.recovery_date ?? 'Not recovered'}</Td>
                  <Td right>{benchDD.recovery_days ?? '—'}</Td>
                  <Td>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div className="bg-red-400 h-1.5 rounded-full" style={{ width: `${Math.min(100, (benchDD.max_drawdown / worstDD) * 100)}%` }} />
                    </div>
                  </Td>
                </tr>
              )}
              {allFunds.map((f, i) => {
                const dd = f.drawdown;
                return (
                  <tr key={f.scheme_code} className="hover:bg-slate-50">
                    <Td>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: FUND_COLORS[i % FUND_COLORS.length] }} />
                        <span className="text-slate-700">{shortName(f.scheme_name)}</span>
                      </div>
                    </Td>
                    <Td right accent="text-red-500">{fmt1(dd.max_drawdown)}</Td>
                    <Td right>{dd.peak_date ?? '—'}</Td>
                    <Td right>{dd.trough_date ?? '—'}</Td>
                    <Td right>{dd.drawdown_duration_days ?? '—'}</Td>
                    <Td right>{dd.recovery_date ?? 'Not recovered'}</Td>
                    <Td right>{dd.recovery_days ?? '—'}</Td>
                    <Td>
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (dd.max_drawdown / worstDD) * 100)}%` }} />
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// ── Root SaasResults ───────────────────────────────────────────────────────────
const SaasResults = ({ data, analyticsData, analyticsLoading, loading, error, activeTab }) => {
  if (error) return (
    <div className="flex items-center justify-center py-16">
      <div className="text-center">
        <p className="text-red-500 font-medium mb-1">Error loading data</p>
        <p className="text-slate-400 text-sm">{error}</p>
      </div>
    </div>
  );

  if (loading) return <LoadingSpinner />;

  if (!data) return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-slate-400">
      <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
      </svg>
      <p className="text-base font-medium text-slate-500 mb-1">No analysis yet</p>
      <p className="text-sm">Select funds and a benchmark, then click Run Analysis.</p>
    </div>
  );

  return (
    <div>
      {activeTab === 'returns' && <ReturnsTab data={data} />}
      {activeTab === 'risk' && <RiskTab data={data} />}
      {activeTab === 'capture' && <CaptureTab data={data} />}
      {activeTab === 'drawdown' && <DrawdownTab analyticsData={analyticsData} analyticsLoading={analyticsLoading} />}
    </div>
  );
};

export default SaasResults;
