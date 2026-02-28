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

// ─── Reverse SIP Calculator ───────────────────────────────────────────────────

/**
 * Required monthly SIP to reach a target FV given annual return and duration.
 * Closed-form inverse of sipFV.
 *
 * @param {number} annualReturn - Annual return as decimal (e.g. 0.12)
 * @param {number} months       - Investment duration in months
 * @param {number} target       - Target corpus in ₹
 * @returns {number}            - Required monthly SIP in ₹
 */
export function requiredMonthlySIP(annualReturn, months, target) {
  if (months <= 0) return target;
  const r = Math.pow(1 + annualReturn, 1 / 12) - 1;
  if (Math.abs(r) < 1e-10) return target / months; // ~0% return
  return target * r / ((1 + r) * (Math.pow(1 + r, months) - 1));
}

/**
 * Build the reverse SIP scenario table for P10 / P25 / P50 / P75 / P90.
 * Returns rows suitable for direct table rendering.
 *
 * @param {number[]} returnDistPct  - Historical CAGR distribution in %
 * @param {number}   target         - Target corpus in ₹
 * @param {number}   years          - Horizon in years
 * @returns {Object[]}              - Array of scenario rows
 */
export function computeReverseSipScenarios(returnDistPct, target, years) {
  const months = years * 12;
  const sorted = [...returnDistPct].sort((a, b) => a - b);
  const pct = (p) => sorted[Math.min(Math.floor((p / 100) * sorted.length), sorted.length - 1)] / 100;

  return [10, 25, 50, 75, 90].map((p) => {
    const annualReturn = pct(p);
    const sip = requiredMonthlySIP(annualReturn, months, target);
    const totalInvested = sip * months;
    return {
      label: `P${p}`,
      isBear: p <= 25,
      isBull: p >= 75,
      annualReturnPct: annualReturn * 100,
      requiredSIP: Math.ceil(sip),
      totalInvested: Math.round(totalInvested),
      totalGain: Math.round(target - totalInvested),
      wealthMultiple: +(target / totalInvested).toFixed(2),
    };
  });
}

/**
 * Sensitivity: for a fixed SIP amount and horizon, compute
 * the required CAGR and what % of historical observations meet it.
 *
 * @param {number[]} returnDistPct  - Historical CAGR distribution in %
 * @param {number}   monthlySIP     - Fixed monthly SIP in ₹
 * @param {number}   years          - Horizon in years
 * @param {number}   target         - Target corpus in ₹
 * @returns {{ requiredReturnPct: number, hitRatePct: number }}
 */
export function sipSensitivity(returnDistPct, monthlySIP, years, target) {
  const months = years * 12;
  const req = requiredAnnualReturn(monthlySIP, months, target);
  const hits = returnDistPct.filter((r) => r / 100 >= req).length;
  return {
    requiredReturnPct: req * 100,
    hitRatePct: returnDistPct.length ? (hits / returnDistPct.length) * 100 : 0,
  };
}

// ─── Retirement Corpus Simulator ─────────────────────────────────────────────

/**
 * Accumulation: compute corpus at retirement across percentiles.
 * Factors in existing savings (lump sum) + ongoing SIP.
 *
 * @param {number[]} returnDistPct  - Historical CAGR distribution in %
 * @param {number}   monthlySIP     - Monthly investment in ₹
 * @param {number}   years          - Years until retirement
 * @param {number}   currentCorpus  - Existing savings in ₹
 * @returns {Object}                - { p10, p25, p50, p75, p90 } in ₹
 */
export function computeRetirementCorpus(returnDistPct, monthlySIP, years, currentCorpus = 0) {
  const sorted = [...returnDistPct].sort((a, b) => a - b);
  const pct = (p) => sorted[Math.min(Math.floor((p / 100) * sorted.length), sorted.length - 1)] / 100;
  const months = years * 12;

  const corpusAt = (r) => {
    const sipPart = sipFV(r, monthlySIP, months);
    const lumpPart = currentCorpus * Math.pow(1 + r, years);
    return Math.round(sipPart + lumpPart);
  };

  return {
    p10: corpusAt(pct(10)),
    p25: corpusAt(pct(25)),
    p50: corpusAt(pct(50)),
    p75: corpusAt(pct(75)),
    p90: corpusAt(pct(90)),
  };
}

/**
 * Decumulation: deterministic depletion path with inflation-adjusted withdrawals.
 *
 * @param {number} startCorpus        - Starting corpus in ₹
 * @param {number} monthlyWithdrawal  - Initial monthly withdrawal in ₹
 * @param {number} retirementMonths   - Retirement duration in months
 * @param {number} annualEquityReturn - Equity annual return as % (e.g. 8.5)
 * @param {number} annualDebtReturn   - Debt annual return as % (e.g. 6.5)
 * @param {number} equityAllocPct     - Equity allocation as % (e.g. 30)
 * @param {number} annualInflation    - Annual inflation as % (e.g. 6)
 * @returns {{ corpus: number[], depleted: boolean, depletionMonth: number|null }}
 */
