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

const WINDOW_COLORS = {
  '1y': { scheme: '#2563eb', benchmark: '#16a34a' },
  '3y': { scheme: '#7c3aed', benchmark: '#d97706' },
  '5y': { scheme: '#db2777', benchmark: '#0891b2' },
  '10y': { scheme: '#dc2626', benchmark: '#65a30d' },
};

const formatPct = (v) => (v == null ? 'N/A' : `${v.toFixed(2)}%`);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="text-gray-600 truncate max-w-[220px]">{entry.name}:</span>
          <span className="font-medium ml-auto">{formatPct(entry.value)}</span>
        </div>
      ))}
    </div>
  );
};

// Thin out labels to avoid X-axis crowding
const tickFormatter = (dateStr) => {
  if (!dateStr) return '';
  const [year, month] = dateStr.split('-');
  return `${month}/${year?.slice(2)}`;
};

const RollingReturnChart = ({ data }) => {
  const [activeWindow, setActiveWindow] = useState(data?.windows?.[0]?.window || null);

  if (!data || !data.windows?.length) return null;

  const windowResult = data.windows.find((w) => w.window === activeWindow) || data.windows[0];
  const colors = WINDOW_COLORS[windowResult.window] || { scheme: '#2563eb', benchmark: '#16a34a' };

  // Build chart data: each point has date, scheme_return, benchmark_return
  const chartData = windowResult.data;
  const hasData = chartData.length > 0;

  // Summary stats
  const schemeReturns = chartData.map((d) => d.scheme_return).filter((v) => v != null);
  const benchReturns = chartData.map((d) => d.benchmark_return).filter((v) => v != null);
  const avgScheme = schemeReturns.length ? schemeReturns.reduce((a, b) => a + b, 0) / schemeReturns.length : null;
  const avgBench = benchReturns.length ? benchReturns.reduce((a, b) => a + b, 0) / benchReturns.length : null;
  const latestScheme = schemeReturns.at(-1) ?? null;
  const latestBench = benchReturns.at(-1) ?? null;

  // Shorten long names for legend
  const shortName = (name) => name?.length > 45 ? name.slice(0, 42) + '...' : name;

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
        {data.windows.map((w) => (
          <button
            key={w.window}
            onClick={() => setActiveWindow(w.window)}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              activeWindow === w.window
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {w.window.toUpperCase()} <span className="text-xs opacity-75">({w.data_points} pts)</span>
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Latest (Fund)', value: latestScheme, color: colors.scheme },
          { label: 'Latest (Benchmark)', value: latestBench, color: colors.benchmark },
          { label: 'Avg Return (Fund)', value: avgScheme, color: colors.scheme },
          { label: 'Avg Return (Benchmark)', value: avgBench, color: colors.benchmark },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="text-lg font-semibold" style={{ color }}>
              {value != null ? `${value.toFixed(2)}%` : 'N/A'}
            </p>
          </div>
        ))}
      </div>

      {/* Chart */}
      {!hasData ? (
        <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
          Not enough data to compute {windowResult.window.toUpperCase()} rolling returns
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={340}>
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
                <span className="text-xs text-gray-700">{shortName(value)}</span>
              )}
            />
            <ReferenceLine y={0} stroke="#e5e7eb" strokeDasharray="4 4" />
            <Line
              type="monotone"
              dataKey="scheme_return"
              name={shortName(windowResult.scheme_name)}
              stroke={colors.scheme}
              dot={false}
              strokeWidth={2}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="benchmark_return"
              name={shortName(windowResult.benchmark_name)}
              stroke={colors.benchmark}
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
