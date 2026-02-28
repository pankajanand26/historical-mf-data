import { fmt2 } from '../../../utils/formatters';

const LineTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm max-w-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 py-0.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="text-gray-600 truncate">{entry.name}:</span>
          <span className="font-medium ml-auto pl-2">{fmt2(entry.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default LineTooltip;
