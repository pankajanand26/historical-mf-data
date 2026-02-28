/**
 * ArenaChart — Concept 6: Head-to-Head Arena (Fund Switcher)
 * Sports-style bracket: rounds = metric dimensions, winner gets a badge.
 * Aggregate leaderboard at the bottom.
 */
import { useState, useMemo } from 'react';
import {
  buildChartData, computeAllStats, computeFundScores,
  fmt2, fmtRatio, shortName, FUND_COLORS,
} from '../../../shared/utils/chartUtils';

const ROUNDS = [
  { id: 'returns',     label: '01 RETURNS',      desc: 'Avg Alpha vs Benchmark',    format: (s) => fmt2(s?.raw?.raw?.returns),      better: 'higher' },
  { id: 'risk',        label: '02 RISK-ADJ.',     desc: 'Sharpe Ratio',              format: (s) => fmtRatio(s?.raw?.raw?.risk),     better: 'higher' },
  { id: 'consistency', label: '03 CONSISTENCY',  desc: 'Beat Rate %',               format: (s) => s?.raw?.raw?.consistency != null ? `${s.raw.raw.consistency.toFixed(1)}%` : 'N/A', better: 'higher' },
  { id: 'capture',     label: '04 CAPTURE',      desc: 'UCR / DCR Ratio',           format: (s) => fmtRatio(s?.raw?.raw?.capture),  better: 'higher' },
  { id: 'drawdown',    label: '05 DRAWDOWN',     desc: 'Max DD (less negative wins)', format: (s) => s?.raw?.raw?.drawdown != null ? `${s.raw.raw.drawdown.toFixed(1)}%` : 'N/A', better: 'higher' },
];

const Medal = ({ rank }) => {
  if (rank === 1) return <span className="text-xl">🥇</span>;
  if (rank === 2) return <span className="text-xl">🥈</span>;
  if (rank === 3) return <span className="text-xl">🥉</span>;
  return <span className="text-xl text-slate-600">#{rank}</span>;
};

