import React from 'react';

interface BottomNavProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: 'receipt_long' },
  { id: 'salary', label: 'Salary', icon: 'balance' },
  { id: 'simulator', label: 'Simulator', icon: 'tune' },
  { id: 'upi', label: 'UPI', icon: 'document_scanner' },
  { id: 'tax-coach', label: 'Tax Coach', icon: 'forum' },
];

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onSelectTab }) => {
  return (
    <nav
      className="fixed bottom-0 w-full z-50 pb-safe bg-[#f8f9fc]/90 backdrop-blur-xl shadow-[0_-2px_12px_rgba(0,0,0,0.04)] border-t border-[#e1e2e6]/60"
      data-active-classes="text-primary font-semibold"
    >
      <div className="flex justify-between items-center h-16 px-space-xs max-w-lg mx-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center justify-center min-w-[44px] min-h-[44px] flex-1 py-1 transition-all group cursor-pointer ${
                isActive ? 'text-[#1b6968] font-semibold scale-105' : 'text-[#3f4948] hover:text-[#191c1e]'
              }`}
              data-path={item.id}
            >
              <div className="relative">
                <span
                  className="material-symbols-outlined text-[22px] transition-transform group-active:scale-90"
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {item.icon}
                </span>
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#1b6968]" />
                )}
              </div>
              <span className="font-label-sm text-label-sm mt-0.5">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
