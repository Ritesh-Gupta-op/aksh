import React, { useState } from 'react';
import { SalaryDetails } from '../../types/tax';
import { computeTaxComparison, formatINR } from '../../utils/taxCalculator';

interface SalaryScreenProps {
  salary: SalaryDetails;
  onUpdateSalary: (updated: Partial<SalaryDetails>) => void;
  onNavigateTab: (tab: string) => void;
}

export const SalaryScreen: React.FC<SalaryScreenProps> = ({
  salary,
  onUpdateSalary,
  onNavigateTab,
}) => {
  const [slipText, setSlipText] = useState<string>(
`Basic: ₹85,000
HRA: ₹42,500
EPF: ₹10,200
Gross: ₹1,71,000`
  );
  const [showManual, setShowManual] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [activeRegimeTab, setActiveRegimeTab] = useState<'OLD' | 'NEW'>('OLD');
  const [analyzedSuccess, setAnalyzedSuccess] = useState<boolean>(false);

  // Parse text or compute from current salary state
  const comparison = computeTaxComparison(salary);
  const oldReg = comparison.oldRegime;
  const newReg = comparison.newRegime;

  const basicAnnual = salary.basicMonthly * 12;
  const hraAnnual = salary.hraMonthly * 12;
  const specialAnnual = salary.specialMonthly * 12;
  const grossAnnual = basicAnnual + hraAnnual + specialAnnual + salary.bonusAnnual;
  const epfAnnual = salary.epfMonthly * 12;
  const rentAnnual = salary.rentMonthly * 12;

  // Rupee percentages
  const takeHomePct = Math.round((oldReg.annualTakeHome / grossAnnual) * 100) || 78;
  const taxPct = Math.round((oldReg.totalAnnualTax / grossAnnual) * 100) || 12;
  const epfPct = Math.round((epfAnnual / grossAnnual) * 100) || 6;
  const otherPct = Math.max(1, 100 - takeHomePct - taxPct - epfPct);

  // 80C progress
  const used80C = Math.min(150000, epfAnnual + salary.voluntary80C);
  const headroom80C = Math.max(0, 150000 - used80C);
  const percent80C = Math.min(100, Math.round((used80C / 150000) * 100));

  const handleParseSlip = () => {
    setIsAnalyzing(true);
    // Simple robust regex extraction for Indian payslips
    const lines = slipText.split('\n');
    let newBasic = salary.basicMonthly;
    let newHra = salary.hraMonthly;
    let newEpf = salary.epfMonthly;

    lines.forEach((line) => {
      const clean = line.replace(/,/g, '');
      const numMatch = clean.match(/(\d+[\d,]*)/);
      if (!numMatch) return;
      const val = parseInt(numMatch[1].replace(/,/g, ''), 10);
      if (isNaN(val)) return;

      if (/basic/i.test(line)) {
        newBasic = val > 100000 ? Math.round(val / 12) : val;
      } else if (/hra|rent\s*allowance/i.test(line)) {
        newHra = val > 80000 ? Math.round(val / 12) : val;
      } else if (/epf|provident|pf/i.test(line)) {
        newEpf = val > 30000 ? Math.round(val / 12) : val;
      }
    });

    setTimeout(() => {
      onUpdateSalary({
        basicMonthly: newBasic,
        hraMonthly: newHra,
        epfMonthly: newEpf,
      });
      setIsAnalyzing(false);
      setAnalyzedSuccess(true);
      setTimeout(() => setAnalyzedSuccess(false), 2000);
    }, 450);
  };

  const handleTrySample = () => {
    const sample = `ACME CORP SALARY STATEMENT
Employee: Aksh User
Basic Salary: ₹95,000
HRA: ₹47,500
Transport Allowance: ₹3,200
Special Allowance: ₹32,000
EPF Contribution: ₹11,400
Professional Tax: ₹200
Gross Earnings: ₹1,77,700
Net Payable: ₹1,66,100`;
    setSlipText(sample);
  };

  return (
    <div className="flex flex-col w-full pb-10 space-y-space-lg max-w-2xl mx-auto">
      {/* Top Intro Voucher Block */}
      <div className="bg-[#f3f3f7] rounded-lg p-space-md shadow-sm relative overflow-hidden border border-[#e1e2e6]">
        <div className="flex items-start justify-between gap-space-sm mb-space-xs">
          <div className="min-w-0">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-[#1b6968] text-[20px]">receipt_long</span>
              <h1 className="font-headline-sm text-headline-sm text-[#191c1e] font-semibold tracking-tight">
                Analyze your salary slip
              </h1>
            </div>
            <p className="font-body-sm text-body-sm text-[#3f4948] mt-0.5">
              Paste text directly from your slip or supply manual figures.
            </p>
          </div>
          <span className="font-label-sm text-label-sm px-space-xs py-0.5 bg-[#aeeeec] text-[#00201f] rounded uppercase font-semibold">
            FY 2025-26
          </span>
        </div>

        {/* Textarea with Fiscal Slip Styling */}
        <div className="mt-space-md">
          <div className="flex items-center justify-between pb-1">
            <label className="font-label-sm text-label-sm uppercase tracking-wider text-[#3f4948] font-bold" htmlFor="slip-text">
              Slip OCR / Raw Content
            </label>
            <button
              onClick={() => setSlipText('')}
              className="font-figure-md text-[11px] text-[#1b6968] cursor-pointer hover:underline"
            >
              Clear
            </button>
          </div>
          <div className="bg-white rounded-lg p-space-sm shadow-inner border border-[#bec9c8]/40 focus-within:ring-1 focus-within:ring-[#1b6968] transition-all">
            <textarea
              id="slip-text"
              className="w-full bg-transparent font-figure-md text-figure-md text-[#191c1e] focus:outline-none resize-none placeholder:text-[#6f7978]"
              rows={4}
              value={slipText}
              onChange={(e) => setSlipText(e.target.value)}
              placeholder="Basic: ₹85,000&#10;HRA: ₹42,500&#10;EPF: ₹10,200&#10;Gross: ₹1,71,000"
            />
          </div>
        </div>

        {/* Secondary Action & Accordion Trigger */}
        <div className="mt-space-sm flex items-center justify-between gap-space-sm">
          <button
            type="button"
            onClick={handleTrySample}
            className="inline-flex items-center gap-1 font-label-sm text-label-sm text-[#276867] hover:text-[#1b6968] transition-colors py-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">magic_button</span>
            <span>Try a sample payslip</span>
          </button>
          <button
            type="button"
            onClick={() => setShowManual(!showManual)}
            className="inline-flex items-center gap-1 font-label-sm text-label-sm text-[#3f4948] hover:text-[#191c1e] transition-colors py-1 cursor-pointer"
          >
            <span
              className={`material-symbols-outlined text-[16px] transition-transform duration-200 ${
                showManual ? 'rotate-180' : ''
              }`}
            >
              expand_more
            </span>
            <span>Enter details manually</span>
          </button>
        </div>

        {/* Manual Accordion Tray */}
        {showManual && (
          <div className="mt-space-md pt-space-md bg-[#edeef1] rounded-lg p-space-md space-y-space-sm border border-[#bec9c8]/40">
            <div className="grid grid-cols-2 gap-space-sm">
              <div className="bg-white p-space-xs rounded shadow-sm border border-[#e1e2e6]">
                <label className="font-label-sm text-[10px] text-[#3f4948] uppercase block">Basic (Annual)</label>
                <div className="flex items-center">
                  <span className="text-xs text-[#6f7978] mr-1">₹</span>
                  <input
                    type="number"
                    value={salary.basicMonthly * 12}
                    onChange={(e) =>
                      onUpdateSalary({ basicMonthly: Math.round(Number(e.target.value) / 12) || 0 })
                    }
                    className="w-full font-figure-md text-figure-md text-[#191c1e] font-semibold bg-transparent focus:outline-none"
                  />
                </div>
              </div>
              <div className="bg-white p-space-xs rounded shadow-sm border border-[#e1e2e6]">
                <label className="font-label-sm text-[10px] text-[#3f4948] uppercase block">HRA (Annual)</label>
                <div className="flex items-center">
                  <span className="text-xs text-[#6f7978] mr-1">₹</span>
                  <input
                    type="number"
                    value={salary.hraMonthly * 12}
                    onChange={(e) =>
                      onUpdateSalary({ hraMonthly: Math.round(Number(e.target.value) / 12) || 0 })
                    }
                    className="w-full font-figure-md text-figure-md text-[#191c1e] font-semibold bg-transparent focus:outline-none"
                  />
                </div>
              </div>
              <div className="bg-white p-space-xs rounded shadow-sm border border-[#e1e2e6]">
                <label className="font-label-sm text-[10px] text-[#3f4948] uppercase block">Bonus / Special</label>
                <div className="flex items-center">
                  <span className="text-xs text-[#6f7978] mr-1">₹</span>
                  <input
                    type="number"
                    value={salary.specialMonthly * 12 + salary.bonusAnnual}
                    onChange={(e) =>
                      onUpdateSalary({ specialMonthly: Math.round(Number(e.target.value) / 12) || 0 })
                    }
                    className="w-full font-figure-md text-figure-md text-[#191c1e] font-semibold bg-transparent focus:outline-none"
                  />
                </div>
              </div>
              <div className="bg-white p-space-xs rounded shadow-sm border border-[#e1e2e6]">
                <label className="font-label-sm text-[10px] text-[#3f4948] uppercase block">EPF Deduction</label>
                <div className="flex items-center">
                  <span className="text-xs text-[#6f7978] mr-1">₹</span>
                  <input
                    type="number"
                    value={salary.epfMonthly * 12}
                    onChange={(e) =>
                      onUpdateSalary({ epfMonthly: Math.round(Number(e.target.value) / 12) || 0 })
                    }
                    className="w-full font-figure-md text-figure-md text-[#191c1e] font-semibold bg-transparent focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white p-space-xs rounded shadow-sm flex items-center justify-between border border-[#e1e2e6]">
              <div>
                <span className="font-label-sm text-[10px] text-[#3f4948] uppercase block">Annual Rent Paid</span>
                <div className="flex items-center">
                  <span className="text-xs text-[#6f7978] mr-1">₹</span>
                  <input
                    type="number"
                    value={salary.rentMonthly * 12}
                    onChange={(e) =>
                      onUpdateSalary({ rentMonthly: Math.round(Number(e.target.value) / 12) || 0 })
                    }
                    className="w-28 font-figure-md text-figure-md text-[#191c1e] font-semibold bg-transparent focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center gap-space-xs">
                <label className="flex items-center gap-1 font-label-sm text-[11px] text-[#3f4948] cursor-pointer">
                  <input
                    type="radio"
                    name="city-type"
                    checked={salary.isMetro}
                    onChange={() => onUpdateSalary({ isMetro: true })}
                    className="accent-[#1b6968]"
                  />
                  <span>Metro</span>
                </label>
                <label className="flex items-center gap-1 font-label-sm text-[11px] text-[#3f4948] ml-2 cursor-pointer">
                  <input
                    type="radio"
                    name="city-type"
                    checked={!salary.isMetro}
                    onChange={() => onUpdateSalary({ isMetro: false })}
                    className="accent-[#1b6968]"
                  />
                  <span>Non-Metro</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Main Call to Action Button */}
        <div className="mt-space-md">
          <button
            type="button"
            onClick={handleParseSlip}
            className="w-full bg-[#599f9e] hover:bg-[#1b6968] active:scale-[0.99] text-[#003232] hover:text-white font-headline-sm text-headline-sm py-space-sm px-space-md rounded-lg font-semibold flex items-center justify-center gap-space-xs shadow-sm transition-all cursor-pointer"
          >
            {isAnalyzing ? (
              <>
                <span className="material-symbols-outlined text-[20px] animate-spin">refresh</span>
                <span>Computing Ledger...</span>
              </>
            ) : analyzedSuccess ? (
              <>
                <span className="material-symbols-outlined text-[20px] text-white">task_alt</span>
                <span className="text-white">Voucher Verified!</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]">calculate</span>
                <span>Analyze my salary</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Regime Comparison Tabs for Mobile */}
      <div className="flex flex-col space-y-space-md">
        <div className="flex items-center justify-between px-space-xs">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-[#276867] text-[20px]">balance</span>
            <h2 className="font-headline-sm text-headline-sm text-[#191c1e] font-semibold">Regime Breakdown</h2>
          </div>
          <div className="flex bg-[#e7e8eb] rounded p-0.5">
            <button
              onClick={() => setActiveRegimeTab('OLD')}
              className={`px-space-sm py-0.5 rounded font-label-sm text-label-sm font-semibold transition-all cursor-pointer ${
                activeRegimeTab === 'OLD'
                  ? 'bg-white text-[#1b6968] shadow-sm'
                  : 'text-[#3f4948] hover:text-[#191c1e]'
              }`}
            >
              Old Regime
            </button>
            <button
              onClick={() => setActiveRegimeTab('NEW')}
              className={`px-space-sm py-0.5 rounded font-label-sm text-label-sm font-semibold transition-all cursor-pointer ${
                activeRegimeTab === 'NEW'
                  ? 'bg-white text-[#1b6968] shadow-sm'
                  : 'text-[#3f4948] hover:text-[#191c1e]'
              }`}
            >
              New Regime
            </button>
          </div>
        </div>

        {/* Old Tax Regime Card (Recommended) */}
        <div
          className={`rounded-lg p-space-md shadow-sm relative transition-all border ${
            comparison.recommended === 'OLD'
              ? 'bg-[#aeeeec]/20 border-[#276867]/30'
              : 'bg-[#edeef1]/50 border-transparent opacity-80'
          }`}
        >
          <div className="flex items-start justify-between mb-space-xs">
            <div>
              <div className="flex items-center gap-space-xs">
                <span className="font-headline-sm text-headline-sm text-[#191c1e] font-bold">Old Tax Regime</span>
                {comparison.recommended === 'OLD' && (
                  <span className="inline-flex items-center px-space-xs py-0.5 rounded bg-[#1b6968] text-white font-label-sm text-[10px] tracking-wider uppercase font-bold transform -rotate-1 shadow-sm">
                    RECOMMENDED
                  </span>
                )}
              </div>
              <span className="font-body-sm text-body-sm text-[#3f4948]">Includes HRA, 80C, 80D deductions</span>
            </div>
          </div>

          {/* Main Highlight Voucher Banner */}
          {comparison.savings > 0 && (
            <div className="mt-space-sm bg-[#1b6968]/10 rounded p-space-xs flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-[#1b6968] text-[18px]">verified</span>
              <span className="font-label-lg text-label-lg text-[#1b6968] font-semibold">
                Save ₹{formatINR(comparison.savings)} over New Regime
              </span>
            </div>
          )}

          {/* Ledger Numbers Grid */}
          <div className="mt-space-md grid grid-cols-2 gap-space-sm">
            <div className="bg-white p-space-sm rounded shadow-sm border border-[#e1e2e6]">
              <span className="font-label-sm text-label-sm uppercase text-[#3f4948] block">Total Annual Tax</span>
              <span className="font-figure-xl text-figure-xl text-[#191c1e] font-bold tracking-tight block mt-0.5">
                ₹{formatINR(oldReg.totalAnnualTax)}
              </span>
              <span className="font-body-sm text-[11px] text-[#3f4948] block mt-0.5">
                Taxable: ₹{formatINR(oldReg.taxableIncome)}
              </span>
            </div>
            <div className="bg-white p-space-sm rounded shadow-sm border border-[#e1e2e6]">
              <span className="font-label-sm text-label-sm uppercase text-[#3f4948] block">Annual Take-Home</span>
              <span className="font-figure-lg text-figure-lg text-[#276867] font-bold tracking-tight block mt-0.5">
                ₹{formatINR(oldReg.annualTakeHome)}
              </span>
              <span className="font-body-sm text-[11px] text-[#3f4948] block mt-0.5">
                Effective Rate: {oldReg.effectiveTaxRate}%
              </span>
            </div>
          </div>
        </div>

        {/* New Tax Regime Card */}
        <div
          className={`rounded-lg p-space-md shadow-sm relative transition-all border ${
            comparison.recommended === 'NEW'
              ? 'bg-[#aeeeec]/20 border-[#276867]/30'
              : 'bg-[#ffddb6]/20 border-[#78592f]/20'
          }`}
        >
          <div className="flex items-start justify-between mb-space-xs">
            <div>
              <span className="font-headline-sm text-headline-sm text-[#191c1e] font-bold">New Tax Regime</span>
              <span className="font-body-sm text-body-sm text-[#3f4948] block">Default standard ₹75,000 deduction</span>
            </div>
            <span className="font-label-sm text-[11px] text-[#6f7978] px-space-xs py-0.5 rounded bg-[#edeef1]">
              {comparison.recommended === 'NEW' ? 'RECOMMENDED' : 'Alternative'}
            </span>
          </div>

          {/* Ledger Numbers Grid */}
          <div className="mt-space-md grid grid-cols-2 gap-space-sm">
            <div className="bg-white p-space-sm rounded shadow-sm border border-[#e1e2e6]">
              <span className="font-label-sm text-label-sm uppercase text-[#3f4948] block">Total Annual Tax</span>
              <span className="font-figure-xl text-figure-xl text-[#191c1e] font-bold tracking-tight block mt-0.5">
                ₹{formatINR(newReg.totalAnnualTax)}
              </span>
              <span className="font-body-sm text-[11px] text-[#3f4948] block mt-0.5">
                Taxable: ₹{formatINR(newReg.taxableIncome)}
              </span>
            </div>
            <div className="bg-white p-space-sm rounded shadow-sm border border-[#e1e2e6]">
              <span className="font-label-sm text-label-sm uppercase text-[#3f4948] block">Annual Take-Home</span>
              <span className="font-figure-lg text-figure-lg text-[#191c1e] font-bold tracking-tight block mt-0.5">
                ₹{formatINR(newReg.annualTakeHome)}
              </span>
              <span className="font-body-sm text-[11px] text-[#3f4948] block mt-0.5">
                Effective Rate: {newReg.effectiveTaxRate}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Rupee Distribution Bar Section */}
      <div className="bg-[#f3f3f7] rounded-lg p-space-md shadow-sm border border-[#e1e2e6]">
        <div className="flex items-center justify-between mb-space-sm">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-[#1b6968] text-[20px]">pie_chart</span>
            <h3 className="font-headline-sm text-headline-sm text-[#191c1e] font-semibold">Where each rupee goes</h3>
          </div>
          <span className="font-label-sm text-label-sm text-[#3f4948]">Annual Gross ₹{formatINR(grossAnnual)}</span>
        </div>

        {/* Stacked Ledger Bar */}
        <div className="w-full h-7 rounded-lg overflow-hidden flex shadow-inner bg-[#e1e2e6]">
          <div
            className="bg-[#aeeeec] h-full transition-all duration-500 relative flex items-center justify-center"
            style={{ width: `${takeHomePct}%` }}
            title={`Take-Home ${takeHomePct}%`}
          >
            <span className="font-figure-md text-[11px] font-bold text-[#2e6e6d]">{takeHomePct}%</span>
          </div>
          <div
            className="bg-[#ffdad6] h-full transition-all duration-500 relative flex items-center justify-center"
            style={{ width: `${taxPct}%` }}
            title={`Income Tax ${taxPct}%`}
          >
            <span className="font-figure-md text-[11px] font-bold text-[#93000a]">{taxPct}%</span>
          </div>
          <div
            className="bg-[#ffddb6] h-full transition-all duration-500 relative flex items-center justify-center"
            style={{ width: `${epfPct}%` }}
            title={`EPF ${epfPct}%`}
          >
            <span className="font-figure-md text-[10px] font-bold text-[#2a1800]">{epfPct}%</span>
          </div>
          <div
            className="bg-[#bec9c8] h-full transition-all duration-500 relative flex items-center justify-center"
            style={{ width: `${otherPct}%` }}
            title={`Other Deductions ${otherPct}%`}
          >
            <span className="font-figure-md text-[9px] font-bold text-[#3f4948]">{otherPct}%</span>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-space-md grid grid-cols-2 gap-space-xs pt-space-xs">
          <div className="flex items-center gap-space-xs">
            <span className="w-3 h-3 rounded-sm bg-[#aeeeec] flex-shrink-0"></span>
            <span className="font-body-sm text-body-sm text-[#191c1e]">
              Take-Home: <strong className="font-figure-md">{takeHomePct}%</strong>
            </span>
          </div>
          <div className="flex items-center gap-space-xs">
            <span className="w-3 h-3 rounded-sm bg-[#ffdad6] flex-shrink-0"></span>
            <span className="font-body-sm text-body-sm text-[#191c1e]">
              Income Tax: <strong className="font-figure-md">{taxPct}%</strong>
            </span>
          </div>
          <div className="flex items-center gap-space-xs">
            <span className="w-3 h-3 rounded-sm bg-[#ffddb6] flex-shrink-0"></span>
            <span className="font-body-sm text-body-sm text-[#191c1e]">
              Mandatory EPF: <strong className="font-figure-md">{epfPct}%</strong>
            </span>
          </div>
          <div className="flex items-center gap-space-xs">
            <span className="w-3 h-3 rounded-sm bg-[#bec9c8] flex-shrink-0"></span>
            <span className="font-body-sm text-body-sm text-[#191c1e]">
              Prof. Tax / Other: <strong className="font-figure-md">{otherPct}%</strong>
            </span>
          </div>
        </div>
      </div>

      {/* 80C Usage Progress Tracker */}
      <div className="bg-white rounded-lg p-space-md shadow-sm space-y-space-xs border border-[#e1e2e6]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-[#1b6968] text-[18px]">verified_user</span>
            <span className="font-label-lg text-label-lg text-[#191c1e] font-semibold">Section 80C Utilization</span>
          </div>
          <span className="font-figure-md text-figure-md text-[#1b6968] font-bold">{percent80C}% Filled</span>
        </div>
        <div className="w-full bg-[#e7e8eb] rounded-full h-3 overflow-hidden shadow-inner mt-space-xs">
          <div
            className="bg-[#1b6968] h-full rounded-full transition-all duration-500"
            style={{ width: `${percent80C}%` }}
          />
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="font-figure-md text-[12px] text-[#3f4948] font-medium">
            ₹{formatINR(used80C)} used of ₹1,50,000
          </span>
          <span className="font-label-sm text-[11px] text-[#1b6968] font-bold">
            ₹{formatINR(headroom80C)} headroom left
          </span>
        </div>
        <p className="font-body-sm text-body-sm text-[#3f4948] pt-0.5">
          Tip: Exhaust the remaining headroom via tax-saving ELSS mutual funds or voluntary PPF deposit before March 31.
        </p>
      </div>

      {/* Warning Notices (Tactile Tint Panels) */}
      <div className="space-y-space-sm">
        {rentAnnual > 100000 && (
          <div className="bg-[#ffdad6]/40 p-space-sm rounded-lg flex items-start gap-space-xs shadow-sm border border-[#ffdad6]">
            <span className="material-symbols-outlined text-[#ba1a1a] text-[20px] flex-shrink-0 mt-0.5">warning</span>
            <div className="min-w-0">
              <span className="font-label-sm text-label-sm font-bold text-[#93000a] uppercase tracking-wide block">
                Compliance Check
              </span>
              <p className="font-body-sm text-body-sm text-[#191c1e] leading-snug mt-0.5">
                Your total rent paid exceeds <strong>₹1,00,000</strong> annually. Ensure you possess your landlord's PAN to
                validate HRA exemption during audit scrutiny.
              </p>
            </div>
          </div>
        )}

        <div className="bg-[#ffddb6]/30 p-space-sm rounded-lg flex items-start gap-space-xs shadow-sm border border-[#ffddb6]/60">
          <span className="material-symbols-outlined text-[#78592f] text-[20px] flex-shrink-0 mt-0.5">info</span>
          <div className="min-w-0">
            <span className="font-label-sm text-label-sm font-bold text-[#3f2703] uppercase tracking-wide block">
              Deduction Saturation
            </span>
            <p className="font-body-sm text-body-sm text-[#191c1e] leading-snug mt-0.5">
              Section 80C deduction cap of <strong>₹1,50,000</strong> is nearly reached with your mandatory EPF alone
              (₹{formatINR(epfAnnual)}).
            </p>
          </div>
        </div>
      </div>

      {/* Salary Component Explanations (Component Ledger) */}
      <div className="bg-[#f3f3f7] rounded-lg p-space-md shadow-sm border border-[#e1e2e6]">
        <div className="flex items-center justify-between mb-space-xs">
          <h3 className="font-headline-sm text-headline-sm text-[#191c1e] font-semibold flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-[#276867] text-[20px]">table_rows</span>
            <span>Component Ledger</span>
          </h3>
          <span className="font-label-sm text-label-sm text-[#3f4948]">Taxability Breakdown</span>
        </div>
        <div className="divide-none space-y-space-xs mt-space-sm">
          {/* Basic */}
          <div className="bg-white p-space-sm rounded shadow-sm flex items-center justify-between border border-[#e1e2e6]">
            <div>
              <span className="font-label-lg text-label-lg text-[#191c1e] block font-medium">Basic Salary</span>
              <span className="font-body-sm text-body-sm text-[#3f4948]">The fully taxable core of your salary.</span>
            </div>
            <div className="text-right">
              <span className="font-figure-md text-figure-md text-[#191c1e] font-bold block">
                ₹{formatINR(basicAnnual)}
              </span>
              <span className="font-label-sm text-[10px] text-[#ba1a1a] font-bold uppercase">100% Taxable</span>
            </div>
          </div>

          {/* HRA */}
          <div className="bg-white p-space-sm rounded shadow-sm flex items-center justify-between border border-[#e1e2e6]">
            <div>
              <span className="font-label-lg text-label-lg text-[#191c1e] block font-medium">
                House Rent Allowance (HRA)
              </span>
              <span className="font-body-sm text-body-sm text-[#3f4948]">Tax-exempt under Sec 10(13A).</span>
            </div>
            <div className="text-right">
              <span className="font-figure-md text-figure-md text-[#191c1e] font-bold block">
                ₹{formatINR(hraAnnual)}
              </span>
              <span className="font-label-sm text-[10px] text-[#1b6968] font-bold uppercase">Partial Exemption</span>
            </div>
          </div>

          {/* Special */}
          <div className="bg-white p-space-sm rounded shadow-sm flex items-center justify-between border border-[#e1e2e6]">
            <div>
              <span className="font-label-lg text-label-lg text-[#191c1e] block font-medium">Special Allowance</span>
              <span className="font-body-sm text-body-sm text-[#3f4948]">Zero exemptions allowed u/s 17(1).</span>
            </div>
            <div className="text-right">
              <span className="font-figure-md text-figure-md text-[#191c1e] font-bold block">
                ₹{formatINR(specialAnnual)}
              </span>
              <span className="font-label-sm text-[10px] text-[#ba1a1a] font-bold uppercase">Taxable</span>
            </div>
          </div>

          {/* EPF */}
          <div className="bg-white p-space-sm rounded shadow-sm flex items-center justify-between border border-[#e1e2e6]">
            <div>
              <span className="font-label-lg text-label-lg text-[#191c1e] block font-medium">
                Employee Provident Fund
              </span>
              <span className="font-body-sm text-body-sm text-[#3f4948]">Counts towards ₹1.5L 80C threshold.</span>
            </div>
            <div className="text-right">
              <span className="font-figure-md text-figure-md text-[#191c1e] font-bold block">
                ₹{formatINR(epfAnnual)}
              </span>
              <span className="font-label-sm text-[10px] text-[#276867] font-bold uppercase">80C Deduction</span>
            </div>
          </div>
        </div>
      </div>

      {/* Personalized Tax Action Plan */}
      <div className="space-y-space-sm">
        <div className="flex items-center justify-between px-space-xs">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-[#1b6968] text-[20px]">flag</span>
            <h3 className="font-headline-sm text-headline-sm text-[#191c1e] font-semibold">
              Personalized Tax Action Plan
            </h3>
          </div>
          <span className="font-label-sm text-label-sm text-[#1b6968] font-bold">Save up to ₹26,400</span>
        </div>

        {/* High Impact: NPS */}
        <div
          onClick={() => onNavigateTab('simulator')}
          className="bg-white rounded-lg p-space-md shadow-sm relative overflow-hidden border border-[#e1e2e6] hover:border-[#1b6968] transition-all cursor-pointer group"
        >
          <div className="flex items-start justify-between gap-space-sm">
            <div className="space-y-0.5">
              <div className="flex items-center gap-space-xs">
                <span className="px-space-xs py-0.5 bg-[#ffdad6] text-[#93000a] rounded font-label-sm text-[10px] font-bold uppercase">
                  High Impact
                </span>
                <span className="font-label-sm text-[11px] text-[#3f4948]">Sec 80CCD(1B)</span>
              </div>
              <p className="font-label-lg text-label-lg text-[#191c1e] font-semibold group-hover:text-[#1b6968] transition-colors">
                Allocate ₹50,000 into National Pension System (NPS)
              </p>
              <p className="font-body-sm text-body-sm text-[#3f4948]">
                Dedicated exclusive deduction over and above the Section 80C ceiling.
              </p>
            </div>
            <div className="bg-[#1b6968]/10 px-space-sm py-1 rounded text-right flex-shrink-0">
              <span className="font-label-sm text-[10px] text-[#1b6968] uppercase font-bold block">Potential</span>
              <span className="font-figure-md text-figure-md text-[#1b6968] font-bold">Save ₹15,600</span>
            </div>
          </div>
        </div>

        {/* Medium Impact: 80D */}
        <div
          onClick={() => onNavigateTab('simulator')}
          className="bg-white rounded-lg p-space-md shadow-sm relative overflow-hidden border border-[#e1e2e6] hover:border-[#276867] transition-all cursor-pointer group"
        >
          <div className="flex items-start justify-between gap-space-sm">
            <div className="space-y-0.5">
              <div className="flex items-center gap-space-xs">
                <span className="px-space-xs py-0.5 bg-[#ffddb6] text-[#2a1800] rounded font-label-sm text-[10px] font-bold uppercase">
                  Medium Impact
                </span>
                <span className="font-label-sm text-[11px] text-[#3f4948]">Sec 80D</span>
              </div>
              <p className="font-label-lg text-label-lg text-[#191c1e] font-semibold group-hover:text-[#276867] transition-colors">
                Optimise Section 80D Mediclaim Premium
              </p>
              <p className="font-body-sm text-body-sm text-[#3f4948]">
                Include health insurance policy premiums for self, spouse, and parents.
              </p>
            </div>
            <div className="bg-[#276867]/10 px-space-sm py-1 rounded text-right flex-shrink-0">
              <span className="font-label-sm text-[10px] text-[#276867] uppercase font-bold block">Potential</span>
              <span className="font-figure-md text-figure-md text-[#276867] font-bold">Save ₹7,800</span>
            </div>
          </div>
        </div>

        {/* Low Impact: 80C Gap */}
        <div
          onClick={() => onNavigateTab('simulator')}
          className="bg-white rounded-lg p-space-md shadow-sm relative overflow-hidden border border-[#e1e2e6] hover:border-[#1b6968] transition-all cursor-pointer group"
        >
          <div className="flex items-start justify-between gap-space-sm">
            <div className="space-y-0.5">
              <div className="flex items-center gap-space-xs">
                <span className="px-space-xs py-0.5 bg-[#edeef1] text-[#3f4948] rounded font-label-sm text-[10px] font-bold uppercase">
                  Low Impact
                </span>
                <span className="font-label-sm text-[11px] text-[#3f4948]">Sec 80C Gap</span>
              </div>
              <p className="font-label-lg text-label-lg text-[#191c1e] font-semibold group-hover:text-[#1b6968] transition-colors">
                Maximize Voluntary Provident Fund (VPF)
              </p>
              <p className="font-body-sm text-body-sm text-[#3f4948]">
                Top-up the ₹{formatINR(headroom80C)} buffer left under the 80C threshold seamlessly.
              </p>
            </div>
            <div className="bg-[#edeef1] px-space-sm py-1 rounded text-right flex-shrink-0">
              <span className="font-label-sm text-[10px] text-[#3f4948] uppercase font-bold block">Potential</span>
              <span className="font-figure-md text-figure-md text-[#191c1e] font-bold">Save ₹3,000</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