const ArenaChart = ({ data, analyticsData, loading, error, selectedFunds }) => {
  const [activeWindow, setActiveWindow] = useState(null);
  const [expandedRound, setExpandedRound] = useState(null);

  const activeWin = useMemo(() => {
    if (!data?.benchmark) return null;
    const wins = data.benchmark.windows;
    if (!wins?.length) return null;
    const target = activeWindow ?? wins[0].window;
    return wins.find((w) => w.window === target) ?? wins[0];
  }, [data, activeWindow]);

  const chartData = useMemo(() => {
    if (!data || !activeWin) return [];
    return buildChartData(data.funds ?? [], activeWin, 'cagr');
  }, [data, activeWin]);

  const allStats = useMemo(() => {
    if (!chartData.length || !data?.funds?.length) return [];
    return computeAllStats(data.funds, chartData, 0.065 * (activeWin?.window_days ?? 1095) / 365);
  }, [chartData, data, activeWin]);

  const scored = useMemo(() => {
    if (!allStats.length) return [];
    return computeFundScores(allStats, analyticsData);
  }, [allStats, analyticsData]);

  // Count round wins per fund
  const roundWins = useMemo(() => {
    const wins = {};
    scored.forEach((s) => { wins[s.fund.scheme_code] = 0; });
    for (const round of ROUNDS) {
      let bestScore = -Infinity, bestCode = null;
      scored.forEach((s) => {
        const sc = s.scores[round.id];
        if (sc != null && sc > bestScore) { bestScore = sc; bestCode = s.fund.scheme_code; }
      });
      if (bestCode) wins[bestCode] = (wins[bestCode] ?? 0) + 1;
    }
    return wins;
  }, [scored]);

  // Leaderboard sorted by wins then overall score
  const leaderboard = useMemo(() => {
    return [...scored].sort((a, b) => {
      const wa = roundWins[a.fund.scheme_code] ?? 0;
      const wb = roundWins[b.fund.scheme_code] ?? 0;
      if (wb !== wa) return wb - wa;
      return (b.overall ?? 0) - (a.overall ?? 0);
    });
  }, [scored, roundWins]);

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-slate-950">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm font-mono">LOADING ARENA…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex-1 flex items-center justify-center bg-slate-950">
      <div className="bg-red-950 border border-red-800 rounded-xl px-6 py-4 text-center">
        <p className="text-red-400 text-sm font-mono">{error}</p>
      </div>
    </div>
  );

  if (!data || !scored.length) return (
    <div className="flex-1 flex items-center justify-center bg-slate-950 flex-col gap-4">
      <div className="text-4xl">⚔️</div>
      <p className="text-slate-500 text-sm font-mono">ADD FUNDS & RUN TO BEGIN THE ARENA</p>
      <p className="text-slate-600 text-xs font-mono">Load 2+ funds to compare head-to-head</p>
    </div>
  );

  const windows = data.benchmark?.windows ?? [];

  return (
    <div className="flex-1 overflow-auto bg-slate-950 p-6">
      {/* Window selector */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-xs text-slate-500 font-mono uppercase tracking-widest">Window:</span>
        {windows.map((w) => (
          <button key={w.window} onClick={() => setActiveWindow(w.window)}
            className={`px-3 py-1 text-xs rounded font-mono font-bold transition-colors ${activeWin?.window === w.window ? 'bg-red-600 text-white' : 'border border-slate-700 text-slate-500 hover:border-red-700 hover:text-red-400'}`}>
            {w.window.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="max-w-4xl mx-auto space-y-3">
        {/* Rounds */}
        {ROUNDS.map((round, ri) => {
          // Find winner for this round
          let bestScore = -Infinity, winnerIdx = -1;
          scored.forEach((s, i) => {
            const sc = s.scores[round.id];
            if (sc != null && sc > bestScore) { bestScore = sc; winnerIdx = i; }
          });

          return (
            <div key={round.id} className="border border-slate-800 rounded-xl overflow-hidden">
              {/* Round header */}
              <button className="w-full flex items-center gap-4 px-5 py-3 bg-slate-900 hover:bg-slate-800 transition-colors text-left"
                onClick={() => setExpandedRound(expandedRound === ri ? null : ri)}>
                <span className="text-xs font-mono font-bold text-red-500 tracking-widest">{round.label}</span>
                <span className="text-xs text-slate-500">{round.desc}</span>
                {winnerIdx >= 0 && (
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-xs text-slate-400">Winner:</span>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: FUND_COLORS[winnerIdx] }} />
                    <span className="text-xs font-semibold text-slate-200">{shortName(scored[winnerIdx]?.fund?.scheme_name, 20)}</span>
                    <span className="text-yellow-400 text-sm ml-1">★</span>
                  </div>
                )}
                <svg className={`w-4 h-4 text-slate-600 ml-2 transition-transform ${expandedRound === ri ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Expanded: side-by-side comparison */}
              {expandedRound === ri && (
                <div className="bg-slate-950 px-5 py-4">
                  <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${scored.length}, 1fr)` }}>
                    {scored.map((s, fi) => {
                      const isWinner = fi === winnerIdx;
                      return (
                        <div key={s.fund.scheme_code}
                          className={`rounded-lg border p-4 text-center transition-all ${isWinner ? 'border-yellow-500/50 bg-yellow-950/30' : 'border-slate-800 bg-slate-900'}`}>
                          <div className="flex items-center justify-center gap-2 mb-3">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: FUND_COLORS[fi] }} />
                            <span className="text-xs font-medium text-slate-300 truncate max-w-[120px]">
                              {shortName(s.fund.scheme_name, 20)}
                            </span>
                            {isWinner && <span className="text-yellow-400 text-sm">★</span>}
                          </div>
                          <div className="text-xl font-bold font-mono" style={{ color: FUND_COLORS[fi] }}>
                            {round.format(s)}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-1">
                            Score: {s.scores[round.id] != null ? Math.round(s.scores[round.id]) : 'N/A'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Leaderboard */}
        <div className="mt-6 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-800 bg-slate-800/50">
            <h3 className="text-xs font-mono font-bold text-red-500 tracking-widest">FINAL LEADERBOARD</h3>
          </div>
          <div className="divide-y divide-slate-800">
            {leaderboard.map((s, rank) => (
              <div key={s.fund.scheme_code} className="flex items-center gap-4 px-5 py-4">
                <Medal rank={rank + 1} />
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                <span className="flex-1 text-sm text-slate-200">{shortName(s.fund.scheme_name, 40)}</span>
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <div className="text-xs text-slate-500">Round Wins</div>
                    <div className="text-lg font-bold text-yellow-400">{roundWins[s.fund.scheme_code] ?? 0}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-slate-500">Overall Score</div>
                    <div className="text-lg font-bold text-slate-200">{s.overall != null ? Math.round(s.overall) : 'N/A'}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArenaChart;
