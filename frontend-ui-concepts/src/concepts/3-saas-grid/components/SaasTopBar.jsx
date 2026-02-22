const TABS = [
  { id: 'returns', label: 'Returns', icon: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z' },
  { id: 'risk', label: 'Risk', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { id: 'capture', label: 'Capture', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
  { id: 'drawdown', label: 'Drawdown', icon: 'M19 14l-7 7m0 0l-7-7m7 7V3' },
];

const SaasTopBar = ({ selectedFunds, selectedBenchmark, activeTab, onTabChange, hasData, loading }) => (
  <header className="h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-4 flex-shrink-0 z-10">
    {/* Brand */}
    <div className="flex items-center gap-2.5 mr-4">
      <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
      </div>
      <span className="font-semibold text-slate-800 text-sm">MF Analytics</span>
    </div>

    {/* Tabs — only shown when data is available */}
    {(hasData || loading) && (
      <nav className="flex items-center gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
            </svg>
            {tab.label}
          </button>
        ))}
      </nav>
    )}

    {/* Right: context breadcrumb */}
    <div className="ml-auto flex items-center gap-2 text-xs text-slate-400">
      {selectedFunds.length > 0 && (
        <span className="bg-slate-100 px-2 py-1 rounded-md">
          {selectedFunds.length} fund{selectedFunds.length > 1 ? 's' : ''}
        </span>
      )}
      {selectedBenchmark && (
        <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md">
          vs {selectedBenchmark.scheme_name.split(' ').slice(0, 3).join(' ')}…
        </span>
      )}
    </div>
  </header>
);

export default SaasTopBar;
