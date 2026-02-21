import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';

// Up to 5 distinct fund colors (benchmark is always dashed gray-green)
const FUND_COLORS = [
  '#2563eb', // blue
  '#dc2626', // red
  '#d97706', // amber
  '#7c3aed', // violet
  '#db2777', // pink
];
const BENCHMARK_COLOR = '#16a34a';

const fmt2 = (v) => (v == null || isNaN(v) ? 'N/A' : `${v.toFixed(2)}%`);
const fmtRatio = (v) => (v == null || isNaN(v) ? 'N/A' : v.toFixed(2));

const shortName = (name) =>
  name?.length > 42 ? name.slice(0, 39) + '...' : name;

const tickFormatter = (dateStr) => {
  if (!dateStr) return '';
  const [year, month] = dateStr.split('-');
  return `${month}/${year?.slice(2)}`;
};

// ─── Return-type helpers ──────────────────────────────────────────────────────

/**
 * Convert stored absolute-return percentage to CAGR percentage.
 * CAGR = ((1 + total_return)^(365/window_days) − 1) × 100
 */
function applyReturnType(valuePct, windowDays, returnType) {
  if (valuePct == null) return null;
  if (returnType === 'cagr') {
    return ((1 + valuePct / 100) ** (365 / windowDays) - 1) * 100;
  }
  return valuePct;
}

/**
 * Risk-free rate for the current window period (in %, same unit as valuePct).
 *   CAGR mode  → annual rf directly (e.g. 6.5 for 6.5%)
 *   Absolute   → compound rf over window_years  ((1+rf)^N − 1) × 100
 */
function rfPeriodPct(rfAnnual, windowDays, returnType) {
  if (returnType === 'cagr') return rfAnnual * 100;
  const years = windowDays / 365;
  return ((1 + rfAnnual) ** years - 1) * 100;
}

// ─── Chart data builder ───────────────────────────────────────────────────────

