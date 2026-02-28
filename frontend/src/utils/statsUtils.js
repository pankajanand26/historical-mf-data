// ─── Statistical analysis utilities ───────────────────────────────────────────

import { mean, stdDev, applyReturnType, getWindowDays } from './chartUtils';
import { FUND_COLORS } from './constants';
import { fmt2, fmtRatio, shortNameMd } from './formatters';

/**
 * Compute outperformance statistics for a fund vs benchmark.
 */
export function computeOutperformanceStats(chartData, fund) {
  let outperformed = 0, underperformed = 0, tied = 0;
  let totalAlpha = 0, count = 0;
  const key = `fund_${fund.scheme_code}`;

  for (const row of chartData) {
    const fv = row[key], bv = row.benchmark;
    if (fv == null || bv == null) continue;
    totalAlpha += fv - bv;
    count++;
    if (fv > bv) outperformed++;
    else if (fv < bv) underperformed++;
    else tied++;
  }

  return {
    total: count,
    outperformed,
    underperformed,
    tied,
    outperformedPct: count > 0 ? (outperformed / count) * 100 : 0,
    underperformedPct: count > 0 ? (underperformed / count) * 100 : 0,
    avgAlpha: count > 0 ? totalAlpha / count : 0,
  };
}

/**
 * Compute volatility and risk-adjusted metrics for a fund.
 * All inputs and outputs are in percentage form (e.g. 12.5 = 12.5%).
 */
export function computeVolatilityStats(chartData, fund, rfPct) {
  const key = `fund_${fund.scheme_code}`;
  const fundVals = [], benchVals = [], alphas = [];

  for (const row of chartData) {
    const fv = row[key], bv = row.benchmark;
    if (fv == null || bv == null) continue;
    fundVals.push(fv);
    benchVals.push(bv);
    alphas.push(fv - bv);
  }

  if (fundVals.length < 2) {
    return {
      stdDevFund: NaN, stdDevBench: NaN,
      beta: NaN, trackingError: NaN,
      infoRatio: NaN,
      sharpeFund: NaN, sharpeBench: NaN,
      sortinoFund: NaN, sortinoBench: NaN,
      meanFund: NaN, meanBench: NaN,
    };
  }

  const mFund = mean(fundVals);
  const mBench = mean(benchVals);
  const sdFund = stdDev(fundVals);
  const sdBench = stdDev(benchVals);

  // Beta = Cov(fund, bench) / Var(bench)
  const cov = fundVals.reduce((s, fv, i) => s + (fv - mFund) * (benchVals[i] - mBench), 0)
    / (fundVals.length - 1);
  const varBench = sdBench ** 2;
  const beta = varBench > 0 ? cov / varBench : NaN;

  // Tracking Error = σ(fund − bench)
  const te = stdDev(alphas);

  // Information Ratio = mean(alpha) / σ(alpha)
  const avgAlpha = mean(alphas);
  const infoRatio = te > 0 ? avgAlpha / te : NaN;

  // Sharpe = (mean − rf) / σ
  const sharpeFund = sdFund > 0 ? (mFund - rfPct) / sdFund : NaN;
  const sharpeBench = sdBench > 0 ? (mBench - rfPct) / sdBench : NaN;

  // Sortino = (mean − rf) / downside σ (downside = below rf threshold)
  const downsideFund = fundVals.filter((v) => v < rfPct);
  const downsideBench = benchVals.filter((v) => v < rfPct);
  const sdDownFund = stdDev(downsideFund);
  const sdDownBench = stdDev(downsideBench);
  const sortinoFund = !isNaN(sdDownFund) && sdDownFund > 0
    ? (mFund - rfPct) / sdDownFund : NaN;
  const sortinoBench = !isNaN(sdDownBench) && sdDownBench > 0
    ? (mBench - rfPct) / sdDownBench : NaN;

  return {
    stdDevFund: sdFund,
    stdDevBench: sdBench,
    beta,
    trackingError: te,
    infoRatio,
    sharpeFund,
    sharpeBench,
    sortinoFund,
    sortinoBench,
    meanFund: mFund,
    meanBench: mBench,
  };
}

