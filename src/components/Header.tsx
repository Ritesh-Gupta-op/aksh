import React from 'react';

interface HeaderProps {
  currentTab: string;
  onOpenSettings?: () => void;
}

const TAB_TITLES: Record<string, string> = {
  home: 'HOME',
  salary: 'SALARY',
  simulator: 'SIMULATOR',
  upi: 'UPI SCANNER',
  'tax-coach': 'TAX COACH',
};

export const Header: React.FC<HeaderProps> = ({ currentTab, onOpenSettings }) => {
  return (
    <header className="fixed top-0 w-full z-50 pt-safe bg-[#f8f9fc]/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-[#e1e2e6]/50">
      <div className="h-20 px-margin flex items-center justify-between max-w-5xl mx-auto">
        <div className="flex items-center gap-space-sm min-w-0">
          <div className="relative flex-shrink-0">
            <img
              alt="Aksh Brand Logo"
              className="h-8 w-auto object-contain flex-shrink-0"
              src="https://lh3.googleusercontent.com/aida/AEtjO1W2wWBVR5YXgeTLUYTNzXMBJ7xppWOJFfvDBn3KfnT1QO4Xv5BDY7WgoKtP_TwrBdt6yWzkToBAk3ZWvuYGXjngzk9srTABjwAhI08t0ieYHvi-CR5r4icDFYF8kPlOAcOiaBKB-y_q4455GNHyrMtlZDM2hfFMzwykts0w_WRJT9jp_DBCGVCZT5OMYDYS5ilNw1pTlqDttkGojHXKszaP3baL3cV9c9V6GDw-yfXoBifEXNkOqImhK3w"
              onError={(e) => {
                // Fallback styled logo if external image network issues
                (e.currentTarget as HTMLElement).style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  const badge = document.createElement('div');
                  badge.className = 'flex items-center gap-1.5 px-2 py-0.5 rounded border border-[#1b6968]/30 bg-[#f8f9fc] text-xs font-bold text-[#191c1e]';
                  badge.innerHTML = '<span class="w-5 h-5 rounded-full bg-[#1b6968] text-white flex items-center justify-center text-[11px]">₹</span> Aksh <span class="bg-[#ffdad6] text-[#ba1a1a] text-[9px] px-1 rounded">25-26</span>';
                  parent.appendChild(badge);
                }
              }}
            />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-space-xs">
              <span className="font-headline-sm text-headline-sm text-[#191c1e] font-semibold tracking-tight">Aksh</span>
              <span className="px-space-xs py-0.5 rounded bg-[#edeef1] text-[#3f4948] font-label-sm text-label-sm font-semibold tracking-wide uppercase">
                {TAB_TITLES[currentTab] || 'HOME'}
              </span>
            </div>
            <span className="font-body-sm text-body-sm text-[#3f4948] truncate">
              Your eternal financial companion • FY 2025-26
            </span>
          </div>
        </div>

        <div className="flex items-center gap-space-sm flex-shrink-0">
          <div className="hidden sm:flex items-center gap-space-xs bg-[#e7e8eb] px-space-xs py-1 rounded text-[#1b6968] font-label-sm text-label-sm">
            <span className="material-symbols-outlined text-[14px]">lock</span>
            <span>Private &amp; Local</span>
          </div>
          <button
            onClick={onOpenSettings}
            title="Profile & Preferences"
            className="w-8 h-8 rounded-full bg-[#1b6968] hover:bg-[#276867] active:scale-95 transition-all flex items-center justify-center flex-shrink-0 text-white cursor-pointer shadow-sm"
          >
            <span className="material-symbols-outlined text-white text-[18px]">person</span>
          </button>
        </div>
      </div>
    </header>
  );
};
