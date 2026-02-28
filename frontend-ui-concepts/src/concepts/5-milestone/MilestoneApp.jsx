import { useState, useCallback } from 'react';
import { useRollingReturns } from '../../shared/hooks/useRollingReturns';
import { useFundAnalytics } from '../../shared/hooks/useFundAnalytics';
import { getDateRange } from '../../shared/utils/chartUtils';
import ControlsBar from '../../shared/components/ControlsBar';
import MilestoneChart from './components/MilestoneChart';

const DEFAULT_MILESTONES = [
  { id: 1, name: 'Emergency Fund', years: 3, target: 500000 },
  { id: 2, name: "Child's Education", years: 7, target: 2500000 },
  { id: 3, name: 'Home Down Payment', years: 10, target: 5000000 },
  { id: 4, name: 'Retirement Corpus', years: 20, target: 20000000 },
];

const MilestoneApp = () => {
  const [selectedFunds, setSelectedFunds] = useState([]);
  const [selectedBenchmark, setSelectedBenchmark] = useState(null);
  const [windows, setWindows] = useState(['5y']);
  const [datePreset, setDatePreset] = useState('all');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [monthlySIP, setMonthlySIP] = useState(10000);
  const [milestones, setMilestones] = useState(DEFAULT_MILESTONES);

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

  const updateMilestone = (id, field, value) =>
    setMilestones((prev) => prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)));

  const addMilestone = () =>
    setMilestones((prev) => [
      ...prev,
      { id: Date.now(), name: 'New Goal', years: 5, target: 1000000 },
    ]);

  const removeMilestone = (id) => setMilestones((prev) => prev.filter((m) => m.id !== id));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      <ControlsBar
        brand="MILESTONE TRACKER"
        accentColor="#f59e0b"
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
        {/* Milestone config panel */}
        <aside className="w-72 flex-shrink-0 bg-white border-r border-slate-200 p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Milestones</h2>
            <button onClick={addMilestone}
              className="text-xs bg-amber-100 text-amber-700 hover:bg-amber-200 px-2 py-0.5 rounded font-medium transition-colors">
              + Add
            </button>
          </div>
          <div className="mb-4">
            <label className="text-xs text-slate-500 block mb-1">Monthly SIP (₹)</label>
            <input type="number" value={monthlySIP} onChange={(e) => setMonthlySIP(Number(e.target.value))}
              className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded outline-none focus:border-amber-500" />
          </div>
          <div className="space-y-4">
            {milestones.map((m) => (
              <div key={m.id} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <input value={m.name} onChange={(e) => updateMilestone(m.id, 'name', e.target.value)}
                    className="flex-1 text-sm font-semibold bg-transparent outline-none text-slate-700 border-b border-amber-300 focus:border-amber-500 mr-2" />
                  <button onClick={() => removeMilestone(m.id)} className="text-slate-400 hover:text-red-400 text-xs">✕</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500">Years</label>
                    <input type="number" min={1} max={30} value={m.years}
                      onChange={(e) => updateMilestone(m.id, 'years', Number(e.target.value))}
                      className="w-full px-2 py-1 text-xs border border-amber-300 rounded outline-none focus:border-amber-500 bg-white" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500">Target (₹)</label>
                    <input type="number" value={m.target}
                      onChange={(e) => updateMilestone(m.id, 'target', Number(e.target.value))}
                      className="w-full px-2 py-1 text-xs border border-amber-300 rounded outline-none focus:border-amber-500 bg-white" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>
        <MilestoneChart
          data={data}
          analyticsData={analyticsData}
          loading={loading}
          error={error}
          milestones={milestones}
          monthlySIP={monthlySIP}
          selectedFunds={selectedFunds}
          windows={windows}
        />
      </div>
    </div>
  );
};

export default MilestoneApp;
