// ─── Constants ────────────────────────────────────────────────────────────────

export const FUND_COLORS = ['#2563eb', '#dc2626', '#d97706', '#7c3aed', '#db2777'];
export const BENCHMARK_COLOR = '#16a34a';

export const WINDOWS = [
  { id: '1y', label: '1Y' },
  { id: '3y', label: '3Y' },
  { id: '5y', label: '5Y' },
  { id: '10y', label: '10Y' },
];

export const DATE_PRESETS = [
  { id: '1y', label: '1Y' },
  { id: '3y', label: '3Y' },
  { id: '5y', label: '5Y' },
  { id: '10y', label: '10Y' },
  { id: 'all', label: 'All' },
  { id: 'custom', label: 'Custom' },
];

// ─── Formatters ───────────────────────────────────────────────────────────────

export const fmt2 = (v) => (v == null || isNaN(v) ? 'N/A' : `${v.toFixed(2)}%`);
export const fmt1 = (v) => (v == null || isNaN(v) ? 'N/A' : `${v.toFixed(1)}%`);
export const fmtRatio = (v) => (v == null || isNaN(v) ? 'N/A' : v.toFixed(2));

export const shortName = (name) =>
  name?.length > 42 ? name.slice(0, 39) + '...' : (name ?? '');

export const shortNameMd = (name) =>
  name?.length > 30 ? name.slice(0, 27) + '...' : (name ?? '');

export const tickFormatter = (dateStr) => {
  if (!dateStr) return '';
  const [year, month] = dateStr.split('-');
  return `${month}/${year?.slice(2)}`;
};

// ─── Date range helpers ───────────────────────────────────────────────────────

export const getDateRange = (preset, startDate, endDate) => {
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
};

// ─── Return-type helpers ──────────────────────────────────────────────────────

export function applyReturnType(valuePct, windowDays, returnType) {
  if (valuePct == null) return null;
  if (returnType === 'cagr') {
    return ((1 + valuePct / 100) ** (365 / windowDays) - 1) * 100;
  }
  return valuePct;
}

export function rfPeriodPct(rfAnnual, windowDays, returnType) {
  if (returnType === 'cagr') return rfAnnual * 100;
  const years = windowDays / 365;
  return ((1 + rfAnnual) ** years - 1) * 100;
}

// ─── Stats helpers ────────────────────────────────────────────────────────────

export function mean(arr) {
  if (!arr.length) return NaN;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function stdDev(arr) {
  if (arr.length < 2) return NaN;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1));
}

// ─── Chart data builders ──────────────────────────────────────────────────────

