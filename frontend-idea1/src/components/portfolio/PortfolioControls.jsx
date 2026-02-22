/**
 * PortfolioControls
 * Date range inputs and Run Analysis button for the Portfolio Optimizer view.
 * Props:
 *   startDate        {string|null}  YYYY-MM-DD or null
 *   endDate          {string|null}  YYYY-MM-DD or null
 *   onStartDateChange {fn}
 *   onEndDateChange   {fn}
 *   onRun            {fn}
 *   loading          {boolean}
 */
export default function PortfolioControls({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onRun,
  loading,
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-800">Portfolio Optimizer</h2>
        <p className="text-xs text-gray-400 mt-0.5">6 asset classes · Markowitz MVO · Monte Carlo</p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Start date</label>
          <input
            type="date"
            value={startDate ?? ''}
            onChange={(e) => onStartDateChange(e.target.value || null)}
            min="2013-01-01"
            max="2025-12-31"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">End date</label>
          <input
            type="date"
            value={endDate ?? ''}
            onChange={(e) => onEndDateChange(e.target.value || null)}
            min="2013-01-01"
            max="2025-12-31"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
          />
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Leave blank to use the full 2013–2025 history
      </p>

      <button
        onClick={onRun}
        disabled={loading}
        className={`w-full py-2.5 px-4 rounded-lg text-sm font-semibold transition-colors ${
          loading
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
        }`}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            Running...
          </span>
        ) : (
          'Run Analysis'
        )}
      </button>

      <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 space-y-1">
        <p className="text-xs font-semibold text-blue-700">Asset classes</p>
        {[
          ['Passive Equity', 'Nifty 50 index fund'],
          ['Gold ETF', 'Physical gold proxy'],
          ['Govt Bonds', 'Long-duration gilt fund'],
          ['Corp Bonds', 'AAA corporate bond fund'],
          ['Short Duration', 'Short-term debt fund'],
          ['Liquid', 'Overnight / cash proxy'],
        ].map(([name, desc]) => (
          <div key={name} className="text-xs text-blue-600">
            <span className="font-medium">{name}</span>
            <span className="text-blue-400 ml-1">· {desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