/**
 * Compute UCR, DCR, Capture Ratio, and consistency metrics.
 */
export function computeCaptureStats(chartData, fund) {
  const key = `fund_${fund.scheme_code}`;
  const upFund = [], upBench = [], downFund = [], downBench = [];
  let upConsistCount = 0, downConsistCount = 0, totalCount = 0, downAlphaSum = 0;

  for (const row of chartData) {
    const fv = row[key], bv = row.benchmark;
    if (fv == null || bv == null) continue;
    totalCount++;
    if (bv > 0) {
      upFund.push(fv);
      upBench.push(bv);
      if (fv > bv) upConsistCount++;
    } else if (bv < 0) {
      downFund.push(fv);
      downBench.push(bv);
      downAlphaSum += fv - bv;
      if (fv > bv) downConsistCount++;  // fund fell less than benchmark
    }
  }

  const meanUp = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : NaN;

  const mUpFund = meanUp(upFund);
  const mUpBench = meanUp(upBench);
  const mDownFund = meanUp(downFund);
  const mDownBench = meanUp(downBench);

  const ucr = (!isNaN(mUpFund) && !isNaN(mUpBench) && mUpBench !== 0)
    ? (mUpFund / mUpBench) * 100 : NaN;
  const dcr = (!isNaN(mDownFund) && !isNaN(mDownBench) && mDownBench !== 0)
    ? (mDownFund / mDownBench) * 100 : NaN;
  const captureRatio = (!isNaN(ucr) && !isNaN(dcr) && dcr !== 0)
    ? ucr / dcr : NaN;

  const upConsistPct = upFund.length > 0 ? (upConsistCount / upFund.length) * 100 : NaN;
  const downConsistPct = downFund.length > 0 ? (downConsistCount / downFund.length) * 100 : NaN;
  const downAlpha = downFund.length > 0 ? downAlphaSum / downFund.length : NaN;

  return {
    ucr, dcr, captureRatio,
    upConsistPct, downConsistPct,
    upPeriods: upFund.length,
    downPeriods: downFund.length,
    totalPeriods: totalCount,
    downAlpha,
  };
}

/**
 * Freefincal-style capture ratios using non-overlapping monthly returns.
 *
 * Methodology (matches Freefincal's published approach):
 *   1. Align benchmark and fund on shared month-end dates.
 *   2. Filter to UP months (benchmark > 0) → compute CAGR product for fund & bench.
 *   3. Filter to DOWN months (benchmark < 0) → compute CAGR product for fund & bench.
 *   4. UCR = upCAGR_fund / upCAGR_bench × 100
 *   5. DCR = downCAGR_fund / downCAGR_bench × 100
 *   6. Capture Ratio = UCR / DCR
 */
export function computeFreefincalCaptureStats(monthlyReturns, fund) {
  if (!monthlyReturns) return null;
  const key = `fund_${fund.scheme_code}`;

  const benchPoints = monthlyReturns.benchmark ?? [];
  const fundPoints = monthlyReturns[key] ?? [];

  if (!benchPoints.length || !fundPoints.length) return null;

  // Build lookup map for fund monthly returns by date
  const fundMap = new Map(fundPoints.map(p => [p.date, p.value]));

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
    // months where benchmark == 0 are excluded (as per Freefincal)
  }

  // CAGR product formula: [∏(1 + rᵢ)]^(12/n) − 1
  const cagrFromMonthly = (arr) => {
    if (!arr.length) return NaN;
    const product = arr.reduce((acc, r) => acc * (1 + r), 1);
    return Math.pow(product, 12 / arr.length) - 1;
  };

  const upCAGR_bench = cagrFromMonthly(upBench);
  const upCAGR_fund = cagrFromMonthly(upFund);
  const downCAGR_bench = cagrFromMonthly(downBench);
  const downCAGR_fund = cagrFromMonthly(downFund);

  const ucr = (!isNaN(upCAGR_fund) && !isNaN(upCAGR_bench) && upCAGR_bench !== 0)
    ? (upCAGR_fund / upCAGR_bench) * 100 : NaN;
  const dcr = (!isNaN(downCAGR_fund) && !isNaN(downCAGR_bench) && downCAGR_bench !== 0)
    ? (downCAGR_fund / downCAGR_bench) * 100 : NaN;
  const captureRatio = (!isNaN(ucr) && !isNaN(dcr) && dcr !== 0)
    ? ucr / dcr : NaN;

  return {
    ucr, dcr, captureRatio,
    upMonths: upFund.length,
    downMonths: downFund.length,
    totalMonths: upFund.length + downFund.length,
    upCAGR_fund, upCAGR_bench, downCAGR_fund, downCAGR_bench,
  };
}