export function runDeterministicDecumulation(
  startCorpus, monthlyWithdrawal, retirementMonths,
  annualEquityReturn, annualDebtReturn, equityAllocPct, annualInflation
) {
  const equityR = Math.pow(1 + annualEquityReturn / 100, 1 / 12) - 1;
  const debtR   = Math.pow(1 + annualDebtReturn   / 100, 1 / 12) - 1;
  const blended = (equityAllocPct / 100) * equityR + (1 - equityAllocPct / 100) * debtR;
  const inflR   = Math.pow(1 + annualInflation / 100, 1 / 12) - 1;

  const corpusPath = [startCorpus];
  let corpus = startCorpus;

  for (let t = 1; t <= retirementMonths; t++) {
    const withdrawal = monthlyWithdrawal * Math.pow(1 + inflR, t - 1);
    corpus = corpus * (1 + blended) - withdrawal;
    if (corpus <= 0) {
      return { corpus: corpusPath, depleted: true, depletionMonth: t };
    }
    corpusPath.push(Math.round(corpus));
  }
  return { corpus: corpusPath, depleted: false, depletionMonth: null };
}

/**
 * Decumulation: Monte Carlo simulation using bootstrapped equity returns.
 *
 * @param {number[]} returnDistPct    - Historical equity CAGR distribution in %
 * @param {number}   startCorpus      - Starting corpus in ₹
 * @param {number}   monthlyWithdrawal
 * @param {number}   retirementYears
 * @param {number}   annualDebtReturn - % (e.g. 6.5)
 * @param {number}   equityAllocPct   - % (e.g. 30)
 * @param {number}   annualInflation  - % (e.g. 6)
 * @param {number}   runs             - Number of Monte Carlo paths (default 1000)
 * @returns {{ successRate: number, fanChart: Object[], depletionYears: number[] }}
 */
export function runRetirementMonteCarlo(
  returnDistPct, startCorpus, monthlyWithdrawal,
  retirementYears, annualDebtReturn, equityAllocPct, annualInflation, runs = 1000
) {
  const months = retirementYears * 12;
  const debtR  = Math.pow(1 + annualDebtReturn / 100, 1 / 12) - 1;
  const inflR  = Math.pow(1 + annualInflation  / 100, 1 / 12) - 1;
  const eq     = equityAllocPct / 100;

  // Annual CAGR → monthly: r_m = (1 + CAGR)^(1/12) − 1
  const monthlyPool = returnDistPct.map((r) => Math.pow(1 + r / 100, 1 / 12) - 1);

  const allPaths   = [];
  const depletionY = [];

  for (let run = 0; run < runs; run++) {
    let corpus = startCorpus;
    const yearlyCorpus = [corpus];
    let depleted = false;

    for (let t = 1; t <= months; t++) {
      const equityR  = monthlyPool[Math.floor(Math.random() * monthlyPool.length)];
      const blended  = eq * equityR + (1 - eq) * debtR;
      const withdrawal = monthlyWithdrawal * Math.pow(1 + inflR, t - 1);
      corpus = corpus * (1 + blended) - withdrawal;

      if (corpus <= 0) {
        depletionY.push(Math.ceil(t / 12));
        depleted = true;
        while (yearlyCorpus.length <= retirementYears) yearlyCorpus.push(0);
        break;
      }
      if (t % 12 === 0) yearlyCorpus.push(Math.round(corpus));
    }
    if (!depleted) yearlyCorpus.push(Math.round(corpus));
    allPaths.push(yearlyCorpus);
  }

  const successRate = ((runs - depletionY.length) / runs) * 100;

  const fanChart = Array.from({ length: retirementYears + 1 }, (_, y) => {
    const vals = allPaths.map((p) => p[y] ?? 0).sort((a, b) => a - b);
    const pct  = (p) => vals[Math.min(Math.floor((p / 100) * vals.length), vals.length - 1)];
    return { year: y, p10: pct(10), p25: pct(25), p50: pct(50), p75: pct(75), p90: pct(90) };
  });

  const avgDepletion = depletionY.length
    ? depletionY.reduce((a, b) => a + b, 0) / depletionY.length
    : null;

  return { successRate, fanChart, depletionYears: depletionY, avgDepletionYear: avgDepletion };
}

/**
 * Find the Safe Withdrawal Rate for a given corpus and duration.
 * Binary searches for the max monthly withdrawal giving >= targetSuccessRate.
 *
 * @param {number[]} returnDistPct
 * @param {number}   startCorpus
 * @param {number}   retirementYears
 * @param {number}   annualDebtReturn
 * @param {number}   equityAllocPct
 * @param {number}   annualInflation
 * @param {number}   targetSuccessRate  - e.g. 90 for 90%
 * @param {number}   runs               - Monte Carlo runs per probe
 * @returns {{ safeMonthlyWithdrawal: number, swrPct: number }}
 */
export function findSafeWithdrawalRate(
  returnDistPct, startCorpus, retirementYears,
  annualDebtReturn, equityAllocPct, annualInflation,
  targetSuccessRate = 90, runs = 500
) {
  if (!returnDistPct.length || !startCorpus) return { safeMonthlyWithdrawal: 0, swrPct: 0 };
  let lo = 0, hi = startCorpus / 12;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    const { successRate } = runRetirementMonteCarlo(
      returnDistPct, startCorpus, mid, retirementYears,
      annualDebtReturn, equityAllocPct, annualInflation, runs
    );
    if (successRate >= targetSuccessRate) lo = mid;
    else hi = mid;
  }
  const safeMonthly = Math.floor((lo + hi) / 2);
  return {
    safeMonthlyWithdrawal: safeMonthly,
    swrPct: +((safeMonthly * 12 / startCorpus) * 100).toFixed(2),
  };
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
