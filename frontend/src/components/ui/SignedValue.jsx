import { fmt2, fmtRatio } from '../../utils/formatters';

const SignedValue = ({ value, isRatio = false }) => {
  if (value == null || isNaN(value)) return <span className="text-gray-400">N/A</span>;
  const formatted = isRatio ? fmtRatio(value) : fmt2(value);
  const positive = value >= 0;
  return (
    <span className={positive ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>
      {positive && value > 0 ? `+${formatted}` : formatted}
    </span>
  );
};

export default SignedValue;
