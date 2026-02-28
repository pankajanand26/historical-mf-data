import { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import {
  extractReturnDist,
  computeRetirementCorpus,
  runRetirementMonteCarlo,
  findSafeWithdrawalRate,
} from '../../../utils/sipUtils';
import { shortName, fmtLakh, fmt1 } from '../../../utils/formatters';
import { SectionHeader } from '../../ui';

/**
 * Retirement Corpus Simulator card.
 * Two-phase lifecycle planner:
 *   1. Accumulation — SIP + existing corpus → projected corpus at retirement
 *   2. Decumulation — Monte Carlo simulation of 30-year withdrawal sustainability
 */
const RetirementCard = ({ data, activeWindow }) => {
  // Accumulation inputs
  const [monthlySIP, setMonthlySIP]       = useState(20000);
  const [yearsToRetire, setYearsToRetire] = useState(25);
  const [currentCorpus, setCurrentCorpus] = useState(0);

  // Decumulation inputs
  const [withdrawal, setWithdrawal]       = useState(80000);
  const [retireDuration, setRetireDuration] = useState(30);
  const [inflation, setInflation]         = useState(6);
  const [equityAlloc, setEquityAlloc]     = useState(30);
  const [debtReturn, setDebtReturn]       = useState(6.5);

  // Simulation control
  const [mcRuns, setMcRuns]               = useState(500);
  const [corpusChoice, setCorpusChoice]   = useState('p50'); // which accumulated corpus to run MC on

  const avail  = useMemo(() => data?.benchmark_windows?.map((bw) => bw.window) ?? [], [data]);
  const curWin = avail.includes(activeWindow) ? activeWindow : avail[0] ?? '3y';
  const funds  = data?.funds ?? [];
  const primary = funds[0];

  const dist = useMemo(
    () => (primary ? extractReturnDist(data, primary.scheme_code, curWin) : []),
    [data, primary, curWin]
  );

  // --- Phase 1: Accumulation ---
  const corpus = useMemo(
    () =>
      dist.length
        ? computeRetirementCorpus(dist, monthlySIP, yearsToRetire, currentCorpus)
        : null,
    [dist, monthlySIP, yearsToRetire, currentCorpus]
  );

  const selectedCorpus = corpus ? corpus[corpusChoice] : 0;

  // --- Phase 2: Monte Carlo ---
  const mcResult = useMemo(() => {
    if (!dist.length || !selectedCorpus) return null;
    return runRetirementMonteCarlo(
      dist, selectedCorpus, withdrawal,
      retireDuration, debtReturn, equityAlloc, inflation, mcRuns
    );
  }, [dist, selectedCorpus, withdrawal, retireDuration, debtReturn, equityAlloc, inflation, mcRuns]);

  // --- Safe Withdrawal Rate ---
  const swr = useMemo(() => {
    if (!dist.length || !selectedCorpus) return null;
    return findSafeWithdrawalRate(
      dist, selectedCorpus, retireDuration,
      debtReturn, equityAlloc, inflation, 90, 300
    );
  }, [dist, selectedCorpus, retireDuration, debtReturn, equityAlloc, inflation]);

  if (!data?.funds?.length) return null;

  const successRate    = mcResult?.successRate ?? null;
  const successColor   = successRate == null ? '' : successRate >= 80 ? 'text-emerald-600' : successRate >= 60 ? 'text-amber-600' : 'text-red-500';
  const successBgColor = successRate == null ? '' : successRate >= 80 ? 'bg-emerald-50 border-emerald-200' : successRate >= 60 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';

  const requiredSWR = selectedCorpus ? +((withdrawal * 12 / selectedCorpus) * 100).toFixed(1) : 0;
  const swrDanger   = requiredSWR > (swr?.swrPct ?? Infinity) * 1.1;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold text-gray-900">
          Retirement Corpus Simulator
          <span className="ml-2 text-xs font-normal text-gray-400">
            ({curWin.toUpperCase()} window · {dist.length} obs)
          </span>
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Accumulation + decumulation lifecycle planner using Monte Carlo simulation ·{' '}
          {primary ? shortName(primary.scheme_name) : 'Select a fund'}
        </p>
      </div>

      {/* Inputs — two columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Accumulation */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide border-b pb-1">
            Accumulation
          </p>
          <InputRow label="Monthly SIP" prefix="₹" value={monthlySIP}
            onChange={(v) => setMonthlySIP(Math.max(500, v))} width="w-28" />
          <InputRow label="Years to retire" value={yearsToRetire}
            onChange={(v) => setYearsToRetire(Math.max(1, Math.min(40, v)))} width="w-16" />
          <InputRow label="Current corpus" prefix="₹" value={currentCorpus}
            onChange={(v) => setCurrentCorpus(Math.max(0, v))} width="w-32" />
        </div>

        {/* Decumulation */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide border-b pb-1">
            Decumulation
          </p>
          <InputRow label="Monthly withdrawal" prefix="₹" value={withdrawal}
            onChange={(v) => setWithdrawal(Math.max(500, v))} width="w-28" />
          <InputRow label="Retirement duration (yr)" value={retireDuration}
            onChange={(v) => setRetireDuration(Math.max(5, Math.min(50, v)))} width="w-16" />
          <InputRow label="Inflation (%)" value={inflation}
            onChange={(v) => setInflation(Math.max(0, Math.min(20, v)))} width="w-16" suffix="%" />
          <InputRow label="Equity allocation (%)" value={equityAlloc}
            onChange={(v) => setEquityAlloc(Math.max(0, Math.min(100, v)))} width="w-16" suffix="%" />
          <InputRow label="Debt return (%)" value={debtReturn}
            onChange={(v) => setDebtReturn(Math.max(0, Math.min(20, v)))} width="w-16" suffix="%" isFloat />
        </div>
      </div>

      {/* MC runs + corpus choice */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <span className="text-gray-500">MC runs</span>
        <input type="number" value={mcRuns}
          onChange={(e) => setMcRuns(Math.max(100, Math.min(2000, parseInt(e.target.value) || 500)))}
          className="w-20 px-2 py-1 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-blue-500"
        />
        <span className="text-gray-500 ml-2">Corpus basis</span>
        {['p10', 'p25', 'p50', 'p75', 'p90'].map((k) => (
          <button key={k} onClick={() => setCorpusChoice(k)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              corpusChoice === k ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-600 hover:border-blue-500'
            }`}>
            {k.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Phase 1 result */}
      {corpus && (
        <div>
          <SectionHeader
            title="Projected Corpus at Retirement"
            subtitle={`After ${yearsToRetire} years of ₹${monthlySIP.toLocaleString('en-IN')}/month SIP`}
          />
          <div className="grid grid-cols-5 gap-2 text-center">
            {[['P10', corpus.p10, false], ['P25', corpus.p25, false], ['P50', corpus.p50, true], ['P75', corpus.p75, false], ['P90', corpus.p90, false]].map(([label, val, highlight]) => (
              <div key={label}
                onClick={() => setCorpusChoice(label.toLowerCase())}
                className={`cursor-pointer rounded-lg p-3 border transition-all ${
                  corpusChoice === label.toLowerCase()
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-100 bg-gray-50 hover:border-blue-300'
                }`}>
                <p className={`text-[10px] font-semibold mb-1 ${highlight ? 'text-blue-600' : 'text-gray-500'}`}>{label}</p>
                <p className={`text-sm font-bold tabular-nums ${highlight ? 'text-blue-700' : 'text-gray-800'}`}>
                  {fmtLakh(val)}
                </p>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 mt-1 text-right">
            Click a scenario to run Monte Carlo on that corpus
          </p>
        </div>
      )}

      {/* Phase 2 — MC result */}
      {mcResult && (
        <>
          <div>
            <SectionHeader
              title="Retirement Viability"
              subtitle={`${mcRuns} Monte Carlo paths · ${retireDuration}Y retirement · ₹${withdrawal.toLocaleString('en-IN')}/month withdrawal · starting corpus ${fmtLakh(selectedCorpus)}`}
            />
            <div className={`rounded-xl border p-4 mb-4 ${successBgColor}`}>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className={`text-3xl font-bold tabular-nums ${successColor}`}>
                    {successRate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">success rate</p>
                </div>
                <div className="text-sm text-gray-700 space-y-0.5">
                  <p>
                    <span className="font-semibold text-emerald-600">
                      {Math.round((successRate / 100) * mcRuns).toLocaleString('en-IN')}
                    </span>{' '}
                    / {mcRuns} paths survived {retireDuration} years
                  </p>
                  {mcResult.avgDepletionYear && (
                    <p className="text-red-500">
                      Failed paths depleted at avg year {mcResult.avgDepletionYear.toFixed(0)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Fan chart */}
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={mcResult.fanChart} margin={{ top: 10, right: 20, bottom: 10, left: 60 }}>
                <defs>
                  <linearGradient id="retireGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false}
                  label={{ value: 'Year of retirement', position: 'insideBottom', offset: -5, fontSize: 11, fill: '#9ca3af' }} />
                <YAxis tickFormatter={(v) => fmtLakh(v)} tick={{ fontSize: 11, fill: '#6b7280' }}
                  tickLine={false} axisLine={false} width={55} />
                <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(v, name) => [fmtLakh(v), name]} />
                <ReferenceLine y={0} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 2"
                  label={{ value: 'Corpus depleted', fill: '#ef4444', fontSize: 10 }} />
                <Area type="monotone" dataKey="p10" stroke="none" fill="#dcfce7" fillOpacity={0.7} name="P10" />
                <Area type="monotone" dataKey="p25" stroke="none" fill="#bbf7d0" fillOpacity={0.7} name="P25" />
                <Area type="monotone" dataKey="p50" stroke="#22c55e" fill="url(#retireGrad)" strokeWidth={2} name="P50 (Median)" />
                <Area type="monotone" dataKey="p75" stroke="none" fill="#bbf7d0" fillOpacity={0.7} name="P75" />
                <Area type="monotone" dataKey="p90" stroke="none" fill="#dcfce7" fillOpacity={0.7} name="P90" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* SWR */}
          {swr && (
            <div className={`rounded-xl border p-4 space-y-2 ${swrDanger ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Safe Withdrawal Rate (90% confidence)
              </p>
              <div className="flex items-center gap-6 flex-wrap">
                <div>
                  <p className="text-xl font-bold text-emerald-600 tabular-nums">
                    {fmtLakh(swr.safeMonthlyWithdrawal)} / month
                  </p>
                  <p className="text-xs text-gray-500">{swr.swrPct}% SWR annual</p>
                </div>
                <div className={`text-sm ${swrDanger ? 'text-red-600' : 'text-gray-600'}`}>
                  <p>
                    Your target: ₹{withdrawal.toLocaleString('en-IN')}/month = {requiredSWR}% SWR
                    {swrDanger && (
                      <span className="ml-2 font-semibold">⚠ Above safe rate</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!dist.length && (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-500 text-sm">No return data available for the selected window.</p>
        </div>
      )}

      {/* Disclaimer */}
      <div className="text-xs text-gray-400 border-t border-gray-100 pt-3 space-y-1">
        <p>
          <strong>Note:</strong> Monte Carlo bootstraps from the fund's historical return distribution.
          Results depend on the selected corpus percentile. Past distributions do not guarantee future returns.
          Debt return is assumed constant. Consult a financial advisor before making retirement decisions.
        </p>
      </div>
    </div>
  );
};

// ─── Shared input row helper ──────────────────────────────────────────────────
const InputRow = ({ label, value, onChange, prefix, suffix, width = 'w-24', isFloat = false }) => (
  <div className="flex items-center gap-2">
    <span className="text-xs text-gray-500 w-40 flex-shrink-0">{label}</span>
    <div className="relative">
      {prefix && (
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">{prefix}</span>
      )}
      <input
        type="number"
        value={value}
        step={isFloat ? '0.1' : '1'}
        onChange={(e) => {
          const v = isFloat ? parseFloat(e.target.value) || 0 : parseInt(e.target.value) || 0;
          onChange(v);
        }}
        className={`${width} ${prefix ? 'pl-6' : 'px-2'} ${suffix ? 'pr-6' : 'pr-2'} py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
      />
      {suffix && (
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">{suffix}</span>
      )}
    </div>
  </div>
);

export default RetirementCard;
