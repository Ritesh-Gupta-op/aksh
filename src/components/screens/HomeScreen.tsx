import React, { useState } from 'react';
import { SalaryDetails } from '../../types/tax';
import { formatINR } from '../../utils/taxCalculator';

interface HomeScreenProps {
  salary: SalaryDetails;
  onNavigateTab: (tab: string) => void;
  onOpenBreakdownModal: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  salary,
  onNavigateTab,
  onOpenBreakdownModal,
}) => {
  const [selectedRow, setSelectedRow] = useState<string | null>(null);

  const toggleRow = (rowName: string) => {
    setSelectedRow((prev) => (prev === rowName ? null : rowName));
  };

  const monthlyGross = salary.basicMonthly + salary.hraMonthly + salary.specialMonthly;
  const monthlyTds = 14700; // estimated monthly TDS on ₹20.52L baseline
  const monthlyTakeHome = monthlyGross - salary.epfMonthly - 200 - monthlyTds;

  return (
    <div className="flex flex-col w-full pb-10 space-y-space-xl max-w-2xl mx-auto">
      {/* Top Voucher Intro / Hero Statement */}
      <section className="flex flex-col space-y-space-md pt-space-xs">
        <div className="inline-flex items-center self-start gap-space-xs px-space-md py-1 bg-[#e7e8eb] rounded text-[#3f4948] shadow-sm">
          <span className="material-symbols-outlined text-[15px] text-[#1b6968]" style={{ fontVariationSettings: "'FILL' 1" }}>
            verified
          </span>
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-[#1b6968] font-bold">
            FY 2025-26 SALARIED TAX GUIDE
          </span>
        </div>

        <div className="space-y-space-xs">
          <h1 className="font-display-lg-mobile text-display-lg-mobile text-[#191c1e] font-semibold tracking-tight text-balance leading-tight">
            Your private tax coach that decodes payslips and finds legal savings.
          </h1>
          <p className="font-body-md text-body-md text-[#3f4948] leading-relaxed">
            Built specifically for Indian salaried professionals caught between the Old and New tax regimes.
          </p>
        </div>

        {/* Quick Stat Strip / Trust Ledger */}
        <div className="grid grid-cols-3 gap-space-xs pt-space-xs">
          <div className="bg-[#f3f3f7] rounded-lg p-space-sm flex flex-col justify-between shadow-sm border border-[#e1e2e6]/50">
            <span className="font-label-sm text-label-sm text-[#3f4948] uppercase">Engine</span>
            <span className="font-figure-md text-figure-md text-[#1b6968] font-semibold mt-1">Budget 2025</span>
          </div>
          <div className="bg-[#f3f3f7] rounded-lg p-space-sm flex flex-col justify-between shadow-sm border border-[#e1e2e6]/50">
            <span className="font-label-sm text-label-sm text-[#3f4948] uppercase">Privacy</span>
            <span className="font-figure-md text-figure-md text-[#1b6968] font-semibold mt-1">Zero Server</span>
          </div>
          <div className="bg-[#f3f3f7] rounded-lg p-space-sm flex flex-col justify-between shadow-sm border border-[#e1e2e6]/50">
            <span className="font-label-sm text-label-sm text-[#3f4948] uppercase">Optimal</span>
            <span className="font-figure-md text-figure-md text-[#1b6968] font-semibold mt-1">₹18k+ Delta</span>
          </div>
        </div>
      </section>

      {/* Visual Asset: Tactile Physical Slips Imagery */}
      <div className="relative w-full rounded-xl overflow-hidden bg-[#edeef1] shadow-sm h-36 flex items-end p-space-md border border-[#bec9c8]/30">
        <img
          className="absolute inset-0 w-full h-full object-cover mix-blend-multiply opacity-85"
          alt="Close up editorial flatlay photography of an authentic physical Indian printed salary slip"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBq5-ufKNCwXNuCNhsELi9mF_afIpq-3NeFw4AzVJC5osMLKnJyIoA7czZOllLzRGN64CvC3tFYmmS2qMAxh9p07TIe7jYyPAZUcAhsJU1MkUKrvzWLknEBgOSy5ENhwgODQCVkbI2eau6kUPmXzSwNADFAgBPks7oWd6utR_WB0rbYVsEAc-olA3NPtviLxM66_5pjWC_rJLQdtUwzS3O1colYDnWUAoVa0HmOW7fHHCcjk6SVYBSF8Q"
          onError={(e) => {
            (e.currentTarget as HTMLElement).style.display = 'none';
          }}
        />
        <div className="relative z-10 bg-[#f8f9fc]/95 backdrop-blur-md px-space-md py-1.5 rounded-lg shadow-sm flex items-center justify-between w-full border border-white/50">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-[#1b6968] text-[18px]">receipt</span>
            <span className="font-label-sm text-label-sm text-[#191c1e] font-medium">Voucher Decryption Engine Active</span>
          </div>
          <span className="font-figure-md text-label-sm text-[#3f4948]">SEC 192 IT ACT</span>
        </div>
      </div>

      {/* Interactive Annotated Payslip Hero Card */}
      <section className="flex flex-col space-y-space-sm">
        <div className="flex items-center justify-between px-space-xs">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-[#1b6968] text-[18px]">document_scanner</span>
            <span className="font-label-lg text-label-lg text-[#191c1e]">Interactive Payslip Anatomy</span>
          </div>
          <span className="font-body-sm text-body-sm text-[#3f4948]">Tap row to inspect</span>
        </div>

        {/* Payslip Container */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden relative flex flex-col border border-[#bec9c8]/40">
          {/* Header */}
          <div className="bg-[#e7e8eb] p-space-md flex items-start justify-between border-b border-[#bec9c8]/30">
            <div className="flex flex-col min-w-0">
              <span className="font-headline-sm text-headline-sm font-bold text-[#191c1e] uppercase tracking-tight">
                BHARAT TECHWORKS LABS PVT LTD
              </span>
              <span className="font-body-sm text-body-sm text-[#3f4948] mt-0.5">Pay Advice • Month: October 2025</span>
              <span className="font-figure-md text-[11px] text-[#6f7978] mt-0.5">UAN: 100876129841 | PAN: ABCDE1234F</span>
            </div>
            <div className="flex-shrink-0 ml-2 rotate-[-4deg] bg-[#aeeeec]/90 border border-[#2e6e6d]/30 px-space-sm py-1 rounded shadow-sm">
              <div className="flex items-center gap-0.5">
                <span className="material-symbols-outlined text-[13px] text-[#2e6e6d]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_circle
                </span>
                <span className="font-label-sm text-[10px] text-[#2e6e6d] font-extrabold uppercase tracking-widest">
                  VERIFIED SALARY
                </span>
              </div>
            </div>
          </div>

          {/* Rows with Plain-Language Callout Annotations */}
          <div className="flex flex-col p-space-md space-y-space-md bg-white">
            {/* Row 1: Basic */}
            <div
              onClick={() => toggleRow('basic')}
              className={`flex flex-col rounded-lg p-space-sm transition-all cursor-pointer border ${
                selectedRow === 'basic' ? 'bg-[#edeef1] border-[#1b6968] ring-1 ring-[#1b6968]' : 'bg-[#f3f3f7] border-transparent hover:bg-[#edeef1]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <span className="font-body-md text-body-md font-medium text-[#191c1e]">Basic Salary</span>
                  <span className="material-symbols-outlined text-[15px] text-[#6f7978]">info</span>
                </div>
                <span className="font-figure-lg text-figure-lg text-[#191c1e] font-semibold">
                  ₹{formatINR(salary.basicMonthly)}.00
                </span>
              </div>
              <div className="mt-2 inline-flex items-center gap-1.5 self-start bg-[#e1e2e6] px-space-sm py-1 rounded text-[#3f4948] text-xs">
                <span className="font-label-sm text-label-sm font-bold text-[#191c1e]">The Foundation:</span>
                <span className="font-body-sm text-body-sm text-[#3f4948]">100% taxable, sets EPF baseline &amp; HRA ceiling</span>
              </div>
            </div>

            {/* Row 2: HRA */}
            <div
              onClick={() => toggleRow('hra')}
              className={`flex flex-col rounded-lg p-space-sm transition-all cursor-pointer border ${
                selectedRow === 'hra' ? 'bg-[#aeeeec]/40 border-[#276867] ring-1 ring-[#276867]' : 'bg-[#aeeeec]/25 border-transparent hover:bg-[#aeeeec]/35'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <span className="font-body-md text-body-md font-semibold text-[#276867]">House Rent Allowance (HRA)</span>
                  <span className="material-symbols-outlined text-[16px] text-[#276867]">home_pin</span>
                </div>
                <span className="font-figure-lg text-figure-lg text-[#276867] font-bold">
                  ₹{formatINR(salary.hraMonthly)}.00
                </span>
              </div>
              <div className="mt-2 inline-flex items-center gap-1.5 self-start bg-[#aeeeec] px-space-sm py-1 rounded text-[#2e6e6d] text-xs">
                <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                <span className="font-label-sm text-label-sm font-bold">Tax-Free Potential:</span>
                <span className="font-body-sm text-body-sm">Can be fully tax-exempt in Old Regime if paying rent</span>
              </div>
            </div>

            {/* Row 3: Special Allowance */}
            <div
              onClick={() => toggleRow('special')}
              className={`flex flex-col rounded-lg p-space-sm transition-all cursor-pointer border ${
                selectedRow === 'special' ? 'bg-[#ffdad6]/40 border-[#ba1a1a] ring-1 ring-[#ba1a1a]' : 'bg-[#ffdad6]/20 border-transparent hover:bg-[#ffdad6]/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <span className="font-body-md text-body-md font-medium text-[#191c1e]">Special Allowance</span>
                  <span className="material-symbols-outlined text-[15px] text-[#ba1a1a]">trending_down</span>
                </div>
                <span className="font-figure-lg text-figure-lg text-[#191c1e] font-semibold">
                  ₹{formatINR(salary.specialMonthly)}.00
                </span>
              </div>
              <div className="mt-2 inline-flex items-center gap-1.5 self-start bg-[#ffdad6]/70 px-space-sm py-1 rounded text-[#93000a] text-xs">
                <span className="material-symbols-outlined text-[14px]">warning</span>
                <span className="font-label-sm text-label-sm font-bold">Full Tax Drain:</span>
                <span className="font-body-sm text-body-sm">Catch-all bucket with zero statutory exemptions</span>
              </div>
            </div>

            {/* Row 4: EPF */}
            <div
              onClick={() => toggleRow('epf')}
              className={`flex flex-col rounded-lg p-space-sm transition-all cursor-pointer border ${
                selectedRow === 'epf' ? 'bg-[#a8efee]/40 border-[#1b6968] ring-1 ring-[#1b6968]' : 'bg-[#a8efee]/20 border-transparent hover:bg-[#a8efee]/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <span className="font-body-md text-body-md font-medium text-[#191c1e]">Employee Provident Fund (EPF)</span>
                  <span className="material-symbols-outlined text-[15px] text-[#1b6968]">lock_clock</span>
                </div>
                <span className="font-figure-lg text-figure-lg text-[#ba1a1a] font-medium">
                  -₹{formatINR(salary.epfMonthly)}.00
                </span>
              </div>
              <div className="mt-2 inline-flex items-center gap-1.5 self-start bg-[#8cd3d1]/40 px-space-sm py-1 rounded text-[#00504f] text-xs">
                <span className="material-symbols-outlined text-[14px]">savings</span>
                <span className="font-label-sm text-label-sm font-bold">Forced 80C Saving:</span>
                <span className="font-body-sm text-body-sm">Locked nest egg auto-consuming ₹1.5L ceiling</span>
              </div>
            </div>
          </div>

          {/* Payslip Perforation / Accounting Tally Summary */}
          <div className="bg-[#e7e8eb] p-space-md flex flex-col space-y-space-xs border-t border-[#bec9c8]/30">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-[#3f4948] uppercase">Gross Monthly Earnings</span>
              <span className="font-figure-md text-figure-md text-[#191c1e] font-medium">
                ₹{formatINR(monthlyGross)}.00
              </span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="font-label-lg text-label-lg font-bold text-[#191c1e]">Net In-Hand Take-Home</span>
              <span className="font-figure-xl text-headline-sm font-bold text-[#1b6968]">
                ₹{formatINR(monthlyTakeHome)}.00
              </span>
            </div>
            <div className="pt-1 flex items-center justify-between text-[#3f4948] font-body-sm text-body-sm">
              <span>*TDS of ₹{formatINR(monthlyTds)} deducted automatically</span>
              <button
                onClick={onOpenBreakdownModal}
                className="underline text-[#1b6968] font-semibold cursor-pointer hover:text-[#00504f]"
              >
                View breakdown
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Hero Primary Call To Action */}
      <section className="flex flex-col space-y-space-xs pt-space-xs">
        <button
          onClick={() => onNavigateTab('salary')}
          className="w-full bg-[#599f9e] hover:bg-[#1b6968] active:scale-[0.99] transition-all text-white font-headline-sm text-headline-sm py-space-md px-space-lg rounded-xl shadow-md flex items-center justify-center gap-space-sm cursor-pointer"
        >
          <span className="font-bold">Analyze my payslip</span>
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </button>
        <div className="flex items-center justify-center gap-space-xs pt-1 text-[#3f4948]">
          <span className="material-symbols-outlined text-[16px] text-[#1b6968]">shield_person</span>
          <span className="font-body-sm text-body-sm">Takes &lt; 45 seconds • No PAN or Aadhaar login required</span>
        </div>
      </section>

      {/* Proven Case Study Card */}
      <section className="bg-white rounded-xl p-space-md shadow-md flex flex-col space-y-space-sm border border-[#bec9c8]/30">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1 bg-[#edeef1] px-space-sm py-0.5 rounded text-[#3f4948]">
            <span className="material-symbols-outlined text-[14px] text-[#78592f]">workspace_premium</span>
            <span className="font-label-sm text-label-sm font-bold uppercase tracking-wider text-[#78592f]">
              PROVEN CASE STUDY
            </span>
          </div>
          <span className="font-figure-md text-label-sm text-[#1b6968] font-bold">Bengaluru Tech Lead</span>
        </div>
        <div className="flex flex-col">
          <div className="font-display-lg-mobile text-headline-md font-bold text-[#191c1e] leading-tight">
            Old Regime saves{' '}
            <span className="text-[#1b6968] font-figure-xl text-headline-lg underline decoration-[#599f9e]">
              ₹2,600
            </span>{' '}
            a year
          </div>
          <p className="font-body-md text-body-md text-[#3f4948] mt-1">
            On a ₹20.5 Lakh CTC with ₹25,000 monthly metro rent + statutory EPF.
          </p>
        </div>

        {/* Visual Delta Spark */}
        <div className="bg-[#f3f3f7] rounded-lg p-space-sm space-y-space-xs border border-[#e1e2e6]">
          <div className="flex items-center justify-between text-body-sm font-body-sm">
            <span className="text-[#3f4948]">Standard Setup (HRA + 80C)</span>
            <span className="font-figure-md font-semibold text-[#1b6968]">Old saves ₹2,600</span>
          </div>
          {/* Mini bar comparison */}
          <div className="w-full bg-[#e1e2e6] rounded-full h-2 overflow-hidden flex">
            <div className="bg-[#1b6968] h-full w-[54%]"></div>
            <div className="bg-[#bec9c8] h-full w-[46%]"></div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1 text-[#191c1e] font-body-sm text-body-sm">
              <span className="material-symbols-outlined text-[15px] text-[#78592f]">add_circle</span>
              <span className="font-medium">With ₹50k Tier-1 NPS:</span>
            </div>
            <span className="font-figure-md text-label-lg font-bold text-[#1b6968]">Savings grow to ₹18,200</span>
          </div>
        </div>
      </section>

      {/* Section: 'Why Aksh exists' & 3 Numbered Steps */}
      <section className="flex flex-col space-y-space-md">
        <div className="space-y-space-xs">
          <div className="inline-flex items-center gap-1 text-[#1b6968]">
            <span className="material-symbols-outlined text-[18px]">lightbulb</span>
            <span className="font-label-sm text-label-sm font-bold uppercase tracking-wider">The Problem</span>
          </div>
          <h2 className="font-headline-lg text-headline-lg text-[#191c1e] font-semibold">
            Why Aksh exists
          </h2>
          <p className="font-body-md text-body-md text-[#3f4948] leading-relaxed">
            Every financial year, HR portals force Indian engineers and managers to blindly pick between the Old and
            New tax regimes. One careless click deducts an extra ₹25,000 to ₹90,000 from monthly paychecks because
            corporate portals never decode your actual allowances.
          </p>
        </div>

        {/* 3 Numbered Step Cards */}
        <div className="flex flex-col space-y-space-sm">
          <div className="bg-white rounded-xl p-space-md shadow-sm flex items-start gap-space-md border border-[#e1e2e6]">
            <div className="w-10 h-10 rounded-lg bg-[#edeef1] flex items-center justify-center flex-shrink-0 text-[#1b6968] font-figure-lg font-bold">
              01
            </div>
            <div className="flex flex-col min-w-0">
              <h3 className="font-headline-sm text-headline-sm font-semibold text-[#191c1e]">Paste or Enter Slip</h3>
              <p className="font-body-md text-body-md text-[#3f4948] mt-0.5">
                Copy the earnings column from your portal or type numbers into our zero-clutter Form 16 builder.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-space-md shadow-sm flex items-start gap-space-md border border-[#e1e2e6]">
            <div className="w-10 h-10 rounded-lg bg-[#aeeeec] flex items-center justify-center flex-shrink-0 text-[#2e6e6d] font-figure-lg font-bold">
              02
            </div>
            <div className="flex flex-col min-w-0">
              <h3 className="font-headline-sm text-headline-sm font-semibold text-[#191c1e]">See Which Regime Wins</h3>
              <p className="font-body-md text-body-md text-[#3f4948] mt-0.5">
                Instant side-by-side ledger computation across revised 2025-26 slabs, standard deductions, and HRA rules.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-space-md shadow-sm flex items-start gap-space-md border border-[#e1e2e6]">
            <div className="w-10 h-10 rounded-lg bg-[#599f9e] flex items-center justify-center flex-shrink-0 text-white font-figure-lg font-bold">
              03
            </div>
            <div className="flex flex-col min-w-0">
              <h3 className="font-headline-sm text-headline-sm font-semibold text-[#191c1e]">Follow the Action Plan</h3>
              <p className="font-body-md text-body-md text-[#3f4948] mt-0.5">
                Get exact proof submission steps for your employer portal—rent receipts, NPS challan dates, and health insurance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Editorial Visual: Desk with Ledger & Calculation */}
      <div className="relative w-full rounded-xl overflow-hidden bg-[#edeef1] shadow-sm h-40 flex items-center p-space-md border border-[#bec9c8]/30">
        <img
          className="absolute inset-0 w-full h-full object-cover mix-blend-multiply opacity-80"
          alt="Editorial overhead photograph of an Indian accountant ledger notebook"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCP7B53AVT0Cqq167FPqHfFhUanl7AeebKl0lFWjkES0fAS2jrGF1zfAZZIw-cjuwfuvE7UiNEi3_sJ8Ejeg9A5ceE8YwXxkdn8du6pC26Gfgl4FdbVhb6lQABxn-SNz_XujXGI_NpDHLcEd4LB_8CKBkd6zxKSZOp_mZLHtM-tlEhkPNJISO_7yahn06j-6eoNoWUPEnO4IyDpEOilfYCGa5moJtreLhlKEP6VkEbTb5stqzLt90dA5g"
          onError={(e) => {
            (e.currentTarget as HTMLElement).style.display = 'none';
          }}
        />
        <div className="relative z-10 max-w-[85%] bg-[#f8f9fc]/95 backdrop-blur-md p-space-sm rounded-lg shadow-sm border border-white/60">
          <span className="font-label-sm text-label-sm uppercase font-bold text-[#1b6968] block">Transparent Logic</span>
          <span className="font-body-sm text-body-sm text-[#191c1e] mt-0.5 block">
            Every formula matches Central Board of Direct Taxes (CBDT) circulars item-by-item.
          </span>
        </div>
      </div>

      {/* Privacy & Guardrails Section */}
      <section className="flex flex-col space-y-space-sm">
        <div className="bg-white rounded-xl p-space-md shadow-sm flex flex-col space-y-space-xs border border-[#e1e2e6]">
          <div className="flex items-center gap-space-xs text-[#1b6968]">
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              security
            </span>
            <h3 className="font-headline-sm text-headline-sm font-bold text-[#191c1e]">
              Privacy First: Device-Only Sandbox
            </h3>
          </div>
          <p className="font-body-md text-body-md text-[#3f4948]">
            Your salary figures never leave this smartphone. Aksh runs client-side calculations entirely inside your
            browser memory. We have no databases, no tracking pixels, and no ad brokers selling your salary data.
          </p>
          <div className="pt-1 flex items-center gap-space-xs text-[#3f4948] font-label-sm text-label-sm">
            <span className="material-symbols-outlined text-[15px] text-[#1b6968]">check</span>
            <span>Local DOM storage</span>
            <span className="mx-1">•</span>
            <span className="material-symbols-outlined text-[15px] text-[#1b6968]">check</span>
            <span>No phone number requested</span>
          </div>
        </div>

        <div className="bg-[#f3f3f7] rounded-xl p-space-md shadow-sm flex flex-col space-y-space-xs border border-[#e1e2e6]">
          <div className="flex items-center gap-space-xs text-[#3f4948]">
            <span className="material-symbols-outlined text-[18px]">rule</span>
            <h4 className="font-label-lg text-label-lg font-semibold text-[#191c1e]">Scope &amp; Honest Boundaries</h4>
          </div>
          <p className="font-body-sm text-body-sm text-[#3f4948] leading-relaxed">
            To maintain 100% privacy and accuracy, Aksh does not:
          </p>
          <ul className="space-y-1 font-body-sm text-body-sm text-[#3f4948]">
            <li className="flex items-start gap-space-xs">
              <span className="text-[#ba1a1a] font-bold">•</span>
              <span>Parse password-protected PDFs directly yet (simply paste text or enter figures).</span>
            </li>
            <li className="flex items-start gap-space-xs">
              <span className="text-[#ba1a1a] font-bold">•</span>
              <span>Compute active stock trading, intraday, or crypto capital gains (Section 115BBH).</span>
            </li>
            <li className="flex items-start gap-space-xs">
              <span className="text-[#ba1a1a] font-bold">•</span>
              <span>Offer regional languages currently (available in crisp English for FY 2025-26).</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Sticky Quick Action Bar Before Tab Bar */}
      <div className="bg-[#e7e8eb] rounded-xl p-space-md flex items-center justify-between shadow-sm border border-[#bec9c8]/30">
        <div className="flex flex-col">
          <span className="font-label-lg text-label-lg font-bold text-[#191c1e]">Ready to check your numbers?</span>
          <span className="font-body-sm text-body-sm text-[#3f4948]">Free, instant, and private.</span>
        </div>
        <button
          onClick={() => onNavigateTab('salary')}
          className="bg-[#1b6968] text-white px-space-md py-2 rounded-lg font-label-lg text-label-lg font-semibold hover:bg-[#003232] active:scale-95 transition-all flex items-center gap-1 shadow-sm cursor-pointer"
        >
          <span>Start</span>
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
        </button>
      </div>

      {/* Editorial Disclaimer Footer Note */}
      <footer className="pt-space-xs pb-space-sm text-center flex flex-col items-center justify-center space-y-1">
        <p className="font-body-sm text-body-sm text-[#6f7978] italic">
          Aksh is an educational tax advisory simulator. For complex dual-country payroll or multi-city home loan set-offs,
          talk to a qualified Chartered Accountant (CA).
        </p>
        <span className="font-label-sm text-[10px] text-[#6f7978] uppercase tracking-widest pt-1">
          AKSH FISCAL INSTRUMENTS • FY 2025-26 CBDT READY
        </span>
      </footer>
    </div>
  );
};
