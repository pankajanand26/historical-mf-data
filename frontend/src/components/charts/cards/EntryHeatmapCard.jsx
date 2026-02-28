import { useState, useMemo } from 'react';
import { FUND_COLORS, BENCHMARK_COLOR } from '../../../utils/constants';
import { shortName, shortNameMd } from '../../../utils/formatters';

/**
 * Build entry date heatmap data from rolling return windows.
 * Matrix: rows = entry year, columns = holding period (1Y/3Y/5Y/10Y), cells = CAGR
 * 
 * @param {Object} fund - Fund object with windows data
 * @returns {Object} - { years: string[], windows: string[], matrix: { [year]: { [window]: number } } }
 */
function buildEntryHeatmap(fund) {
  if (!fund?.windows?.length) return null;
  
  const windowOrder = ['1y', '3y', '5y', '10y'];
  const availableWindows = fund.windows
    .filter(w => windowOrder.includes(w.window))
    .sort((a, b) => windowOrder.indexOf(a.window) - windowOrder.indexOf(b.window));
  
  if (!availableWindows.length) return null;
  
  // Group returns by entry year
  const matrix = {};
  const allYears = new Set();
  
  for (const windowData of availableWindows) {
    const windowId = windowData.window;
    const windowDays = windowData.window_days;
    
    for (const point of windowData.data || []) {
      const entryDate = point.date;
      const year = entryDate.split('-')[0];
      allYears.add(year);
      
      if (!matrix[year]) matrix[year] = {};
      
      // Convert rolling return to CAGR
      const value = point.value;
      const cagr = windowDays > 365 
        ? (Math.pow(1 + value, 365 / windowDays) - 1) * 100
        : value * 100;
      
      // Take the average if we have multiple data points for same year-window
      if (matrix[year][windowId] == null) {
        matrix[year][windowId] = { sum: cagr, count: 1 };
      } else {
        matrix[year][windowId].sum += cagr;
        matrix[year][windowId].count += 1;
      }
    }
  }
  
  // Average out the values
  for (const year of Object.keys(matrix)) {
    for (const win of Object.keys(matrix[year])) {
      const { sum, count } = matrix[year][win];
      matrix[year][win] = sum / count;
    }
  }
  
  const years = Array.from(allYears).sort();
  const windows = availableWindows.map(w => w.window);
  
  return { years, windows, matrix };
}

/**
 * Interpolate color from red (negative) through yellow (0) to green (positive)
 */
function getHeatmapColor(value) {
  if (value == null || isNaN(value)) return 'bg-gray-100 text-gray-400';
  
  // Clamp value for color calculation
  const clamped = Math.max(-20, Math.min(30, value));
  
  if (clamped < 0) {
    // Red gradient: -20 = bright red, 0 = light red
    const intensity = Math.abs(clamped) / 20;
    if (intensity > 0.7) return 'bg-red-600 text-white';
    if (intensity > 0.4) return 'bg-red-500 text-white';
    if (intensity > 0.2) return 'bg-red-400 text-white';
    return 'bg-red-300 text-red-900';
  } else if (clamped < 8) {
    // Yellow-ish range: 0-8
    if (clamped < 2) return 'bg-amber-200 text-amber-900';
    if (clamped < 5) return 'bg-amber-300 text-amber-900';
    return 'bg-yellow-400 text-yellow-900';
  } else {
    // Green gradient: 8+ = green shades
    if (clamped < 12) return 'bg-emerald-300 text-emerald-900';
    if (clamped < 16) return 'bg-emerald-400 text-white';
    if (clamped < 22) return 'bg-emerald-500 text-white';
    return 'bg-emerald-600 text-white';
  }
}

/**
 * Format window label
 */
const windowLabel = (w) => {
  const labels = { '1y': '1 Year', '3y': '3 Year', '5y': '5 Year', '10y': '10 Year' };
  return labels[w] || w.toUpperCase();
};

/**
 * Entry Date Heatmap Card
 * Matrix showing CAGR by entry year and holding period
 */
