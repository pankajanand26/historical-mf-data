import { useState, useCallback } from 'react';
import { useRollingReturns } from '../../shared/hooks/useRollingReturns';
import { useFundAnalytics } from '../../shared/hooks/useFundAnalytics';
import { getDateRange } from '../../shared/utils/chartUtils';
import StepIndicator from './components/StepIndicator';
import Step1Funds from './components/Step1Funds';
import Step2Configure from './components/Step2Configure';
import Step3Results from './components/Step3Results';

const WizardApp = () => {
  const [step, setStep] = useState(1);
  const [selectedFunds, setSelectedFunds] = useState([]);
  const [selectedBenchmark, setSelectedBenchmark] = useState(null);
  const [windows, setWindows] = useState(['3y']);
  const [datePreset, setDatePreset] = useState('all');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const { data, loading, error, fetch: fetchReturns, reset } = useRollingReturns();
  const { data: analyticsData, loading: analyticsLoading, fetch: fetchAnalytics, reset: resetAnalytics } = useFundAnalytics();

  const handleFundAdd = useCallback((fund) => {
    setSelectedFunds((prev) => {
      if (prev.some((f) => f.scheme_code === fund.scheme_code) || prev.length >= 5) return prev;
      return [...prev, fund];
    });
  }, []);

  const handleFundRemove = useCallback((code) => {
    setSelectedFunds((prev) => prev.filter((f) => f.scheme_code !== code));
  }, []);

  const handleAnalyze = useCallback(() => {
    const { startDate: sd, endDate: ed } = getDateRange(datePreset, startDate, endDate);
    const params = { schemeCodes: selectedFunds.map((f) => f.scheme_code), benchmarkCode: selectedBenchmark.scheme_code, startDate: sd, endDate: ed };
    fetchReturns({ ...params, windows });
    fetchAnalytics(params);
    setStep(3);
  }, [selectedFunds, selectedBenchmark, windows, datePreset, startDate, endDate, fetchReturns, fetchAnalytics]);

  const handleReset = () => {
    setStep(1);
    setSelectedFunds([]);
    setSelectedBenchmark(null);
    setWindows(['3y']);
    setDatePreset('all');
    setStartDate(null);
    setEndDate(null);
    reset();
    resetAnalytics();
  };

  return (
    <div className="min-h-screen bg-violet-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-violet-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <span className="font-semibold text-slate-800">Fund Analyzer</span>
        </div>
        {step === 3 && (
          <button onClick={handleReset} className="text-sm text-violet-600 hover:text-violet-800 font-medium transition-colors">
            ← Start Over
          </button>
        )}
      </header>

      {/* Step indicator */}
      <div className="bg-white border-b border-violet-100 px-6 py-4">
        <div className="max-w-2xl mx-auto">
          <StepIndicator currentStep={step} />
        </div>
      </div>

      {/* Step content */}
      <main className="flex-1 flex flex-col items-center justify-start px-6 py-10">
        <div className="w-full max-w-2xl">
          {step === 1 && (
            <Step1Funds
              selectedFunds={selectedFunds}
              onAdd={handleFundAdd}
              onRemove={handleFundRemove}
              onNext={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <Step2Configure
              selectedFunds={selectedFunds}
              selectedBenchmark={selectedBenchmark}
              windows={windows}
              datePreset={datePreset}
              startDate={startDate}
              endDate={endDate}
              onBenchmarkSelect={setSelectedBenchmark}
              onWindowsChange={setWindows}
              onDatePresetChange={setDatePreset}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              onBack={() => setStep(1)}
              onNext={handleAnalyze}
            />
          )}
          {step === 3 && (
            <Step3Results
              data={data}
              analyticsData={analyticsData}
              analyticsLoading={analyticsLoading}
              loading={loading}
              error={error}
              selectedFunds={selectedFunds}
              selectedBenchmark={selectedBenchmark}
              onBack={() => setStep(2)}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default WizardApp;