function buildChartData(funds, benchmarkWindow, returnType) {
  const map = new Map();
  const windowDays = benchmarkWindow?.window_days;

  if (benchmarkWindow) {
    for (const pt of benchmarkWindow.data) {
      map.set(pt.date, {
        date: pt.date,
        benchmark: applyReturnType(pt.value, windowDays, returnType),
      });
    }
  }

  for (const fund of funds) {
    const fundWindow = fund.windows.find((w) => w.window === benchmarkWindow?.window);
    if (!fundWindow) continue;
    for (const pt of fundWindow.data) {
      const row = map.get(pt.date) ?? { date: pt.date };
      row[`fund_${fund.scheme_code}`] = applyReturnType(pt.value, windowDays, returnType);
      map.set(pt.date, row);
    }
  }

  return Array.from(map.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
}

// ─── Outperformance stats ─────────────────────────────────────────────────────

function computeOutperformanceStats(chartData, fund) {
  let outperformed = 0, underperformed = 0, tied = 0;
  let totalAlpha = 0, count = 0;
  const key = `fund_${fund.scheme_code}`;

  for (const row of chartData) {
    const fv = row[key], bv = row.benchmark;
    if (fv == null || bv == null) continue;
    totalAlpha += fv - bv;
    count++;
    if (fv > bv) outperformed++;
    else if (fv < bv) underperformed++;
    else tied++;
  }

  return {
    total: count,
    outperformed,
    underperformed,
    tied,
    outperformedPct: count > 0 ? (outperformed / count) * 100 : 0,
    underperformedPct: count > 0 ? (underperformed / count) * 100 : 0,
    avgAlpha: count > 0 ? totalAlpha / count : 0,
  };
}

// ─── Volatility stats ─────────────────────────────────────────────────────────

function stdDev(arr) {
  if (arr.length < 2) return NaN;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((s, v) => s + (v - mean) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

function mean(arr) {
  if (!arr.length) return NaN;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/**
 * Compute all volatility / risk-adjusted metrics for a single fund
 * against the benchmark from the already-transformed chartData rows.
 *
 * All inputs and outputs are in percentage form (e.g. 12.5 = 12.5%).
 */
function computeVolatilityStats(chartData, fund, rfPct) {
  const key = `fund_${fund.scheme_code}`;
  const fundVals = [], benchVals = [], alphas = [];

  for (const row of chartData) {
    const fv = row[key], bv = row.benchmark;
    if (fv == null || bv == null) continue;
    fundVals.push(fv);
    benchVals.push(bv);
    alphas.push(fv - bv);
  }

  if (fundVals.length < 2) {
    return {
      stdDevFund: NaN, stdDevBench: NaN,
      beta: NaN, trackingError: NaN,
      infoRatio: NaN,
      sharpeFund: NaN, sharpeBench: NaN,
      sortinoFund: NaN, sortinoBench: NaN,
    };
  }

  const mFund = mean(fundVals);
  const mBench = mean(benchVals);
  const sdFund = stdDev(fundVals);
  const sdBench = stdDev(benchVals);

  // Beta = Cov(fund, bench) / Var(bench)
  const cov = fundVals.reduce((s, fv, i) => s + (fv - mFund) * (benchVals[i] - mBench), 0)
    / (fundVals.length - 1);
  const varBench = sdBench ** 2;
  const beta = varBench > 0 ? cov / varBench : NaN;

  // Tracking Error = σ(fund − bench)
  const te = stdDev(alphas);

  // Information Ratio = mean(alpha) / σ(alpha)
  const avgAlpha = mean(alphas);
  const infoRatio = te > 0 ? avgAlpha / te : NaN;

  // Sharpe = (mean − rf) / σ
  const sharpeFund = sdFund > 0 ? (mFund - rfPct) / sdFund : NaN;
  const sharpeBench = sdBench > 0 ? (mBench - rfPct) / sdBench : NaN;

  // Sortino = (mean − rf) / downside σ  (downside = below rf threshold)
  const downsideFund = fundVals.filter((v) => v < rfPct);
  const downsideBench = benchVals.filter((v) => v < rfPct);
  const sdDownFund = stdDev(downsideFund);
  const sdDownBench = stdDev(downsideBench);
  const sortinoFund = !isNaN(sdDownFund) && sdDownFund > 0
    ? (mFund - rfPct) / sdDownFund : NaN;
  const sortinoBench = !isNaN(sdDownBench) && sdDownBench > 0
    ? (mBench - rfPct) / sdDownBench : NaN;

  return {
    stdDevFund: sdFund,
    stdDevBench: sdBench,
    beta,
    trackingError: te,
    infoRatio,
    sharpeFund,
    sharpeBench,
    sortinoFund,
    sortinoBench,
    // also needed for scatter plot
    meanFund: mFund,
    meanBench: mBench,
  };
}

// ─── Tooltip components ───────────────────────────────────────────────────────

const LineTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm max-w-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 py-0.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="text-gray-600 truncate">{entry.name}:</span>
          <span className="font-medium ml-auto pl-2">{fmt2(entry.value)}</span>
        </div>
      ))}
    </div>
  );
};

const ScatterTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-800 mb-1">{d.name}</p>
      <p className="text-gray-500">Risk (Std Dev): <span className="font-medium text-gray-800">{fmt2(d.x)}</span></p>
      <p className="text-gray-500">Return (Mean): <span className="font-medium text-gray-800">{fmt2(d.y)}</span></p>
      {d.sharpe != null && !isNaN(d.sharpe) && (
        <p className="text-gray-500">Sharpe: <span className="font-medium text-gray-800">{fmtRatio(d.sharpe)}</span></p>
      )}
    </div>
  );
};

// ─── Sub-components for each section ─────────────────────────────────────────

