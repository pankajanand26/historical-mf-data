/**
 * PortfolioOptimizerView
 * Top-level container for the Portfolio Optimizer tab.
 * Manages all three data-fetching hooks, fires them in parallel on "Run Analysis",
 * and renders the full UI: controls sidebar + four chart sections.
 */
import { useState, useCallback } from 'react';
import PortfolioControls from './PortfolioControls';
import NavGrowthChart from '../charts/NavGrowthChart';
import CorrelationHeatmap from '../charts/CorrelationHeatmap';
import EfficientFrontierChart from '../charts/EfficientFrontierChart';
import WeightsBarChart from '../charts/WeightsBarChart';
import MonteCarloChart from '../charts/MonteCarloChart';
import { usePortfolioNav } from '../../hooks/usePortfolioNav';
import { useCorrelation } from '../../hooks/useCorrelation';
import { useOptimization } from '../../hooks/useOptimization';

function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
      <span className="font-medium">Error: </span>{message}
    </div>
  );
}

function LoadingCard({ label }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-gray-500 text-sm">{label}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col items-center justify-center h-80 text-center px-6">
      <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mb-4">
        <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
      <p className="text-gray-600 font-medium mb-1">Ready to optimise</p>
      <p className="text-gray-400 text-sm">
        Select a date range (or leave blank for full history) and click{' '}
        <strong className="text-gray-600">Run Analysis</strong>.
      </p>
      <p className="text-gray-400 text-xs mt-3">
        Tip: first run uses full 2013–2025 data · optimisation takes ~5–10 s
      </p>
    </div>
  );
}

export default function PortfolioOptimizerView() {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate]     = useState(null);
  const [hasRun, setHasRun]       = useState(false);

  const navHook  = usePortfolioNav();
  const corrHook = useCorrelation();
  const optHook  = useOptimization();

  const anyLoading = navHook.loading || corrHook.loading || optHook.loading;
  const anyError   = navHook.error   || corrHook.error   || optHook.error;

  const handleRun = useCallback(() => {
    const params = { startDate, endDate };
    navHook.fetch(params);
    corrHook.fetch(params);
    optHook.fetch(params);
    setHasRun(true);
  }, [startDate, endDate, navHook, corrHook, optHook]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

      {/* ── Left panel: controls ─────────────────────────────────── */}
      <aside className="lg:col-span-1">
        <PortfolioControls
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onRun={handleRun}
          loading={anyLoading}
        />
      </aside>

      {/* ── Right panel: charts ──────────────────────────────────── */}
      <section className="lg:col-span-3 space-y-6">

        {/* Error banners */}
        {navHook.error  && <ErrorBanner message={navHook.error} />}
        {corrHook.error && <ErrorBanner message={corrHook.error} />}
        {optHook.error  && <ErrorBanner message={optHook.error} />}

        {/* Pre-run empty state */}
        {!hasRun && <EmptyState />}

        {/* NAV Growth */}
        {navHook.loading && <LoadingCard label="Loading NAV data..." />}
        {navHook.data && !navHook.loading && (
          <NavGrowthChart data={navHook.data} />
        )}

        {/* Correlation */}
        {corrHook.loading && <LoadingCard label="Computing correlations..." />}
        {corrHook.data && !corrHook.loading && (
          <CorrelationHeatmap data={corrHook.data} />
        )}

        {/* Efficient Frontier */}
        {optHook.loading && <LoadingCard label="Optimising portfolio (Markowitz MVO)..." />}
        {optHook.data && !optHook.loading && (
          <>
            <EfficientFrontierChart data={optHook.data} />
            <WeightsBarChart data={optHook.data} />
            <MonteCarloChart data={optHook.data} />
          </>
        )}
      </section>
    </div>
  );
}
