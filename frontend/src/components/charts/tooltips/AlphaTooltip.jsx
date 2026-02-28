import { fmt2 } from '../../../utils/formatters';

const AlphaTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const alpha = payload[0]?.value;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="text-gray-500 mb-1">{label}</p>
      <p className="text-gray-500">Alpha: <span className={`font-semibold ${alpha >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{alpha >= 0 ? '+' : ''}{fmt2(alpha)}</span></p>
    </div>
  );
};

export default AlphaTooltip;
