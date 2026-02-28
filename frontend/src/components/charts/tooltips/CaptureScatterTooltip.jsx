import { fmt2 } from '../../../utils/formatters';

const CaptureScatterTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const alpha = d.y - d.x;
  const quadrant = d.x > 0
    ? (d.y > d.x ? 'Up market — outperformed' : 'Up market — underperformed')
    : (d.y > d.x ? 'Down market — protected' : 'Down market — amplified');
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm max-w-xs">
      <p className="text-gray-500">Benchmark: <span className="font-medium text-gray-800">{fmt2(d.x)}</span></p>
      <p className="text-gray-500">Fund: <span className="font-medium text-gray-800">{fmt2(d.y)}</span></p>
      <p className="text-gray-500">Alpha: <span className={`font-medium ${alpha >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{alpha >= 0 ? '+' : ''}{fmt2(alpha)}</span></p>
      <p className="text-xs text-gray-400 mt-1">{quadrant}</p>
    </div>
  );
};

export default CaptureScatterTooltip;
