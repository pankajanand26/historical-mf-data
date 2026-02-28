import { useState } from 'react';
import ConceptSelector from './ConceptSelector';
import TerminalApp from './concepts/1-terminal/TerminalApp';
import WorkbenchApp from './concepts/2-workbench/WorkbenchApp';
import HeatmapApp from './concepts/3-heatmap/HeatmapApp';
import ProjectorApp from './concepts/4-projector/ProjectorApp';
import MilestoneApp from './concepts/5-milestone/MilestoneApp';
import ArenaApp from './concepts/6-arena/ArenaApp';
import AdvisorApp from './concepts/7-advisor/AdvisorApp';

const CONCEPTS = {
  selector: null,
  1: TerminalApp,
  2: WorkbenchApp,
  3: HeatmapApp,
  4: ProjectorApp,
  5: MilestoneApp,
  6: ArenaApp,
  7: AdvisorApp,
};

const App = () => {
  const [active, setActive] = useState('selector');

  if (active === 'selector') {
    return <ConceptSelector onSelect={setActive} />;
  }

  const ConceptComponent = CONCEPTS[active];
  return (
    <div className="relative">
      {/* Back button — always accessible */}
      <button
        onClick={() => setActive('selector')}
        className="fixed bottom-5 right-5 z-[9999] flex items-center gap-2 bg-gray-900 text-white text-xs font-semibold px-3 py-2 rounded-full shadow-xl hover:bg-gray-700 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Concepts
      </button>
      <ConceptComponent />
    </div>
  );
};

export default App;
