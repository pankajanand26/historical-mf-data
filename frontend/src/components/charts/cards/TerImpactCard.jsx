import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import { FUND_COLORS } from '../../../utils/constants';
import { fmtLakh, shortName } from '../../../utils/formatters';
import { sipFV } from '../../../utils/sipUtils';

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Compute corpus growth year-by-year for a given TER drag applied to gross return.
 *
 * @param {number} grossReturnPct   - Gross annual return as % (e.g. 12)
 * @param {number} terPct           - TER as % to deduct (e.g. 1.2)
 * @param {number} monthlySIP       - Monthly SIP in ₹ (0 for lumpsum)
 * @param {number} lumpsum          - One-time lumpsum in ₹ (0 for SIP-only)
 * @param {number} years            - Investment horizon in years
 * @returns {Array<{year, corpus, invested}>}
 */
function computeCorpusPath(grossReturnPct, terPct, monthlySIP, lumpsum, years) {
  const netReturn = (grossReturnPct - terPct) / 100;
  const result = [];
  for (let y = 0; y <= years; y++) {
    const months = y * 12;
    const sipCorpus = monthlySIP > 0 ? sipFV(netReturn, monthlySIP, months) : 0;
    const lumpCorpus = lumpsum > 0 ? lumpsum * Math.pow(1 + netReturn, y) : 0;
    const corpus = sipCorpus + lumpCorpus;
    const invested = monthlySIP * months + lumpsum;
    result.push({ year: y, corpus: Math.round(corpus), invested: Math.round(invested) });
  }
  return result;
}

// 5 distinct line colors for up to 3 TER comparisons + 2 funds if needed
const TER_COLORS = ['#2563eb', '#dc2626', '#d97706', '#7c3aed', '#db2777'];

const fmt2 = (v) => (v == null || isNaN(v) ? 'N/A' : `${Number(v).toFixed(2)}%`);

// ── Card component ────────────────────────────────────────────────────────────

/**
 * TER Impact Card (Feature 2)
 *
 * Shows how Total Expense Ratio drag compounds over time for a given
 * investment (SIP or lumpsum) across up to 3 configurable TER levels.
 * The actual TER of the selected fund(s) is pre-populated.
 */
