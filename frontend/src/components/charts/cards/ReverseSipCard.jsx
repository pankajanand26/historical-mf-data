import { useState, useMemo } from 'react';
import {
  extractReturnDist,
  computeReverseSipScenarios,
  sipSensitivity,
} from '../../../utils/sipUtils';
import { shortName, fmtLakh, fmt1 } from '../../../utils/formatters';
import { FUND_COLORS } from '../../../utils/constants';
import { SectionHeader } from '../../ui';

/**
 * Reverse SIP Calculator card.
 * Given a target corpus and time horizon, shows required monthly SIP per
 * percentile of the fund's historical return distribution.
 * Also includes a sensitivity tool: "if I can only invest ₹X/month, what
 * return do I need, and how often did this fund actually deliver that?"
 */
const ReverseSipCard = ({ data, activeWindow }) => {
  const [target, setTarget]         = useState(2500000);
  const [years, setYears]           = useState(10);
  const [sensitivitySIP, setSensitivitySIP] = useState(8000);

  const avail = useMemo(
    () => data?.benchmark_windows?.map((bw) => bw.window) ?? [],
    [data]
  );
  const curWin = avail.includes(activeWindow) ? activeWindow : avail[0] ?? '3y';
  const funds = data?.funds ?? [];

  // Use first fund (primary fund) for the main table
  const primaryFund = funds[0];
  const primaryDist = useMemo(
    () => (primaryFund ? extractReturnDist(data, primaryFund.scheme_code, curWin) : []),
    [data, primaryFund, curWin]
  );

  const scenarios = useMemo(
    () => (primaryDist.length ? computeReverseSipScenarios(primaryDist, target, years) : []),
    [primaryDist, target, years]
  );

  const sensitivity = useMemo(
    () =>
      primaryDist.length
        ? sipSensitivity(primaryDist, sensitivitySIP, years, target)
        : null,
    [primaryDist, sensitivitySIP, years, target]
  );

  // Per-fund scenarios for comparison table (P50 only)
  const fundScenarios = useMemo(
    () =>
      funds.map((fund, i) => {
        const dist = extractReturnDist(data, fund.scheme_code, curWin);
        const rows = dist.length ? computeReverseSipScenarios(dist, target, years) : [];
        const p50  = rows.find((r) => r.label === 'P50');
        return {
          fund,
          color: FUND_COLORS[i % FUND_COLORS.length],
          p50,
          observations: dist.length,
        };
      }),
    [data, funds, target, years, curWin]
  );

  if (!data?.funds?.length) return null;

  const hitBarWidth = sensitivity ? Math.max(2, Math.min(100, sensitivity.hitRatePct)) : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold text-gray-900">
          Reverse SIP Calculator
          <span className="ml-2 text-xs font-normal text-gray-400">
            ({curWin.toUpperCase()} window)
          </span>
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          "How much do I need to invest monthly to reach my goal?" — anchored to
          fund's historical return distribution
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Target */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Target</span>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
            <input
              type="number"
              value={target}
              onChange={(e) => setTarget(Math.max(10000, parseInt(e.target.value) || 10000))}
              className="w-32 pl-6 pr-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        {/* Horizon */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Years</span>
          <input
            type="number"
            value={years}
            onChange={(e) => setYears(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))}
            className="w-16 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
          />
        </div>
      </div>

      {/* Scenarios table */}
      <div>
        <SectionHeader
          title="Required Monthly SIP"
          subtitle={
            primaryFund
              ? `Based on ${primaryDist.length} observations · ${shortName(primaryFund.scheme_name)} · ${curWin.toUpperCase()} rolling window`
              : 'Select a fund to view scenarios'
          }
        />
        {scenarios.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left font-medium text-gray-500 pb-2 pr-4">Scenario</th>
                  <th className="text-right font-medium text-gray-500 pb-2 px-3">CAGR</th>
                  <th className="text-right font-medium text-gray-500 pb-2 px-3">SIP / month</th>
                  <th className="text-right font-medium text-gray-500 pb-2 px-3">Total Invested</th>
                  <th className="text-right font-medium text-gray-500 pb-2 px-3">Gain</th>
                  <th className="text-right font-medium text-gray-500 pb-2 pl-3">Multiple</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {scenarios.map((row) => {
                  const isBase = row.label === 'P50';
                  return (
                    <tr
                      key={row.label}
                      className={`transition-colors ${isBase ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'}`}
                    >
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-xs font-semibold ${
                              row.isBear
                                ? 'bg-red-100 text-red-700'
                                : row.isBull
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {row.label}
                          </span>
                          {isBase && (
                            <span className="text-[10px] text-blue-500 font-medium">◄ Base</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right text-gray-700">
                        {fmt1(row.annualReturnPct)}
                      </td>
                      <td className={`py-3 px-3 text-right font-semibold ${isBase ? 'text-blue-700' : 'text-gray-800'}`}>
                        ₹{row.requiredSIP.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-right text-gray-600">
                        {fmtLakh(row.totalInvested)}
                      </td>
                      <td className={`py-3 px-3 text-right font-medium ${row.totalGain >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {row.totalGain >= 0 ? '+' : ''}{fmtLakh(row.totalGain)}
                      </td>
                      <td className="py-3 pl-3 text-right text-gray-500">
                        {row.wealthMultiple}x
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <p className="text-gray-500 text-sm">No data available for the selected window.</p>
          </div>
        )}
      </div>

      {/* Sensitivity tool */}
      {primaryDist.length > 0 && (
        <div className="border border-gray-200 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Sensitivity — What if I can only invest…
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
              <input
                type="number"
                value={sensitivitySIP}
                onChange={(e) =>
                  setSensitivitySIP(Math.max(500, parseInt(e.target.value) || 500))
                }
                className="w-28 pl-6 pr-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <span className="text-xs text-gray-500">/ month</span>
          </div>

          {sensitivity && (
            <div className="space-y-2">
              <p className="text-sm text-gray-700">
                You need a CAGR of{' '}
                <span className="font-semibold text-blue-700">
                  {sensitivity.requiredReturnPct.toFixed(1)}%
                </span>
              </p>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      sensitivity.hitRatePct >= 60
                        ? 'bg-emerald-500'
                        : sensitivity.hitRatePct >= 30
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                    }`}
                    style={{ width: `${hitBarWidth}%` }}
                  />
                </div>
                <span
                  className={`text-sm font-semibold tabular-nums w-12 text-right ${
                    sensitivity.hitRatePct >= 60
                      ? 'text-emerald-600'
                      : sensitivity.hitRatePct >= 30
                        ? 'text-amber-600'
                        : 'text-red-500'
                  }`}
                >
                  {sensitivity.hitRatePct.toFixed(0)}%
                </span>
                <span className="text-xs text-gray-500">of historical periods delivered this</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fund comparison at P50 */}
      {funds.length > 1 && (
        <div>
          <SectionHeader
            title="Fund Comparison — Base (P50) Required SIP"
            subtitle={`At ${years}Y horizon to reach ${fmtLakh(target)}`}
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left font-medium text-gray-500 pb-2 pr-4">Fund</th>
                  <th className="text-right font-medium text-gray-500 pb-2 px-3">CAGR (P50)</th>
                  <th className="text-right font-medium text-gray-500 pb-2 px-3">SIP / month</th>
                  <th className="text-right font-medium text-gray-500 pb-2 px-3">Total Invested</th>
                  <th className="text-right font-medium text-gray-500 pb-2 pl-3">Obs.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {fundScenarios.map(({ fund, color, p50, observations }) => (
                  <tr key={fund.scheme_code} className="hover:bg-gray-50">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span
                          className="font-medium text-gray-800 truncate max-w-[200px]"
                          title={fund.scheme_name}
                        >
                          {shortName(fund.scheme_name)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right text-gray-600">
                      {p50 ? fmt1(p50.annualReturnPct) : '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-emerald-700">
                      {p50 ? `₹${p50.requiredSIP.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="py-3 px-3 text-right text-gray-600">
                      {p50 ? fmtLakh(p50.totalInvested) : '—'}
                    </td>
                    <td className="py-3 pl-3 text-right text-gray-400">{observations}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="text-xs text-gray-400 border-t border-gray-100 pt-3 space-y-1">
        <p>
          <strong>Note:</strong> Scenarios use the fund's historical rolling return
          distribution. P10 = pessimistic (only 10% of periods were worse), P50 = median,
          P90 = optimistic. Past distributions do not guarantee future returns.
        </p>
      </div>
    </div>
  );
};

export default ReverseSipCard;
