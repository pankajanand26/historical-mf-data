import { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter, ReferenceLine, ReferenceArea,
  AreaChart, Area,
} from 'recharts';
import {
  FUND_COLORS, BENCHMARK_COLOR, WINDOWS,
  fmt2, fmt1, fmtRatio, shortName, tickFormatter,
  buildChartData, computeAllStats, rfPeriodPct, computeKPIs,
} from '../../../shared/utils/chartUtils';

const TABS = [
  { id: 'returns', label: '① Returns' },
  { id: 'risk', label: '② Risk' },
  { id: 'capture', label: '③ Capture' },
  { id: 'drawdown', label: '④ Drawdown' },
];

const TIP = { backgroundColor: '#fff', border: '1px solid #ede9fe', borderRadius: 8, fontSize: 11 };

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl border border-violet-100 shadow-sm overflow-hidden ${className}`}>{children}</div>
);

const CardTitle = ({ children }) => (
  <div className="px-5 py-4 border-b border-violet-50"><p className="font-semibold text-sm text-slate-700">{children}</p></div>
);

const Th = ({ children, right }) => (
  <th className={`px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-b border-violet-50 ${right ? 'text-right' : 'text-left'}`}>{children}</th>
);
const Td = ({ children, right, accent }) => (
  <td className={`px-4 py-3 text-sm border-b border-violet-50/60 ${right ? 'text-right' : ''} ${accent ?? 'text-slate-600'}`}>{children}</td>
);
const colorCls = (v) => (v == null || isNaN(v) ? 'text-slate-400' : v >= 0 ? 'text-emerald-600' : 'text-red-500');

const FundDot = ({ color, name }) => (
  <div className="flex items-center gap-2">
    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
    <span className="text-slate-700 truncate">{shortName(name)}</span>
  </div>
);

const WinTabs = ({ avail, current, onChange }) => (
  <div className="flex gap-1.5 flex-wrap">
    {avail.map((w) => (
      <button key={w} onClick={() => onChange(w)}
        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${current === w ? 'bg-violet-600 text-white shadow-sm' : 'bg-violet-50 text-violet-500 hover:bg-violet-100'}`}>
        {WINDOWS.find((x) => x.id === w)?.label ?? w.toUpperCase()}
      </button>
    ))}
  </div>
);

// ── KPI strip ──────────────────────────────────────────────────────────────────
const KPIStrip = ({ kpis }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
    {kpis.map((k, i) => (
      <div key={i} className="bg-white rounded-2xl border border-violet-100 p-4 text-center shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">{k.label}</p>
        <p className={`text-2xl font-bold ${k.positive ? 'text-emerald-600' : 'text-red-500'}`}>{k.value}</p>
        <p className="text-[11px] text-slate-400 mt-0.5 truncate">{k.sub}</p>
      </div>
    ))}
  </div>
);