const SectionHeader = ({ title, subtitle }) => (
  <div className="mb-3">
    <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
    {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
  </div>
);

const SignedValue = ({ value, isRatio = false }) => {
  if (value == null || isNaN(value)) return <span className="text-gray-400">N/A</span>;
  const formatted = isRatio ? fmtRatio(value) : fmt2(value);
  const positive = value >= 0;
  return (
    <span className={positive ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>
      {positive && value > 0 ? `+${formatted}` : formatted}
    </span>
  );
};

const NeutralValue = ({ value, isRatio = false }) => {
  if (value == null || isNaN(value)) return <span className="text-gray-400">N/A</span>;
  return <span className="font-semibold text-gray-800">{isRatio ? fmtRatio(value) : fmt2(value)}</span>;
};

// ─── Main component ───────────────────────────────────────────────────────────

const RollingReturnChart = ({ data }) => {
  const windows = data?.benchmark_windows ?? [];
  const funds = data?.funds ?? [];
  const riskFreeAnnual = data?.risk_free_rate ?? 0.065;

  const [activeWindow, setActiveWindow] = useState(windows[0]?.window ?? null);
  const [returnType, setReturnType] = useState('absolute');

  if (!data || !windows.length || !funds.length) return null;

  const benchmarkWindow = windows.find((w) => w.window === activeWindow) ?? windows[0];
  const currentWindow = benchmarkWindow.window;
  const windowDays = benchmarkWindow.window_days;

  const chartData = buildChartData(funds, benchmarkWindow, returnType);
  const hasData = chartData.length > 0;

  // Risk-free rate converted to current period + return type
  const rfPct = rfPeriodPct(riskFreeAnnual, windowDays, returnType);

  // Summary stats (Latest / Avg) per fund
  const fundStats = funds.map((fund, idx) => {
    const fundWindow = fund.windows.find((w) => w.window === currentWindow);
    const values = (fundWindow?.data ?? [])
      .map((d) => applyReturnType(d.value, windowDays, returnType))
      .filter((v) => v != null);
    const latest = values.at(-1) ?? null;
    const avg = values.length ? mean(values) : null;
    return { fund, color: FUND_COLORS[idx % FUND_COLORS.length], latest, avg };
  });

  const benchValues = benchmarkWindow.data
    .map((d) => applyReturnType(d.value, windowDays, returnType))
    .filter((v) => v != null);
  const benchLatest = benchValues.at(-1) ?? null;
  const benchAvg = benchValues.length ? mean(benchValues) : null;

  // All analysis stats
  const allStats = funds.map((fund, idx) => ({
    fund,
    color: FUND_COLORS[idx % FUND_COLORS.length],
    outperf: computeOutperformanceStats(chartData, fund),
    vol: computeVolatilityStats(chartData, fund, rfPct),
  }));

  // Scatter data: each fund + benchmark as a point { x: stdDev, y: meanReturn }
  const scatterFundPoints = allStats
    .filter((s) => !isNaN(s.vol.stdDevFund) && !isNaN(s.vol.meanFund))
    .map((s) => ({
      name: shortName(s.fund.scheme_name),
      x: parseFloat(s.vol.stdDevFund.toFixed(3)),
      y: parseFloat(s.vol.meanFund.toFixed(3)),
      sharpe: s.vol.sharpeFund,
      color: s.color,
    }));

  const benchPoint =
    allStats.length > 0 && !isNaN(allStats[0].vol.stdDevBench)
      ? {
          name: shortName(data.benchmark_name),
          x: parseFloat(allStats[0].vol.stdDevBench.toFixed(3)),
          y: parseFloat(allStats[0].vol.meanBench.toFixed(3)),
          sharpe: allStats[0].vol.sharpeBench,
          color: BENCHMARK_COLOR,
        }
      : null;

  const returnLabel = returnType === 'cagr' ? 'CAGR' : 'Absolute';

  return (
    <>
      {/* ══════════════════════════════════════════════════════════════════════
          CARD 1 — Rolling Return Chart
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        {/* Title */}
        <div className="mb-4">
          <h2 className="text-base font-semibold text-gray-900">Rolling Returns vs Benchmark</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {returnType === 'absolute'
              ? 'Total return over trailing window · Values in %'
              : 'Annualised (CAGR) return over trailing window · Values in %'}
          </p>
        </div>

        {/* Window tabs + Absolute/CAGR toggle */}
        <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
          <div className="flex gap-2 flex-wrap">
            {windows.map((w) => (
              <button
                key={w.window}
                onClick={() => setActiveWindow(w.window)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  currentWindow === w.window
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {w.window.toUpperCase()}{' '}
                <span className="text-xs opacity-75">({w.data_points} pts)</span>
              </button>
            ))}
          </div>

          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden text-sm font-medium shadow-sm">
            <button
              onClick={() => setReturnType('absolute')}
              className={`px-3 py-1.5 transition-colors ${
                returnType === 'absolute' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Absolute
            </button>
            <button
              onClick={() => setReturnType('cagr')}
              className={`px-3 py-1.5 transition-colors ${
                returnType === 'cagr' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              CAGR
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="space-y-2 mb-5">
          {fundStats.map(({ fund, color, latest, avg }) => (
            <div key={fund.scheme_code} className="grid grid-cols-3 gap-2 items-center bg-gray-50 rounded-lg px-3 py-2">
              <div className="col-span-1 flex items-center gap-2 min-w-0">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="text-xs font-medium text-gray-700 truncate" title={fund.scheme_name}>
                  {shortName(fund.scheme_name)}
                </span>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400">Latest</p>
                <p className="text-sm font-semibold" style={{ color }}>
                  {latest != null ? `${latest.toFixed(2)}%` : 'N/A'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400">Avg</p>
                <p className="text-sm font-semibold" style={{ color }}>
                  {avg != null ? `${avg.toFixed(2)}%` : 'N/A'}
                </p>
              </div>
            </div>
          ))}

          <div className="grid grid-cols-3 gap-2 items-center bg-gray-50 rounded-lg px-3 py-2">
            <div className="col-span-1 flex items-center gap-2 min-w-0">
              <span className="w-3 h-3 rounded-full flex-shrink-0 border-2"
                style={{ borderColor: BENCHMARK_COLOR, backgroundColor: 'white' }} />
              <span className="text-xs font-medium text-gray-700 truncate" title={data.benchmark_name}>
                {shortName(data.benchmark_name)}
              </span>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400">Latest</p>
              <p className="text-sm font-semibold" style={{ color: BENCHMARK_COLOR }}>
                {benchLatest != null ? `${benchLatest.toFixed(2)}%` : 'N/A'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400">Avg</p>
              <p className="text-sm font-semibold" style={{ color: BENCHMARK_COLOR }}>
                {benchAvg != null ? `${benchAvg.toFixed(2)}%` : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Chart */}
        {!hasData ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
            Not enough data to compute {currentWindow.toUpperCase()} rolling returns
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={360}>
            <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tickFormatter={tickFormatter}
                tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} interval="preserveStartEnd" />
              <YAxis tickFormatter={(v) => `${v.toFixed(0)}%`}
                tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} />
              <Tooltip content={<LineTooltip />} />
              <Legend formatter={(value) => <span className="text-xs text-gray-700">{value}</span>} />
              <ReferenceLine y={0} stroke="#e5e7eb" strokeDasharray="4 4" />

              {funds.map((fund, idx) => (
                <Line key={fund.scheme_code} type="monotone"
                  dataKey={`fund_${fund.scheme_code}`} name={shortName(fund.scheme_name)}
                  stroke={FUND_COLORS[idx % FUND_COLORS.length]}
                  dot={false} strokeWidth={2} connectNulls={false} />
              ))}
              <Line type="monotone" dataKey="benchmark" name={shortName(data.benchmark_name)}
                stroke={BENCHMARK_COLOR} dot={false} strokeWidth={2}
                strokeDasharray="5 3" connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          CARD 2 — Analysis: Outperformance + Volatility + Scatter
      ══════════════════════════════════════════════════════════════════════ */}
      {hasData && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-8">
          {/* Card header */}
          <div>
            <h2 className="text-base font-semibold text-gray-900">Performance &amp; Risk Analysis</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {currentWindow.toUpperCase()} rolling {returnLabel} returns ·{' '}
              {allStats[0]?.outperf.total ?? 0} shared data points ·{' '}
              Rf = {(riskFreeAnnual * 100).toFixed(1)}% p.a. · Fund vs{' '}
              <span className="font-medium">{shortName(data.benchmark_name)}</span>
            </p>
          </div>

          {/* ── Section 1: Outperformance ─────────────────────────────────── */}
          <div>
            <SectionHeader
              title="Outperformance vs Benchmark"
              subtitle="How often did the fund beat or trail the benchmark over this rolling window?"
            />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left font-medium text-gray-500 pb-2 pr-4">Fund</th>
                    <th className="text-right font-medium text-gray-500 pb-2 px-3">Outperformed</th>
                    <th className="text-right font-medium text-gray-500 pb-2 px-3">Underperformed</th>
                    <th className="text-right font-medium text-gray-500 pb-2 pl-3">Avg Alpha / period</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {allStats.map(({ fund, color, outperf }) => (
                    <tr key={fund.scheme_code} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                          <span className="font-medium text-gray-800 truncate" title={fund.scheme_name}>
                            {shortName(fund.scheme_name)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex flex-col items-end">
                          <span className="font-semibold text-emerald-600">{outperf.outperformedPct.toFixed(1)}%</span>
                          <span className="text-xs text-gray-400">{outperf.outperformed}/{outperf.total} periods</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex flex-col items-end">
                          <span className="font-semibold text-rose-600">{outperf.underperformedPct.toFixed(1)}%</span>
                          <span className="text-xs text-gray-400">{outperf.underperformed}/{outperf.total} periods</span>
                        </div>
                      </td>
                      <td className="py-3 pl-3 text-right">
                        <SignedValue value={outperf.avgAlpha} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Avg Alpha = mean(Fund − Benchmark) per period. Positive = fund consistently delivered more.
            </p>
          </div>

          {/* ── Section 2: Absolute vs Relative Volatility ────────────────── */}
          <div>
            <SectionHeader
              title="Absolute vs Relative Volatility"
              subtitle="How much does the fund's return vary on its own, and how does it move relative to the benchmark?"
            />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left font-medium text-gray-500 pb-2 pr-4">Fund</th>
                    <th className="text-right font-medium text-gray-500 pb-2 px-3">
                      Std Dev <span className="font-normal">(Fund)</span>
                    </th>
                    <th className="text-right font-medium text-gray-500 pb-2 px-3">
                      Std Dev <span className="font-normal">(Bench)</span>
                    </th>
                    <th className="text-right font-medium text-gray-500 pb-2 px-3">Beta (β)</th>
                    <th className="text-right font-medium text-gray-500 pb-2 pl-3">Tracking Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {allStats.map(({ fund, color, vol }) => (
                    <tr key={fund.scheme_code} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                          <span className="font-medium text-gray-800 truncate" title={fund.scheme_name}>
                            {shortName(fund.scheme_name)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <NeutralValue value={vol.stdDevFund} />
                      </td>
                      <td className="py-3 px-3 text-right text-gray-500">
                        <NeutralValue value={vol.stdDevBench} />
                      </td>
                      <td className="py-3 px-3 text-right">
                        {/* Beta: colour-code >1 as amber (aggressive) <1 as blue (defensive) */}
                        {isNaN(vol.beta) ? (
                          <span className="text-gray-400">N/A</span>
                        ) : (
                          <span className={`font-semibold ${
                            vol.beta > 1.1 ? 'text-amber-600'
                            : vol.beta < 0.9 ? 'text-blue-600'
                            : 'text-gray-800'
                          }`}>
                            {vol.beta.toFixed(2)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 pl-3 text-right">
                        <NeutralValue value={vol.trackingError} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-xs text-gray-400 mt-2 space-y-0.5">
              <p>Std Dev = standard deviation of rolling return observations (wider spread = more uncertain outcomes).</p>
              <p>Beta &gt; 1 = amplifies benchmark (amber), Beta &lt; 1 = dampens benchmark (blue), ~1 = market-like (gray).</p>
              <p>Tracking Error = σ(Fund − Benchmark). Low TE = benchmark-hugging. High TE = high-conviction active bet.</p>
              <p className="text-gray-300">Note: rolling return observations are overlapping — Std Dev / TE comparisons are valid for ranking, not for absolute volatility inference.</p>
            </div>
          </div>

          {/* ── Section 3: Fund Quality Indicators ───────────────────────── */}
          <div>
            <SectionHeader
              title="Fund Quality Indicators"
              subtitle="How consistent and efficient is the fund's active management relative to the benchmark?"
            />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left font-medium text-gray-500 pb-2 pr-4">Fund</th>
                    <th className="text-right font-medium text-gray-500 pb-2 px-3">Avg Alpha</th>
                    <th className="text-right font-medium text-gray-500 pb-2 px-3">Tracking Error</th>
                    <th className="text-right font-medium text-gray-500 pb-2 pl-3">Information Ratio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {allStats.map(({ fund, color, outperf, vol }) => (
                    <tr key={fund.scheme_code} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                          <span className="font-medium text-gray-800 truncate" title={fund.scheme_name}>
                            {shortName(fund.scheme_name)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <SignedValue value={outperf.avgAlpha} />
                      </td>
                      <td className="py-3 px-3 text-right">
                        <NeutralValue value={vol.trackingError} />
                      </td>
                      <td className="py-3 pl-3 text-right">
                        {/* IR interpretation: >0.5 = good, >1.0 = excellent */}
                        {isNaN(vol.infoRatio) ? (
                          <span className="text-gray-400">N/A</span>
                        ) : (
                          <span className={`font-semibold ${
                            vol.infoRatio >= 1.0 ? 'text-emerald-600'
                            : vol.infoRatio >= 0.5 ? 'text-blue-600'
                            : vol.infoRatio >= 0 ? 'text-gray-700'
                            : 'text-rose-600'
                          }`}>
                            {fmtRatio(vol.infoRatio)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-xs text-gray-400 mt-2 space-y-0.5">
              <p>Information Ratio = Avg Alpha / Tracking Error. Measures alpha earned per unit of active risk taken.</p>
              <p>
                <span className="text-emerald-600 font-medium">IR &ge; 1.0</span> = excellent ·{' '}
                <span className="text-blue-600 font-medium">0.5 – 1.0</span> = good ·{' '}
                <span className="text-gray-700 font-medium">0 – 0.5</span> = weak positive ·{' '}
                <span className="text-rose-600 font-medium">&lt; 0</span> = underperforming on a risk-adjusted basis
              </p>
            </div>
          </div>

          {/* ── Section 4: Symmetric vs Asymmetric Risk ───────────────────── */}
          <div>
            <SectionHeader
              title="Symmetric vs Asymmetric Risk"
              subtitle={`Risk-adjusted return using total volatility (Sharpe) and downside-only volatility (Sortino) · Rf = ${(riskFreeAnnual * 100).toFixed(1)}% p.a.`}
            />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left font-medium text-gray-500 pb-2 pr-4">Fund</th>
                    <th className="text-right font-medium text-gray-500 pb-2 px-3">
                      Sharpe <span className="font-normal">(Fund)</span>
                    </th>
                    <th className="text-right font-medium text-gray-500 pb-2 px-3">
                      Sharpe <span className="font-normal">(Bench)</span>
                    </th>
                    <th className="text-right font-medium text-gray-500 pb-2 px-3">
                      Sortino <span className="font-normal">(Fund)</span>
                    </th>
                    <th className="text-right font-medium text-gray-500 pb-2 pl-3">
                      Sortino <span className="font-normal">(Bench)</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {allStats.map(({ fund, color, vol }) => (
                    <tr key={fund.scheme_code} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                          <span className="font-medium text-gray-800 truncate" title={fund.scheme_name}>
                            {shortName(fund.scheme_name)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <SignedValue value={vol.sharpeFund} isRatio />
                      </td>
                      <td className="py-3 px-3 text-right text-gray-500">
                        <SignedValue value={vol.sharpeBench} isRatio />
                      </td>
                      <td className="py-3 px-3 text-right">
                        <SignedValue value={vol.sortinoFund} isRatio />
                      </td>
                      <td className="py-3 pl-3 text-right text-gray-500">
                        <SignedValue value={vol.sortinoBench} isRatio />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-xs text-gray-400 mt-2 space-y-0.5">
              <p>Sharpe = (Mean Return − Rf) / Std Dev. Penalises all volatility equally — symmetric.</p>
              <p>Sortino = (Mean Return − Rf) / Downside Std Dev. Only penalises returns below Rf — asymmetric, investor-friendly.</p>
              <p>Fund Sharpe &gt; Benchmark Sharpe = fund offered better risk-adjusted return. Same logic for Sortino.</p>
            </div>
          </div>

          {/* ── Section 5: Risk-Return Scatter ───────────────────────────── */}
          {scatterFundPoints.length > 0 && benchPoint && (
            <div>
              <SectionHeader
                title="Risk-Return Map"
                subtitle="Each dot = a fund or benchmark. Upper-left quadrant = higher return for less risk (better). Upper-right = higher return but higher risk."
              />
              <ResponsiveContainer width="100%" height={280}>
                <ScatterChart margin={{ top: 16, right: 24, bottom: 24, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    type="number" dataKey="x" name="Std Dev"
                    label={{ value: `Risk — Std Dev (${returnLabel} %)`, position: 'insideBottom', offset: -12, fontSize: 11, fill: '#9ca3af' }}
                    tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false}
                    tickFormatter={(v) => `${v.toFixed(1)}%`}
                    domain={['auto', 'auto']}
                  />
                  <YAxis
                    type="number" dataKey="y" name="Mean Return"
                    label={{ value: `Return — Mean (${returnLabel} %)`, angle: -90, position: 'insideLeft', offset: 12, fontSize: 11, fill: '#9ca3af' }}
                    tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false}
                    tickFormatter={(v) => `${v.toFixed(1)}%`}
                    domain={['auto', 'auto']}
                  />
                  <ZAxis range={[80, 80]} />
                  <Tooltip content={<ScatterTooltip />} />

                  {/* One Scatter per fund so each gets its own colour */}
                  {scatterFundPoints.map((pt) => (
                    <Scatter
                      key={pt.name}
                      name={pt.name}
                      data={[pt]}
                      fill={pt.color}
                    />
                  ))}

                  {/* Benchmark as a distinct diamond shape */}
                  <Scatter
                    name={shortName(data.benchmark_name)}
                    data={[benchPoint]}
                    fill={BENCHMARK_COLOR}
                    shape={(props) => {
                      const { cx, cy } = props;
                      const s = 8;
                      return (
                        <polygon
                          points={`${cx},${cy - s} ${cx + s},${cy} ${cx},${cy + s} ${cx - s},${cy}`}
                          fill={BENCHMARK_COLOR}
                          opacity={0.9}
                        />
                      );
                    }}
                  />
                </ScatterChart>
              </ResponsiveContainer>

              {/* Legend for scatter */}
              <div className="flex flex-wrap gap-3 mt-2 justify-center">
                {scatterFundPoints.map((pt) => (
                  <div key={pt.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: pt.color }} />
                    {pt.name}
                  </div>
                ))}
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <svg width="12" height="12" viewBox="0 0 12 12">
                    <polygon points="6,0 12,6 6,12 0,6" fill={BENCHMARK_COLOR} opacity="0.9" />
                  </svg>
                  {shortName(data.benchmark_name)}
                </div>
              </div>
            </div>
          )}

          {/* Footer disclaimer */}
          <p className="text-xs text-gray-300 border-t border-gray-50 pt-3">
            All metrics derived from {allStats[0]?.outperf.total ?? 0} co-aligned downsampled rolling-return
            observations. Overlapping windows introduce serial correlation — use for relative comparison only,
            not as standalone absolute risk estimates.
          </p>
        </div>
      )}
    </>
  );
};

export default RollingReturnChart;
