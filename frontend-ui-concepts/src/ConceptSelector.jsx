const CONCEPTS = [
  {
    id: 1,
    name: 'Terminal',
    tagline: 'Dark · Data-Dense · Bloomberg-style',
    description: 'Near-black background, monospace numbers, amber accents. All controls in a sticky top bar. Maximum data density.',
    accent: '#f59e0b',
    badge: 'DIY',
    badgeBg: '#1a2332',
    badgeText: '#f59e0b',
    group: 'Power User',
  },
  {
    id: 2,
    name: 'Analyst Workbench',
    tagline: 'Dark · Gauges · Tabbed Deep-Dive',
    description: 'Sidebar with circular score gauges. Five tabs (Summary / Returns / Risk / Capture / Drawdown). Expandable full-metric rows.',
    accent: '#818cf8',
    badge: 'DIY',
    badgeBg: '#1e1b4b',
    badgeText: '#818cf8',
    group: 'DIY Investor',
  },
  {
    id: 3,
    name: 'Heatmap Scorecard',
    tagline: 'Light · Color Grid · At-a-glance',
    description: 'White canvas, color-coded fund × metric grid. Crown badge on the best fund per column. Click any row to expand full metrics.',
    accent: '#0891b2',
    badge: 'DIY',
    badgeBg: '#ecfeff',
    badgeText: '#0891b2',
    group: 'DIY Investor',
  },
  {
    id: 4,
    name: 'Goal Projector',
    tagline: 'Light · Fan Chart · SIP Planning',
    description: 'Configure SIP amount, horizon, and target corpus. Fan chart shows P10–P90 projection bands. Probability-of-reaching-target per fund.',
    accent: '#10b981',
    badge: 'Goal',
    badgeBg: '#ecfdf5',
    badgeText: '#059669',
    group: 'Goal-Based Investor',
  },
  {
    id: 5,
    name: 'Milestone Tracker',
    tagline: 'Light · Growth Curve · Hit Rates',
    description: 'Set multiple corpus milestones. Growth curve chart with milestone target lines. Hit-rate matrix shows % of historical windows that met each milestone.',
    accent: '#f59e0b',
    badge: 'Goal',
    badgeBg: '#fffbeb',
    badgeText: '#d97706',
    group: 'Goal-Based Investor',
  },
  {
    id: 6,
    name: 'Head-to-Head Arena',
    tagline: 'Dark · 5 Rounds · Leaderboard',
    description: 'Slate-950 background. Five metric dimensions become five rounds. Expandable per-round comparison. Final leaderboard with round wins tally.',
    accent: '#ef4444',
    badge: 'Switch',
    badgeBg: '#1c0606',
    badgeText: '#ef4444',
    group: 'Fund Switcher',
  },
  {
    id: 7,
    name: 'Switch Advisor',
    tagline: 'Light · Delta Chips · Switch Score',
    description: 'Select your current fund. Ranked alternatives with Δ-delta chips per dimension. Switch Score = average delta across all dimensions.',
    accent: '#7c3aed',
    badge: 'Switch',
    badgeBg: '#f5f3ff',
    badgeText: '#7c3aed',
    group: 'Fund Switcher',
  },
];

