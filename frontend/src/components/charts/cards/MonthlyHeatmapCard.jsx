import { useState, useMemo } from 'react';
import { FUND_COLORS, BENCHMARK_COLOR } from '../../../utils/constants';
import { shortNameMd } from '../../../utils/formatters';
import { SectionHeader } from '../../ui';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Get background and text color classes based on return value.
 * Light theme version with softer colors.
 */
const getColorClasses = (val) => {
  if (val == null) return { bg: 'bg-gray-100', text: 'text-gray-400' };
  if (val >= 5) return { bg: 'bg-green-500', text: 'text-white' };
  if (val >= 2) return { bg: 'bg-green-400', text: 'text-white' };
  if (val >= 0) return { bg: 'bg-green-200', text: 'text-green-800' };
  if (val >= -2) return { bg: 'bg-red-200', text: 'text-red-800' };
  if (val >= -5) return { bg: 'bg-red-400', text: 'text-white' };
  return { bg: 'bg-red-500', text: 'text-white' };
};

/**
 * Calculate yearly return from monthly returns.
 */
const calcYearlyReturn = (months) => {
  const values = Object.values(months).filter((v) => v != null);
  if (values.length === 0) return null;
  // Compound monthly returns: (1+r1) * (1+r2) * ... - 1
  const compound = values.reduce((acc, v) => acc * (1 + v / 100), 1);
  return (compound - 1) * 100;
};

/**
 * Monthly Heatmap Card - Calendar view of monthly returns.
 * Shows a year-by-month grid with color-coded returns.
 */
