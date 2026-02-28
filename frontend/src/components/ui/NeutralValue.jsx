import { fmt2, fmtRatio } from '../../utils/formatters';

const NeutralValue = ({ value, isRatio = false }) => {
  if (value == null || isNaN(value)) return <span className="text-gray-400">N/A</span>;
  return <span className="font-semibold text-gray-800">{isRatio ? fmtRatio(value) : fmt2(value)}</span>;
};

export default NeutralValue;