// Preview SVG thumbnails — abstract representations of each layout
const PreviewThumbnail = ({ id }) => {
  // 1 — Terminal (dark, amber)
  if (id === 1) return (
    <svg viewBox="0 0 280 160" className="w-full h-full">
      <rect width="280" height="160" fill="#0d1117" />
      <rect y="0" width="280" height="28" fill="#161b22" />
      <rect x="8" y="8" width="60" height="12" rx="2" fill="#f59e0b" opacity="0.9" />
      <rect x="80" y="10" width="40" height="8" rx="2" fill="#30363d" />
      <rect x="128" y="10" width="40" height="8" rx="2" fill="#30363d" />
      <rect x="176" y="10" width="40" height="8" rx="2" fill="#30363d" />
      <rect x="230" y="8" width="40" height="12" rx="2" fill="#f59e0b" opacity="0.7" />
      <rect x="8" y="36" width="264" height="90" rx="2" fill="#161b22" />
      <polyline points="20,110 60,85 100,95 140,65 180,75 220,50 260,60" stroke="#f59e0b" strokeWidth="2" fill="none" />
      <polyline points="20,115 60,100 100,108 140,85 180,90 220,75 260,80" stroke="#22c55e" strokeWidth="1.5" fill="none" strokeDasharray="4 2" />
      <rect x="8" y="134" width="50" height="18" rx="2" fill="#f59e0b" opacity="0.3" />
      <rect x="66" y="134" width="50" height="18" rx="2" fill="#30363d" />
      <rect x="124" y="134" width="50" height="18" rx="2" fill="#30363d" />
      <rect x="182" y="134" width="50" height="18" rx="2" fill="#30363d" />
    </svg>
  );

  // 2 — Analyst Workbench (slate-900, indigo gauges, tabs)
  if (id === 2) return (
    <svg viewBox="0 0 280 160" className="w-full h-full">
      <rect width="280" height="160" fill="#0f172a" />
      {/* Top bar */}
      <rect width="280" height="26" fill="#1e293b" />
      <rect x="8" y="7" width="50" height="12" rx="2" fill="#818cf8" opacity="0.85" />
      <rect x="70" y="9" width="35" height="8" rx="2" fill="#334155" />
      <rect x="113" y="9" width="35" height="8" rx="2" fill="#334155" />
      <rect x="240" y="8" width="32" height="10" rx="2" fill="#818cf8" opacity="0.5" />
      {/* Sidebar */}
      <rect x="0" y="26" width="72" height="134" fill="#1e293b" />
      {/* Circular gauges in sidebar */}
      <circle cx="36" cy="55" r="18" fill="none" stroke="#334155" strokeWidth="5" />
      <circle cx="36" cy="55" r="18" fill="none" stroke="#818cf8" strokeWidth="5" strokeDasharray="85 28" strokeDashoffset="7" strokeLinecap="round" />
      <circle cx="36" cy="90" r="14" fill="none" stroke="#334155" strokeWidth="4" />
      <circle cx="36" cy="90" r="14" fill="none" stroke="#6ee7b7" strokeWidth="4" strokeDasharray="66 22" strokeDashoffset="5" strokeLinecap="round" />
      <circle cx="36" cy="120" r="14" fill="none" stroke="#334155" strokeWidth="4" />
      <circle cx="36" cy="120" r="14" fill="none" stroke="#fbbf24" strokeWidth="4" strokeDasharray="55 33" strokeDashoffset="5" strokeLinecap="round" />
      {/* Main panel — tabs */}
      <rect x="78" y="26" width="202" height="134" fill="#0f172a" />
      <rect x="78" y="26" width="40" height="18" rx="0" fill="#818cf8" opacity="0.25" />
      <rect x="120" y="26" width="40" height="18" rx="0" fill="none" />
      <rect x="162" y="26" width="40" height="18" rx="0" fill="none" />
      <rect x="204" y="26" width="40" height="18" rx="0" fill="none" />
      {/* Tab indicator */}
      <rect x="78" y="42" width="40" height="2" fill="#818cf8" />
      {/* Content rows */}
      <rect x="84" y="54" width="180" height="10" rx="2" fill="#1e293b" />
      <rect x="84" y="54" width="120" height="10" rx="2" fill="#818cf8" opacity="0.15" />
      <rect x="84" y="70" width="180" height="10" rx="2" fill="#1e293b" />
      <rect x="84" y="86" width="180" height="10" rx="2" fill="#1e293b" />
      <rect x="84" y="102" width="180" height="10" rx="2" fill="#1e293b" />
      <rect x="84" y="118" width="180" height="10" rx="2" fill="#1e293b" />
    </svg>
  );

  // 3 — Heatmap Scorecard (white, cyan, color grid)
  if (id === 3) return (
    <svg viewBox="0 0 280 160" className="w-full h-full">
      <rect width="280" height="160" fill="#f8fafc" />
      {/* Header */}
      <rect width="280" height="26" fill="#0f172a" />
      <rect x="8" y="7" width="55" height="12" rx="2" fill="#0891b2" opacity="0.9" />
      <rect x="72" y="9" width="35" height="8" rx="2" fill="#334155" />
      <rect x="115" y="9" width="35" height="8" rx="2" fill="#334155" />
      {/* Column headers */}
      <rect x="80" y="34" width="36" height="12" rx="2" fill="#e2e8f0" />
      <rect x="122" y="34" width="36" height="12" rx="2" fill="#e2e8f0" />
      <rect x="164" y="34" width="36" height="12" rx="2" fill="#e2e8f0" />
      <rect x="206" y="34" width="36" height="12" rx="2" fill="#e2e8f0" />
      <rect x="248" y="34" width="24" height="12" rx="2" fill="#e2e8f0" />
      {/* Fund rows */}
      {[52, 72, 92, 112, 132].map((y, ri) => (
        <g key={ri}>
          <rect x="4" y={y} width="72" height="16" rx="2" fill="#f1f5f9" />
          {/* heatmap cells — vary colors per row */}
          {[[80, '#16a34a'], [122, '#22c55e'], [164, '#fbbf24'], [206, '#ef4444'], [248, '#10b981']].map(([x, col], ci) => (
            <rect key={ci} x={x} y={y} width="36" height="16" rx="2"
              fill={col} opacity={0.15 + ((ri + ci) % 3) * 0.2} />
          ))}
        </g>
      ))}
      {/* Crown badge on best column */}
      <text x="88" y="49" fontSize="8" fill="#f59e0b">♛</text>
      <text x="172" y="49" fontSize="8" fill="#f59e0b">♛</text>
    </svg>
  );

  // 4 — Goal Projector (light, emerald fan chart)
  if (id === 4) return (
    <svg viewBox="0 0 280 160" className="w-full h-full">
      <rect width="280" height="160" fill="#f8fafc" />
      {/* Header */}
      <rect width="280" height="26" fill="#0f172a" />
      <rect x="8" y="7" width="60" height="12" rx="2" fill="#10b981" opacity="0.9" />
      <rect x="76" y="9" width="35" height="8" rx="2" fill="#334155" />
      {/* Left panel */}
      <rect x="0" y="26" width="80" height="134" fill="#f1f5f9" />
      <rect x="6" y="34" width="68" height="10" rx="2" fill="#d1fae5" />
      <rect x="6" y="50" width="68" height="8" rx="2" fill="#e2e8f0" />
      <rect x="6" y="63" width="68" height="8" rx="2" fill="#e2e8f0" />
      <rect x="6" y="76" width="68" height="8" rx="2" fill="#e2e8f0" />
      <rect x="6" y="96" width="68" height="20" rx="3" fill="#10b981" opacity="0.8" />
      {/* Fan chart */}
      <rect x="86" y="26" width="194" height="134" fill="#fff" />
      {/* Fan bands P10-P90 */}
      <polygon points="90,145 140,130 190,110 240,85 270,68" fill="#10b981" opacity="0.08" />
      <polygon points="90,145 140,125 190,100 240,70 270,50 270,68 240,85 190,110 140,130" fill="#10b981" opacity="0.08" />
      <polygon points="90,145 140,120 190,90 240,58 270,38 270,50 240,70 190,100 140,125" fill="#10b981" opacity="0.1" />
      <polygon points="90,145 140,115 190,80 240,46 270,28 270,38 240,58 190,90 140,120" fill="#10b981" opacity="0.12" />
      {/* P50 median line */}
      <polyline points="90,145 140,122 190,95 240,67 270,48" stroke="#10b981" strokeWidth="2" fill="none" />
      {/* Target line */}
      <line x1="86" y1="45" x2="275" y2="45" stroke="#ef4444" strokeWidth="1" strokeDasharray="4 3" opacity="0.7" />
      {/* invested baseline */}
      <polyline points="90,145 140,138 190,130 240,122 270,116" stroke="#94a3b8" strokeWidth="1.5" fill="none" strokeDasharray="3 2" />
    </svg>
  );

  // 5 — Milestone Tracker (light, amber, milestone lines)
  if (id === 5) return (
    <svg viewBox="0 0 280 160" className="w-full h-full">
      <rect width="280" height="160" fill="#f8fafc" />
      {/* Header */}
      <rect width="280" height="26" fill="#0f172a" />
      <rect x="8" y="7" width="60" height="12" rx="2" fill="#f59e0b" opacity="0.9" />
      <rect x="76" y="9" width="35" height="8" rx="2" fill="#334155" />
      {/* Left panel */}
      <rect x="0" y="26" width="76" height="134" fill="#fffbeb" />
      <rect x="5" y="33" width="66" height="10" rx="2" fill="#fef3c7" />
      <rect x="5" y="49" width="66" height="8" rx="2" fill="#e2e8f0" />
      <rect x="5" y="62" width="66" height="8" rx="2" fill="#e2e8f0" />
      {/* milestone entries */}
      {[78, 95, 112].map((y, i) => (
        <g key={i}>
          <rect x="5" y={y} width="10" height="10" rx="2" fill="#f59e0b" opacity={0.5 + i * 0.2} />
          <rect x="20" y={y + 1} width="48" height="8" rx="1" fill="#fef3c7" />
        </g>
      ))}
      {/* Main chart area */}
      <rect x="82" y="26" width="198" height="104" fill="#fff" />
      {/* Growth curves */}
      <polyline points="86,120 120,108 155,92 190,74 225,60 270,46" stroke="#f59e0b" strokeWidth="2" fill="none" />
      <polyline points="86,120 120,112 155,100 190,86 225,74 270,62" stroke="#94a3b8" strokeWidth="1.5" fill="none" strokeDasharray="3 2" />
      {/* Milestone horizontal lines */}
      <line x1="82" y1="72" x2="275" y2="72" stroke="#10b981" strokeWidth="1" strokeDasharray="5 3" opacity="0.7" />
      <line x1="82" y1="58" x2="275" y2="58" stroke="#3b82f6" strokeWidth="1" strokeDasharray="5 3" opacity="0.7" />
      <line x1="82" y1="46" x2="275" y2="46" stroke="#ef4444" strokeWidth="1" strokeDasharray="5 3" opacity="0.7" />
      {/* Hit-rate matrix below */}
      <rect x="82" y="134" width="198" height="22" fill="#f8fafc" />
      {[0, 1, 2].map(i => (
        <g key={i}>
          <rect x={86 + i * 66} y="137" width="58" height="16" rx="2"
            fill={['#d1fae5', '#fef3c7', '#fee2e2'][i]} />
        </g>
      ))}
    </svg>
  );

  // 6 — Head-to-Head Arena (slate-950, red rounds)
  if (id === 6) return (
    <svg viewBox="0 0 280 160" className="w-full h-full">
      <rect width="280" height="160" fill="#020617" />
      {/* Header */}
      <rect width="280" height="26" fill="#0f172a" />
      <rect x="8" y="7" width="60" height="12" rx="2" fill="#ef4444" opacity="0.9" />
      <rect x="76" y="9" width="35" height="8" rx="2" fill="#1e293b" />
      {/* Round cards */}
      {[32, 57, 82, 107, 132].map((y, i) => (
        <g key={i}>
          <rect x="8" y={y} width="264" height="20" rx="3" fill="#0f172a" stroke="#1e293b" strokeWidth="0.5" />
          {/* Round label */}
          <rect x="12" y={y + 5} width="30" height="10" rx="1" fill="#ef4444" opacity="0.25" />
          {/* Fund A bar */}
          <rect x="50" y={y + 6} width={40 + i * 8} height="8" rx="1" fill="#ef4444" opacity="0.5" />
          {/* Fund B bar */}
          <rect x="160" y={y + 6} width={50 - i * 5} height="8" rx="1" fill="#818cf8" opacity="0.5" />
          {/* vs divider */}
          <rect x="148" y={y + 8} width="8" height="4" rx="1" fill="#475569" />
        </g>
      ))}
    </svg>
  );

  // 7 — Switch Advisor (white, violet, ranked list)
  if (id === 7) return (
    <svg viewBox="0 0 280 160" className="w-full h-full">
      <rect width="280" height="160" fill="#fff" />
      {/* Header */}
      <rect width="280" height="26" fill="#0f172a" />
      <rect x="8" y="7" width="60" height="12" rx="2" fill="#7c3aed" opacity="0.9" />
      <rect x="76" y="9" width="35" height="8" rx="2" fill="#334155" />
      {/* Current fund card */}
      <rect x="8" y="33" width="264" height="32" rx="3" fill="#f5f3ff" stroke="#ddd6fe" strokeWidth="0.8" />
      <rect x="14" y="39" width="60" height="8" rx="2" fill="#7c3aed" opacity="0.6" />
      <rect x="14" y="51" width="40" height="7" rx="2" fill="#c4b5fd" opacity="0.7" />
      {/* Score chips on current fund */}
      {[100, 140, 180, 220].map((x, i) => (
        <rect key={i} x={x} y="42" width="24" height="14" rx="3"
          fill="#7c3aed" opacity={0.15 + i * 0.1} />
      ))}
      {/* Ranked alternatives */}
      {[72, 95, 118, 141].map((y, i) => (
        <g key={i}>
          <rect x="8" y={y} width="264" height="18" rx="2" fill={i === 0 ? '#f5f3ff' : '#f8fafc'} stroke="#e2e8f0" strokeWidth="0.5" />
          {/* rank badge */}
          <rect x="12" y={y + 4} width="14" height="10" rx="2" fill="#7c3aed" opacity={0.3 - i * 0.05} />
          <rect x="32" y={y + 5} width="55" height="8" rx="2" fill="#e2e8f0" />
          {/* delta chips */}
          {[110, 148, 186, 224].map((x, ci) => (
            <rect key={ci} x={x} y={y + 4} width="26" height="10" rx="3"
              fill={ci % 2 === 0 ? '#d1fae5' : '#fee2e2'} />
          ))}
        </g>
      ))}
    </svg>
  );

  return null;
};

