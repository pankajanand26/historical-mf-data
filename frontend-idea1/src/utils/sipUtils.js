// ─── SIP and goal projection utilities ────────────────────────────────────────

import { applyReturnType, getWindowDays } from './chartUtils';

/**
 * Calculate Future Value of a monthly SIP given an annual return rate.
 *
 * FV = P × [(1+r)^n - 1] / r × (1+r)
 * where:
 *   P = monthly SIP amount
 *   r = monthly rate = (1 + annualReturn)^(1/12) - 1
 *   n = number of months
 *
 * @param {number} annualReturn - Annual return as decimal (e.g., 0.12 for 12%)
 * @param {number} monthlySIP - Monthly investment amount in ₹
 * @param {number} months - Investment duration in months
 * @returns {number} - Future value in ₹
 */
export function sipFV(annualReturn, monthlySIP, months) {
  if (months <= 0) return 0;
  const r = Math.pow(1 + annualReturn, 1 / 12) - 1;
  if (Math.abs(r) < 1e-10) return monthlySIP * months; // ~0% return
  return monthlySIP * ((Math.pow(1 + r, months) - 1) / r) * (1 + r);
}

/**
 * Calculate required annual return so that a SIP reaches target in given months.
 * Uses binary search to find the rate.
 *
 * @param {number} monthlySIP - Monthly investment amount in ₹
 * @param {number} months - Investment duration in months
 * @param {number} target - Target corpus in ₹
 * @returns {number} - Required annual return as decimal (e.g., 0.12 for 12%)
 */
export function requiredAnnualReturn(monthlySIP, months, target) {
  if (target <= monthlySIP * months) return 0; // trivially reachable with 0% return
  let lo = -0.5, hi = 5.0; // search range: -50% to 500%
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (sipFV(mid, monthlySIP, months) < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Extract annualized return distribution for a fund/window from API data.
 * Returns an array of numbers in % (e.g., [12.4, 8.7, ...]).
 *
 * @param {Object} data - API response with funds and benchmark data
 * @param {string} fundKey - 'benchmark' or fund scheme_code
 * @param {string} windowId - '1y', '3y', '5y', or '10y'
 * @returns {Array<number>} - Array of CAGR returns in percentage
 */
export function extractReturnDist(data, fundKey, windowId) {
  if (!data) return [];

  // Handle benchmark
  if (fundKey === 'benchmark') {
    const benchWin = data.benchmark_windows?.find((w) => w.window === windowId);
    if (!benchWin?.data?.length) return [];
    const windowDays = getWindowDays(windowId);
    return benchWin.data
      .map((pt) => applyReturnType(pt.value, windowDays, 'cagr'))
      .filter((v) => v != null && !isNaN(v));
  }

  // Handle fund
  const fundData = data.funds?.find(
    (f) => `fund_${f.scheme_code}` === fundKey || f.scheme_code === fundKey || String(f.scheme_code) === fundKey
  );
  if (!fundData) return [];

  const windowDays = getWindowDays(windowId);
  const win = fundData.windows?.find((w) => w.window === windowId);
  if (!win?.data?.length) return [];

  return win.data
    .map((pt) => applyReturnType(pt.value, windowDays, 'cagr'))
    .filter((v) => v != null && !isNaN(v));
}

/**
 * Build fan-chart projection data for a SIP across years 0..maxYears.
 * Returns data points with percentile projections at each year.
 *
 * @param {Array<number>} returnDistPct - Array of annual returns in % (e.g., [12.4, 8.7, ...])
 * @param {number} monthlySIP - Monthly investment amount in ₹
 * @param {number} maxYears - Maximum projection horizon in years
 * @returns {Array<Object>} - [{year, p10, p25, p50, p75, p90, invested}, ...]
 */
export function computeGoalProjections(returnDistPct, monthlySIP, maxYears) {
  if (!returnDistPct.length) return [];

  const sorted = [...returnDistPct].sort((a, b) => a - b);

  // Get percentile value
  const pct = (p) => {
    const idx = Math.min(Math.floor((p / 100) * sorted.length), sorted.length - 1);
    return sorted[idx] / 100; // convert % → decimal
  };

  const result = [];
  for (let y = 0; y <= maxYears; y++) {
    const months = y * 12;
    result.push({
      year: y,
      p10: Math.round(sipFV(pct(10), monthlySIP, months)),
      p25: Math.round(sipFV(pct(25), monthlySIP, months)),
      p50: Math.round(sipFV(pct(50), monthlySIP, months)),
      p75: Math.round(sipFV(pct(75), monthlySIP, months)),
      p90: Math.round(sipFV(pct(90), monthlySIP, months)),
      invested: monthlySIP * months,
    });
  }
  return result;
}

/**
 * Calculate probability (%) that a SIP reaches target in given months.
 *
 * @param {Array<number>} returnDistPct - Array of annual returns in %
 * @param {number} monthlySIP - Monthly investment amount in ₹
 * @param {number} months - Investment duration in months
 * @param {number} target - Target corpus in ₹
 * @returns {number|null} - Probability as percentage (0-100), or null if insufficient data
 */
export function goalProbability(returnDistPct, monthlySIP, months, target) {
  if (!returnDistPct.length || !target) return null;
  const successes = returnDistPct.filter((r) => sipFV(r / 100, monthlySIP, months) >= target);
  return (successes.length / returnDistPct.length) * 100;
}

/**
 * Milestone hit rate: % of return distribution observations
 * that are >= requiredReturn.
 *
 * @param {Array<number>} returnDistPct - Array of annual returns in %
 * @param {number} requiredReturn - Required return as decimal (e.g., 0.12 for 12%)
 * @returns {number|null} - Hit rate as percentage (0-100)
 */
export function milestoneHitRate(returnDistPct, requiredReturn) {
  if (!returnDistPct.length) return null;
  const successes = returnDistPct.filter((r) => r / 100 >= requiredReturn);
  return (successes.length / returnDistPct.length) * 100;
}

/**
 * Get distribution statistics (min, max, mean, median, std dev).
 */
export function getDistributionStats(returnDistPct) {
  if (!returnDistPct.length) return null;

  const sorted = [...returnDistPct].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / sorted.length;
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];
  const variance = sorted.reduce((s, v) => s + (v - mean) ** 2, 0) / (sorted.length - 1);
  const stdDev = Math.sqrt(variance);

  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean,
    median,
    stdDev,
    count: sorted.length,
  };
}
