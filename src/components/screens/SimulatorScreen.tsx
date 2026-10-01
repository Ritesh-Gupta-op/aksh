import React, { useState } from 'react';
import { SalaryDetails } from '../../types/tax';
import { computeTaxComparison, formatINR } from '../../utils/taxCalculator';

interface SimulatorScreenProps {
  salary: SalaryDetails;
  onUpdateSalary: (updated: Partial<SalaryDetails>) => void;
  onNavigateTab: (tab: string) => void;
}

export const SimulatorScreen: React.FC<SimulatorScreenProps> = ({
  salary,
  onUpdateSalary,
  onNavigateTab,
}) => {
  const [selectedRegime, setSelectedRegime] = useState<'OLD' | 'NEW'>('OLD');
  const [epfPercent, setEpfPercent] = useState<number>(salary.epfPercentage || 12);
  const [npsPercent, setNpsPercent] = useState<number>(salary.employerNpsPercentage || 5);
  const [vol80C, setVol80C] = useState<number>(salary.voluntary80C || 27600);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [appliedSuccess, setAppliedSuccess] = useState<boolean>(false);

  // Compute baseline (default levers: 12% epf, 0% nps, 0 extra)
  const baselineSimSalary: SalaryDetails = {
    ...salary,
    epfPercentage: 12,
    employerNpsPercentage: 0,
    voluntary80C: 0,
    additionalNps80CCD1B: 0,
  };
  const baselineComp = computeTaxComparison(baselineSimSalary);
  const baselineTax =
    selectedRegime === 'OLD'
      ? baselineComp.oldRegime.totalAnnualTax
      : baselineComp.newRegime.totalAnnualTax;

  // Compute adjusted simulation
  const adjustedSimSalary: SalaryDetails = {
    ...salary,
    epfPercentage: epfPercent,
    employerNpsPercentage: npsPercent,
    voluntary80C: vol80C,
    additionalNps80CCD1B: 50000, // simulated NPS advantage
  };
  const adjustedComp = computeTaxComparison(adjustedSimSalary);
  const adjustedTax =
    selectedRegime === 'OLD'
      ? adjustedComp.oldRegime.totalAnnualTax
      : adjustedComp.newRegime.totalAnnualTax;

  const netSavings = Math.max(0, baselineTax - adjustedTax);
  const savingsPct =
    baselineTax > 0 ? (((baselineTax - adjustedTax) / baselineTax) * 100).toFixed(1) : '0.0';

  const grossAnnual =
    (salary.basicMonthly + salary.hraMonthly + salary.specialMonthly) * 12 + salary.bonusAnnual;
  const effectiveRate =
    grossAnnual > 0 ? ((adjustedTax / grossAnnual) * 100).toFixed(1) : '11.8';
  const baselineRate =
    grossAnnual > 0 ? ((baselineTax / grossAnnual) * 100).toFixed(1) : '13.2';

  // Bar progress
  const remainingPct =
    baselineTax > 0
      ? Math.max(30, Math.min(100, Math.round((adjustedTax / baselineTax) * 100)))
      : 80;
  const savedPct = 100 - remainingPct;

  const handleResetDefaults = () => {
    setEpfPercent(12);
    setNpsPercent(5);
    setVol80C(27600);
  };

  const handleApply = () => {
    setIsApplying(true);
    onUpdateSalary({
      epfPercentage: epfPercent,
      employerNpsPercentage: npsPercent,
      voluntary80C: vol80C,
      additionalNps80CCD1B: 50000,
    });
    setTimeout(() => {
      setIsApplying(false);
      setAppliedSuccess(true);
      setTimeout(() => setAppliedSuccess(false), 2500);
    }, 600);
  };

  return (
    <div className="flex flex-col w-full space-y-space-lg pb-space-2xl max-w-2xl mx-auto">
      {/* Title & Subtitle Editorial Block */}
      <div className="flex flex-col space-y-space-xs">
        <div className="flex items-center justify-between">
          <span className="font-headline-lg text-headline-lg text-[#191c1e] tracking-tight">
            Live Tax Savings Simulator
          </span>
          <span className="px-space-xs py-0.5 rounded bg-[#aeeeec] text-[#00201f] font-label-sm text-label-sm uppercase tracking-wider">
            FY 2025-26
          </span>
        </div>
        <p className="font-body-md text-body-md text-[#3f4948]">
          Adjust contribution levers to observe immediate changes to your net annual tax liability.
        </p>
      </div>

      {/* Regime Toggle Container */}
      <div className="p-1 rounded-xl bg-[#edeef1] flex items-center shadow-sm border border-[#bec9c8]/30">
        <button
          type="button"
          onClick={() => setSelectedRegime('OLD')}
          className={`flex-1 py-space-sm px-space-md rounded-lg font-label-lg text-label-lg shadow-sm transition-all flex items-center justify-center gap-space-xs cursor-pointer ${
            selectedRegime === 'OLD'
              ? 'bg-white text-[#1b6968]'
              : 'text-[#3f4948] hover:text-[#191c1e]'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">account_balance</span>
          <span>Old Regime</span>
          <span className="px-1.5 py-0.5 rounded bg-[#599f9e] text-white font-label-sm text-[10px]">
            Optimal
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedRegime('NEW')}
          className={`flex-1 py-space-sm px-space-md rounded-lg font-label-lg text-label-lg transition-all flex items-center justify-center gap-space-xs cursor-pointer ${
            selectedRegime === 'NEW'
              ? 'bg-white text-[#1b6968]'
              : 'text-[#3f4948] hover:text-[#191c1e]'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">bolt</span>
          <span>New Regime (115BAC)</span>
        </button>
      </div>

      {/* Live Simulated Tax Outcome Card (Voucher Paper Style) */}
      <div className="rounded-xl bg-white shadow-md overflow-hidden border border-[#bec9c8]/40">
        {/* Voucher Header Strip */}
        <div className="bg-[#e7e8eb] px-space-md py-space-sm flex items-center justify-between border-b border-[#bec9c8]/30">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-[#1b6968] text-[20px]">calculate</span>
            <span className="font-headline-sm text-headline-sm text-[#191c1e]">Simulated Tax Outcome</span>
          </div>
          <span className="px-space-xs py-0.5 rounded bg-[#1b6968] text-white font-label-sm text-label-sm tracking-wider uppercase">
            {selectedRegime === 'OLD' ? 'Old Regime' : 'New Regime'}
          </span>
        </div>

        <div className="p-space-md flex flex-col space-y-space-md">
          {/* 3 Key Metrics Bento Grid */}
          <div className="grid grid-cols-3 gap-space-xs pt-space-xs">
            {/* Baseline Tax */}
            <div className="bg-[#f3f3f7] p-space-sm rounded-lg flex flex-col justify-between border border-[#e1e2e6]">
              <span className="font-label-sm text-label-sm text-[#3f4948] uppercase truncate">Baseline Tax</span>
              <span className="font-figure-md text-figure-md text-[#191c1e] mt-space-xs font-semibold">
                ₹{formatINR(baselineTax)}
              </span>
              <span className="font-body-sm text-body-sm text-[#6f7978] text-[11px] truncate">Before tweaks</span>
            </div>

            {/* Adjusted Tax */}
            <div className="bg-[#1b6968]/10 p-space-sm rounded-lg flex flex-col justify-between border border-[#1b6968]/20">
              <span className="font-label-sm text-label-sm text-[#1b6968] uppercase font-bold truncate">Adjusted Tax</span>
              <span className="font-figure-md text-figure-md text-[#1b6968] font-bold mt-space-xs">
                ₹{formatINR(adjustedTax)}
              </span>
              <span className="font-body-sm text-body-sm text-[#1b6968]/80 text-[11px] flex items-center gap-0.5 truncate">
                <span className="material-symbols-outlined text-[12px]">trending_down</span> -{savingsPct}%
              </span>
            </div>

            {/* Net Savings */}
            <div className="bg-[#aeeeec] p-space-sm rounded-lg flex flex-col justify-between border border-[#2e6e6d]/30">
              <span className="font-label-sm text-label-sm text-[#00201f] uppercase truncate font-bold">Net Savings</span>
              <span className="font-figure-md text-figure-md text-[#00201f] font-bold mt-space-xs">
                Save ₹{formatINR(netSavings)}
              </span>
              <span className="font-body-sm text-body-sm text-[#00201f]/90 text-[11px] truncate">Annual cash back</span>
            </div>
          </div>

          {/* Visual Reduction Progress Bar Track */}
          <div className="flex flex-col space-y-space-xs pt-space-xs">
            <div className="flex justify-between items-center text-[#3f4948]">
              <span className="font-body-sm text-body-sm font-medium">Tax Liability Reduction Ledger</span>
              <span className="font-figure-md text-figure-md text-[#1b6968] font-semibold">
                ₹{formatINR(adjustedTax)} vs ₹{formatINR(baselineTax)}
              </span>
            </div>
            <div className="h-3 w-full bg-[#edeef1] rounded-full overflow-hidden flex relative">
              {/* Remaining Tax Amount Bar */}
              <div
                className="bg-[#1b6968] h-full rounded-l-full transition-all duration-300"
                style={{ width: `${remainingPct}%` }}
              />
              {/* Shaved Off Section */}
              <div
                className="bg-[#aeeeec] h-full rounded-r-full transition-all duration-300 relative flex items-center justify-center"
                style={{ width: `${savedPct}%` }}
              >
                <div className="w-full h-full bg-[#1b6968]/20" />
              </div>
            </div>
            <div className="flex justify-between items-center font-body-sm text-body-sm text-[#6f7978] text-[11px]">
              <span>Optimized Liability</span>
              <span className="text-[#1b6968] font-semibold flex items-center gap-0.5">
                <span className="material-symbols-outlined text-[14px]">savings</span>
                <span>₹{formatINR(netSavings)} Shaved off</span>
              </span>
            </div>
          </div>

          {/* Visual Context Sparkline Graphic */}
          <div className="bg-[#f3f3f7] p-space-sm rounded-lg flex items-center justify-between border border-[#e1e2e6]">
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-[#3f4948] uppercase">Effective Tax Rate</span>
              <div className="flex items-baseline gap-space-xs">
                <span className="font-figure-lg text-figure-lg text-[#191c1e] font-semibold">
                  {effectiveRate}%
                </span>
                <span className="font-body-sm text-body-sm text-[#1b6968] font-medium">
                  down from {baselineRate}%
                </span>
              </div>
            </div>

            {/* Inline Micro SVG Chart */}
            <svg className="w-28 h-8 overflow-visible" fill="none" viewBox="0 0 110 32" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M0 26 C20 26, 35 18, 55 18 C75 18, 90 6, 110 6"
                stroke="#1b6968"
                strokeLinecap="round"
                strokeWidth="2.5"
              />
              <path
                d="M0 26 C20 26, 35 18, 55 18 C75 18, 90 6, 110 6 L110 32 L0 32 Z"
                fill="#599f9e"
                fillOpacity="0.15"
              />
              <circle cx="110" cy="6" fill="#1b6968" r="3.5" />
            </svg>
          </div>
        </div>
      </div>

      {/* Interactive Sliders Schedule */}
      <div className="flex flex-col space-y-space-md">
        <div className="flex items-center justify-between">
          <span className="font-headline-sm text-headline-sm text-[#191c1e]">Contribution Levers</span>
          <button
            type="button"
            onClick={handleResetDefaults}
            className="font-label-sm text-label-sm text-[#1b6968] flex items-center gap-0.5 hover:underline cursor-pointer"
          >
            <span className="material-symbols-outlined text-[14px]">restart_alt</span> Reset Defaults
          </button>
        </div>

        {/* Lever 1: Employee Provident Fund (EPF) */}
        <div className="p-space-md rounded-xl bg-white shadow-sm flex flex-col space-y-space-sm border border-[#e1e2e6]">
          <div className="flex items-start justify-between">
            <div className="flex flex-col pr-space-sm">
              <span className="font-label-lg text-label-lg text-[#191c1e]">Employee Provident Fund (EPF)</span>
              <span className="font-body-sm text-body-sm text-[#3f4948]">
                Statutory deduction on Basic Pay (Mandatory min 12%)
              </span>
            </div>
            <div className="px-space-sm py-1 rounded bg-[#e7e8eb] text-[#1b6968] font-figure-md text-figure-md font-bold whitespace-nowrap">
              <span>{epfPercent}</span>%
            </div>
          </div>
          <div className="pt-space-xs">
            <input
              type="range"
              min="12"
              max="15"
              step="1"
              value={epfPercent}
              onChange={(e) => setEpfPercent(Number(e.target.value))}
              className="w-full accent-[#1b6968] h-2 bg-[#edeef1] rounded-lg cursor-pointer appearance-none"
            />
            <div className="flex justify-between items-center font-figure-md text-[11px] text-[#6f7978] mt-1">
              <span>12% (Standard)</span>
              <span>13%</span>
              <span>14%</span>
              <span>15% (Voluntary PF)</span>
            </div>
          </div>
        </div>

        {/* Lever 2: Corporate / Self NPS */}
        <div className="p-space-md rounded-xl bg-white shadow-sm flex flex-col space-y-space-sm border border-[#e1e2e6]">
          <div className="flex items-start justify-between">
            <div className="flex flex-col pr-space-sm">
              <div className="flex items-center gap-space-xs">
                <span className="font-label-lg text-label-lg text-[#191c1e]">Employer NPS [Sec 80CCD(2)]</span>
                <span className="px-1.5 py-0.5 rounded bg-[#ffddb6] text-[#2a1800] font-label-sm text-[10px] uppercase font-bold">
                  Top Pick
                </span>
              </div>
              <span className="font-body-sm text-body-sm text-[#3f4948]">
                Pre-tax corporate deduction up to 14% of Basic + DA
              </span>
            </div>
            <div className="px-space-sm py-1 rounded bg-[#aeeeec] text-[#2e6e6d] font-figure-md text-figure-md font-bold whitespace-nowrap">
              <span>{npsPercent}</span>%
            </div>
          </div>
          <div className="pt-space-xs">
            <input
              type="range"
              min="0"
              max="10"
              step="1"
              value={npsPercent}
              onChange={(e) => setNpsPercent(Number(e.target.value))}
              className="w-full accent-[#1b6968] h-2 bg-[#edeef1] rounded-lg cursor-pointer appearance-none"
            />
            <div className="flex justify-between items-center font-figure-md text-[11px] text-[#6f7978] mt-1">
              <span>0%</span>
              <span>2.5%</span>
              <span>5.0% (Current)</span>
              <span>7.5%</span>
              <span>10% (Max)</span>
            </div>
          </div>
        </div>

        {/* Lever 3: Extra 80C Deductions */}
        <div className="p-space-md rounded-xl bg-white shadow-sm flex flex-col space-y-space-sm border border-[#e1e2e6]">
          <div className="flex items-start justify-between">
            <div className="flex flex-col pr-space-sm">
              <span className="font-label-lg text-label-lg text-[#191c1e]">Voluntary 80C (ELSS / PPF / Sukanya)</span>
              <span className="font-body-sm text-body-sm text-[#3f4948]">
                Combined cap of ₹1,50,000 under Section 80C
              </span>
            </div>
            <div className="px-space-sm py-1 rounded bg-[#e7e8eb] text-[#191c1e] font-figure-md text-figure-md font-bold whitespace-nowrap">
              ₹<span>{formatINR(vol80C)}</span>
            </div>
          </div>
          <div className="pt-space-xs">
            <input
              type="range"
              min="0"
              max="150000"
              step="5000"
              value={vol80C}
              onChange={(e) => setVol80C(Number(e.target.value))}
              className="w-full accent-[#1b6968] h-2 bg-[#edeef1] rounded-lg cursor-pointer appearance-none"
            />
            <div className="flex justify-between items-center font-figure-md text-[11px] text-[#6f7978] mt-1">
              <span>₹0</span>
              <span>₹50,000</span>
              <span>₹1,00,000</span>
              <span>₹1,50,000</span>
            </div>
          </div>
        </div>
      </div>

      {/* Editorial Pro-Tips & Tax Rules Box */}
      <div className="p-space-md rounded-xl bg-[#e7e8eb] flex flex-col space-y-space-sm border border-[#bec9c8]/30">
        <div className="flex items-center gap-space-xs text-[#1b6968]">
          <span className="material-symbols-outlined text-[20px]">lightbulb</span>
          <span className="font-headline-sm text-headline-sm font-semibold">Optimization Insights &amp; Pro-Tips</span>
        </div>
        <div className="flex flex-col space-y-space-xs">
          <div className="p-space-sm rounded-lg bg-white flex items-start gap-space-sm border border-[#bec9c8]/30">
            <span className="material-symbols-outlined text-[#1b6968] text-[18px] mt-0.5">verified</span>
            <div className="flex flex-col">
              <span className="font-label-lg text-label-lg text-[#191c1e]">Section 80CCD(1B) NPS Benefit</span>
              <p className="font-body-sm text-body-sm text-[#3f4948]">
                Exclusive ₹50,000 deduction saves ₹15,600 at 30% slab + 4% cess. Valid across both corporate &amp; retail
                tiers.
              </p>
            </div>
          </div>
          <div className="p-space-sm rounded-lg bg-white flex items-start gap-space-sm border border-[#bec9c8]/30">
            <span className="material-symbols-outlined text-[#276867] text-[18px] mt-0.5">account_tree</span>
            <div className="flex flex-col">
              <span className="font-label-lg text-label-lg text-[#191c1e]">Zero Net Monthly In-Hand Dip</span>
              <p className="font-body-sm text-body-sm text-[#3f4948]">
                When structured as Employer Corporate NPS, reduced TDS matches the salary allocation, keeping monthly cash
                flow neutral.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Action Lock-In Button */}
      <div className="pt-space-xs">
        <button
          type="button"
          onClick={handleApply}
          disabled={isApplying}
          className={`w-full py-space-md px-space-lg rounded-xl font-headline-sm text-headline-sm font-semibold shadow-md active:scale-[0.99] transition-all flex items-center justify-center gap-space-sm cursor-pointer ${
            appliedSuccess ? 'bg-[#276867] text-white' : 'bg-[#1b6968] hover:bg-[#003232] text-white'
          }`}
        >
          {isApplying ? (
            <>
              <span className="material-symbols-outlined text-[20px] animate-spin">sync</span>
              <span>Saving simulation...</span>
            </>
          ) : appliedSuccess ? (
            <>
              <span className="material-symbols-outlined text-[20px]">check_circle</span>
              <span>Action Plan Updated!</span>
            </>
          ) : (
            <>
              <span>Apply changes to my action plan</span>
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </>
          )}
        </button>
        <div className="flex items-center justify-center gap-space-xs mt-space-xs text-[#6f7978] font-body-sm text-body-sm text-[12px]">
          <span className="material-symbols-outlined text-[14px]">shield</span>
          <span>Calculations computed locally on device • Instant draft update</span>
        </div>
      </div>
    </div>
  );
};
