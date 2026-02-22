import { useState, useCallback, useEffect } from 'react';
import { useRollingReturns } from '../../shared/hooks/useRollingReturns';
import { useFundAnalytics } from '../../shared/hooks/useFundAnalytics';
import { getDateRange } from '../../shared/utils/chartUtils';
import WorkbenchSidebar from './components/WorkbenchSidebar';
import FundDiffStrip from './components/FundDiffStrip';
import AnalysisTabs from './components/AnalysisTabs';
import ThemeToggle from './components/ThemeToggle';

const WorkbenchApp = () => {
  const [darkMode, setDarkMode] = useState(true);
  const [selectedFunds, setSelectedFunds] = useState([]);
  const [selectedBenchmark, setSelectedBenchmark] = useState(null);
  const [windows, setWindows] = useState(['3y']);
  const [datePreset, setDatePreset] = useState('all');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [activeTab, setActiveTab] = useState('returns');

  const { data, loading, error, fetch: fetchReturns, reset } = useRollingReturns();
  const { data: analyticsData, loading: analyticsLoading, fetch: fetchAnalytics, reset: resetAnalytics } = useFundAnalytics();

  // Apply dark class to wrapper element
  const containerClass = darkMode ? 'dark' : '';

  const canAnalyze = selectedFunds.length > 0 && selectedBenchmark && windows.length > 0 && !loading;

  const handleAnalyze = useCallback(() => {
    if (!canAnalyze) return;
    const { startDate: sd, endDate: ed } = getDateRange(datePreset, startDate, endDate);
    const params = { schemeCodes: selectedFunds.map((f) => f.scheme_code), benchmarkCode: selectedBenchmark.scheme_code, startDate: sd, endDate: ed };
    fetchReturns({ ...params, windows });
    fetchAnalytics(params);
    setActiveTab('returns');
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

  return (
    <div className={containerClass}>
      <div className="min-h-screen bg-white dark:bg-[#1e1e2e] text-slate-800 dark:text-[#cdd6f4] flex flex-col transition-colors duration-200">
        {/* Top bar */}
        <header className="flex-shrink-0 h-12 bg-white dark:bg-[#181825] border-b border-slate-200 dark:border-[#313244] flex items-center px-4 gap-3 z-20">
          <span className="font-bold text-sm text-slate-700 dark:text-[#cba6f7] tracking-tight">⚙ Workbench</span>
          <div className="h-4 w-px bg-slate-200 dark:bg-[#313244]" />
          <span className="text-xs text-slate-400 dark:text-[#6c7086]">
            {selectedFunds.length > 0 ? `${selectedFunds.length} fund${selectedFunds.length > 1 ? 's' : ''} selected` : 'No funds selected'}
          </span>
          {selectedBenchmark && (
            <span className="text-xs text-emerald-600 dark:text-[#a6e3a1]">vs {selectedBenchmark.scheme_name.split(' ').slice(0, 3).join(' ')}…</span>
          )}
          <div className="ml-auto">
            <ThemeToggle dark={darkMode} onToggle={() => setDarkMode((v) => !v)} />
          </div>
        </header>

        {/* Fund diff strip */}
        {selectedFunds.length > 0 && (
          <FundDiffStrip
            funds={selectedFunds}
            benchmark={selectedBenchmark}
            data={data}
            darkMode={darkMode}
          />
        )}

        {/* Main layout */}
        <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 48px - (selectedFunds.length > 0 ? 36px : 0px))' }}>
          {/* Drag-to-resize sidebar */}
          <WorkbenchSidebar
            width={sidebarWidth}
            onWidthChange={setSidebarWidth}
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
            darkMode={darkMode}
          />

          {/* Right pane */}
          <main className="flex-1 overflow-hidden flex flex-col">
            <AnalysisTabs
              data={data}
              analyticsData={analyticsData}
              analyticsLoading={analyticsLoading}
              loading={loading}
              error={error}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              darkMode={darkMode}
            />
          </main>
        </div>
      </div>
    </div>
  );
};

export default WorkbenchApp;
