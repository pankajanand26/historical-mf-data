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

/**
 * Merge fund windows + benchmark window into a single array for Recharts.
 * Each row: { date, fund_<scheme_code>: value, benchmark: value }
 * Uses a Map keyed by date for O(n) merge.
 */
function buildChartData(funds, benchmarkWindow) {
  const map = new Map();

  // Benchmark points
  if (benchmarkWindow) {
    for (const pt of benchmarkWindow.data) {
      map.set(pt.date, { date: pt.date, benchmark: pt.value });
    }
  }

  // Fund points
  for (const fund of funds) {
    const fundWindow = fund.windows.find((w) => w.window === benchmarkWindow?.window);
    if (!fundWindow) continue;
    for (const pt of fundWindow.data) {
      const row = map.get(pt.date) ?? { date: pt.date };
      row[`fund_${fund.scheme_code}`] = pt.value;
      map.set(pt.date, row);
    }
  }

  return Array.from(map.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
}

const RollingReturnChart = ({ data }) => {
  const windows = data?.benchmark_windows ?? [];
  const funds = data?.funds ?? [];

  const [activeWindow, setActiveWindow] = useState(windows[0]?.window ?? null);

  if (!data || !windows.length || !funds.length) return null;

  const benchmarkWindow =
    windows.find((w) => w.window === activeWindow) ?? windows[0];
  const currentWindow = benchmarkWindow.window;

  const chartData = buildChartData(funds, benchmarkWindow);
  const hasData = chartData.length > 0;

  // Summary stats per fund for current window
  const fundStats = funds.map((fund, idx) => {
    const fundWindow = fund.windows.find((w) => w.window === currentWindow);
    const values = (fundWindow?.data ?? []).map((d) => d.value).filter((v) => v != null);
    const latest = values.at(-1) ?? null;
    const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
    return { fund, color: FUND_COLORS[idx % FUND_COLORS.length], latest, avg };
  });

  const benchValues = benchmarkWindow.data.map((d) => d.value).filter((v) => v != null);
  const benchLatest = benchValues.at(-1) ?? null;
  const benchAvg = benchValues.length
    ? benchValues.reduce((a, b) => a + b, 0) / benchValues.length
    : null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      {/* Title */}
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">Rolling Returns vs Benchmark</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Point-in-time annualised return over trailing window · Values in %
        </p>
      </div>

      {/* Window tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
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
  );
};

export default RollingReturnChart;