/**
 * Build scatter data for a single fund: [{x: benchReturn, y: fundReturn}]
 */
export function buildScatterData(chartData, fund) {
  const key = `fund_${fund.scheme_code}`;
  const pts = [];
  for (const row of chartData) {
    const fv = row[key], bv = row.benchmark;
    if (fv == null || bv == null) continue;
    pts.push({ x: parseFloat(bv.toFixed(3)), y: parseFloat(fv.toFixed(3)) });
  }
  return pts;
}

/**
 * Build alpha time-series for a single fund: [{date, alpha}]
 */
export function buildAlphaData(chartData, fund) {
  const key = `fund_${fund.scheme_code}`;
  const pts = [];
  for (const row of chartData) {
    const fv = row[key], bv = row.benchmark;
    if (fv == null || bv == null) continue;
    pts.push({ date: row.date, alpha: parseFloat((fv - bv).toFixed(3)) });
  }
  return pts;
}

/**
 * Build drawdown time-series for a single fund vs benchmark.
 * Returns [{date, fundDD, benchmarkDD}] where DD is % drawdown from peak.
 * Drawdowns are always <= 0 (negative when below peak, 0 at peak).
 */
export function buildDrawdownSeries(chartData, fund) {
  const key = `fund_${fund.scheme_code}`;
  const rows = chartData.filter((row) => row[key] != null && row.benchmark != null);
  if (rows.length === 0) return [];

  let fundPeak = -Infinity;
  let benchPeak = -Infinity;

  return rows.map((row) => {
    // Treat return as NAV growth: NAV = 100 + cumulative return %
    const fundNav = 100 + row[key];
    const benchNav = 100 + row.benchmark;

    // Update peaks
    fundPeak = Math.max(fundPeak, fundNav);
    benchPeak = Math.max(benchPeak, benchNav);

    // Drawdown = (current / peak - 1) * 100, always <= 0
    return {
      date: row.date,
      fundDD: parseFloat(((fundNav / fundPeak - 1) * 100).toFixed(3)),
      benchmarkDD: parseFloat(((benchNav / benchPeak - 1) * 100).toFixed(3)),
    };
  });
}

/**
 * Compute all stats for all funds in one pass.
 */
export function computeAllStats(funds, chartData, rfPct, monthlyReturns) {
  return funds.map((fund, idx) => ({
    fund,
    color: FUND_COLORS[idx % FUND_COLORS.length],
    outperf: computeOutperformanceStats(chartData, fund),
    vol: computeVolatilityStats(chartData, fund, rfPct),
    capture: computeCaptureStats(chartData, fund),
    freefincal: computeFreefincalCaptureStats(monthlyReturns, fund),
    scatterData: buildScatterData(chartData, fund),
    alphaData: buildAlphaData(chartData, fund),
    ddSeries: buildDrawdownSeries(chartData, fund),
  }));
}

/**
 * Compute KPI summary values for display strip.
 */
export function computeKPIs(allStats, analyticsData) {
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
      value: `${worst.drawdown.max_drawdown?.toFixed(1)}%`,
      sub: shortNameMd(worst.scheme_name),
      positive: false,
    });
  }

  return kpis;
}
