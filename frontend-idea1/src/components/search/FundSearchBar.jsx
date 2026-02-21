import { useState, useRef, useEffect } from 'react';
import { useFundSearch } from '../../hooks/useFundSearch';

const FundSearchBar = ({ onSelect, selectedFund, placeholder = 'Search mutual fund...' }) => {
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
    onSelect(fund);
    clear();
    setOpen(false);
  };

  const handleClear = () => {
    onSelect(null);
    clear();
    setOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-sm font-medium text-gray-700 mb-1">Fund</label>

      {selectedFund ? (
        <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-blue-900 truncate">{selectedFund.scheme_name}</p>
            <p className="text-xs text-blue-600">Code: {selectedFund.scheme_code}</p>
          </div>
          <button
            onClick={handleClear}
            className="flex-shrink-0 text-blue-400 hover:text-blue-600 text-lg leading-none"
            title="Clear selection"
          >
            &times;
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={handleInput}
              onFocus={() => results.length > 0 && setOpen(true)}
              placeholder={placeholder}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {loading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {error && <p className="mt-1 text-xs text-red-500">{error}</p>}

          {open && results.length > 0 && (
            <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {results.map((fund) => (
                <li key={fund.scheme_code}>
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b border-gray-100 last:border-0"
                    onClick={() => handleSelect(fund)}
                  >
                    <span className="font-medium text-gray-900 block truncate">{fund.scheme_name}</span>
                    <span className="text-xs text-gray-400">Code: {fund.scheme_code}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {open && !loading && query.length >= 2 && results.length === 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow p-3 text-sm text-gray-500">
              No funds found for "{query}"
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FundSearchBar;
