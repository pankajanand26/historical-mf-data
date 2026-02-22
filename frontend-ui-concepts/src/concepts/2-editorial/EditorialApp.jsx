import { useState, useCallback } from 'react';
import { useRollingReturns } from '../../shared/hooks/useRollingReturns';
import { useFundAnalytics } from '../../shared/hooks/useFundAnalytics';
import { getDateRange, computeAllStats, rfPeriodPct, buildChartData } from '../../shared/utils/chartUtils';
import KPISummaryBar from './components/KPISummaryBar';
import ControlsDrawer from './components/ControlsDrawer';
import EditorialChart from './components/EditorialChart';
import { computeKPIs } from '../../shared/utils/chartUtils';

const EditorialApp = () => {
  const [selectedFunds, setSelectedFunds] = useState([]);
  const [selectedBenchmark, setSelectedBenchmark] = useState(null);
  const [windows, setWindows] = useState(['3y']);
  const [datePreset, setDatePreset] = useState('all');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('returns');

  const { data, loading, error, fetch: fetchReturns, reset } = useRollingReturns();
  const { data: analyticsData, loading: analyticsLoading, fetch: fetchAnalytics, reset: resetAnalytics } = useFundAnalytics();

  const canAnalyze = selectedFunds.length > 0 && selectedBenchmark && windows.length > 0 && !loading;

  const handleAnalyze = useCallback(() => {
    if (!canAnalyze) return;
    const { startDate: sd, endDate: ed } = getDateRange(datePreset, startDate, endDate);
    const params = { schemeCodes: selectedFunds.map((f) => f.scheme_code), benchmarkCode: selectedBenchmark.scheme_code, startDate: sd, endDate: ed };
    fetchReturns({ ...params, windows });
    fetchAnalytics(params);
    setDrawerOpen(false);
    setActiveSection('returns');
  }, [canAnalyze, selectedFunds, selectedBenchmark, windows, datePreset, startDate, endDate, fetchReturns, fetchAnalytics]);

  const handleFundAdd = useCallback((fund) => {
    setSelectedFunds((prev) => {
      if (prev.some((f) => f.scheme_code === fund.scheme_code) || prev.length >= 5) return prev;
      return [...prev, fund];
    });
    reset(); resetAnalytics();
  }, [reset, resetAnalytics]);

  const handleFundRemove = useCallback((code) => {
    setSelectedFunds((prev) => prev.filter((f) => f.scheme_code !== code));
    reset(); resetAnalytics();
  }, [reset, resetAnalytics]);

  // Derive KPIs when data is available
  const kpis = (() => {
    if (!data) return [];
    const bw = data.benchmark_windows?.[0];
    if (!bw) return [];
    const rfPct = rfPeriodPct(data.risk_free_rate ?? 0.065, bw.window_days ?? 365, 'absolute');
    const chartData = buildChartData(data.funds ?? [], bw, 'absolute');
    const allStats = computeAllStats(data.funds ?? [], chartData, rfPct);
    return computeKPIs(data.funds ?? [], allStats, analyticsData);
  })();

  return (
    <div className="min-h-screen bg-editorial-cream font-sans">
      {/* Top masthead */}
      <header className="border-b-2 border-editorial-navy bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl text-editorial-navy font-bold tracking-tight">Morning Brief</h1>
            <p className="text-xs text-editorial-navy/50 font-sans mt-0.5">Mutual Fund Performance Attribution</p>
          </div>
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-2 px-4 py-2 border-2 border-editorial-navy text-editorial-navy text-sm font-semibold hover:bg-editorial-navy hover:text-white transition-colors rounded"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Configure
          </button>
        </div>
      </header>

      {/* KPI bar */}
      {kpis.length > 0 && <KPISummaryBar kpis={kpis} />}

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <EditorialChart
          data={data}
          analyticsData={analyticsData}
          analyticsLoading={analyticsLoading}
          loading={loading}
          error={error}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          selectedFunds={selectedFunds}
          selectedBenchmark={selectedBenchmark}
          onOpenDrawer={() => setDrawerOpen(true)}
        />
      </main>

      {/* Slide-in controls drawer */}
      <ControlsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        selectedFunds={selectedFunds}
        selectedBenchmark={selectedBenchmark}
        windows={windows}
        datePreset={datePreset}
        startDate={startDate}
        endDate={endDate}
        canAnalyze={canAnalyze}
        loading={loading}
        onFundAdd={handleFundAdd}
        onFundRemove={handleFundRemove}
        onBenchmarkSelect={(b) => { setSelectedBenchmark(b); reset(); resetAnalytics(); }}
        onWindowsChange={setWindows}
        onDatePresetChange={setDatePreset}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onAnalyze={handleAnalyze}
      />
    </div>
  );
};

export default EditorialApp;
