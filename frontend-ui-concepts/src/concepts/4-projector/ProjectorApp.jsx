import { useState, useCallback } from 'react';
import { useRollingReturns } from '../../shared/hooks/useRollingReturns';
import { useFundAnalytics } from '../../shared/hooks/useFundAnalytics';
import { getDateRange } from '../../shared/utils/chartUtils';
import ControlsBar from '../../shared/components/ControlsBar';
import ProjectorChart from './components/ProjectorChart';

const ProjectorApp = () => {
  const [selectedFunds, setSelectedFunds] = useState([]);
  const [selectedBenchmark, setSelectedBenchmark] = useState(null);
  const [windows, setWindows] = useState(['5y']);
  const [datePreset, setDatePreset] = useState('all');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  // Goal configuration
  const [monthlySIP, setMonthlySIP] = useState(10000);
  const [horizonYears, setHorizonYears] = useState(10);
  const [targetCorpus, setTargetCorpus] = useState(2000000);

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
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      <ControlsBar
        brand="GOAL PROJECTOR"
        accentColor="#10b981"
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
      <div className="flex flex-1">
        {/* Goal Config Panel */}
        <aside className="w-64 flex-shrink-0 bg-white border-r border-slate-200 p-5 flex flex-col gap-5">
          <div>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Goal Setup</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Monthly SIP (₹)</label>
                <input type="number" value={monthlySIP} onChange={(e) => setMonthlySIP(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200" />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Horizon: {horizonYears} years</label>
                <input type="range" min={1} max={30} value={horizonYears} onChange={(e) => setHorizonYears(Number(e.target.value))}
                  className="w-full accent-emerald-500" />
                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5"><span>1Y</span><span>30Y</span></div>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Target Corpus (₹)</label>
                <input type="number" value={targetCorpus} onChange={(e) => setTargetCorpus(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200" />
              </div>
            </div>
          </div>
          <div className="mt-auto p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <p className="text-[10px] text-emerald-700 font-semibold mb-1">Invested Capital</p>
            <p className="text-sm font-bold text-emerald-800">
              ₹{((monthlySIP * horizonYears * 12) / 100000).toFixed(1)} L
            </p>
            <p className="text-[10px] text-emerald-600 mt-0.5">over {horizonYears} years</p>
          </div>
        </aside>
        <ProjectorChart
          data={data}
          analyticsData={analyticsData}
          loading={loading}
          error={error}
          monthlySIP={monthlySIP}
          horizonYears={horizonYears}
          targetCorpus={targetCorpus}
          selectedFunds={selectedFunds}
          windows={windows}
        />
      </div>
    </div>
  );
};

export default ProjectorApp;
