const CONCEPTS = [
  {
    id: 1,
    name: 'Terminal',
    tagline: 'Dark · Data-Dense · Bloomberg-style',
    description: 'Near-black background, monospace numbers, amber accents. All controls in a sticky top bar. Maximum data density.',
    accent: '#f59e0b',
    bg: '#0d1117',
    textColor: '#e6edf3',
    preview: 'terminal',
    badge: 'Dark',
    badgeBg: '#1a2332',
    badgeText: '#f59e0b',
  },
  {
    id: 2,
    name: 'Morning Brief',
    tagline: 'Editorial · Serif · Story-Driven',
    description: 'White canvas, large serif headings, 4 KPI insight cards at the top. Controls in a slide-in drawer. Generous whitespace.',
    accent: '#1e3a5f',
    bg: '#faf8f3',
    textColor: '#1a1a2e',
    preview: 'editorial',
    badge: 'Light',
    badgeBg: '#e8f0e8',
    badgeText: '#1e3a5f',
  },
  {
    id: 3,
    name: 'SaaS Dashboard',
    tagline: 'Card Grid · Collapsible Sidebar · Linear-style',
    description: 'Floating white cards on slate background. Icon sidebar that collapses. Four analysis tabs: Returns · Risk · Capture · Drawdown.',
    accent: '#6366f1',
    bg: '#f8fafc',
    textColor: '#0f172a',
    preview: 'saas',
    badge: 'Light',
    badgeBg: '#eef2ff',
    badgeText: '#4f46e5',
  },
  {
    id: 4,
    name: 'Guided Flow',
    tagline: 'Step Wizard · Consumer-Friendly · Fintech-style',
    description: 'Three-step flow: Select Funds → Configure → Results. Large touch-friendly controls. Friendly empty states and progress indicator.',
    accent: '#7c3aed',
    bg: '#f5f3ff',
    textColor: '#1e1b4b',
    preview: 'wizard',
    badge: 'Light',
    badgeBg: '#f5f3ff',
    badgeText: '#7c3aed',
  },
  {
    id: 5,
    name: 'Workbench',
    tagline: 'Resizable Panels · Dark/Light · VSCode-style',
    description: 'Drag-to-resize side panel. Persistent fund diff strip. Tabbed analysis panes with mini TOC. Dark/light mode toggle.',
    accent: '#3b82f6',
    bg: '#1e1e2e',
    textColor: '#cdd6f4',
    preview: 'workbench',
    badge: 'Dark + Light',
    badgeBg: '#1e293b',
    badgeText: '#60a5fa',
  },
];

