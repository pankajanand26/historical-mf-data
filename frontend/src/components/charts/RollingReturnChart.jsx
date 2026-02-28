import { useState } from 'react';
import { FUND_COLORS, BENCHMARK_COLOR, DEFAULT_RF_RATE } from '../../utils/constants';
import {
  mean,
  applyReturnType,
  rfPeriodPct,
  buildChartData,
} from '../../utils/chartUtils';
import { computeAllStats } from '../../utils/statsUtils';
import { shortName } from '../../utils/formatters';
import {
  RollingReturnCard,
  PerformanceRiskCard,
  MarketCaptureCard,
  DrawdownCard,
  ScorecardCard,
  DistributionCard,
  SipPlannerCard,
  ReverseSipCard,
  RetirementCard,
  MonthlyHeatmapCard,
} from './cards';

const RollingReturnChart = ({
  data,
  analyticsData,
  analyticsLoading,
  activeTab = 'returns',
  rfRate = DEFAULT_RF_RATE,
  activeWindow,      // Global window from App
  setActiveWindow,   // Global setter from App
}) => {
  const windows = data?.benchmark_windows ?? [];
  const funds = data?.funds ?? [];
  // Use rfRate prop (from App) if provided, otherwise fall back to data or default
  const riskFreeAnnual = rfRate ?? data?.risk_free_rate ?? DEFAULT_RF_RATE;

  // Use global activeWindow, fallback to first window if not available
  const currentWindowKey = windows.find((w) => w.window === activeWindow)
    ? activeWindow
    : windows[0]?.window ?? null;
    
  const [returnType, setReturnType] = useState('absolute');

  if (!data || !windows.length || !funds.length) return null;

  const benchmarkWindow = windows.find((w) => w.window === currentWindowKey) ?? windows[0];
  const currentWindow = benchmarkWindow.window;
  const windowDays = benchmarkWindow.window_days;

  const chartData = buildChartData(funds, benchmarkWindow, returnType);
  const hasData = chartData.length > 0;

  // Risk-free rate converted to current period + return type
  const rfPct = rfPeriodPct(riskFreeAnnual, windowDays, returnType);

  // Summary stats (Latest / Avg) per fund
  const fundStats = funds.map((fund, idx) => {
    const fundWindow = fund.windows.find((w) => w.window === currentWindow);
    const values = (fundWindow?.data ?? [])
      .map((d) => applyReturnType(d.value, windowDays, returnType))
      .filter((v) => v != null);
    const latest = values.at(-1) ?? null;
    const avg = values.length ? mean(values) : null;
    return { fund, color: FUND_COLORS[idx % FUND_COLORS.length], latest, avg };
  });

  const benchValues = benchmarkWindow.data
    .map((d) => applyReturnType(d.value, windowDays, returnType))
    .filter((v) => v != null);
  const benchLatest = benchValues.at(-1) ?? null;
  const benchAvg = benchValues.length ? mean(benchValues) : null;

  // All analysis stats (now includes ddSeries for each fund)
  const allStats = computeAllStats(funds, chartData, rfPct, data?.monthly_returns);

  // Compute shared scatter domain across all funds for visual consistency
  const allScatterPts = allStats.flatMap((s) => s.scatterData);
  const allX = allScatterPts.map((p) => p.x);
  const allY = allScatterPts.map((p) => p.y);
  const scatterXMin = allX.length ? Math.min(...allX) : -20;
  const scatterXMax = allX.length ? Math.max(...allX) : 20;
  const scatterYMin = allY.length ? Math.min(...allY) : -20;
  const scatterYMax = allY.length ? Math.max(...allY) : 20;
  // Add a bit of padding
  const xPad = (scatterXMax - scatterXMin) * 0.08 || 2;
  const yPad = (scatterYMax - scatterYMin) * 0.08 || 2;
  const scatterDomain = {
    x: [scatterXMin - xPad, scatterXMax + xPad],
    y: [scatterYMin - yPad, scatterYMax + yPad],
  };

  // Scatter data: each fund + benchmark as a point { x: stdDev, y: meanReturn }
  const scatterFundPoints = allStats
    .filter((s) => !isNaN(s.vol.stdDevFund) && !isNaN(s.vol.meanFund))
    .map((s) => ({
      name: shortName(s.fund.scheme_name),
      x: parseFloat(s.vol.stdDevFund.toFixed(3)),
      y: parseFloat(s.vol.meanFund.toFixed(3)),
      sharpe: s.vol.sharpeFund,
      color: s.color,
    }));

  const benchPoint =
    allStats.length > 0 && !isNaN(allStats[0].vol.stdDevBench)
      ? {
          name: shortName(data.benchmark_name),
          x: parseFloat(allStats[0].vol.stdDevBench.toFixed(3)),
          y: parseFloat(allStats[0].vol.meanBench.toFixed(3)),
          sharpe: allStats[0].vol.sharpeBench,
          color: BENCHMARK_COLOR,
        }
      : null;

  // Render content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'returns':
        return (
          <RollingReturnCard
            data={data}
            funds={funds}
            windows={windows}
            currentWindow={currentWindow}
            returnType={returnType}
            setReturnType={setReturnType}
            chartData={chartData}
            hasData={hasData}
            fundStats={fundStats}
            benchLatest={benchLatest}
            benchAvg={benchAvg}
          />
        );

      case 'performance':
        return hasData ? (
          <PerformanceRiskCard
            data={data}
            currentWindow={currentWindow}
            returnType={returnType}
            riskFreeAnnual={riskFreeAnnual}
            allStats={allStats}
            scatterFundPoints={scatterFundPoints}
            benchPoint={benchPoint}
          />
        ) : null;

      case 'capture':
        return hasData && allStats.length > 0 ? (
          <MarketCaptureCard
            currentWindow={currentWindow}
            returnType={returnType}
            captureStats={allStats}
            scatterDomain={scatterDomain}
          />
        ) : null;

      case 'drawdown':
        return hasData ? (
          <DrawdownCard
            funds={funds}
            analyticsData={analyticsData}
            analyticsLoading={analyticsLoading}
            allStats={allStats}
            benchmarkName={data.benchmark_name}
          />
        ) : null;

      case 'scorecard':
        return (
          <ScorecardCard
            data={data}
            analyticsData={analyticsData}
            rfRate={riskFreeAnnual}
            activeWindow={activeWindow}
          />
        );

      case 'distribution':
        return <DistributionCard data={data} activeWindow={activeWindow} />;

      case 'sip':
        return <SipPlannerCard data={data} activeWindow={activeWindow} />;

      case 'reverse-sip':
        return <ReverseSipCard data={data} activeWindow={activeWindow} />;

      case 'retirement':
        return <RetirementCard data={data} activeWindow={activeWindow} />;

      case 'monthly':
        return <MonthlyHeatmapCard data={data} />;

      default:
        return null;
    }
  };

  return <>{renderTabContent()}</>;
};

export default RollingReturnChart;