const MonthlyHeatmapCard = ({ data }) => {
  const funds = data?.funds ?? [];
  const monthlyReturns = data?.monthly_returns;

  // Build fund options for selector
  const fundOptions = useMemo(
    () => [
      { key: 'benchmark', name: data?.benchmark_name ?? 'Benchmark', color: BENCHMARK_COLOR },
      ...funds.map((f, i) => ({
        key: `fund_${f.scheme_code}`,
        name: f.scheme_name,
        color: FUND_COLORS[i % FUND_COLORS.length],
      })),
    ],
    [data?.benchmark_name, funds]
  );

  const [activeFund, setActiveFund] = useState(fundOptions[0]?.key ?? 'benchmark');

  // Transform monthly returns into year-by-month grid
  const heatmapData = useMemo(() => {
    if (!monthlyReturns) return [];
    const series = monthlyReturns[activeFund] ?? [];
    if (!series.length) return [];

    // Group by year
    const byYear = {};
    for (const pt of series) {
      const [year, month] = pt.date.split('-');
      if (!byYear[year]) byYear[year] = {};
      byYear[year][parseInt(month)] = pt.value * 100; // Convert to percentage
    }

    // Convert to array format, sorted by year descending (most recent first)
    const years = Object.keys(byYear).sort((a, b) => b - a);
    return years.map((year) => ({
      year,
      months: byYear[year],
      yearlyReturn: calcYearlyReturn(byYear[year]),
    }));
  }, [monthlyReturns, activeFund]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!heatmapData.length) return null;

    const allMonthly = heatmapData.flatMap((y) =>
      Object.values(y.months).filter((v) => v != null)
    );
    if (!allMonthly.length) return null;

    const positive = allMonthly.filter((v) => v > 0).length;
    const negative = allMonthly.filter((v) => v < 0).length;
    const avg = allMonthly.reduce((a, b) => a + b, 0) / allMonthly.length;
    const best = Math.max(...allMonthly);
    const worst = Math.min(...allMonthly);

    return { positive, negative, total: allMonthly.length, avg, best, worst };
  }, [heatmapData]);

  if (!monthlyReturns) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <p className="text-gray-500">No monthly returns data available.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-5">
      {/* Fund selector pills */}
      <div className="flex gap-2 flex-wrap">
        {fundOptions.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setActiveFund(opt.key)}
            className={`px-3 py-1.5 text-xs rounded-lg transition-all flex items-center gap-2 ${
              activeFund === opt.key
                ? 'bg-indigo-50 border-2 border-indigo-500 text-indigo-700 font-medium'
                : 'bg-gray-50 border border-gray-200 text-gray-600 hover:border-gray-400'
            }`}
          >
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: opt.color }}
            />
            <span className="max-w-[140px] truncate">{shortNameMd(opt.name)}</span>
          </button>
        ))}
      </div>

      {/* Statistics summary */}
      {stats && (
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="bg-gray-50 rounded-lg px-3 py-2">
            <span className="text-gray-500">Positive months:</span>{' '}
            <span className="font-semibold text-green-600">
              {stats.positive} ({((stats.positive / stats.total) * 100).toFixed(0)}%)
            </span>
          </div>
          <div className="bg-gray-50 rounded-lg px-3 py-2">
            <span className="text-gray-500">Negative months:</span>{' '}
            <span className="font-semibold text-red-600">
              {stats.negative} ({((stats.negative / stats.total) * 100).toFixed(0)}%)
            </span>
          </div>
          <div className="bg-gray-50 rounded-lg px-3 py-2">
            <span className="text-gray-500">Avg monthly:</span>{' '}
            <span className={`font-semibold ${stats.avg >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.avg >= 0 ? '+' : ''}
              {stats.avg.toFixed(2)}%
            </span>
          </div>
          <div className="bg-gray-50 rounded-lg px-3 py-2">
            <span className="text-gray-500">Best:</span>{' '}
            <span className="font-semibold text-green-600">+{stats.best.toFixed(1)}%</span>
          </div>
          <div className="bg-gray-50 rounded-lg px-3 py-2">
            <span className="text-gray-500">Worst:</span>{' '}
            <span className="font-semibold text-red-600">{stats.worst.toFixed(1)}%</span>
          </div>
        </div>
      )}

      {/* Heatmap table */}
      <div>
        <SectionHeader title="Monthly Returns Calendar" subtitle="Color-coded by return magnitude" />
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-2 px-2 text-left font-semibold text-gray-700 sticky left-0 bg-white">
                  Year
                </th>
                {MONTH_NAMES.map((m) => (
                  <th key={m} className="py-2 px-1 text-center font-medium text-gray-500 w-12">
                    {m}
                  </th>
                ))}
                <th className="py-2 px-2 text-center font-semibold text-gray-700 border-l border-gray-200">
                  YTD
                </th>
              </tr>
            </thead>
            <tbody>
              {heatmapData.map(({ year, months, yearlyReturn }) => (
                <tr key={year} className="hover:bg-gray-50/50">
                  <td className="py-1.5 px-2 font-semibold text-gray-800 sticky left-0 bg-white">
                    {year}
                  </td>
                  {MONTH_NAMES.map((_, i) => {
                    const val = months[i + 1];
                    const { bg, text } = getColorClasses(val);
                    return (
                      <td key={i} className="py-1 px-0.5 text-center">
                        {val != null ? (
                          <span
                            className={`inline-block w-full px-1 py-1.5 rounded text-[10px] font-mono font-medium ${bg} ${text}`}
                            title={`${MONTH_NAMES[i]} ${year}: ${val.toFixed(2)}%`}
                          >
                            {val >= 0 ? '+' : ''}
                            {val.toFixed(1)}
                          </span>
                        ) : (
                          <span className="inline-block w-full px-1 py-1.5 text-[10px] text-gray-300">
                            —
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td className="py-1 px-1 text-center border-l border-gray-200">
                    {yearlyReturn != null ? (
                      <span
                        className={`inline-block px-2 py-1.5 rounded text-[10px] font-mono font-semibold ${
                          yearlyReturn >= 0
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {yearlyReturn >= 0 ? '+' : ''}
                        {yearlyReturn.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Color legend */}
      <div className="flex items-center gap-2 text-[10px] text-gray-500 flex-wrap pt-2 border-t border-gray-100">
        <span className="font-medium">Legend:</span>
        <span className="px-2 py-1 rounded bg-red-500 text-white">&lt;-5%</span>
        <span className="px-2 py-1 rounded bg-red-400 text-white">-5 to -2%</span>
        <span className="px-2 py-1 rounded bg-red-200 text-red-800">-2 to 0%</span>
        <span className="px-2 py-1 rounded bg-green-200 text-green-800">0 to 2%</span>
        <span className="px-2 py-1 rounded bg-green-400 text-white">2 to 5%</span>
        <span className="px-2 py-1 rounded bg-green-500 text-white">&gt;5%</span>
      </div>
    </div>
  );
};

export default MonthlyHeatmapCard;