// Preview SVG thumbnails — abstract representations of each layout
const PreviewThumbnail = ({ id }) => {
  if (id === 1) return (
    <svg viewBox="0 0 280 160" className="w-full h-full">
      <rect width="280" height="160" fill="#0d1117" />
      <rect y="0" width="280" height="28" fill="#161b22" />
      <rect x="8" y="8" width="60" height="12" rx="2" fill="#f59e0b" opacity="0.9" />
      <rect x="80" y="10" width="40" height="8" rx="2" fill="#30363d" />
      <rect x="128" y="10" width="40" height="8" rx="2" fill="#30363d" />
      <rect x="176" y="10" width="40" height="8" rx="2" fill="#30363d" />
      <rect x="230" y="8" width="40" height="12" rx="2" fill="#f59e0b" opacity="0.7" />
      {/* Chart area */}
      <rect x="8" y="36" width="264" height="90" rx="2" fill="#161b22" />
      <polyline points="20,110 60,85 100,95 140,65 180,75 220,50 260,60" stroke="#f59e0b" strokeWidth="2" fill="none" />
      <polyline points="20,115 60,100 100,108 140,85 180,90 220,75 260,80" stroke="#22c55e" strokeWidth="1.5" fill="none" strokeDasharray="4 2" />
      {/* Bottom tabs */}
      <rect x="8" y="134" width="50" height="18" rx="2" fill="#f59e0b" opacity="0.3" />
      <rect x="66" y="134" width="50" height="18" rx="2" fill="#30363d" />
      <rect x="124" y="134" width="50" height="18" rx="2" fill="#30363d" />
      <rect x="182" y="134" width="50" height="18" rx="2" fill="#30363d" />
    </svg>
  );

  if (id === 2) return (
    <svg viewBox="0 0 280 160" className="w-full h-full">
      <rect width="280" height="160" fill="#faf8f3" />
      {/* Header */}
      <rect x="0" y="0" width="280" height="36" fill="#1e3a5f" />
      <rect x="12" y="10" width="90" height="10" rx="2" fill="#fff" opacity="0.9" />
      <rect x="12" y="24" width="60" height="6" rx="1" fill="#fff" opacity="0.4" />
      <rect x="248" y="12" width="24" height="12" rx="6" fill="#b8860b" opacity="0.9" />
      {/* KPI cards */}
      <rect x="8" y="44" width="57" height="30" rx="3" fill="#fff" stroke="#e2e8f0" strokeWidth="0.5" />
      <rect x="73" y="44" width="57" height="30" rx="3" fill="#fff" stroke="#e2e8f0" strokeWidth="0.5" />
      <rect x="138" y="44" width="57" height="30" rx="3" fill="#fff" stroke="#e2e8f0" strokeWidth="0.5" />
      <rect x="203" y="44" width="69" height="30" rx="3" fill="#fff" stroke="#e2e8f0" strokeWidth="0.5" />
      <rect x="16" y="50" width="30" height="6" rx="1" fill="#1e3a5f" opacity="0.7" />
      <rect x="16" y="60" width="40" height="8" rx="1" fill="#b8860b" />
      <rect x="81" y="50" width="30" height="6" rx="1" fill="#1e3a5f" opacity="0.7" />
      <rect x="81" y="60" width="40" height="8" rx="1" fill="#16a34a" />
      {/* Chart */}
      <rect x="8" y="82" width="264" height="70" rx="3" fill="#fff" stroke="#e2e8f0" strokeWidth="0.5" />
      <polyline points="20,135 60,118 100,125 140,100 180,110 220,88 260,95" stroke="#1e3a5f" strokeWidth="2" fill="none" />
      <polyline points="20,138 60,128 100,132 140,115 180,120 220,105 260,108" stroke="#b8860b" strokeWidth="1.5" fill="none" strokeDasharray="4 2" />
    </svg>
  );

  if (id === 3) return (
    <svg viewBox="0 0 280 160" className="w-full h-full">
      <rect width="280" height="160" fill="#f8fafc" />
      {/* Sidebar */}
      <rect x="0" y="0" width="36" height="160" fill="#fff" stroke="#e2e8f0" strokeWidth="0.5" />
      <rect x="8" y="12" width="20" height="20" rx="4" fill="#6366f1" opacity="0.15" />
      <rect x="12" y="18" width="12" height="8" rx="2" fill="#6366f1" opacity="0.5" />
      <rect x="8" y="40" width="20" height="20" rx="4" fill="#f1f5f9" />
      <rect x="8" y="68" width="20" height="20" rx="4" fill="#f1f5f9" />
      <rect x="8" y="96" width="20" height="20" rx="4" fill="#f1f5f9" />
      {/* Top bar */}
      <rect x="36" y="0" width="244" height="32" fill="#fff" stroke="#e2e8f0" strokeWidth="0.5" />
      <rect x="44" y="10" width="80" height="12" rx="6" fill="#6366f1" opacity="0.9" />
      <rect x="132" y="10" width="50" height="12" rx="6" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="0.5" />
      <rect x="190" y="10" width="50" height="12" rx="6" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="0.5" />
      {/* Card grid */}
      <rect x="44" y="40" width="112" height="52" rx="4" fill="#fff" stroke="#e2e8f0" strokeWidth="0.5" />
      <rect x="164" y="40" width="112" height="52" rx="4" fill="#fff" stroke="#e2e8f0" strokeWidth="0.5" />
      <rect x="44" y="100" width="112" height="52" rx="4" fill="#fff" stroke="#e2e8f0" strokeWidth="0.5" />
      <rect x="164" y="100" width="112" height="52" rx="4" fill="#fff" stroke="#e2e8f0" strokeWidth="0.5" />
      {/* Chart in card 1 */}
      <polyline points="52,82 72,72 92,77 112,62 132,68 152,55 156,58" stroke="#6366f1" strokeWidth="1.5" fill="none" />
      {/* Chart in card 2 */}
      <polyline points="172,82 192,75 212,79 232,68 252,72 272,60 276,63" stroke="#dc2626" strokeWidth="1.5" fill="none" />
    </svg>
  );

  if (id === 4) return (
    <svg viewBox="0 0 280 160" className="w-full h-full">
      <rect width="280" height="160" fill="#f5f3ff" />
      {/* Step indicator */}
      <rect x="40" y="12" width="200" height="3" rx="1.5" fill="#ddd6fe" />
      <rect x="40" y="12" width="100" height="3" rx="1.5" fill="#7c3aed" />
      <circle cx="40" cy="13.5" r="8" fill="#7c3aed" />
      <circle cx="140" cy="13.5" r="8" fill="#7c3aed" />
      <circle cx="240" cy="13.5" r="8" fill="#ddd6fe" />
      <rect x="34" y="9" width="12" height="9" rx="2" fill="#7c3aed" />
      <text x="36" y="17" fontSize="7" fill="white" fontWeight="bold">1</text>
      <text x="136" y="17" fontSize="7" fill="white" fontWeight="bold">2</text>
      <text x="236" y="17" fontSize="7" fill="#7c3aed" fontWeight="bold">3</text>
      {/* Big form area */}
      <rect x="20" y="30" width="240" height="100" rx="8" fill="#fff" stroke="#ddd6fe" strokeWidth="1" />
      <rect x="36" y="44" width="80" height="10" rx="2" fill="#7c3aed" opacity="0.15" />
      <rect x="36" y="58" width="208" height="18" rx="4" fill="#f5f3ff" stroke="#ddd6fe" strokeWidth="0.8" />
      <rect x="36" y="80" width="208" height="18" rx="4" fill="#f5f3ff" stroke="#ddd6fe" strokeWidth="0.8" />
      <rect x="36" y="102" width="208" height="18" rx="4" fill="#f5f3ff" stroke="#ddd6fe" strokeWidth="0.8" />
      {/* Nav */}
      <rect x="188" y="138" width="60" height="14" rx="7" fill="#7c3aed" />
      <rect x="32" y="138" width="60" height="14" rx="7" fill="#ede9fe" />
    </svg>
  );

  if (id === 5) return (
    <svg viewBox="0 0 280 160" className="w-full h-full">
      <rect width="280" height="160" fill="#1e1e2e" />
      {/* Top bar */}
      <rect x="0" y="0" width="280" height="28" fill="#181825" />
      <rect x="8" y="8" width="60" height="12" rx="2" fill="#cba6f7" opacity="0.8" />
      <rect x="76" y="8" width="80" height="12" rx="2" fill="#313244" />
      <rect x="240" y="8" width="32" height="12" rx="6" fill="#313244" />
      {/* Diff strip */}
      <rect x="0" y="28" width="280" height="18" fill="#1e1e2e" stroke="#313244" strokeWidth="0.5" />
      <rect x="8" y="32" width="50" height="8" rx="4" fill="#a6e3a1" opacity="0.3" />
      <rect x="66" y="32" width="50" height="8" rx="4" fill="#f38ba8" opacity="0.3" />
      <rect x="124" y="32" width="50" height="8" rx="4" fill="#89b4fa" opacity="0.3" />
      {/* Left panel */}
      <rect x="0" y="46" width="68" height="114" fill="#181825" />
      <rect x="6" y="54" width="56" height="28" rx="3" fill="#313244" />
      <rect x="10" y="58" width="40" height="6" rx="1" fill="#cdd6f4" opacity="0.5" />
      <rect x="10" y="68" width="30" height="5" rx="1" fill="#cdd6f4" opacity="0.3" />
      <rect x="6" y="88" width="56" height="8" rx="3" fill="#313244" />
      <rect x="6" y="100" width="56" height="8" rx="3" fill="#313244" />
      <rect x="6" y="112" width="56" height="8" rx="3" fill="#313244" />
      {/* Resize handle */}
      <rect x="67" y="46" width="2" height="114" fill="#313244" />
      {/* Right panel — tabs */}
      <rect x="70" y="46" width="210" height="16" fill="#1e1e2e" />
      <rect x="72" y="48" width="40" height="12" rx="2" fill="#cba6f7" opacity="0.3" />
      <rect x="118" y="48" width="40" height="12" rx="2" fill="#313244" />
      <rect x="164" y="48" width="40" height="12" rx="2" fill="#313244" />
      <rect x="210" y="48" width="40" height="12" rx="2" fill="#313244" />
      {/* Chart */}
      <rect x="70" y="64" width="210" height="96" fill="#1e1e2e" />
      <polyline points="78,145 108,128 138,135 168,112 198,120 228,98 268,105" stroke="#89b4fa" strokeWidth="2" fill="none" />
      <polyline points="78,148 108,138 138,142 168,125 198,128 228,115 268,118" stroke="#a6e3a1" strokeWidth="1.5" fill="none" strokeDasharray="4 2" />
    </svg>
  );

  return null;
};

