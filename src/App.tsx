import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { HomeScreen } from './components/screens/HomeScreen';
import { SalaryScreen } from './components/screens/SalaryScreen';
import { SimulatorScreen } from './components/screens/SimulatorScreen';
import { UpiScannerScreen } from './components/screens/UpiScannerScreen';
import { TaxCoachScreen } from './components/screens/TaxCoachScreen';
import { BreakdownModal, SettingsDrawer } from './components/Modals';
import { SalaryDetails } from './types/tax';
import { DEFAULT_SALARY } from './utils/taxCalculator';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [salary, setSalary] = useState<SalaryDetails>(() => {
    try {
      const saved = localStorage.getItem('aksh_salary_v1');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return DEFAULT_SALARY;
  });

  const [breakdownModalOpen, setBreakdownModalOpen] = useState<boolean>(false);
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState<boolean>(false);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('aksh_salary_v1', JSON.stringify(salary));
    } catch {
      // storage unavailable
    }
  }, [salary]);

  // Support hash navigation
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (['home', 'salary', 'simulator', 'upi', 'tax-coach'].includes(hash)) {
        setCurrentTab(hash);
      }
    };
    window.addEventListener('hashchange', handleHash);
    handleHash();
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const handleSelectTab = (tab: string) => {
    setCurrentTab(tab);
    window.location.hash = `#${tab}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateSalary = (updated: Partial<SalaryDetails>) => {
    setSalary((prev) => ({ ...prev, ...updated }));
  };

  const handleResetSalary = () => {
    setSalary(DEFAULT_SALARY);
    setSettingsDrawerOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fc] text-[#191c1e] flex flex-col antialiased">
      {/* Fixed Header */}
      <Header currentTab={currentTab} onOpenSettings={() => setSettingsDrawerOpen(true)} />

      {/* Main Content Area */}
      <main className="flex flex-col relative w-full pt-20 pb-24 px-margin min-h-screen">
        {currentTab === 'home' && (
          <HomeScreen
            salary={salary}
            onNavigateTab={handleSelectTab}
            onOpenBreakdownModal={() => setBreakdownModalOpen(true)}
          />
        )}
        {currentTab === 'salary' && (
          <SalaryScreen
            salary={salary}
            onUpdateSalary={handleUpdateSalary}
            onNavigateTab={handleSelectTab}
          />
        )}
        {currentTab === 'simulator' && (
          <SimulatorScreen
            salary={salary}
            onUpdateSalary={handleUpdateSalary}
            onNavigateTab={handleSelectTab}
          />
        )}
        {currentTab === 'upi' && (
          <UpiScannerScreen
            salary={salary}
            onUpdateSalary={handleUpdateSalary}
            onNavigateTab={handleSelectTab}
          />
        )}
        {currentTab === 'tax-coach' && (
          <TaxCoachScreen salary={salary} onNavigateTab={handleSelectTab} />
        )}
      </main>

      {/* Fixed Bottom Navigation */}
      <BottomNav currentTab={currentTab} onSelectTab={handleSelectTab} />

      {/* Breakdown Modal */}
      <BreakdownModal
        isOpen={breakdownModalOpen}
        onClose={() => setBreakdownModalOpen(false)}
        salary={salary}
      />

      {/* Settings / Preferences Drawer */}
      <SettingsDrawer
        isOpen={settingsDrawerOpen}
        onClose={() => setSettingsDrawerOpen(false)}
        salary={salary}
        onUpdateSalary={handleUpdateSalary}
        onReset={handleResetSalary}
      />
    </div>
  );
}
