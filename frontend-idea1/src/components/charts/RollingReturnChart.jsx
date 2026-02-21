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

const formatPct = (v) => (v == null ? 'N/A' : `${v.toFixed(2)}%`);

const shortName = (name) =>
  name?.length > 42 ? name.slice(0, 39) + '...' : name;

const tickFormatter = (dateStr) => {
  if (!dateStr) return '';
  const [year, month] = dateStr.split('-');
  return `${month}/${year?.slice(2)}`;
};

/**
 * Convert a raw absolute return percentage to CAGR percentage.
 * raw value is already in % form (e.g. 45.23 means 45.23% total return).
 * CAGR = ((1 + total_return)^(365/window_days) - 1) * 100
 */
function applyReturnType(valuePct, windowDays, returnType) {
  if (valuePct == null) return null;
  if (returnType === 'cagr') {
    return ((1 + valuePct / 100) ** (365 / windowDays) - 1) * 100;
  }
  return valuePct;
}

/**
 * Merge fund windows + benchmark window into a single array for Recharts,
 * applying the return type transformation.
 * Each row: { date, fund_<scheme_code>: value, benchmark: value }
 */
function buildChartData(funds, benchmarkWindow, returnType) {
  const map = new Map();
  const windowDays = benchmarkWindow?.window_days;

  // Benchmark points
  if (benchmarkWindow) {
    for (const pt of benchmarkWindow.data) {
      map.set(pt.date, {
        date: pt.date,
        benchmark: applyReturnType(pt.value, windowDays, returnType),
      });
    }
  }

  // Fund points
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

/**
 * Compute outperformance/underperformance stats for a single fund
 * against the benchmark using already-transformed chartData rows.
 */
function computeOutperformanceStats(chartData, fund) {
  let outperformed = 0;
  let underperformed = 0;
  let tied = 0;
  let totalAlpha = 0;
  let count = 0;

  const key = `fund_${fund.scheme_code}`;

  for (const row of chartData) {
    const fundVal = row[key];
    const benchVal = row.benchmark;
    if (fundVal == null || benchVal == null) continue;

    const alpha = fundVal - benchVal;
    totalAlpha += alpha;
    count++;

    if (fundVal > benchVal) outperformed++;
    else if (fundVal < benchVal) underperformed++;
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

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm max-w-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 py-0.5">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-600 truncate">{entry.name}:</span>
          <span className="font-medium ml-auto pl-2">{formatPct(entry.value)}</span>
        </div>
      ))}
    </div>
  );
};

