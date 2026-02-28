import { useState, useCallback } from 'react';
import Layout from './components/layout/Layout';
import FundSearchBar from './components/search/FundSearchBar';
import BenchmarkPicker from './components/benchmark/BenchmarkPicker';
import WindowSelector from './components/controls/WindowSelector';
import DateRangePicker from './components/controls/DateRangePicker';
import RfRateInput from './components/controls/RfRateInput';
import RollingReturnChart from './components/charts/RollingReturnChart';
import { TabNav, ExportButton, KpiStrip } from './components/ui';
import { useRollingReturns } from './hooks/useRollingReturns';
import { useFundAnalytics } from './hooks/useFundAnalytics';
import { DEFAULT_RF_RATE } from './utils/constants';

const getDateRange = (preset, startDate, endDate) => {
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

const App = () => {
  const [selectedFunds, setSelectedFunds] = useState([]);   // [{ scheme_code, scheme_name }]
  const [selectedBenchmark, setSelectedBenchmark] = useState(null);
  const [windows, setWindows] = useState(['3y']);
  const [datePreset, setDatePreset] = useState('all');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [activeTab, setActiveTab] = useState('returns');
  const [rfRate, setRfRate] = useState(DEFAULT_RF_RATE);
  const [activeWindow, setActiveWindow] = useState('3y'); // Global window for all tabs

  const { data, loading, error, fetch: fetchReturns, reset } = useRollingReturns();
  const { data: analyticsData, loading: analyticsLoading, fetch: fetchAnalytics, reset: resetAnalytics } = useFundAnalytics();

  const canAnalyze = selectedFunds.length > 0 && selectedBenchmark && windows.length > 0 && !loading;

  const handleAnalyze = useCallback(() => {
    if (!canAnalyze) return;
    const { startDate: sd, endDate: ed } = getDateRange(datePreset, startDate, endDate);
    const params = {
      schemeCodes: selectedFunds.map((f) => f.scheme_code),
      benchmarkCode: selectedBenchmark.scheme_code,
      startDate: sd,
      endDate: ed,
    };
    fetchReturns({ ...params, windows });
    fetchAnalytics(params);
  }, [canAnalyze, selectedFunds, selectedBenchmark, windows, datePreset, startDate, endDate, fetchReturns, fetchAnalytics]);

  const handleFundAdd = useCallback((fund) => {
    setSelectedFunds((prev) => {
      if (prev.some((f) => f.scheme_code === fund.scheme_code)) return prev;
      if (prev.length >= 5) return prev;
      return [...prev, fund];
    });
    reset();
    resetAnalytics();
  }, [reset, resetAnalytics]);

  const handleFundRemove = useCallback((schemeCode) => {
    setSelectedFunds((prev) => prev.filter((f) => f.scheme_code !== schemeCode));
    reset();
    resetAnalytics();
  }, [reset, resetAnalytics]);

  const handleBenchmarkSelect = (b) => {
    setSelectedBenchmark(b);
    reset();
    resetAnalytics();
  };

  return (
    <Layout>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Performance Attribution & Benchmarking</h1>
            <p className="text-sm text-gray-500">Rolling return analysis · Indian mutual funds · AMFI data</p>
          </div>
          <div className="flex items-center gap-3">
            <ExportButton data={data} analyticsData={analyticsData} activeTab={activeTab} />
            <span className="hidden sm:inline text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">Idea 1</span>
          </div>
        </div>
      </header>

      {/* KPI Strip - below header, above main content */}
      {data && !loading && (
        <KpiStrip
          data={data}
          analyticsData={analyticsData}
          rfRate={rfRate}
          activeWindow={activeWindow}
          setActiveWindow={setActiveWindow}
        />
      )}

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* ---- Left panel: controls ---- */}
          <aside className="lg:col-span-1 space-y-5">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-5">
              <FundSearchBar
                selectedFunds={selectedFunds}
                onAdd={handleFundAdd}
                onRemove={handleFundRemove}
                placeholder="e.g. HDFC Flexi Cap..."
              />

              <BenchmarkPicker
                selectedBenchmark={selectedBenchmark}
                onSelect={handleBenchmarkSelect}
              />

              <WindowSelector selected={windows} onChange={setWindows} />

              <DateRangePicker
                preset={datePreset}
                onPresetChange={setDatePreset}
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
              />

              <RfRateInput value={rfRate} onChange={setRfRate} />

              <button
                onClick={handleAnalyze}
                disabled={!canAnalyze}
                className={`w-full py-2.5 px-4 rounded-lg text-sm font-semibold transition-colors ${
                  canAnalyze
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Calculating...
                  </span>
                ) : (
                  'Analyze'
                )}
              </button>

              {selectedFunds.length === 0 && (
                <p className="text-xs text-gray-400 text-center">Search and select funds to begin</p>
              )}
              {selectedFunds.length > 0 && !selectedBenchmark && (
                <p className="text-xs text-gray-400 text-center">Now pick a benchmark index fund</p>
              )}
            </div>
          </aside>

          {/* ---- Right panel: chart ---- */}
          <section className="lg:col-span-3 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                <span className="font-medium">Error: </span>{error}
              </div>
            )}

            {!data && !loading && !error && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col items-center justify-center h-80 text-center px-6">
                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm">
                  Select funds, choose a benchmark, pick your rolling windows and click <strong>Analyze</strong>.
                </p>
              </div>
            )}

            {loading && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col items-center justify-center h-80">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-gray-500 text-sm">Computing rolling returns...</p>
                <p className="text-gray-400 text-xs mt-1">This may take a few seconds for long date ranges</p>
              </div>
            )}

            {data && !loading && (
              <>
                <TabNav activeTab={activeTab} setActiveTab={setActiveTab} />
                <RollingReturnChart
                  data={data}
                  analyticsData={analyticsData}
                  analyticsLoading={analyticsLoading}
                  activeTab={activeTab}
                  rfRate={rfRate}
                  activeWindow={activeWindow}
                  setActiveWindow={setActiveWindow}
                />
              </>
            )}
          </section>
        </div>
      </main>
    </Layout>
  );
};

export default App;
