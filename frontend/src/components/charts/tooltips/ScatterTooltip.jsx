import { fmt2, fmtRatio } from '../../../utils/formatters';

const ScatterTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-800 mb-1">{d.name}</p>
      <p className="text-gray-500">Risk (Std Dev): <span className="font-medium text-gray-800">{fmt2(d.x)}</span></p>
      <p className="text-gray-500">Return (Mean): <span className="font-medium text-gray-800">{fmt2(d.y)}</span></p>
      {d.sharpe != null && !isNaN(d.sharpe) && (
        <p className="text-gray-500">Sharpe: <span className="font-medium text-gray-800">{fmtRatio(d.sharpe)}</span></p>
      )}
    </div>
  );
};

export default ScatterTooltip;