const ConceptSelector = ({ onSelect }) => (
  <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
    {/* Header */}
    <header className="px-8 pt-12 pb-8 text-center">
      <div className="inline-flex items-center gap-2 bg-white/10 text-white/60 text-xs font-mono px-3 py-1.5 rounded-full mb-6 border border-white/10">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        5 UI Concepts · Indian MF Analytics
      </div>
      <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">
        Performance Attribution
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400"> & Benchmarking</span>
      </h1>
      <p className="text-slate-400 text-base max-w-xl mx-auto">
        Five distinct UI approaches — same data, same functionality, radically different experiences.
        Pick one to explore.
      </p>
    </header>

    {/* Concept cards */}
    <main className="flex-1 px-6 pb-12 max-w-6xl mx-auto w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {CONCEPTS.map((c) => (
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

        {/* "All concepts" legend card */}
        <div className="bg-white/3 border border-white/8 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <p className="text-white/20 font-mono text-xs mb-3">SHARED CORE</p>
            <p className="text-white/60 text-sm leading-relaxed mb-4">
              Every concept shares the same data layer:
            </p>
            <ul className="space-y-1.5">
              {['Rolling returns (1Y/3Y/5Y/10Y)', 'Outperformance analysis', 'Sharpe · Sortino · Beta · TE · IR', 'UCR / DCR · Capture Ratio', 'Rolling Alpha scatter + area charts', 'Max Drawdown & Recovery'].map((f) => (
                <li key={f} className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="w-1 h-1 rounded-full bg-slate-600" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-white/20 mt-4 pt-3 border-t border-white/8">
            Backend: FastAPI · port 8001 · AMFI NAV data
          </p>
        </div>
      </div>
    </main>
  </div>
);

export default ConceptSelector;