// ── Returns ────────────────────────────────────────────────────────────────────
const ReturnsTab = ({ data }) => {
  const [activeWindow, setActiveWindow] = useState('3y');
  const [returnType, setReturnType] = useState('absolute');
  const avail = useMemo(() => data?.benchmark_windows?.map((bw) => bw.window) ?? [], [data]);
  const curWin = avail.includes(activeWindow) ? activeWindow : (avail[0] ?? '3y');
  const benchWin = data?.benchmark_windows?.find((bw) => bw.window === curWin);
  const rfPct = rfPeriodPct(data?.risk_free_rate ?? 0.065, benchWin?.window_days ?? 365, returnType);
  const chartData = useMemo(() => buildChartData(data?.funds ?? [], benchWin, returnType), [data, benchWin, returnType]);
  const allStats = useMemo(() => computeAllStats(data?.funds ?? [], chartData, rfPct), [data, chartData, rfPct]);

  return (
    <div className="space-y-5">
      <Card>
        <CardTitle>Rolling Returns</CardTitle>
        <div className="p-5">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <WinTabs avail={avail} current={curWin} onChange={setActiveWindow} />
            <div className="ml-auto flex gap-1.5">
              {['absolute', 'cagr'].map((rt) => (
                <button key={rt} onClick={() => setReturnType(rt)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${returnType === rt ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                  {rt === 'absolute' ? 'Absolute' : 'CAGR'}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f0ff" />
              <XAxis dataKey="date" tickFormatter={tickFormatter} tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} />
              <YAxis tickFormatter={(v) => `${v.toFixed(1)}%`} tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v) => fmt2(v)} contentStyle={TIP} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine y={0} stroke="#e2e8f0" strokeDasharray="4 2" />
              <Line type="monotone" dataKey="benchmark" name={data?.benchmark_name ?? 'Benchmark'} stroke={BENCHMARK_COLOR} dot={false} strokeWidth={2} />
              {(data?.funds ?? []).map((f, i) => <Line key={f.scheme_code} type="monotone" dataKey={`fund_${f.scheme_code}`} name={f.scheme_name} stroke={FUND_COLORS[i % FUND_COLORS.length]} dot={false} strokeWidth={2} />)}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card>
        <CardTitle>Outperformance vs Benchmark</CardTitle>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr><Th>Fund</Th><Th right>Periods</Th><Th right>Out%</Th><Th right>Under%</Th><Th right>Avg Alpha</Th></tr></thead>
            <tbody>{allStats.map(({ fund, color, outperf }) => (
              <tr key={fund.scheme_code} className="hover:bg-violet-50/40">
                <Td><FundDot color={color} name={fund.scheme_name} /></Td>
                <Td right>{outperf.total}</Td>
                <Td right accent="text-emerald-600">{fmt1(outperf.outperformedPct)}</Td>
                <Td right accent="text-red-500">{fmt1(outperf.underperformedPct)}</Td>
                <Td right accent={colorCls(outperf.avgAlpha)}>{fmt2(outperf.avgAlpha)}</Td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// ── Risk ───────────────────────────────────────────────────────────────────────
const RiskTab = ({ data }) => {
  const [activeWindow, setActiveWindow] = useState('3y');
  const avail = useMemo(() => data?.benchmark_windows?.map((bw) => bw.window) ?? [], [data]);
  const curWin = avail.includes(activeWindow) ? activeWindow : (avail[0] ?? '3y');
  const benchWin = data?.benchmark_windows?.find((bw) => bw.window === curWin);
  const rfPct = rfPeriodPct(data?.risk_free_rate ?? 0.065, benchWin?.window_days ?? 365, 'absolute');
  const chartData = useMemo(() => buildChartData(data?.funds ?? [], benchWin, 'absolute'), [data, benchWin]);
  const allStats = useMemo(() => computeAllStats(data?.funds ?? [], chartData, rfPct), [data, chartData, rfPct]);
  const scatter = allStats.map(({ fund, color, vol }) => ({ name: fund.scheme_name, color, x: vol.stdDevFund, y: vol.meanFund })).filter((d) => !isNaN(d.x) && !isNaN(d.y));

  return (
    <div className="space-y-5">
      <div className="flex gap-1.5 flex-wrap"><WinTabs avail={avail} current={curWin} onChange={setActiveWindow} /></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card>
          <CardTitle>Volatility & Tracking</CardTitle>
          <table className="w-full"><thead><tr><Th>Fund</Th><Th right>Std Dev</Th><Th right>Beta</Th><Th right>TE</Th><Th right>IR</Th></tr></thead>
            <tbody>{allStats.map(({ fund, color, vol }) => (
              <tr key={fund.scheme_code} className="hover:bg-violet-50/40">
                <Td><FundDot color={color} name={fund.scheme_name} /></Td>
                <Td right>{fmtRatio(vol.stdDevFund)}</Td><Td right>{fmtRatio(vol.beta)}</Td>
                <Td right>{fmtRatio(vol.trackingError)}</Td>
                <Td right accent={colorCls(vol.infoRatio)}>{fmtRatio(vol.infoRatio)}</Td>
              </tr>
            ))}</tbody>
          </table>
        </Card>
        <Card>
          <CardTitle>Sharpe & Sortino</CardTitle>
          <table className="w-full"><thead><tr><Th>Fund</Th><Th right>Sharpe</Th><Th right>Sortino</Th></tr></thead>
            <tbody>{allStats.map(({ fund, color, vol }) => (
              <tr key={fund.scheme_code} className="hover:bg-violet-50/40">
                <Td><FundDot color={color} name={fund.scheme_name} /></Td>
                <Td right accent={colorCls(vol.sharpeFund)}>{fmtRatio(vol.sharpeFund)}</Td>
                <Td right accent={colorCls(vol.sortinoFund)}>{fmtRatio(vol.sortinoFund)}</Td>
              </tr>
            ))}</tbody>
          </table>
        </Card>
      </div>
      <Card>
        <CardTitle>Risk vs Return</CardTitle>
        <div className="p-5">
          <ResponsiveContainer width="100%" height={240}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f0ff" />
              <XAxis type="number" dataKey="x" tickFormatter={(v) => `${v.toFixed(1)}%`} tick={{ fontSize: 10, fill: '#94a3b8' }} label={{ value: 'Std Dev', position: 'insideBottom', offset: -10, fontSize: 10, fill: '#94a3b8' }} />
              <YAxis type="number" dataKey="y" tickFormatter={(v) => `${v.toFixed(1)}%`} tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={TIP} content={({ payload }) => { if (!payload?.length) return null; const p = payload[0].payload; return <div className="bg-white border border-violet-100 rounded-xl p-3 text-xs shadow"><p className="font-semibold text-slate-700 mb-1">{p.name}</p><p>Risk: {fmtRatio(p.x)}</p><p>Return: {fmt2(p.y)}</p></div>; }} />
              {scatter.map((d, i) => <Scatter key={i} name={d.name} data={[d]} fill={d.color} />)}
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};

// ── Capture ────────────────────────────────────────────────────────────────────
const CaptureTab = ({ data }) => {
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

  return (
    <div className="space-y-5">
      <div className="flex gap-1.5 flex-wrap"><WinTabs avail={avail} current={curWin} onChange={setActiveWindow} /></div>
      <Card>
        <CardTitle>Up/Down Capture Ratios</CardTitle>
        <div className="overflow-x-auto">
          <table className="w-full"><thead><tr><Th>Fund</Th><Th right>UCR</Th><Th right>DCR</Th><Th right>Ratio</Th><Th right>Up%</Th><Th right>Dn%</Th></tr></thead>
            <tbody>{allStats.map(({ fund, color, capture }) => (
              <tr key={fund.scheme_code} className="hover:bg-violet-50/40">
                <Td><FundDot color={color} name={fund.scheme_name} /></Td>
                <Td right accent={colorCls(capture.ucr != null ? capture.ucr - 100 : null)}>{fmtRatio(capture.ucr)}</Td>
                <Td right accent={colorCls(capture.dcr != null ? 100 - capture.dcr : null)}>{fmtRatio(capture.dcr)}</Td>
                <Td right accent={colorCls(capture.captureRatio != null ? capture.captureRatio - 1 : null)}>{fmtRatio(capture.captureRatio)}</Td>
                <Td right>{fmt1(capture.upConsistPct)}</Td><Td right>{fmt1(capture.downConsistPct)}</Td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card>
          <CardTitle>Benchmark vs Fund Scatter</CardTitle>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={220}>
              <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f0ff" />
                <XAxis type="number" dataKey="x" domain={domain} tickFormatter={(v) => `${v.toFixed(0)}%`} tick={{ fontSize: 9, fill: '#94a3b8' }} label={{ value: 'Benchmark', position: 'insideBottom', offset: -10, fontSize: 9, fill: '#94a3b8' }} />
                <YAxis type="number" dataKey="y" domain={domain} tickFormatter={(v) => `${v.toFixed(0)}%`} tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={TIP} formatter={(v) => fmt2(v)} />
                <ReferenceArea x1={domain[0]} x2={0} y1={domain[0]} y2={0} fill="#fef2f2" fillOpacity={0.5} />
                <ReferenceArea x1={0} x2={domain[1]} y1={0} y2={domain[1]} fill="#f0fdf4" fillOpacity={0.5} />
                <ReferenceLine segment={[{ x: domain[0], y: domain[0] }, { x: domain[1], y: domain[1] }]} stroke="#e2e8f0" strokeDasharray="4 2" />
                {allStats.map(({ fund, color, scatterData }) => <Scatter key={fund.scheme_code} name={fund.scheme_name} data={scatterData} fill={color} opacity={0.7} r={3} />)}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <div className="space-y-4">
          {allStats.map(({ fund, color, alphaData }) => {
            const vals = alphaData.map((d) => d.alpha);
            const yMax = vals.length ? Math.max(...vals, 0) : 1;
            const yMin = vals.length ? Math.min(...vals, 0) : -1;
            const split = yMax !== yMin ? `${((yMax / (yMax - yMin)) * 100).toFixed(1)}%` : '50%';
            return (
              <Card key={fund.scheme_code}>
                <CardTitle>Alpha — {shortName(fund.scheme_name)}</CardTitle>
                <div className="p-4">
                  <svg width="0" height="0" style={{ position: 'absolute' }}>
                    <defs>
                      <linearGradient id={`wgrad-${fund.scheme_code}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset={split} stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset={split} stopColor="#ef4444" stopOpacity={0.3} />
                      </linearGradient>
                    </defs>
                  </svg>
                  <ResponsiveContainer width="100%" height={110}>
                    <AreaChart data={alphaData} margin={{ top: 3, right: 5, bottom: 3, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f0ff" />
                      <XAxis dataKey="date" tickFormatter={tickFormatter} tick={{ fontSize: 8, fill: '#94a3b8' }} tickLine={false} />
                      <YAxis tickFormatter={(v) => `${v.toFixed(0)}%`} tick={{ fontSize: 8, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={TIP} formatter={(v) => fmt2(v)} />
                      <ReferenceLine y={0} stroke="#e2e8f0" strokeDasharray="3 2" />
                      <Area type="monotone" dataKey="alpha" stroke={color} fill={`url(#wgrad-${fund.scheme_code})`} strokeWidth={1.5} dot={false} />
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
const DrawdownTab = ({ analyticsData, analyticsLoading }) => {
  if (analyticsLoading) return <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" /></div>;
  if (!analyticsData) return <p className="text-slate-400 text-sm">No drawdown data.</p>;
  const allFunds = analyticsData.funds ?? [];
  const bench = analyticsData.benchmark_drawdown;
  const worst = Math.min(bench?.max_drawdown ?? 0, ...allFunds.map((f) => f.drawdown.max_drawdown));

  return (
    <Card>
      <CardTitle>Max Drawdown & Recovery</CardTitle>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead><tr><Th>Fund / Benchmark</Th><Th right>Max DD</Th><Th right>Peak</Th><Th right>Trough</Th><Th right>Duration</Th><Th right>Recovery</Th><Th right>Rec. Days</Th><Th>Severity</Th></tr></thead>
          <tbody>
            {bench && (
              <tr className="bg-emerald-50/30 hover:bg-emerald-50/50">
                <Td><FundDot color={BENCHMARK_COLOR} name={analyticsData.benchmark_name ?? 'Benchmark'} /></Td>
                <Td right accent="text-red-500">{fmt1(bench.max_drawdown)}</Td>
                <Td right>{bench.peak_date ?? '—'}</Td><Td right>{bench.trough_date ?? '—'}</Td>
                <Td right>{bench.drawdown_duration_days ?? '—'}</Td>
                <Td right>{bench.recovery_date ?? 'Not recovered'}</Td>
                <Td right>{bench.recovery_days ?? '—'}</Td>
                <Td><div className="w-20 bg-violet-50 rounded-full h-2"><div className="bg-red-400 h-2 rounded-full" style={{ width: `${Math.min(100, (bench.max_drawdown / worst) * 100)}%` }} /></div></Td>
              </tr>
            )}
            {allFunds.map((f, i) => {
              const dd = f.drawdown;
              return (
                <tr key={f.scheme_code} className="hover:bg-violet-50/40">
                  <Td><FundDot color={FUND_COLORS[i % FUND_COLORS.length]} name={f.scheme_name} /></Td>
                  <Td right accent="text-red-500">{fmt1(dd.max_drawdown)}</Td>
                  <Td right>{dd.peak_date ?? '—'}</Td><Td right>{dd.trough_date ?? '—'}</Td>
                  <Td right>{dd.drawdown_duration_days ?? '—'}</Td>
                  <Td right>{dd.recovery_date ?? 'Not recovered'}</Td>
                  <Td right>{dd.recovery_days ?? '—'}</Td>
                  <Td><div className="w-20 bg-violet-50 rounded-full h-2"><div className="bg-red-500 h-2 rounded-full" style={{ width: `${Math.min(100, (dd.max_drawdown / worst) * 100)}%` }} /></div></Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

// ── Root ───────────────────────────────────────────────────────────────────────
const Step3Results = ({ data, analyticsData, analyticsLoading, loading, error, selectedFunds, selectedBenchmark, onBack }) => {
  const [activeTab, setActiveTab] = useState('returns');

  // KPIs
  const kpis = useMemo(() => {
    if (!data) return [];
    const bw = data.benchmark_windows?.[0];
    if (!bw) return [];
    const rfPct = rfPeriodPct(data.risk_free_rate ?? 0.065, bw.window_days ?? 365, 'absolute');
    const chartData = buildChartData(data.funds ?? [], bw, 'absolute');
    const allStats = computeAllStats(data.funds ?? [], chartData, rfPct);
    return computeKPIs(data.funds ?? [], allStats, analyticsData);
  }, [data, analyticsData]);

  if (error) return (
    <div className="text-center py-16">
      <p className="text-red-500 font-medium mb-2">Error fetching data</p>
      <p className="text-slate-400 text-sm mb-6">{error}</p>
      <button onClick={onBack} className="px-6 py-2.5 border-2 border-violet-200 text-violet-600 rounded-xl font-semibold">← Back</button>
    </div>
  );

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-12 h-12 border-3 border-violet-300 border-t-violet-600 rounded-full animate-spin mb-4" />
      <p className="text-slate-500">Analyzing your funds…</p>
    </div>
  );

  return (
    <div className="animate-fade-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 mb-1">③ Results</h2>
          <p className="text-slate-500 text-sm">
            {selectedFunds.length} fund{selectedFunds.length > 1 ? 's' : ''} vs {selectedBenchmark?.scheme_name.split(' ').slice(0, 4).join(' ')}…
          </p>
        </div>
        <button onClick={onBack} className="px-4 py-2 border-2 border-violet-200 text-violet-600 rounded-xl text-sm font-semibold hover:border-violet-400 transition-colors">
          ← Reconfigure
        </button>
      </div>

      {/* KPIs */}
      {kpis.length > 0 && <KPIStrip kpis={kpis} />}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${activeTab === t.id ? 'bg-violet-600 text-white shadow-md' : 'bg-white border border-violet-100 text-slate-500 hover:border-violet-300'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'returns' && <ReturnsTab data={data} />}
      {activeTab === 'risk' && <RiskTab data={data} />}
      {activeTab === 'capture' && <CaptureTab data={data} />}
      {activeTab === 'drawdown' && <DrawdownTab analyticsData={analyticsData} analyticsLoading={analyticsLoading} />}
    </div>
  );
};

export default Step3Results;