const EntryHeatmapCard = ({ data }) => {
  const funds = data?.funds ?? [];
  const [activeFund, setActiveFund] = useState(funds[0]?.scheme_code ?? null);
  
  const fundOptions = useMemo(() => [
    ...funds.map((f, i) => ({
      code: f.scheme_code,
      name: f.scheme_name,
      color: FUND_COLORS[i % FUND_COLORS.length],
      fund: f,
    })),
  ], [funds]);
  
  const selectedFundData = fundOptions.find(f => f.code === activeFund);
  
  // Build heatmap data for selected fund
  const heatmapData = useMemo(() => {
    if (!selectedFundData?.fund) return null;
    return buildEntryHeatmap(selectedFundData.fund);
  }, [selectedFundData]);
  
  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (!heatmapData?.matrix) return null;
    
    const stats = {};
    for (const win of heatmapData.windows) {
      const values = heatmapData.years
        .map(y => heatmapData.matrix[y]?.[win])
        .filter(v => v != null && !isNaN(v));
      
      if (values.length) {
        const sorted = [...values].sort((a, b) => a - b);
        stats[win] = {
          min: sorted[0],
          max: sorted[sorted.length - 1],
          avg: values.reduce((s, v) => s + v, 0) / values.length,
          median: sorted[Math.floor(sorted.length / 2)],
          negative: values.filter(v => v < 0).length,
          total: values.length,
        };
      }
    }
    return stats;
  }, [heatmapData]);
  
  if (!funds.length) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <p className="text-gray-500">Select funds to view entry date analysis.</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Entry Date Return Matrix</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          CAGR achieved based on entry year and holding period
        </p>
      </div>
      
      {/* Fund selector */}
      <div className="flex gap-2 flex-wrap">
        {fundOptions.map((opt) => (
          <button
            key={opt.code}
            onClick={() => setActiveFund(opt.code)}
            className={`px-3 py-1.5 text-xs rounded-lg transition-all flex items-center gap-2 ${
              activeFund === opt.code
                ? 'bg-indigo-50 border-2 border-indigo-500 text-indigo-700 font-medium'
                : 'bg-gray-50 border border-gray-200 text-gray-600 hover:border-gray-400'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: opt.color }} />
            <span className="max-w-[120px] truncate">{shortNameMd(opt.name)}</span>
          </button>
        ))}
      </div>
      
      {/* Heatmap table */}
      {heatmapData && heatmapData.years.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-200">
                  Entry Year
                </th>
                {heatmapData.windows.map((w) => (
                  <th key={w} className="px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-200">
                    {windowLabel(w)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatmapData.years.map((year) => (
                <tr key={year} className="hover:bg-gray-50/50">
                  <td className="px-3 py-2 text-xs font-semibold text-gray-700 border-b border-gray-100">
                    {year}
                  </td>
                  {heatmapData.windows.map((win) => {
                    const value = heatmapData.matrix[year]?.[win];
                    const colorClass = getHeatmapColor(value);
                    return (
                      <td key={win} className="px-1 py-1 text-center border-b border-gray-100">
                        {value != null ? (
                          <span className={`inline-block w-full px-2 py-1.5 rounded text-xs font-mono font-medium ${colorClass}`}>
                            {value >= 0 ? '+' : ''}{value.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="inline-block w-full px-2 py-1.5 rounded text-xs text-gray-400">
                            —
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 text-sm">
          No heatmap data available for selected fund.
        </div>
      )}
      
      {/* Summary statistics per window */}
      {summaryStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          {heatmapData?.windows.map((win) => {
            const stats = summaryStats[win];
            if (!stats) return null;
            return (
              <div key={win} className="bg-gray-50 rounded-lg p-3">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1">
                  {windowLabel(win)}
                </p>
                <div className="space-y-0.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Min:</span>
                    <span className={stats.min < 0 ? 'text-red-600' : 'text-emerald-600'}>
                      {stats.min.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Median:</span>
                    <span className={stats.median < 0 ? 'text-red-600' : 'text-emerald-600'}>
                      {stats.median.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Max:</span>
                    <span className="text-emerald-600">{stats.max.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Negative:</span>
                    <span className={stats.negative > 0 ? 'text-red-600' : 'text-gray-600'}>
                      {stats.negative}/{stats.total}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Legend */}
      <div className="flex items-center gap-1 text-[10px] text-gray-500 flex-wrap">
        <span>Color scale:</span>
        <span className="px-2 py-0.5 rounded bg-red-600 text-white">&lt;-10%</span>
        <span className="px-2 py-0.5 rounded bg-red-400 text-white">-10 to -5%</span>
        <span className="px-2 py-0.5 rounded bg-red-300 text-red-900">-5 to 0%</span>
        <span className="px-2 py-0.5 rounded bg-amber-300 text-amber-900">0 to 5%</span>
        <span className="px-2 py-0.5 rounded bg-yellow-400 text-yellow-900">5 to 8%</span>
        <span className="px-2 py-0.5 rounded bg-emerald-400 text-white">8 to 15%</span>
        <span className="px-2 py-0.5 rounded bg-emerald-600 text-white">&gt;15%</span>
      </div>
      
      {/* Explanation */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-800">
        <p className="font-medium mb-1">How to read this:</p>
        <ul className="list-disc list-inside space-y-0.5 text-[11px]">
          <li>Each row shows returns for investors who entered in that year</li>
          <li>Columns show CAGR for different holding periods (1Y, 3Y, 5Y, 10Y)</li>
          <li>Green = positive returns, Red = negative returns</li>
          <li>Longer holding periods typically show more consistent (less red) results</li>
        </ul>
      </div>
    </div>
  );
};

export default EntryHeatmapCard;
