const PRESETS = [
  { id: '1y', label: '1Y' },
  { id: '3y', label: '3Y' },
  { id: '5y', label: '5Y' },
  { id: '10y', label: '10Y' },
  { id: 'all', label: 'All' },
  { id: 'custom', label: 'Custom' },
];

const DateRangePicker = ({
  preset,
  onPresetChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
    <div className="flex gap-1.5 flex-wrap mb-2">
      {PRESETS.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => onPresetChange(id)}
          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
            preset === id
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          {label}
        </button>
      ))}
    </div>

    {preset === 'custom' && (
      <div className="flex flex-col gap-2">
        <div>
          <label className="block text-xs text-gray-500 mb-0.5">From</label>
          <input
            type="date"
            value={startDate || ''}
            onChange={(e) => onStartDateChange(e.target.value || null)}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-0.5">To</label>
          <input
            type="date"
            value={endDate || ''}
            onChange={(e) => onEndDateChange(e.target.value || null)}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>
    )}
  </div>
);

export default DateRangePicker;