const TerImpactCard = ({ data }) => {
  const funds = data?.funds ?? [];

  // Defaults: pre-populate first fund's TER if available
  const firstTer = funds[0]?.ter ?? 1.0;

  const [grossReturn, setGrossReturn] = useState(12);
  const [monthlySIP, setMonthlySIP]   = useState(10000);
  const [lumpsum, setLumpsum]         = useState(0);
  const [years, setYears]             = useState(20);

  // Up to 3 TER levels to compare
  const [ter1, setTer1] = useState(parseFloat((firstTer ?? 0.5).toFixed(2)));
  const [ter2, setTer2] = useState(parseFloat(((firstTer ?? 1.0) + 0.5).toFixed(2)));
  const [ter3, setTer3] = useState(parseFloat(((firstTer ?? 1.0) + 1.0).toFixed(2)));

  const terLevels = useMemo(
    () =>
      [
        { label: `TER ${ter1.toFixed(2)}%`, ter: ter1, color: TER_COLORS[0] },
        { label: `TER ${ter2.toFixed(2)}%`, ter: ter2, color: TER_COLORS[1] },
        { label: `TER ${ter3.toFixed(2)}%`, ter: ter3, color: TER_COLORS[2] },
      ].filter((t) => t.ter >= 0 && t.ter <= grossReturn),
    [ter1, ter2, ter3, grossReturn]
  );

  // Corpus paths per TER level
  const paths = useMemo(
    () =>
      terLevels.map((tl) =>
        computeCorpusPath(grossReturn, tl.ter, monthlySIP, lumpsum, years)
      ),
    [terLevels, grossReturn, monthlySIP, lumpsum, years]
  );

  // Merge into recharts data format: [{year, "TER X.XX%": corpus, invested}]
  const chartData = useMemo(() => {
    const rows = [];
    for (let y = 0; y <= years; y++) {
      const row = { year: y };
      terLevels.forEach((tl, i) => {
        row[tl.label] = paths[i][y]?.corpus ?? 0;
      });
      row['Invested'] = (paths[0][y]?.invested ?? 0);
      rows.push(row);
    }
    return rows;
  }, [years, terLevels, paths]);

  // Final corpus at end of horizon per level
  const finalCorpus = useMemo(
    () =>
      terLevels.map((tl, i) => ({
        ...tl,
        corpus: paths[i][years]?.corpus ?? 0,
      })),
    [terLevels, paths, years]
  );

  // Drag table: cost vs the lowest-TER scenario
  const baseLine = finalCorpus[0];
  const invested = chartData[years]?.Invested ?? 0;

  if (!data?.funds?.length) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold text-gray-900">
          Expense Ratio Impact
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          See how TER drag compounds and erodes wealth over time.
        </p>
      </div>

      {/* Fund TER badges */}
      {funds.some((f) => f.ter != null) && (
        <div className="flex flex-wrap gap-2">
          {funds.map((f, i) =>
            f.ter != null ? (
              <span
                key={f.scheme_code}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
                style={{ borderColor: FUND_COLORS[i % FUND_COLORS.length], color: FUND_COLORS[i % FUND_COLORS.length] }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: FUND_COLORS[i % FUND_COLORS.length] }}
                />
                {shortName(f.scheme_name)} — TER {f.ter.toFixed(2)}%
              </span>
            ) : null
          )}
        </div>
      )}

      {/* Controls */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-gray-500 uppercase tracking-wide">Gross Return %</span>
          <input
            type="number" min={1} max={50} step={0.5}
            value={grossReturn}
            onChange={(e) => setGrossReturn(parseFloat(e.target.value) || 12)}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-900 w-full focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-gray-500 uppercase tracking-wide">Monthly SIP ₹</span>
          <input
            type="number" min={0} step={1000}
            value={monthlySIP}
            onChange={(e) => setMonthlySIP(parseInt(e.target.value) || 0)}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-900 w-full focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-gray-500 uppercase tracking-wide">Lumpsum ₹</span>
          <input
            type="number" min={0} step={10000}
            value={lumpsum}
            onChange={(e) => setLumpsum(parseInt(e.target.value) || 0)}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-900 w-full focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-gray-500 uppercase tracking-wide">Horizon (years)</span>
          <input
            type="number" min={1} max={40} step={1}
            value={years}
            onChange={(e) => setYears(parseInt(e.target.value) || 20)}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-900 w-full focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </label>
      </div>

      {/* TER level inputs */}
      <div className="flex flex-wrap gap-4 items-end">
        {[
          { value: ter1, set: setTer1, color: TER_COLORS[0], label: 'TER Level 1 %' },
          { value: ter2, set: setTer2, color: TER_COLORS[1], label: 'TER Level 2 %' },
          { value: ter3, set: setTer3, color: TER_COLORS[2], label: 'TER Level 3 %' },
        ].map(({ value, set, color, label }) => (
          <label key={label} className="flex flex-col gap-1 w-32">
            <span className="text-[11px] uppercase tracking-wide" style={{ color }}>
              {label}
            </span>
            <input
              type="number" min={0} max={5} step={0.05}
              value={value}
              onChange={(e) => set(parseFloat(e.target.value) || 0)}
              className="border rounded px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-2"
              style={{ borderColor: color }}
            />
          </label>
        ))}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 12, bottom: 5, left: 16 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="#f0f0f0" />
          <XAxis
            dataKey="year"
            tickFormatter={(v) => `${v}Y`}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => fmtLakh(v)}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
            width={60}
          />
          <Tooltip
            formatter={(v, name) => [fmtLakh(v), name]}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <ReferenceLine
            y={0}
            stroke="#e5e7eb"
            strokeDasharray="4 2"
          />
          <Line
            type="monotone"
            dataKey="Invested"
            stroke="#9ca3af"
            strokeDasharray="5 3"
            dot={false}
            strokeWidth={1.5}
          />
          {terLevels.map((tl) => (
            <Line
              key={tl.label}
              type="monotone"
              dataKey={tl.label}
              stroke={tl.color}
              dot={false}
              strokeWidth={2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* Drag table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-200 text-left">
              <th className="pb-2 text-xs text-gray-500 font-medium uppercase tracking-wide">TER Level</th>
              <th className="pb-2 text-xs text-gray-500 font-medium uppercase tracking-wide text-right">Final Corpus</th>
              <th className="pb-2 text-xs text-gray-500 font-medium uppercase tracking-wide text-right">vs Lowest TER</th>
              <th className="pb-2 text-xs text-gray-500 font-medium uppercase tracking-wide text-right">Wealth Ratio</th>
            </tr>
          </thead>
          <tbody>
            {/* Invested row */}
            <tr className="border-b border-gray-100">
              <td className="py-2 text-gray-400 text-xs italic">Total Invested</td>
              <td className="py-2 text-right text-gray-500 font-mono text-sm">{fmtLakh(invested)}</td>
              <td className="py-2 text-right" />
              <td className="py-2 text-right" />
            </tr>
            {finalCorpus.map((tl, i) => {
              const drag = i === 0 ? 0 : baseLine.corpus - tl.corpus;
              const ratio = invested > 0 ? tl.corpus / invested : null;
              return (
                <tr key={tl.label} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 font-medium" style={{ color: tl.color }}>
                    {tl.label}
                  </td>
                  <td className="py-2 text-right font-mono text-gray-900">{fmtLakh(tl.corpus)}</td>
                  <td className={`py-2 text-right font-mono ${i === 0 ? 'text-gray-400' : 'text-red-600'}`}>
                    {i === 0 ? '—' : `−${fmtLakh(drag)}`}
                  </td>
                  <td className="py-2 text-right font-mono text-gray-700">
                    {ratio != null ? `${ratio.toFixed(2)}x` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Insight */}
      {finalCorpus.length >= 2 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-800">
          <span className="font-semibold">Drag insight: </span>
          Moving from a {fmt2(finalCorpus[0].ter)} TER fund to a {fmt2(finalCorpus[finalCorpus.length - 1].ter)} TER fund
          costs you {fmtLakh(finalCorpus[0].corpus - finalCorpus[finalCorpus.length - 1].corpus)} over {years} years
          at {fmt2(grossReturn)} gross return.
        </div>
      )}
    </div>
  );
};

export default TerImpactCard;
