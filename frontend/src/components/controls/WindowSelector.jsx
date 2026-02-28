const WINDOWS = [
  { id: '1y', label: '1Y' },
  { id: '3y', label: '3Y' },
  { id: '5y', label: '5Y' },
  { id: '10y', label: '10Y' },
];

const WindowSelector = ({ selected, onChange }) => {
  const toggle = (id) => {
    if (selected.includes(id)) {
      if (selected.length === 1) return; // keep at least one
      onChange(selected.filter((w) => w !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Rolling Windows</label>
      <div className="flex gap-2 flex-wrap">
        {WINDOWS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => toggle(id)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              selected.includes(id)
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default WindowSelector;
