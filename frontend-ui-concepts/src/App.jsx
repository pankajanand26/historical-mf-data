import { useState } from 'react';
import ConceptSelector from './ConceptSelector';
import TerminalApp from './concepts/1-terminal/TerminalApp';
import EditorialApp from './concepts/2-editorial/EditorialApp';
import SaasApp from './concepts/3-saas-grid/SaasApp';
import WizardApp from './concepts/4-wizard/WizardApp';
import WorkbenchApp from './concepts/5-workbench/WorkbenchApp';

const CONCEPTS = {
  selector: null,
  1: TerminalApp,
  2: EditorialApp,
  3: SaasApp,
  4: WizardApp,
  5: WorkbenchApp,
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