const RollingReturnChart = ({ data }) => {
  const windows = data?.benchmark_windows ?? [];
  const funds = data?.funds ?? [];

  const [activeWindow, setActiveWindow] = useState(windows[0]?.window ?? null);
  const [returnType, setReturnType] = useState('absolute');

  if (!data || !windows.length || !funds.length) return null;

  const benchmarkWindow =
    windows.find((w) => w.window === activeWindow) ?? windows[0];
  const currentWindow = benchmarkWindow.window;
  const windowDays = benchmarkWindow.window_days;

  const chartData = buildChartData(funds, benchmarkWindow, returnType);
  const hasData = chartData.length > 0;

  // Summary stats per fund for current window (with return type applied)
  const fundStats = funds.map((fund, idx) => {
    const fundWindow = fund.windows.find((w) => w.window === currentWindow);
    const values = (fundWindow?.data ?? [])
      .map((d) => applyReturnType(d.value, windowDays, returnType))
      .filter((v) => v != null);
    const latest = values.at(-1) ?? null;
    const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
    return { fund, color: FUND_COLORS[idx % FUND_COLORS.length], latest, avg };
  });

  const benchValues = benchmarkWindow.data
    .map((d) => applyReturnType(d.value, windowDays, returnType))
    .filter((v) => v != null);
  const benchLatest = benchValues.at(-1) ?? null;
  const benchAvg = benchValues.length
    ? benchValues.reduce((a, b) => a + b, 0) / benchValues.length
    : null;

  // Outperformance stats (uses already-transformed chartData, so respects toggle)
  const outperformanceStats = funds.map((fund, idx) => ({
    fund,
    color: FUND_COLORS[idx % FUND_COLORS.length],
    stats: computeOutperformanceStats(chartData, fund),
  }));

  const returnLabel = returnType === 'cagr' ? 'CAGR' : 'Absolute';

  return (
    <>
      {/* ── Rolling Return Chart Card ── */}
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

        {/* Window tabs + Absolute / CAGR toggle */}
        <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
          {/* Window tabs */}
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

          {/* Return type toggle */}
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden text-sm font-medium shadow-sm">
            <button
              onClick={() => setReturnType('absolute')}
              className={`px-3 py-1.5 transition-colors ${
                returnType === 'absolute'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Absolute
            </button>
            <button
              onClick={() => setReturnType('cagr')}
              className={`px-3 py-1.5 transition-colors ${
                returnType === 'cagr'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              CAGR
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="space-y-2 mb-5">
          {/* Fund rows */}
          {fundStats.map(({ fund, color, latest, avg }) => (
            <div
              key={fund.scheme_code}
              className="grid grid-cols-3 gap-2 items-center bg-gray-50 rounded-lg px-3 py-2"
            >
              <div className="col-span-1 flex items-center gap-2 min-w-0">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span
                  className="text-xs font-medium text-gray-700 truncate"
                  title={fund.scheme_name}
                >
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

          {/* Benchmark row */}
          <div className="grid grid-cols-3 gap-2 items-center bg-gray-50 rounded-lg px-3 py-2">
            <div className="col-span-1 flex items-center gap-2 min-w-0">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0 border-2"
                style={{ borderColor: BENCHMARK_COLOR, backgroundColor: 'white' }}
              />
              <span
                className="text-xs font-medium text-gray-700 truncate"
                title={data.benchmark_name}
              >
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
              <XAxis
                dataKey="date"
                tickFormatter={tickFormatter}
                tick={{ fontSize: 11, fill: '#6b7280' }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tickFormatter={(v) => `${v.toFixed(0)}%`}
                tick={{ fontSize: 11, fill: '#6b7280' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(value) => (
                  <span className="text-xs text-gray-700">{value}</span>
                )}
              />
              <ReferenceLine y={0} stroke="#e5e7eb" strokeDasharray="4 4" />

              {/* One line per fund */}
              {funds.map((fund, idx) => (
                <Line
                  key={fund.scheme_code}
                  type="monotone"
                  dataKey={`fund_${fund.scheme_code}`}
                  name={shortName(fund.scheme_name)}
                  stroke={FUND_COLORS[idx % FUND_COLORS.length]}
                  dot={false}
                  strokeWidth={2}
                  connectNulls={false}
                />
              ))}

              {/* Benchmark — dashed */}
              <Line
                type="monotone"
                dataKey="benchmark"
                name={shortName(data.benchmark_name)}
                stroke={BENCHMARK_COLOR}
                dot={false}
                strokeWidth={2}
                strokeDasharray="5 3"
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Outperformance Analysis Card ── */}
      {hasData && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-gray-900">Outperformance Analysis</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {currentWindow.toUpperCase()} rolling {returnLabel} returns ·{' '}
              {outperformanceStats[0]?.stats.total ?? 0} shared data points ·{' '}
              Fund vs {shortName(data.benchmark_name)}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left font-medium text-gray-500 pb-2 pr-4">Fund</th>
                  <th className="text-right font-medium text-gray-500 pb-2 px-3">
                    Outperformed
                  </th>
                  <th className="text-right font-medium text-gray-500 pb-2 px-3">
                    Underperformed
                  </th>
                  <th className="text-right font-medium text-gray-500 pb-2 pl-3">
                    Avg Alpha / period
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {outperformanceStats.map(({ fund, color, stats }) => (
                  <tr key={fund.scheme_code} className="hover:bg-gray-50 transition-colors">
                    {/* Fund name */}
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span
                          className="font-medium text-gray-800 truncate"
                          title={fund.scheme_name}
                        >
                          {shortName(fund.scheme_name)}
                        </span>
                      </div>
                    </td>

                    {/* Outperformed */}
                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex flex-col items-end">
                        <span className="font-semibold text-emerald-600">
                          {stats.outperformedPct.toFixed(1)}%
                        </span>
                        <span className="text-xs text-gray-400">
                          {stats.outperformed}/{stats.total} periods
                        </span>
                      </div>
                    </td>

                    {/* Underperformed */}
                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex flex-col items-end">
                        <span className="font-semibold text-rose-600">
                          {stats.underperformedPct.toFixed(1)}%
                        </span>
                        <span className="text-xs text-gray-400">
                          {stats.underperformed}/{stats.total} periods
                        </span>
                      </div>
                    </td>

                    {/* Avg Alpha */}
                    <td className="py-3 pl-3 text-right">
                      <span
                        className={`font-semibold ${
                          stats.avgAlpha >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {stats.avgAlpha >= 0 ? '+' : ''}
                        {stats.avgAlpha.toFixed(2)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer note */}
          <p className="text-xs text-gray-400 mt-3 border-t border-gray-50 pt-3">
            Outperformed / Underperformed = % of rolling-return windows where the fund beat or
            trailed the benchmark · Avg Alpha = mean(Fund − Benchmark) per period · Positive
            alpha means the fund consistently delivered more than the benchmark over this window
          </p>
        </div>
      )}
    </>
  );
};

export default RollingReturnChart;
