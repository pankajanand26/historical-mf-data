import { useState, useMemo } from 'react';
import Fuse from 'fuse.js';
import { useIndexFunds } from '../../hooks/useIndexFunds';

// Fuse.js config — tuned for short fund-name tokens
// threshold 0.35: tolerates ~1-2 character typos; lower = stricter
const FUSE_OPTIONS = {
  keys: ['scheme_name'],
  threshold: 0.35,
  distance: 200,      // allow match anywhere within a long name
  minMatchCharLength: 2,
  shouldSort: true,   // sort by match score (best first)
};

const BenchmarkPicker = ({ selectedBenchmark, onSelect }) => {
  const { indexFunds, loading, error } = useIndexFunds();
  const [filter, setFilter] = useState('');

  // Build Fuse index once whenever the list changes
  const fuse = useMemo(() => new Fuse(indexFunds, FUSE_OPTIONS), [indexFunds]);

  const filtered = useMemo(() => {
    if (!filter.trim()) return [];
    return fuse.search(filter.trim()).map((r) => r.item);
  }, [fuse, indexFunds, filter]);

  const handleClear = () => {
    onSelect(null);
    setFilter('');
  };

  if (loading) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Benchmark</label>
        <div className="flex items-center gap-2 text-sm text-gray-500 p-2">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          Loading index funds...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Benchmark</label>
        <p className="text-xs text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Benchmark</label>

      {selectedBenchmark ? (
        <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-green-900 truncate">{selectedBenchmark.scheme_name}</p>
            <p className="text-xs text-green-600">Code: {selectedBenchmark.scheme_code}</p>
          </div>
          <button
            onClick={handleClear}
            className="flex-shrink-0 text-green-400 hover:text-green-600 text-lg leading-none"
            title="Clear benchmark"
          >
            &times;
          </button>
        </div>
      ) : (
        <div className="border border-gray-300 rounded-lg overflow-hidden">
          <div className="p-2 bg-gray-50">
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search index funds (fuzzy)..."
              className="w-full text-sm bg-transparent outline-none placeholder-gray-400"
            />
          </div>
          {filter.trim() && (
            <ul className="max-h-48 overflow-y-auto divide-y divide-gray-100 border-t border-gray-200">
              {filtered.length === 0 && (
                <li className="px-3 py-2 text-sm text-gray-400">No index funds found</li>
              )}
              {filtered.map((fund) => (
                <li key={fund.scheme_code}>
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-green-50 text-sm"
                    onClick={() => { onSelect(fund); setFilter(''); }}
                  >
                    <span className="font-medium text-gray-900 block truncate">{fund.scheme_name}</span>
                    <span className="text-xs text-gray-400">Code: {fund.scheme_code}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default BenchmarkPicker;
