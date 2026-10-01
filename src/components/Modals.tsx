import React from 'react';
import { SalaryDetails } from '../types/tax';
import { formatINR } from '../utils/taxCalculator';

interface BreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  salary: SalaryDetails;
}

export const BreakdownModal: React.FC<BreakdownModalProps> = ({ isOpen, onClose, salary }) => {
  if (!isOpen) return null;

  const monthlyGross = salary.basicMonthly + salary.hraMonthly + salary.specialMonthly;
  const monthlyTds = 14700;
  const profTaxMonthly = 200;
  const monthlyTakeHome = monthlyGross - salary.epfMonthly - profTaxMonthly - monthlyTds;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#bec9c8]/40 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#e1e2e6]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#1b6968]">receipt_long</span>
            <h3 className="font-headline-sm text-headline-sm font-bold text-[#191c1e]">
              Monthly Pay Advice Breakdown
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#edeef1] hover:bg-[#e1e2e6] flex items-center justify-center text-[#3f4948] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="space-y-3 font-body-sm text-sm">
          {/* Earnings */}
          <div className="space-y-1.5">
            <span className="font-label-sm text-xs font-bold text-[#1b6968] uppercase tracking-wider">
              Earnings (A)
            </span>
            <div className="bg-[#f3f3f7] p-2.5 rounded-lg space-y-1">
              <div className="flex justify-between">
                <span className="text-[#3f4948]">Basic Salary</span>
                <span className="font-figure-md font-semibold text-[#191c1e]">₹{formatINR(salary.basicMonthly)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#3f4948]">House Rent Allowance (HRA)</span>
                <span className="font-figure-md font-semibold text-[#191c1e]">₹{formatINR(salary.hraMonthly)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#3f4948]">Special Allowance</span>
                <span className="font-figure-md font-semibold text-[#191c1e]">₹{formatINR(salary.specialMonthly)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-[#e1e2e6] font-semibold text-[#191c1e]">
                <span>Total Gross Earnings</span>
                <span className="font-figure-md">₹{formatINR(monthlyGross)}</span>
              </div>
            </div>
          </div>

          {/* Deductions */}
          <div className="space-y-1.5">
            <span className="font-label-sm text-xs font-bold text-[#ba1a1a] uppercase tracking-wider">
              Deductions (B)
            </span>
            <div className="bg-[#ffdad6]/20 p-2.5 rounded-lg space-y-1 border border-[#ffdad6]/50">
              <div className="flex justify-between">
                <span className="text-[#3f4948]">Employee PF (EPF - 12%)</span>
                <span className="font-figure-md font-semibold text-[#ba1a1a]">-₹{formatINR(salary.epfMonthly)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#3f4948]">Professional Tax (PT)</span>
                <span className="font-figure-md font-semibold text-[#ba1a1a]">-₹{formatINR(profTaxMonthly)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#3f4948]">Income Tax (TDS u/s 192)</span>
                <span className="font-figure-md font-semibold text-[#ba1a1a]">-₹{formatINR(monthlyTds)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-[#ffdad6] font-semibold text-[#93000a]">
                <span>Total Monthly Deductions</span>
                <span className="font-figure-md">-₹{formatINR(salary.epfMonthly + profTaxMonthly + monthlyTds)}</span>
              </div>
            </div>
          </div>

          {/* Net Take Home */}
          <div className="bg-[#aeeeec]/30 p-3 rounded-xl border border-[#276867]/30 flex items-center justify-between">
            <div>
              <span className="font-label-lg font-bold text-[#00201f] block">Net In-Hand Take-Home</span>
              <span className="text-xs text-[#2e6e6d]">Transferred to Salary Account</span>
            </div>
            <span className="font-figure-xl text-xl font-bold text-[#1b6968]">₹{formatINR(monthlyTakeHome)}</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-[#1b6968] hover:bg-[#003232] text-white font-label-lg font-semibold rounded-xl transition-all cursor-pointer shadow-sm"
        >
          Got it
        </button>
      </div>
    </div>
  );
};

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  salary: SalaryDetails;
  onUpdateSalary: (updated: Partial<SalaryDetails>) => void;
  onReset: () => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen,
  onClose,
  salary,
  onUpdateSalary,
  onReset,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#bec9c8]/40 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-[#e1e2e6]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#1b6968]">settings</span>
            <h3 className="font-headline-sm text-headline-sm font-bold text-[#191c1e]">
              Aksh Profile &amp; Preferences
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#edeef1] hover:bg-[#e1e2e6] flex items-center justify-center text-[#3f4948] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="space-y-3">
          <div className="bg-[#f3f3f7] p-3 rounded-xl border border-[#e1e2e6]">
            <label className="font-label-sm text-xs text-[#3f4948] uppercase block mb-1">
              Monthly Basic Pay
            </label>
            <div className="flex items-center">
              <span className="text-gray-500 mr-1">₹</span>
              <input
                type="number"
                value={salary.basicMonthly}
                onChange={(e) => onUpdateSalary({ basicMonthly: Number(e.target.value) || 0 })}
                className="w-full font-figure-md text-base font-semibold bg-transparent focus:outline-none"
              />
            </div>
          </div>

          <div className="bg-[#f3f3f7] p-3 rounded-xl border border-[#e1e2e6]">
            <label className="font-label-sm text-xs text-[#3f4948] uppercase block mb-1">
              Monthly Rent Paid
            </label>
            <div className="flex items-center">
              <span className="text-gray-500 mr-1">₹</span>
              <input
                type="number"
                value={salary.rentMonthly}
                onChange={(e) => onUpdateSalary({ rentMonthly: Number(e.target.value) || 0 })}
                className="w-full font-figure-md text-base font-semibold bg-transparent focus:outline-none"
              />
            </div>
          </div>

          <div className="bg-[#f3f3f7] p-3 rounded-xl border border-[#e1e2e6] flex items-center justify-between">
            <span className="font-body-sm text-sm text-[#191c1e] font-medium">Rental City Type</span>
            <div className="flex gap-2 text-xs">
              <button
                type="button"
                onClick={() => onUpdateSalary({ isMetro: true })}
                className={`px-3 py-1 rounded font-semibold transition-all cursor-pointer ${
                  salary.isMetro ? 'bg-[#1b6968] text-white shadow-sm' : 'bg-white text-[#3f4948]'
                }`}
              >
                Metro (50%)
              </button>
              <button
                type="button"
                onClick={() => onUpdateSalary({ isMetro: false })}
                className={`px-3 py-1 rounded font-semibold transition-all cursor-pointer ${
                  !salary.isMetro ? 'bg-[#1b6968] text-white shadow-sm' : 'bg-white text-[#3f4948]'
                }`}
              >
                Non-Metro (40%)
              </button>
            </div>
          </div>

          <div className="p-3 bg-[#edeef1] rounded-xl flex items-center justify-between text-xs">
            <span className="text-[#3f4948]">Reset numbers to defaults</span>
            <button
              type="button"
              onClick={onReset}
              className="text-[#ba1a1a] font-bold hover:underline cursor-pointer"
            >
              Reset All
            </button>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-[#1b6968] hover:bg-[#003232] text-white font-label-lg font-semibold rounded-xl transition-all cursor-pointer shadow-sm"
        >
          Save &amp; Return
        </button>
      </div>
    </div>
  );
};
