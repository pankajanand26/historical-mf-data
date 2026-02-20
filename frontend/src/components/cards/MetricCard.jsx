import { METRIC_LABELS } from '../../utils/constants';
import { formatNumber, formatPercent, getMetricColor } from '../../utils/formatters';

const MetricCard = ({ metricKey, value, amcName }) => {
  const label = METRIC_LABELS[metricKey] || metricKey;
  const isPercent = ['cagr', 'max_drawdown', 'volatility', 'alpha'].includes(metricKey);
  const formattedValue = isPercent ? formatPercent(value) : formatNumber(value);
  const colorClass = getMetricColor(metricKey, value);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <p className="text-sm text-gray-500 truncate">{amcName}</p>
      <p className="text-xs text-gray-400 mt-1">{label}</p>
      <p className={`text-2xl font-bold mt-2 ${colorClass}`}>
        {formattedValue}
      </p>
    </div>
  );
};

export default MetricCard;
