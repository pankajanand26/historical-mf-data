import { useState, useCallback } from 'react';
import Layout from './components/layout/Layout';
import Header from './components/layout/Header';
import AMCSelector from './components/filters/AMCSelector';
import AMCComparisonTable from './components/tables/AMCComparisonTable';
import CumulativeReturnChart from './components/charts/CumulativeReturnChart';
import ExpenseDragChart from './components/charts/ExpenseDragChart';
import { useAMCData } from './hooks/useAMCData';
import { useMetrics } from './hooks/useMetrics';
import { useExpenseDrag } from './hooks/useExpenseDrag';

const App = () => {
  const { amcs, categories, loading: amcLoading, error: amcError } = useAMCData();
  const { metrics, cumulativeReturns, benchmarkUsed, loading: metricsLoading, error: metricsError, fetchMetrics } = useMetrics();
  const { expenseDragData, loading: expenseLoading, error: expenseError, fetchExpenseDrag } = useExpenseDrag();

  const [selectedAmcs, setSelectedAmcs] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [datePreset, setDatePreset] = useState('3y');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [planType, setPlanType] = useState(null);
  const [sortBy, setSortBy] = useState('sharpe_ratio');
  const [sortOrder, setSortOrder] = useState('desc');
  const [activeTab, setActiveTab] = useState('comparison');
  const [selectedAmcForExpense, setSelectedAmcForExpense] = useState(null);

  const getDateRange = useCallback(() => {
    const now = new Date();
    let start = null;

    switch (datePreset) {
      case '1y':
        start = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      case '3y':
        start = new Date(now.setFullYear(now.getFullYear() - 3));
        break;
      case '5y':
        start = new Date(now.setFullYear(now.getFullYear() - 5));
        break;
      case 'all':
        return { startDate: null, endDate: null };
      case 'custom':
        return { startDate, endDate };
      default:
        start = new Date(now.setFullYear(now.getFullYear() - 3));
    }

    return {
      startDate: start ? start.toISOString().split('T')[0] : null,
      endDate: new Date().toISOString().split('T')[0],
    };
  }, [datePreset, startDate, endDate]);

  const handleAnalyze = useCallback(() => {
    const dateRange = getDateRange();
    fetchMetrics({
      amcs: selectedAmcs,
      start_date: dateRange.startDate,
      end_date: dateRange.endDate,
      category: selectedCategory,
      plan_type: planType,
    });
  }, [selectedAmcs, selectedCategory, planType, getDateRange, fetchMetrics]);

  const handleSort = useCallback((key) => {
    if (sortBy === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortOrder('desc');
    }
  }, [sortBy]);

  const sortedMetrics = [...metrics].sort((a, b) => {
    const aVal = a[sortBy] ?? -Infinity;
    const bVal = b[sortBy] ?? -Infinity;
    return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
  });

  const handleExpenseAnalysis = useCallback((amcName) => {
    setSelectedAmcForExpense(amcName);
    fetchExpenseDrag(amcName);
  }, [fetchExpenseDrag]);

  if (amcLoading) {
    return (
      <Layout>
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading AMC data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (amcError) {
    return (
      <Layout>
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="bg-red-50 text-red-700 p-4 rounded-lg">
            Error: {amcError}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <AMCSelector
              amcs={amcs}
              selectedAmcs={selectedAmcs}
              onAmcChange={setSelectedAmcs}
              categories={categories}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              datePreset={datePreset}
              onDatePresetChange={setDatePreset}
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              planType={planType}
              onPlanTypeChange={setPlanType}
              onAnalyze={handleAnalyze}
              loading={metricsLoading}
            />
          </div>

          <div className="lg:col-span-3 space-y-6">
            <div className="flex gap-4 border-b border-gray-200">
              <button
                onClick={() => setActiveTab('comparison')}
                className={`px-4 py-2 font-medium ${
                  activeTab === 'comparison'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Performance Comparison
              </button>
              <button
                onClick={() => setActiveTab('expense')}
                className={`px-4 py-2 font-medium ${
                  activeTab === 'expense'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Expense Drag Analysis
              </button>
            </div>

            {metricsError && (
              <div className="bg-red-50 text-red-700 p-4 rounded-lg">
                Error: {metricsError}
              </div>
            )}

            {activeTab === 'comparison' && (
              <>
                {benchmarkUsed && (
                  <div className="bg-blue-50 text-blue-700 p-3 rounded-lg text-sm">
                    Benchmark: {benchmarkUsed}
                  </div>
                )}

                <AMCComparisonTable
                  metrics={sortedMetrics}
                  onSort={handleSort}
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                />

                {metrics.length > 0 && (
                  <div className="mt-6">
                    <CumulativeReturnChart cumulativeReturns={cumulativeReturns} />
                  </div>
                )}

                {metrics.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      Expense Drag Analysis
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Select an AMC to view Direct vs Regular plan expense drag:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {metrics.map((m) => (
                        <button
                          key={m.amc_name}
                          onClick={() => handleExpenseAnalysis(m.amc_name)}
                          className={`px-3 py-1 rounded text-sm ${
                            selectedAmcForExpense === m.amc_name
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {m.amc_name.replace(' Mutual Fund', '')}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {activeTab === 'expense' && (
              <>
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Select AMC for Expense Drag Analysis
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedAmcs.map((amc) => (
                      <button
                        key={amc}
                        onClick={() => handleExpenseAnalysis(amc)}
                        className={`px-3 py-1 rounded text-sm ${
                          selectedAmcForExpense === amc
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {amc.replace(' Mutual Fund', '')}
                      </button>
                    ))}
                  </div>
                </div>

                {expenseError && (
                  <div className="bg-red-50 text-red-700 p-4 rounded-lg">
                    Error: {expenseError}
                  </div>
                )}

                {expenseLoading && (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-500">Analyzing expense drag...</p>
                  </div>
                )}

                {expenseDragData && !expenseLoading && (
                  <ExpenseDragChart expenseDragData={expenseDragData} />
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </Layout>
  );
};

export default App;