const GROUP_ORDER = ['Power User', 'DIY Investor', 'Goal-Based Investor', 'Fund Switcher'];
const GROUP_COLORS = {
  'Power User': '#f59e0b',
  'DIY Investor': '#818cf8',
  'Goal-Based Investor': '#10b981',
  'Fund Switcher': '#ef4444',
};

const ConceptSelector = ({ onSelect }) => (
  <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
    {/* Header */}
    <header className="px-8 pt-12 pb-8 text-center">
      <div className="inline-flex items-center gap-2 bg-white/10 text-white/60 text-xs font-mono px-3 py-1.5 rounded-full mb-6 border border-white/10">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        7 UI Concepts · Indian MF Analytics
      </div>
      <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">
        Performance Attribution
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400"> & Benchmarking</span>
      </h1>
      <p className="text-slate-400 text-base max-w-2xl mx-auto">
        Seven distinct UI approaches across four user personas — same data, same functionality, radically different experiences.
        Pick a concept to explore.
      </p>
    </header>

    {/* Concept cards */}
    <main className="flex-1 px-6 pb-12 max-w-7xl mx-auto w-full">
      {GROUP_ORDER.map((group) => {
        const groupConcepts = CONCEPTS.filter(c => c.group === group);
        return (
          <div key={group} className="mb-10">
            {/* Group label */}
            <div className="flex items-center gap-3 mb-4">
              <span
                className="text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full"
                style={{ color: GROUP_COLORS[group], backgroundColor: GROUP_COLORS[group] + '18', border: `1px solid ${GROUP_COLORS[group]}33` }}
              >
                {group}
              </span>
              <div className="flex-1 h-px bg-white/8" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {groupConcepts.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onSelect(c.id)}
                  className="group text-left bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/25 hover:bg-white/8 transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/40 focus:outline-none focus:ring-2 focus:ring-white/30"
                >
                  {/* Preview thumbnail */}
                  <div className="h-40 overflow-hidden border-b border-white/10">
                    <PreviewThumbnail id={c.id} />
                  </div>

                  {/* Card content */}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-white/40 font-mono text-xs">0{c.id}</span>
                        <h2 className="text-white font-semibold text-base group-hover:text-blue-300 transition-colors">
                          {c.name}
                        </h2>
                      </div>
                      <span
                        className="flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: c.badgeBg, color: c.badgeText, border: `1px solid ${c.badgeText}33` }}
                      >
                        {c.badge}
                      </span>
                    </div>
                    <p className="text-xs text-white/40 font-medium mb-2 tracking-wide">{c.tagline}</p>
                    <p className="text-sm text-slate-400 leading-relaxed">{c.description}</p>
                  </div>

                  {/* Launch row */}
                  <div className="px-5 pb-4 flex items-center justify-between">
                    <div className="flex gap-1.5">
                      {[c.accent, '#64748b', '#94a3b8'].map((col, i) => (
                        <span key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: col, opacity: 1 - i * 0.3 }} />
                      ))}
                    </div>
                    <span className="text-xs text-white/30 group-hover:text-white/60 flex items-center gap-1 transition-colors">
                      Open
                      <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {/* Shared core legend */}
      <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
        <p className="text-white/20 font-mono text-xs mb-3">SHARED CORE</p>
        <p className="text-white/60 text-sm leading-relaxed mb-4">
          Every concept shares the same data layer:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1.5">
          {[
            'Rolling returns (1Y/3Y/5Y/10Y)',
            'Outperformance analysis',
            'Sharpe · Sortino · Beta · TE · IR',
            'UCR / DCR · Capture Ratio',
            'Rolling Alpha scatter + area charts',
            'Max Drawdown & Recovery',
          ].map((f) => (
            <li key={f} className="flex items-center gap-2 text-xs text-slate-500 list-none">
              <span className="w-1 h-1 rounded-full bg-slate-600 flex-shrink-0" />
              {f}
            </li>
          ))}
        </div>
        <p className="text-xs text-white/20 mt-4 pt-3 border-t border-white/8">
          Backend: FastAPI · port 8001 · AMFI NAV data
        </p>
      </div>
    </main>
  </div>
);

export default ConceptSelector;
