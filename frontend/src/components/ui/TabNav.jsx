import { useState, useRef, useEffect } from 'react';
import { TABS, SIP_TABS } from '../../utils/constants';

const TabNav = ({ activeTab, setActiveTab }) => {
  const [sipOpen, setSipOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Check if current tab is one of the SIP tools
  const isSipActive = SIP_TABS.some((t) => t.id === activeTab);
  const activeSipLabel = SIP_TABS.find((t) => t.id === activeTab)?.label;

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setSipOpen(false);
      }
    };
    if (sipOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [sipOpen]);

  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
            activeTab === tab.id
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          {tab.label}
        </button>
      ))}

      {/* SIP Tools dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setSipOpen(!sipOpen)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
            isSipActive
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          {isSipActive ? activeSipLabel : 'SIP Tools'}
          <svg
            className={`w-3.5 h-3.5 transition-transform ${sipOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {sipOpen && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[140px]">
            {SIP_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSipOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TabNav;
