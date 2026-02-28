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

// ─── KPI summary helpers (used by Editorial + Wizard) ────────────────────────

export function computeKPIs(funds, allStats, analyticsData) {
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

  // Highest Sharpe
  const withSharpe = allStats.filter((s) => !isNaN(s.vol.sharpeFund));
  if (withSharpe.length) {
    const best = withSharpe.reduce((a, b) => a.vol.sharpeFund > b.vol.sharpeFund ? a : b);
    kpis.push({
      label: 'Best Sharpe',
      value: fmtRatio(best.vol.sharpeFund),
      sub: shortNameMd(best.fund.scheme_name),
      positive: best.vol.sharpeFund >= 0,
    });
  }

  // Best capture ratio
  const withCapture = allStats.filter((s) => !isNaN(s.capture.captureRatio));
  if (withCapture.length) {
    const best = withCapture.reduce((a, b) => a.capture.captureRatio > b.capture.captureRatio ? a : b);
    kpis.push({
      label: 'Best Capture',
      value: `${fmtRatio(best.capture.captureRatio)}x`,
      sub: shortNameMd(best.fund.scheme_name),
      positive: best.capture.captureRatio >= 1,
    });
  }

  // Deepest drawdown (from analytics)
  if (analyticsData?.funds?.length) {
    const worst = analyticsData.funds.reduce((a, b) =>
      a.drawdown.max_drawdown < b.drawdown.max_drawdown ? a : b);
    kpis.push({
      label: 'Max Drawdown',
      value: fmt1(worst.drawdown.max_drawdown),
      sub: shortNameMd(worst.scheme_name),
      positive: false,
    });
  }

  return kpis;
}
