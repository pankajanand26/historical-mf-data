import { useState, useCallback } from 'react';
import { useRollingReturns } from '../../shared/hooks/useRollingReturns';
import { useFundAnalytics } from '../../shared/hooks/useFundAnalytics';
import { getDateRange } from '../../shared/utils/chartUtils';
import ControlsBar from '../../shared/components/ControlsBar';
import HeatmapChart from './components/HeatmapChart';

const HeatmapApp = () => {
  const [selectedFunds, setSelectedFunds] = useState([]);
  const [selectedBenchmark, setSelectedBenchmark] = useState(null);
  const [windows, setWindows] = useState(['3y']);
  const [datePreset, setDatePreset] = useState('all');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const { data, loading, error, fetch: fetchReturns, reset } = useRollingReturns();
  const { data: analyticsData, loading: analyticsLoading, fetch: fetchAnalytics, reset: resetAnalytics } = useFundAnalytics();

  const canAnalyze = selectedFunds.length > 0 && selectedBenchmark && windows.length > 0 && !loading;

  const handleAnalyze = useCallback(() => {
    if (!canAnalyze) return;
    const { startDate: sd, endDate: ed } = getDateRange(datePreset, startDate, endDate);
    const params = {
      schemeCodes: selectedFunds.map((f) => f.scheme_code),
      benchmarkCode: selectedBenchmark.scheme_code,
      startDate: sd, endDate: ed,
    };
    fetchReturns({ ...params, windows });
    fetchAnalytics(params);
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

  const handleBenchmarkSelect = (b) => { setSelectedBenchmark(b); reset(); resetAnalytics(); };

  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col">
      <ControlsBar
        brand="SCORECARD"
        accentColor="#0891b2"
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
        onBenchmarkSelect={handleBenchmarkSelect}
        onWindowsChange={setWindows}
        onDatePresetChange={setDatePreset}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onAnalyze={handleAnalyze}
      />
      <HeatmapChart
        data={data}
        analyticsData={analyticsData}
        analyticsLoading={analyticsLoading}
        loading={loading}
        error={error}
      />
    </div>
  );
};

export default HeatmapApp;
