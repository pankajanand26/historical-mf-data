import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { extractReturnDist, getDistributionStats } from '../../../utils/sipUtils';
import { shortName } from '../../../utils/formatters';
import { FUND_COLORS, WINDOWS } from '../../../utils/constants';
import { SectionHeader } from '../../ui';

/**
 * Distribution card - Histogram of rolling CAGR returns.
 * Shows distribution shape and key statistics.
 */
const DistributionCard = ({ data }) => {
  const [activeWindow, setActiveWindow] = useState('3y');
  const [activeFund, setActiveFund] = useState(null);

  const avail = useMemo(
    () => data?.benchmark_windows?.map((bw) => bw.window) ?? [],
    [data]
  );
  const curWin = avail.includes(activeWindow) ? activeWindow : avail[0] ?? '3y';
  const funds = data?.funds ?? [];

  // Default to first fund if none selected
  const selectedFundCode = activeFund ?? funds[0]?.scheme_code ?? null;
  const selectedFund = funds.find((f) => f.scheme_code === selectedFundCode);

  // Build histogram data
  const distData = useMemo(() => {
    if (!selectedFundCode) return [];
    const raw = extractReturnDist(data, selectedFundCode, curWin);
    if (raw.length === 0) return [];

    // Create histogram buckets
    const min = Math.min(...raw);
    const max = Math.max(...raw);
    const bucketCount = 20;
    const bucketSize = (max - min) / bucketCount || 1;

    const buckets = Array(bucketCount)
      .fill(0)
      .map((_, i) => ({
        range: `${(min + i * bucketSize).toFixed(0)}%`,
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

  // Get statistics
  const stats = useMemo(() => {
    const raw = extractReturnDist(data, selectedFundCode, curWin);
    return getDistributionStats(raw);
  }, [data, selectedFundCode, curWin]);

  const fundColor =
    FUND_COLORS[
      funds.findIndex((f) => f.scheme_code === selectedFundCode) %
        FUND_COLORS.length
    ];

  if (!data?.funds?.length) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold text-gray-900">
          Return Distribution
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Histogram of rolling CAGR returns · Shows probability of different
          return outcomes
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Window selector */}
        <div className="flex gap-2">
          {avail.map((w) => (
            <button
              key={w}
              onClick={() => setActiveWindow(w)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                curWin === w
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {WINDOWS.find((x) => x.id === w)?.label ?? w.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Fund selector */}
        <div className="flex gap-2 flex-wrap">
          {funds.map((f, i) => (
            <button
              key={f.scheme_code}
              onClick={() => setActiveFund(f.scheme_code)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1.5 ${
                selectedFundCode === f.scheme_code
                  ? 'bg-white border-2 border-blue-500 shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: FUND_COLORS[i % FUND_COLORS.length],
                }}
              />
              <span className="max-w-[100px] truncate text-xs font-medium">
                {shortName(f.scheme_name).split(' ')[0]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Statistics summary */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { label: 'Count', value: stats.count, suffix: '' },
            { label: 'Mean', value: stats.mean, suffix: '%' },
            { label: 'Median', value: stats.median, suffix: '%' },
            { label: 'Std Dev', value: stats.stdDev, suffix: '%' },
            { label: 'Min', value: stats.min, suffix: '%' },
            { label: 'Max', value: stats.max, suffix: '%' },
          ].map(({ label, value, suffix }) => (
            <div
              key={label}
              className="bg-gray-50 rounded-lg px-3 py-2 text-center"
            >
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">
                {label}
              </div>
              <div className="text-sm font-semibold text-gray-800">
                {typeof value === 'number' ? value.toFixed(1) : value}
                {suffix}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Histogram chart */}
      {distData.length > 0 ? (
        <div>
          <p className="text-xs text-gray-500 mb-3">
            <span className="font-medium">{selectedFund?.scheme_name}</span> —{' '}
            {curWin.toUpperCase()} window —{' '}
            {extractReturnDist(data, selectedFundCode, curWin).length}{' '}
            observations
          </p>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={distData}
              margin={{ top: 10, right: 20, bottom: 40, left: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="range"
                tick={{ fontSize: 10, fill: '#6b7280' }}
                tickLine={false}
                label={{
                  value: 'CAGR (%)',
                  position: 'insideBottom',
                  offset: -25,
                  fontSize: 11,
                  fill: '#9ca3af',
                }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#6b7280' }}
                tickLine={false}
                axisLine={false}
                width={40}
                label={{
                  value: 'Frequency',
                  angle: -90,
                  position: 'insideLeft',
                  fontSize: 11,
                  fill: '#9ca3af',
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(v, name, props) => [
                  `${v} observations`,
                  `${props.payload.rangeStart?.toFixed(1)}% to ${props.payload.rangeEnd?.toFixed(1)}%`,
                ]}
              />
              {stats?.mean != null && (
                <ReferenceLine
                  x={
                    distData.find(
                      (d) =>
                        d.midpoint <= stats.mean && d.rangeEnd > stats.mean
                    )?.range
                  }
                  stroke="#3b82f6"
                  strokeWidth={2}
                  strokeDasharray="4 2"
                  label={{
                    value: `Mean: ${stats.mean.toFixed(1)}%`,
                    fill: '#3b82f6',
                    fontSize: 10,
                    position: 'top',
                  }}
                />
              )}
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {distData.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={entry.midpoint >= 0 ? '#22c55e' : '#ef4444'}
                    fillOpacity={0.8}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-500 text-sm">
            No distribution data available for selected fund/window.
          </p>
        </div>
      )}

      {/* Interpretation guide */}
      <div className="text-xs text-gray-400 border-t border-gray-100 pt-3 space-y-1">
        <p>
          <span className="text-emerald-600 font-medium">Green bars</span> =
          positive returns ·{' '}
          <span className="text-red-500 font-medium">Red bars</span> = negative
          returns
        </p>
        <p>
          A wider distribution indicates higher volatility. The mean shows the
          central tendency of historical returns.
        </p>
      </div>
    </div>
  );
};

export default DistributionCard;
