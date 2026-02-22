const KPISummaryBar = ({ kpis }) => (
  <div className="border-b border-editorial-navy/10 bg-white">
    <div className="max-w-6xl mx-auto px-6 py-5 grid grid-cols-2 md:grid-cols-4 gap-6">
      {kpis.map((kpi, i) => (
        <div key={i} className="text-center">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-editorial-navy/40 mb-1">{kpi.label}</p>
          <p className={`font-serif text-2xl font-bold ${kpi.positive ? 'text-emerald-700' : 'text-red-600'}`}>
            {kpi.value}
          </p>
          <p className="text-xs text-editorial-navy/50 mt-0.5 truncate">{kpi.sub}</p>
        </div>
      ))}
    </div>
  </div>
);

export default KPISummaryBar;
