import { useFundSearch } from '../../../shared/hooks/useFundSearch';
import { FUND_COLORS } from '../../../shared/utils/chartUtils';

const Step1Funds = ({ selectedFunds, onAdd, onRemove, onNext }) => {
  const { query, results, loading, search, clear } = useFundSearch();

  return (
    <div className="animate-fade-up">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">① Choose Mutual Funds</h2>
        <p className="text-slate-500">Search and select up to 5 funds to compare against a benchmark.</p>
      </div>

      {/* Search box */}
      <div className="relative mb-6">
        <svg className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => search(e.target.value)}
          placeholder="Search for a mutual fund…"
          className="w-full pl-12 pr-4 py-3.5 text-base border-2 border-violet-200 rounded-xl focus:border-violet-500 outline-none bg-white transition-colors shadow-sm"
        />
        {loading && <p className="text-xs text-slate-400 mt-1.5 ml-1">Searching…</p>}
        {results.length > 0 && (
          <ul className="absolute top-full left-0 right-0 mt-2 bg-white border border-violet-100 rounded-xl shadow-xl z-20 max-h-56 overflow-y-auto">
            {results.map((r) => {
              const already = selectedFunds.some((f) => f.scheme_code === r.scheme_code);
              return (
                <li
                  key={r.scheme_code}
                  onClick={() => { if (!already && selectedFunds.length < 5) { onAdd(r); clear(); } }}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                    already ? 'text-violet-300 cursor-default bg-violet-50/30' : 'text-slate-700 hover:bg-violet-50'
                  }`}
                >
                  {already && (
                    <svg className="w-4 h-4 text-violet-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  <span className="text-sm">{r.scheme_name}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Selected funds */}
      {selectedFunds.length > 0 ? (
        <div className="space-y-3 mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Selected ({selectedFunds.length}/5)</p>
          {selectedFunds.map((f, i) => (
            <div key={f.scheme_code} className="flex items-center gap-3 bg-white border border-violet-100 rounded-xl p-4 shadow-sm">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: FUND_COLORS[i % FUND_COLORS.length] }} />
              <span className="flex-1 text-sm text-slate-700">{f.scheme_name}</span>
              <button
                onClick={() => onRemove(f.scheme_code)}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 text-slate-300 mb-8">
          <svg className="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-sm">No funds selected yet</p>
        </div>
      )}

      {/* Next */}
      <button
        onClick={onNext}
        disabled={selectedFunds.length === 0}
        className={`w-full py-4 rounded-xl font-bold text-base transition-all ${
          selectedFunds.length > 0
            ? 'bg-violet-600 text-white hover:bg-violet-700 shadow-lg hover:shadow-violet-200'
            : 'bg-slate-100 text-slate-300 cursor-not-allowed'
        }`}
      >
        Continue → Configure
      </button>
    </div>
  );
};

export default Step1Funds;
