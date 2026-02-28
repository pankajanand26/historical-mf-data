import { useState, useCallback, useEffect } from 'react';
import { useRollingReturns } from '../../shared/hooks/useRollingReturns';
import { useFundAnalytics } from '../../shared/hooks/useFundAnalytics';
import { getDateRange } from '../../shared/utils/chartUtils';
import ControlsBar from '../../shared/components/ControlsBar';
import AdvisorChart from './components/AdvisorChart';

const AdvisorApp = () => {
  const [selectedFunds, setSelectedFunds] = useState([]);
  const [selectedBenchmark, setSelectedBenchmark] = useState(null);
  const [windows, setWindows] = useState(['3y']);
  const [datePreset, setDatePreset] = useState('all');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const { data, loading, error, fetch: fetchReturns, reset } = useRollingReturns();
  const { data: analyticsData, fetch: fetchAnalytics, reset: resetAnalytics } = useFundAnalytics();

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

  // Auto-run analysis when fund/benchmark selection changes
  useEffect(() => {
    if (selectedFunds.length === 0 || !selectedBenchmark || windows.length === 0) return;
    const { startDate: sd, endDate: ed } = getDateRange(datePreset, startDate, endDate);
    const params = {
      schemeCodes: selectedFunds.map((f) => f.scheme_code),
      benchmarkCode: selectedBenchmark.scheme_code,
      startDate: sd, endDate: ed,
    };
    fetchReturns({ ...params, windows });
    fetchAnalytics(params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFunds, selectedBenchmark]);

  const handleFundAdd = useCallback((fund) => {
    setSelectedFunds((prev) => {
      if (prev.some((f) => f.scheme_code === fund.scheme_code) || prev.length >= 5) return prev;
      return [...prev, fund];
    });
  }, []);

  const handleFundRemove = useCallback((code) => {
    setSelectedFunds((prev) => prev.filter((f) => f.scheme_code !== code));
  }, []);

  const handleBenchmarkSelect = (b) => { setSelectedBenchmark(b); };

  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col">
      <ControlsBar
        brand="SWITCH ADVISOR"
        accentColor="#7c3aed"
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
      <AdvisorChart
        data={data}
        analyticsData={analyticsData}
        loading={loading}
        error={error}
        selectedFunds={selectedFunds}
      />
    </div>
  );
};

export default AdvisorApp;
