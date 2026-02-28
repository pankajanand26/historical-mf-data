// ─── Chart data building utilities ────────────────────────────────────────────

/**
 * Convert stored absolute-return percentage to CAGR percentage.
 * CAGR = ((1 + total_return)^(365/window_days) − 1) × 100
 *
 * @param {number|null} valuePct - The absolute return in percentage form
 * @param {number} windowDays - Number of days in the rolling window
 * @param {string} returnType - 'absolute' or 'cagr'
 * @returns {number|null} - Transformed return value
 */
export function applyReturnType(valuePct, windowDays, returnType) {
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
 *
 * @param {number} rfAnnual - Annual risk-free rate as decimal (e.g., 0.065)
 * @param {number} windowDays - Number of days in the rolling window
 * @param {string} returnType - 'absolute' or 'cagr'
 * @returns {number} - Risk-free rate adjusted for window/return type
 */
export function rfPeriodPct(rfAnnual, windowDays, returnType) {
  if (returnType === 'cagr') return rfAnnual * 100;
  const years = windowDays / 365;
  return ((1 + rfAnnual) ** years - 1) * 100;
}

/**
 * Calculate the arithmetic mean of an array of numbers.
 */
export function mean(arr) {
  if (!arr.length) return NaN;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/**
 * Calculate sample standard deviation of an array of numbers.
 */
export function stdDev(arr) {
  if (arr.length < 2) return NaN;
  const m = mean(arr);
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

/**
 * Build chart data by merging benchmark and fund rolling return series.
 * Returns an array of objects sorted by date:
 * [{ date, benchmark, fund_<code1>, fund_<code2>, ... }, ...]
 *
 * @param {Array} funds - Array of fund objects with windows data
 * @param {Object} benchmarkWindow - Selected benchmark window with data
 * @param {string} returnType - 'absolute' or 'cagr'
 * @returns {Array} - Merged and sorted chart data
 */
export function buildChartData(funds, benchmarkWindow, returnType) {
  const map = new Map();
  const windowDays = benchmarkWindow?.window_days;

  // Add benchmark data
  if (benchmarkWindow) {
    for (const pt of benchmarkWindow.data) {
      map.set(pt.date, {
        date: pt.date,
        benchmark: applyReturnType(pt.value, windowDays, returnType),
      });
    }
  }

  // Add fund data
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
 * Get date range based on preset selection.
 *
 * @param {string} preset - '1y', '3y', '5y', '10y', 'all', or 'custom'
 * @param {string|null} startDate - Custom start date (YYYY-MM-DD)
 * @param {string|null} endDate - Custom end date (YYYY-MM-DD)
 * @returns {{ startDate: string|null, endDate: string|null }}
 */
export function getDateRange(preset, startDate, endDate) {
  if (preset === 'custom') return { startDate, endDate };
  if (preset === 'all') return { startDate: null, endDate: null };
  const years = parseInt(preset);
  if (!isNaN(years)) {
    const end = new Date();
    const start = new Date(end);
    start.setFullYear(start.getFullYear() - years);
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  }
  return { startDate: null, endDate: null };
}

/**
 * Get window days from window ID.
 */
export function getWindowDays(windowId) {
  const map = { '1y': 365, '3y': 1095, '5y': 1825, '10y': 3650 };
  return map[windowId] ?? 1095;
}