export function buildChartData(funds, benchmarkWindow, returnType) {
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

// ─── Analysis stats ───────────────────────────────────────────────────────────

export function computeOutperformanceStats(chartData, fund) {
  let outperformed = 0, underperformed = 0, tied = 0, totalAlpha = 0, count = 0;
  const key = `fund_${fund.scheme_code}`;

  for (const row of chartData) {
    const fv = row[key], bv = row.benchmark;
    if (fv == null || bv == null) continue;
    totalAlpha += fv - bv; count++;
    if (fv > bv) outperformed++;
    else if (fv < bv) underperformed++;
    else tied++;
  }

  return {
    total: count, outperformed, underperformed, tied,
    outperformedPct: count > 0 ? (outperformed / count) * 100 : 0,
    underperformedPct: count > 0 ? (underperformed / count) * 100 : 0,
    avgAlpha: count > 0 ? totalAlpha / count : 0,
  };
}

export function computeVolatilityStats(chartData, fund, rfPct) {
  const key = `fund_${fund.scheme_code}`;
  const fundVals = [], benchVals = [], alphas = [];

  for (const row of chartData) {
    const fv = row[key], bv = row.benchmark;
    if (fv == null || bv == null) continue;
    fundVals.push(fv); benchVals.push(bv); alphas.push(fv - bv);
  }

  if (fundVals.length < 2) {
    return { stdDevFund: NaN, stdDevBench: NaN, beta: NaN, trackingError: NaN,
      infoRatio: NaN, sharpeFund: NaN, sharpeBench: NaN, sortinoFund: NaN,
      sortinoBench: NaN, meanFund: NaN, meanBench: NaN };
  }

  const mFund = mean(fundVals), mBench = mean(benchVals);
  const sdFund = stdDev(fundVals), sdBench = stdDev(benchVals);

  const cov = fundVals.reduce((s, fv, i) => s + (fv - mFund) * (benchVals[i] - mBench), 0)
    / (fundVals.length - 1);
  const beta = sdBench ** 2 > 0 ? cov / sdBench ** 2 : NaN;
  const te = stdDev(alphas);
  const avgAlpha = mean(alphas);
  const infoRatio = te > 0 ? avgAlpha / te : NaN;
  const sharpeFund = sdFund > 0 ? (mFund - rfPct) / sdFund : NaN;
  const sharpeBench = sdBench > 0 ? (mBench - rfPct) / sdBench : NaN;

  const downsideFund = fundVals.filter((v) => v < rfPct);
  const downsideBench = benchVals.filter((v) => v < rfPct);
  const sdDownFund = stdDev(downsideFund), sdDownBench = stdDev(downsideBench);
  const sortinoFund = !isNaN(sdDownFund) && sdDownFund > 0 ? (mFund - rfPct) / sdDownFund : NaN;
  const sortinoBench = !isNaN(sdDownBench) && sdDownBench > 0 ? (mBench - rfPct) / sdDownBench : NaN;

  return { stdDevFund: sdFund, stdDevBench: sdBench, beta, trackingError: te,
    infoRatio, sharpeFund, sharpeBench, sortinoFund, sortinoBench, meanFund: mFund, meanBench: mBench };
}

export function computeCaptureStats(chartData, fund) {
  const key = `fund_${fund.scheme_code}`;
  const upFund = [], upBench = [], downFund = [], downBench = [];
  let upConsistCount = 0, downConsistCount = 0, totalCount = 0, downAlphaSum = 0;

  for (const row of chartData) {
    const fv = row[key], bv = row.benchmark;
    if (fv == null || bv == null) continue;
    totalCount++;
    if (bv > 0) {
      upFund.push(fv); upBench.push(bv);
      if (fv > bv) upConsistCount++;
    } else if (bv < 0) {
      downFund.push(fv); downBench.push(bv);
      downAlphaSum += fv - bv;
      if (fv > bv) downConsistCount++;
    }
  }

  const m = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : NaN;
  const mUpFund = m(upFund), mUpBench = m(upBench);
  const mDownFund = m(downFund), mDownBench = m(downBench);

  const ucr = !isNaN(mUpFund) && !isNaN(mUpBench) && mUpBench !== 0
    ? (mUpFund / mUpBench) * 100 : NaN;
  const dcr = !isNaN(mDownFund) && !isNaN(mDownBench) && mDownBench !== 0
    ? (mDownFund / mDownBench) * 100 : NaN;
  const captureRatio = !isNaN(ucr) && !isNaN(dcr) && dcr !== 0 ? ucr / dcr : NaN;
  const upConsistPct = upFund.length > 0 ? (upConsistCount / upFund.length) * 100 : NaN;
  const downConsistPct = downFund.length > 0 ? (downConsistCount / downFund.length) * 100 : NaN;
  const downAlpha = downFund.length > 0 ? downAlphaSum / downFund.length : NaN;

  return { ucr, dcr, captureRatio, upConsistPct, downConsistPct,
    upPeriods: upFund.length, downPeriods: downFund.length, totalPeriods: totalCount, downAlpha };
}

export function buildScatterData(chartData, fund) {
  const key = `fund_${fund.scheme_code}`;
  return chartData
    .filter((row) => row[key] != null && row.benchmark != null)
    .map((row) => ({
      x: parseFloat(row.benchmark.toFixed(3)),
      y: parseFloat(row[key].toFixed(3)),
      outperf: row[key] > row.benchmark,
    }));
}

export function buildDrawdownSeries(chartData, fund) {
  const key = `fund_${fund.scheme_code}`;
  const rows = chartData.filter((row) => row[key] != null && row.benchmark != null);
  if (rows.length === 0) return [];
  let fundPeak = -Infinity, benchPeak = -Infinity;
  return rows.map((row) => {
    const fundNav = 100 + row[key];
    const benchNav = 100 + row.benchmark;
    fundPeak = Math.max(fundPeak, fundNav);
    benchPeak = Math.max(benchPeak, benchNav);
    return {
      date: row.date,
      fundDD: parseFloat(((fundNav / fundPeak - 1) * 100).toFixed(3)),
      benchmarkDD: parseFloat(((benchNav / benchPeak - 1) * 100).toFixed(3)),
    };
  });
}

/**
 * Freefincal-style capture ratios using non-overlapping monthly returns.
 *
 * Methodology:
 *   1. Align benchmark and fund on shared month-end dates.
 *   2. Filter to UP months  (benchmark > 0) → compute CAGR product for fund & bench.
 *   3. Filter to DOWN months (benchmark < 0) → compute CAGR product for fund & bench.
 *   4. UCR  = upCAGR_fund  / upCAGR_bench  × 100
 *   5. DCR  = downCAGR_fund / downCAGR_bench × 100
 *   6. Capture Ratio = UCR / DCR
 *
 * CAGR = [∏(1 + rᵢ)]^(12/n) − 1  where n = count of filtered months.
 *
 * @param {Object|null} monthlyReturns - data.monthly_returns from the API response.
 *   Shape: { benchmark: [{date, value}, ...], fund_<sc>: [{date, value}, ...] }
 *   Values are decimal returns (e.g. 0.0312 = +3.12%).
 * @param {Object} fund - fund object with scheme_code.
 * @returns {Object|null} stats or null if data is unavailable.
 */
export function computeFreefincalCaptureStats(monthlyReturns, fund) {
  if (!monthlyReturns) return null;
  const key = `fund_${fund.scheme_code}`;

  const benchPoints = monthlyReturns.benchmark ?? [];
  const fundPoints  = monthlyReturns[key] ?? [];

  if (!benchPoints.length || !fundPoints.length) return null;

  // Build lookup map for fund monthly returns by date
  const fundMap = new Map(fundPoints.map((p) => [p.date, p.value]));

  const upFund = [], upBench = [], downFund = [], downBench = [];

  for (const bp of benchPoints) {
    const bv = bp.value;
    const fv = fundMap.get(bp.date);
    if (bv == null || fv == null) continue;
    if (bv > 0) {
      upBench.push(bv);
      upFund.push(fv);
    } else if (bv < 0) {
      downBench.push(bv);
      downFund.push(fv);
    }
    // months where benchmark == 0 excluded (per Freefincal)
  }

  // CAGR product formula: [∏(1 + rᵢ)]^(12/n) − 1
  const cagrFromMonthly = (arr) => {
    if (!arr.length) return NaN;
    const product = arr.reduce((acc, r) => acc * (1 + r), 1);
    return Math.pow(product, 12 / arr.length) - 1;
  };

  const upCAGR_bench  = cagrFromMonthly(upBench);
  const upCAGR_fund   = cagrFromMonthly(upFund);
  const downCAGR_bench = cagrFromMonthly(downBench);
  const downCAGR_fund  = cagrFromMonthly(downFund);

  const ucr = (!isNaN(upCAGR_fund) && !isNaN(upCAGR_bench) && upCAGR_bench !== 0)
    ? (upCAGR_fund / upCAGR_bench) * 100 : NaN;
  const dcr = (!isNaN(downCAGR_fund) && !isNaN(downCAGR_bench) && downCAGR_bench !== 0)
    ? (downCAGR_fund / downCAGR_bench) * 100 : NaN;
  const captureRatio = (!isNaN(ucr) && !isNaN(dcr) && dcr !== 0) ? ucr / dcr : NaN;

  return {
    ucr, dcr, captureRatio,
    upMonths: upFund.length,
    downMonths: downFund.length,
    totalMonths: upFund.length + downFund.length,
  };
}

export function buildAlphaData(chartData, fund) {
  const key = `fund_${fund.scheme_code}`;
  return chartData
    .filter((row) => row[key] != null && row.benchmark != null)
    .map((row) => ({
      date: row.date,
      alpha: parseFloat((row[key] - row.benchmark).toFixed(3)),
    }));
}

// ─── Derived "all stats" helper ───────────────────────────────────────────────

export function computeAllStats(funds, chartData, rfPct) {
  return funds.map((fund, idx) => ({
    fund,
    color: FUND_COLORS[idx % FUND_COLORS.length],
    outperf: computeOutperformanceStats(chartData, fund),
    vol: computeVolatilityStats(chartData, fund, rfPct),
    capture: computeCaptureStats(chartData, fund),
    scatterData: buildScatterData(chartData, fund),
    alphaData: buildAlphaData(chartData, fund),
    ddSeries: buildDrawdownSeries(chartData, fund),
  }));
}

// ─── Formatters (money) ───────────────────────────────────────────────────────

export function fmtLakh(v) {
  if (v == null || isNaN(v)) return 'N/A';
  if (Math.abs(v) >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`;
  if (Math.abs(v) >= 1e5) return `₹${(v / 1e5).toFixed(2)} L`;
  return `₹${Math.round(v).toLocaleString('en-IN')}`;
}

// ─── Score normalization ──────────────────────────────────────────────────────

/**
 * Normalize each fund's metrics into 0–100 scores across 5 dimensions.
 * Min-max scaled within the comparison set.
 * Dimensions: returns (avgAlpha), risk (sharpeFund), consistency (outperformedPct),
 *             capture (captureRatio), drawdown (max_drawdown, less negative = better).
 */
export function computeFundScores(allStats, analyticsData) {
  const dims = ['returns', 'risk', 'consistency', 'capture', 'drawdown'];

  const raw = allStats.map((s) => {
    let dd = null;
    if (analyticsData?.funds) {
      const af = analyticsData.funds.find((f) => f.scheme_code === s.fund.scheme_code);
      if (af) dd = af.drawdown?.max_drawdown ?? null; // negative, less negative = better
    }
    return {
      fund: s.fund,
      color: s.color,
      raw: {
        returns: s.outperf?.avgAlpha ?? null,
        risk: s.vol?.sharpeFund ?? null,
        consistency: s.outperf?.outperformedPct ?? null,
        capture: s.capture?.captureRatio ?? null,
        drawdown: dd,
      },
    };
  });

  const normalize = (dim) => {
    const vals = raw.map((r) => r.raw[dim]).filter((v) => v != null && !isNaN(v));
    if (vals.length === 0) return raw.map(() => null);
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const range = hi - lo;
    return raw.map((r) => {
      const v = r.raw[dim];
      if (v == null || isNaN(v)) return null;
      return range === 0 ? 75 : ((v - lo) / range) * 100;
    });
  };

  const normalized = {};
  for (const d of dims) normalized[d] = normalize(d);

  return raw.map((r, i) => {
    const scores = {};
    for (const d of dims) scores[d] = normalized[d][i];
    const valid = dims.filter((d) => scores[d] != null);
    const overall = valid.length ? valid.reduce((s, d) => s + scores[d], 0) / valid.length : null;
    return { ...r, scores, overall };
  });
}

export function scoreGrade(score) {
  if (score == null || isNaN(score)) return { grade: 'N/A', color: '#64748b' };
  if (score >= 85) return { grade: 'A+', color: '#22c55e' };
  if (score >= 70) return { grade: 'A',  color: '#4ade80' };
  if (score >= 55) return { grade: 'B',  color: '#facc15' };
  if (score >= 40) return { grade: 'C',  color: '#fb923c' };
  return { grade: 'D', color: '#ef4444' };
}

export function scoreColor(score) {
  if (score == null || isNaN(score)) return '#1e293b';
  if (score >= 70) return '#14532d';
  if (score >= 40) return '#78350f';
  return '#450a0a';
}

// ─── SIP / Goal projection helpers ───────────────────────────────────────────

/** Future value of a monthly SIP given an annual return rate (decimal). */
export function sipFV(annualReturn, monthlySIP, months) {
  if (months <= 0) return 0;
  const r = Math.pow(1 + annualReturn, 1 / 12) - 1;
  if (Math.abs(r) < 1e-10) return monthlySIP * months;
  return monthlySIP * ((Math.pow(1 + r, months) - 1) / r) * (1 + r);
}

/**
 * Required annual return so that a SIP reaches `target` in `months`.
 * Returns decimal (e.g. 0.12 = 12% p.a.). Uses binary search.
 */
export function requiredAnnualReturn(monthlySIP, months, target) {
  if (target <= monthlySIP * months) return 0; // trivially reachable with 0% return
  let lo = -0.5, hi = 5.0;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (sipFV(mid, monthlySIP, months) < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Extract annualized return distribution for a fund/window from API data.
 * Returns an array of numbers in % (e.g. [12.4, 8.7, ...]).
 */
export function extractReturnDist(data, fundKey, windowId) {
  if (!data) return [];
  const fundData = fundKey === 'benchmark'
    ? data.benchmark
    : data.funds?.find((f) => `fund_${f.scheme_code}` === fundKey || f.scheme_code === fundKey);
  if (!fundData) return [];

  const windowDays = (() => {
    const map = { '1y': 365, '3y': 1095, '5y': 1825, '10y': 3650 };
    return map[windowId] ?? 1095;
  })();

  const win = fundData.windows?.find((w) => w.window === windowId);
  if (!win?.data?.length) return [];

  return win.data
    .map((pt) => applyReturnType(pt.value, windowDays, 'cagr'))
    .filter((v) => v != null && !isNaN(v));
}

/**
 * Build fan-chart projection data for a SIP across years 0..maxYears.
 * Returns [{year, p10, p25, p50, p75, p90, invested}].
 */
export function computeGoalProjections(returnDistPct, monthlySIP, maxYears) {
  if (!returnDistPct.length) return [];
  const sorted = [...returnDistPct].sort((a, b) => a - b);
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
 * Probability (%) that a SIP reaches `target` in `months`
 * given a return distribution in % (e.g. [12.4, 8.7, ...]).
 */
export function goalProbability(returnDistPct, monthlySIP, months, target) {
  if (!returnDistPct.length || !target) return null;
  const successes = returnDistPct.filter((r) => sipFV(r / 100, monthlySIP, months) >= target);
  return (successes.length / returnDistPct.length) * 100;
}

/**
 * Milestone hit rate: % of return distribution observations (in %)
 * that are >= requiredReturn (decimal).
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
 */
export function requiredMonthlySIP(annualReturn, months, target) {
  if (months <= 0) return target;
  const r = Math.pow(1 + annualReturn, 1 / 12) - 1;
  if (Math.abs(r) < 1e-10) return target / months;
  return target * r / ((1 + r) * (Math.pow(1 + r, months) - 1));
}

/**
 * Build the reverse SIP scenario table for P10 / P25 / P50 / P75 / P90.
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
    p10: corpusAt(pct(10)), p25: corpusAt(pct(25)), p50: corpusAt(pct(50)),
    p75: corpusAt(pct(75)), p90: corpusAt(pct(90)),
  };
}

/**
 * Decumulation: deterministic depletion path with inflation-adjusted withdrawals.
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
    if (corpus <= 0) return { corpus: corpusPath, depleted: true, depletionMonth: t };
    corpusPath.push(Math.round(corpus));
  }
  return { corpus: corpusPath, depleted: false, depletionMonth: null };
}

/**
 * Decumulation: Monte Carlo simulation using bootstrapped equity returns.
 */
export function runRetirementMonteCarlo(
  returnDistPct, startCorpus, monthlyWithdrawal,
  retirementYears, annualDebtReturn, equityAllocPct, annualInflation, runs = 1000
) {
  const months = retirementYears * 12;
  const debtR  = Math.pow(1 + annualDebtReturn / 100, 1 / 12) - 1;
  const inflR  = Math.pow(1 + annualInflation  / 100, 1 / 12) - 1;
  const eq     = equityAllocPct / 100;
  const monthlyPool = returnDistPct.map((r) => Math.pow(1 + r / 100, 1 / 12) - 1);

  const allPaths   = [];
  const depletionY = [];

  for (let run = 0; run < runs; run++) {
    let corpus = startCorpus;
    const yearlyCorpus = [corpus];
    let depleted = false;

    for (let t = 1; t <= months; t++) {
      const equityR    = monthlyPool[Math.floor(Math.random() * monthlyPool.length)];
      const blended    = eq * equityR + (1 - eq) * debtR;
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
 * Find the Safe Withdrawal Rate (max monthly withdrawal at >= targetSuccessRate).
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

// ─── KPI summary helpers (used by Terminal) ───────────────────────────────────

export function computeKPIs(funds, allStats, monthlyReturns) {
  const kpis = [];

  // Best performer by avg alpha
  const withAlpha = allStats.filter((s) => !isNaN(s.outperf.avgAlpha));
  if (withAlpha.length) {
    const best = withAlpha.reduce((a, b) => a.outperf.avgAlpha > b.outperf.avgAlpha ? a : b);
    kpis.push({
      label: 'Best Avg Alpha',
      value: fmt2(best.outperf.avgAlpha),
      sub: shortNameMd(best.fund.scheme_name),
      positive: best.outperf.avgAlpha >= 0,
    });
  }

  // Best capture ratio (using Freefincal monthly CAGR method)
  if (monthlyReturns) {
    const withCapture = allStats
      .map((s) => ({ ...s, ff: computeFreefincalCaptureStats(monthlyReturns, s.fund) }))
      .filter((s) => s.ff && !isNaN(s.ff.captureRatio));
    if (withCapture.length) {
      const best = withCapture.reduce((a, b) => a.ff.captureRatio > b.ff.captureRatio ? a : b);
      kpis.push({
        label: 'Best Capture',
        value: `${fmtRatio(best.ff.captureRatio)}x`,
        sub: shortNameMd(best.fund.scheme_name),
        positive: best.ff.captureRatio >= 1,
      });
    }
  }

  return kpis;
}
