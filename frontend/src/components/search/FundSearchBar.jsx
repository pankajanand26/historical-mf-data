import { useState, useRef, useEffect } from 'react';
import { useFundSearch } from '../../hooks/useFundSearch';

const MAX_FUNDS = 5;

/**
 * Multi-fund search bar.
 * Props:
 *   selectedFunds: array of fund objects [{ scheme_code, scheme_name }]
 *   onAdd(fund):   called when user picks a fund from dropdown
 *   onRemove(scheme_code): called when user removes a chip
 *   placeholder: string
 */
const FundSearchBar = ({
  selectedFunds = [],
  onAdd,
  onRemove,
  placeholder = 'Search by any words, any order...',
}) => {
  const { query, results, loading, error, search, clear } = useFundSearch();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleInput = (e) => {
    search(e.target.value);
    setOpen(true);
  };

  const handleSelect = (fund) => {
    // Don't add duplicates
    if (selectedFunds.some((f) => f.scheme_code === fund.scheme_code)) return;
    onAdd(fund);
    clear();
    setOpen(false);
  };

  const atMax = selectedFunds.length >= MAX_FUNDS;

  // Chips for already-selected funds
  const selectedCodes = new Set(selectedFunds.map((f) => f.scheme_code));

  return (
    <div ref={containerRef}>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-sm font-medium text-gray-700">Funds</label>
        <span className="text-xs text-gray-400">{selectedFunds.length}/{MAX_FUNDS}</span>
      </div>

      {/* Chips */}
      {selectedFunds.length > 0 && (
        <div className="flex flex-col gap-1.5 mb-2">
          {selectedFunds.map((fund) => (
            <div
              key={fund.scheme_code}
              className="flex items-center gap-2 px-2.5 py-1.5 bg-blue-50 border border-blue-200 rounded-lg"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-blue-900 truncate">{fund.scheme_name}</p>
                <p className="text-xs text-blue-500">Code: {fund.scheme_code}</p>
              </div>
              <button
                onClick={() => onRemove(fund.scheme_code)}
                className="flex-shrink-0 text-blue-400 hover:text-blue-600 text-base leading-none"
                title="Remove"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search input — hidden when at max */}
      {!atMax ? (
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={handleInput}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder={selectedFunds.length === 0 ? placeholder : 'Add another fund...'}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {error && <p className="mt-1 text-xs text-red-500">{error}</p>}

          {open && results.length > 0 && (
            <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {results.map((fund) => {
                const already = selectedCodes.has(fund.scheme_code);
                return (
                  <li key={fund.scheme_code}>
                    <button
                      disabled={already}
                      className={`w-full text-left px-3 py-2 text-sm border-b border-gray-100 last:border-0 ${
                        already
                          ? 'opacity-40 cursor-not-allowed bg-gray-50'
                          : 'hover:bg-blue-50'
                      }`}
                      onClick={() => !already && handleSelect(fund)}
                    >
                      <span className="font-medium text-gray-900 block truncate">{fund.scheme_name}</span>
                      <span className="text-xs text-gray-400">Code: {fund.scheme_code}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {open && !loading && query.length >= 2 && results.length === 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow p-3 text-sm text-gray-500">
              No funds found for "{query}"
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-gray-400 text-center py-1">
          Maximum {MAX_FUNDS} funds selected
        </p>
      )}

      {selectedFunds.length === 0 && (
        <p className="mt-1 text-xs text-gray-400">Search and add up to {MAX_FUNDS} funds</p>
      )}
    </div>
  );
};

export default FundSearchBar;
