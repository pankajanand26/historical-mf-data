import { FUND_COLORS, BENCHMARK_COLOR, buildChartData, rfPeriodPct, computeAllStats, fmt2, fmtRatio } from '../../../shared/utils/chartUtils';

const FundDiffStrip = ({ funds, benchmark, data, darkMode }) => {
  // Derive quick stats from the first available window
  let stats = [];
  if (data?.benchmark_windows?.length > 0 && funds.length > 0) {
    const bw = data.benchmark_windows[0];
    const rfPct = rfPeriodPct(data.risk_free_rate ?? 0.065, bw.window_days ?? 365, 'absolute');
    const chartData = buildChartData(data.funds ?? [], bw, 'absolute');
    const allStats = computeAllStats(data.funds ?? [], chartData, rfPct);
    stats = allStats;
  }

  const base = darkMode
    ? 'bg-[#181825] border-b border-[#313244] text-[#cdd6f4]'
    : 'bg-slate-50 border-b border-slate-200 text-slate-700';

  return (
    <div className={`flex-shrink-0 h-9 flex items-center px-4 gap-4 overflow-x-auto thin-scrollbar ${base}`}>
      {/* Benchmark chip */}
      {benchmark && (
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: BENCHMARK_COLOR }} />
          <span className="text-[11px] font-medium opacity-70">{benchmark.scheme_name.split(' ').slice(0, 3).join(' ')}</span>
        </div>
      )}

      {/* Divider */}
      {benchmark && <div className="h-4 w-px bg-current opacity-10 flex-shrink-0" />}

      {/* Fund chips */}
      {funds.map((f, i) => {
        const s = stats.find((st) => st.fund.scheme_code === f.scheme_code);
        const alpha = s?.outperf?.avgAlpha;
        const sharpe = s?.vol?.sharpeFund;
        return (
          <div key={f.scheme_code} className="flex items-center gap-2 flex-shrink-0">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: FUND_COLORS[i % FUND_COLORS.length] }} />
            <span className="text-[11px] font-medium opacity-80">{f.scheme_name.split(' ').slice(0, 3).join(' ')}…</span>
            {alpha != null && !isNaN(alpha) && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${alpha >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                α {fmt2(alpha)}
              </span>
            )}
            {sharpe != null && !isNaN(sharpe) && (
              <span className="text-[10px] text-current opacity-50">S: {fmtRatio(sharpe)}</span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default FundDiffStrip;
