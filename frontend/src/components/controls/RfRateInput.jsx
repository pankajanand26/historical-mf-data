import { useState, useEffect } from 'react';

/**
 * Risk-free rate input control for Sharpe/Sortino calculations.
 * Default: 6.5% (typical Indian risk-free rate)
 */
const RfRateInput = ({ value, onChange }) => {
  const [localValue, setLocalValue] = useState(value * 100);

  // Sync local state when prop changes (convert decimal → display %)
  useEffect(() => {
    setLocalValue(value * 100);
  }, [value]);

  const handleBlur = () => {
    // Clamp between 0 and 20%
    const clamped = Math.max(0, Math.min(20, parseFloat(localValue) || 0));
    setLocalValue(clamped);
    onChange(clamped / 100); // convert display % → decimal for internal state
  };

  const handleChange = (e) => {
    setLocalValue(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur();
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Risk-Free Rate (%)
      </label>
      <div className="relative">
        <input
          type="number"
          min="0"
          max="20"
          step="0.1"
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg 
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                     transition-colors bg-white"
          placeholder="6.5"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
          %
        </span>
      </div>
      <p className="text-xs text-gray-400 mt-1">
        Used for Sharpe & Sortino ratios
      </p>
    </div>
  );
};

export default RfRateInput;
