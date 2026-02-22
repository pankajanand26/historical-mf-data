const STEPS = [
  { num: 1, label: 'Select Funds' },
  { num: 2, label: 'Configure' },
  { num: 3, label: 'Results' },
];

const StepIndicator = ({ currentStep }) => (
  <div className="flex items-center justify-center gap-0">
    {STEPS.map((s, i) => {
      const done = currentStep > s.num;
      const active = currentStep === s.num;
      return (
        <div key={s.num} className="flex items-center">
          {/* Step bubble */}
          <div className="flex flex-col items-center gap-1.5">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
              done
                ? 'bg-violet-600 text-white'
                : active
                ? 'bg-violet-600 text-white ring-4 ring-violet-200'
                : 'bg-white border-2 border-violet-200 text-violet-300'
            }`}>
              {done ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : s.num}
            </div>
            <span className={`text-xs font-medium whitespace-nowrap ${active ? 'text-violet-700' : done ? 'text-violet-500' : 'text-slate-400'}`}>
              {s.label}
            </span>
          </div>
          {/* Connector line */}
          {i < STEPS.length - 1 && (
            <div className={`w-20 h-0.5 mx-3 mb-5 transition-colors ${currentStep > s.num ? 'bg-violet-600' : 'bg-violet-100'}`} />
          )}
        </div>
      );
    })}
  </div>
);

export default StepIndicator;
