import { useState, useMemo } from 'react';
import { useIndexFunds } from '../../hooks/useIndexFunds';

const BenchmarkPicker = ({ selectedBenchmark, onSelect }) => {
  const { indexFunds, loading, error } = useIndexFunds();
  const [filter, setFilter] = useState('');

  const filtered = useMemo(() => {
    if (!filter.trim()) return indexFunds;
    const q = filter.toLowerCase();
    return indexFunds.filter((f) => f.scheme_name.toLowerCase().includes(q));
  }, [indexFunds, filter]);

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
          <div className="p-2 border-b border-gray-200 bg-gray-50">
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter index funds..."
              className="w-full text-sm bg-transparent outline-none placeholder-gray-400"
            />
          </div>
          <ul className="max-h-48 overflow-y-auto divide-y divide-gray-100">
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
        </div>
      )}
    </div>
  );
};

export default BenchmarkPicker;
