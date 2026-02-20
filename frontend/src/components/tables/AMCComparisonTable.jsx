import { METRIC_LABELS, METRIC_DESCRIPTIONS } from '../../utils/constants';
import { formatNumber, formatPercent, getMetricColor } from '../../utils/formatters';

const AMCComparisonTable = ({ metrics, onSort, sortBy, sortOrder }) => {
  const columns = [
    { key: 'amc_name', label: 'AMC', format: (v) => v },
    { key: 'scheme_count', label: 'Schemes', format: (v) => v || 0 },
    { key: 'cagr', label: 'CAGR', format: (v) => formatPercent(v) },
    { key: 'sharpe_ratio', label: 'Sharpe', format: (v) => formatNumber(v, 2) },
    { key: 'sortino_ratio', label: 'Sortino', format: (v) => formatNumber(v, 2) },
    { key: 'calmar_ratio', label: 'Calmar', format: (v) => formatNumber(v, 2) },
    { key: 'treynor_ratio', label: 'Treynor', format: (v) => formatNumber(v, 2) },
    { key: 'information_ratio', label: 'Info Ratio', format: (v) => formatNumber(v, 2) },
    { key: 'beta', label: 'Beta', format: (v) => formatNumber(v, 2) },
    { key: 'alpha', label: 'Alpha', format: (v) => formatPercent(v) },
    { key: 'max_drawdown', label: 'Max DD', format: (v) => formatPercent(v) },
    { key: 'volatility', label: 'Volatility', format: (v) => formatPercent(v) },
  ];

  const handleSort = (key) => {
    if (onSort) {
      onSort(key);
    }
  };

  if (!metrics || metrics.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
        No metrics to display. Select AMCs and click Analyze.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 ${
                    sortBy === col.key ? 'bg-gray-100' : ''
                  }`}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {sortBy === col.key && (
                      <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {metrics.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-sm ${
                      col.key === 'amc_name'
                        ? 'font-medium text-gray-900'
                        : col.key !== 'scheme_count'
                        ? getMetricColor(col.key, row[col.key])
                        : 'text-gray-500'
                    }`}
                    title={METRIC_DESCRIPTIONS[col.key] || ''}
                  >
                    {col.format(row[col.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AMCComparisonTable;
