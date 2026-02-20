import Select from 'react-select';
import { DATE_PRESETS, PLAN_TYPES } from '../../utils/constants';

const AMCSelector = ({
  amcs,
  selectedAmcs,
  onAmcChange,
  categories,
  selectedCategory,
  onCategoryChange,
  datePreset,
  onDatePresetChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  planType,
  onPlanTypeChange,
  onAnalyze,
  loading,
}) => {
  const amcOptions = amcs.map((amc) => ({
    value: amc.name,
    label: `${amc.name} (${amc.scheme_count} schemes)`,
  }));

  const categoryOptions = [
    { value: null, label: 'All Categories' },
    ...categories.map((cat) => ({
      value: cat.name,
      label: cat.name,
    })),
  ];

  const selectedOptions = selectedAmcs.map((name) => amcOptions.find((opt) => opt.value === name)).filter(Boolean);

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select AMCs
        </label>
        <Select
          isMulti
          options={amcOptions}
          value={selectedOptions}
          onChange={(selected) => onAmcChange(selected.map((s) => s.value))}
          placeholder="Search and select AMCs..."
          className="react-select-container"
          classNamePrefix="react-select"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category
          </label>
          <Select
            options={categoryOptions}
            value={categoryOptions.find((opt) => opt.value === selectedCategory)}
            onChange={(selected) => onCategoryChange(selected?.value)}
            placeholder="Select category..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Plan Type
          </label>
          <Select
            options={PLAN_TYPES}
            value={PLAN_TYPES.find((opt) => opt.value === planType)}
            onChange={(selected) => onPlanTypeChange(selected?.value)}
            placeholder="Select plan type..."
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Time Period
        </label>
        <div className="flex gap-2 flex-wrap">
          {DATE_PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => onDatePresetChange(preset.value)}
              className={`px-3 py-1 rounded text-sm ${
                datePreset === preset.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {datePreset === 'custom' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={startDate || ''}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={endDate || ''}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
        </div>
      )}

      <button
        onClick={onAnalyze}
        disabled={loading || selectedAmcs.length === 0}
        className={`w-full py-2 px-4 rounded font-medium ${
          loading || selectedAmcs.length === 0
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {loading ? 'Analyzing...' : 'Analyze'}
      </button>
    </div>
  );
};

export default AMCSelector;
