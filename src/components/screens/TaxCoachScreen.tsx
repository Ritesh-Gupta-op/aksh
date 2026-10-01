import React, { useState } from 'react';
import { SalaryDetails, ChatMessage } from '../../types/tax';
import { computeTaxComparison, formatINR, formatINRLakh } from '../../utils/taxCalculator';

interface TaxCoachScreenProps {
  salary: SalaryDetails;
  onNavigateTab: (tab: string) => void;
}

export const TaxCoachScreen: React.FC<TaxCoachScreenProps> = ({ salary, onNavigateTab }) => {
  const comparison = computeTaxComparison(salary);
  const grossAnnual =
    (salary.basicMonthly + salary.hraMonthly + salary.specialMonthly) * 12 + salary.bonusAnnual;
  const rentAnnual = salary.rentMonthly * 12;

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'user',
      content: 'Should I switch to the new regime?',
      timestamp: '10:41 AM',
    },
    {
      id: '2',
      sender: 'bot',
      content: `Based on your salary of ₹${formatINR(grossAnnual)} and ₹${formatINR(
        rentAnnual
      )} annual rent, the ${
        comparison.recommended === 'OLD' ? 'Old Regime is currently superior by ₹' + formatINR(comparison.savings) : 'New Regime is currently superior by ₹' + formatINR(Math.abs(comparison.savings))
      }.`,
      timestamp: '10:41 AM',
      highlightCard: {
        title: 'Salary Grounding Breakdown',
        items: [
          { label: 'HRA Exemption u/s 10(13A)', value: `₹${formatINR(comparison.oldRegime.hraExemption)}` },
          { label: 'Mandatory EPF (Sec 80C)', value: `₹${formatINR(comparison.oldRegime.section80C)}` },
          { label: 'Standard Deduction (Old)', value: '₹50,000' },
        ],
        footerNote:
          "Your HRA exemption and mandatory EPF tip the scale. However, if you do not have verified rent receipts with your landlord's PAN, the New Regime becomes the safer choice.",
      },
    },
    {
      id: '3',
      sender: 'user',
      content: 'How much extra do I save if I put ₹50,000 in NPS?',
      timestamp: '10:43 AM',
    },
    {
      id: '4',
      sender: 'bot',
      content:
        'Under Section 80CCD(1B), NPS grants an exclusive ₹50,000 deduction strictly over and above the ₹1.5L 80C cap.',
      timestamp: '10:44 AM',
      highlightCard: {
        title: '30% Marginal Slab Impact',
        savingsTag: '+₹15,600',
        footerNote:
          '30% base savings + 4% Health & Education cess. Net effective tax reduction for FY 2025-26. In your slab, this additional ₹50,000 NPS contribution will save you exactly ₹15,600 in net tax under the Old Regime, expanding your total tax lead to ₹18,200.',
      },
    },
  ]);

  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [helpfulMap, setHelpfulMap] = useState<Record<string, boolean>>({});

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const toggleHelpful = (id: string) => {
    setHelpfulMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend ?? inputPrompt).trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');

    // Generate intelligent grounded tax response
    setTimeout(() => {
      let botResponse: ChatMessage;
      const lower = text.toLowerCase();

      if (lower.includes('hra') || lower.includes('rent')) {
        const hraEx = comparison.oldRegime.hraExemption;
        botResponse = {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          content: `Under Section 10(13A), your HRA exemption is computed as the lowest of: (1) Actual HRA received (₹${formatINR(
            salary.hraMonthly * 12
          )}), (2) ${salary.isMetro ? '50%' : '40%'} of basic (₹${formatINR(
            salary.basicMonthly * 12 * (salary.isMetro ? 0.5 : 0.4)
          )}), and (3) Rent paid minus 10% basic (₹${formatINR(
            Math.max(0, rentAnnual - salary.basicMonthly * 12 * 0.1)
          )}).`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          highlightCard: {
            title: 'HRA Exemption Result',
            savingsTag: `₹${formatINR(hraEx)} exempt`,
            footerNote:
              rentAnnual > 100000
                ? "Note: Because your annual rent exceeds ₹1 Lakh, your employer portal will mandate the landlord's PAN."
                : 'Rent is under ₹1 Lakh; landlord PAN is optional for TDS proof.',
          },
        };
      } else if (lower.includes('regime') || lower.includes('switch') || lower.includes('better')) {
        const lead = comparison.savings >= 0 ? 'Old Regime' : 'New Regime';
        const delta = Math.abs(comparison.savings);
        botResponse = {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          content: `For your FY 2025-26 salary structure, the ${lead} saves you ₹${formatINR(
            delta
          )} annually in direct income tax.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          highlightCard: {
            title: 'Side-by-Side Slabs Comparison',
            items: [
              { label: 'Old Regime Tax', value: `₹${formatINR(comparison.oldRegime.totalAnnualTax)}` },
              { label: 'New Regime Tax', value: `₹${formatINR(comparison.newRegime.totalAnnualTax)}` },
              { label: 'Recommended Choice', value: lead },
            ],
            footerNote:
              'Tip: You can dynamically simulate altering your NPS and EPF contributions in the Simulator tab to increase this gap.',
          },
        };
      } else if (lower.includes('80d') || lower.includes('medical') || lower.includes('health')) {
        botResponse = {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          content:
            'Section 80D allows tax deductions on health insurance mediclaim premiums. You can claim up to ₹25,000 for self, spouse, and dependent children. Plus an additional ₹25,000 for parents (or up to ₹50,000 if parents are senior citizens aged 60+).',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          highlightCard: {
            title: 'Section 80D Potential Savings',
            savingsTag: 'Up to ₹23,400 Saved',
            footerNote:
              'At a 30% slab, a ₹75,000 total deduction (self + senior parents) reduces income tax by ₹23,400 (including 4% cess).',
          },
        };
      } else {
        botResponse = {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          content: `Grounded in your current numbers (Gross: ${formatINRLakh(
            grossAnnual
          )}, Basic: ₹${formatINR(salary.basicMonthly)}/mo, Rent: ₹${formatINR(
            salary.rentMonthly
          )}/mo): Every allowance is evaluated item-by-item against CBDT notifications for FY 2025-26.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          highlightCard: {
            title: 'CBDT FY 2025-26 Guidance',
            footerNote:
              'Standard deduction in Old is ₹50,000; in New Regime it is ₹75,000. Under Old, HRA, 80C, 80D, and 80CCD(1B) apply. You can test each parameter directly on the Simulator tab.',
          },
        };
      }

      setMessages((prev) => [...prev, botResponse]);
    }, 450);
  };

  return (
    <div className="flex flex-col w-full pb-2 max-w-2xl mx-auto">
      {/* Ask Aksh Header */}
      <div className="flex flex-col gap-space-xs mb-space-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-[#599f9e] animate-pulse"></span>
            <h1 className="font-headline-md text-headline-md text-[#191c1e]">Ask Aksh</h1>
          </div>
          <div className="flex items-center gap-1 bg-[#edeef1] px-space-xs py-0.5 rounded text-[#3f4948] font-label-sm text-label-sm">
            <span className="material-symbols-outlined text-[13px] text-[#1b6968]">verified_user</span>
            <span>FY 2025-26 Live</span>
          </div>
        </div>
        <p className="font-body-sm text-body-sm text-[#3f4948] leading-relaxed">
          Instant clarity on tax rules, deduction caps, and regime decisions grounded in your actual numbers.
        </p>
      </div>

      {/* Salary Grounding Ledger Strip */}
      <div className="bg-[#f3f3f7] rounded-xl p-space-sm mb-space-lg shadow-sm border border-[#e1e2e6]">
        <div className="flex items-center justify-between mb-space-xs">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-[16px] text-[#1b6968]">account_balance_wallet</span>
            <span className="font-label-sm text-label-sm text-[#1b6968] uppercase tracking-wider font-bold">
              Salary Grounding Ledger
            </span>
          </div>
          <span className="font-label-sm text-label-sm text-[#3f4948]">Sync #882B</span>
        </div>
        <div className="bg-white rounded-lg p-space-sm flex flex-wrap items-center gap-y-1 gap-x-2 text-[#191c1e] border border-[#e1e2e6]">
          <span className="inline-flex items-center gap-1 bg-[#edeef1] px-2 py-0.5 rounded font-figure-md text-figure-md font-semibold text-[#191c1e]">
            <span className="text-[#3f4948] font-normal text-[11px]">Gross:</span> {formatINRLakh(grossAnnual)}
          </span>
          <span className="inline-flex items-center gap-1 bg-[#aeeeec] px-2 py-0.5 rounded font-label-sm text-label-sm font-semibold text-[#00201f]">
            <span className="material-symbols-outlined text-[13px]">trending_up</span>{' '}
            {comparison.recommended === 'OLD'
              ? `Old Regime (+₹${formatINR(comparison.savings)})`
              : `New Regime (+₹${formatINR(Math.abs(comparison.savings))})`}
          </span>
          <span className="inline-flex items-center gap-1 bg-[#edeef1] px-2 py-0.5 rounded font-figure-md text-figure-md text-[#3f4948]">
            <span className="text-[#3f4948] font-normal text-[11px]">Rent:</span> ₹{formatINR(salary.rentMonthly)}/mo
          </span>
        </div>
      </div>

      {/* Chat Stream */}
      <div className="flex flex-col gap-space-md mb-space-lg">
        {messages.map((msg) => {
          if (msg.sender === 'user') {
            return (
              <div key={msg.id} className="flex justify-end pl-8">
                <div className="bg-[#e7e8eb] rounded-xl rounded-tr-none px-space-md py-space-sm max-w-[88%] shadow-sm border border-[#bec9c8]/30">
                  <div className="flex items-center justify-end gap-1 mb-1">
                    <span className="font-label-sm text-label-sm text-[#3f4948]">You</span>
                  </div>
                  <p className="font-body-md text-body-md text-[#191c1e]">{msg.content}</p>
                  <span className="block text-right font-label-sm text-label-sm text-[#6f7978] mt-1">
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id} className="flex flex-col pr-4">
              <div className="flex items-center gap-space-xs mb-1">
                <div className="w-5 h-5 rounded-full bg-[#1b6968] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[12px] text-white">smart_toy</span>
                </div>
                <span className="font-label-sm text-label-sm text-[#1b6968] font-semibold">Aksh Tax Companion</span>
                <span className="font-label-sm text-label-sm text-[#6f7978]">• Model 25.4</span>
              </div>
              <div className="bg-white rounded-xl rounded-tl-none p-space-md shadow-sm border border-[#e1e2e6]">
                <p className="font-body-md text-body-md text-[#191c1e] leading-relaxed mb-space-sm">{msg.content}</p>

                {/* Optional Highlight Card */}
                {msg.highlightCard && (
                  <div className="bg-[#f3f3f7] rounded-lg p-space-sm mb-space-sm flex flex-col gap-1 border border-[#e1e2e6]">
                    {msg.highlightCard.savingsTag && (
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-label-sm text-label-sm text-[#1b6968] font-semibold">
                          {msg.highlightCard.title}
                        </span>
                        <span className="font-figure-md text-figure-md font-bold text-[#1b6968]">
                          {msg.highlightCard.savingsTag}
                        </span>
                      </div>
                    )}

                    {msg.highlightCard.items &&
                      msg.highlightCard.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center text-[#3f4948] font-label-sm text-label-sm"
                        >
                          <span>{item.label}</span>
                          <span className="font-figure-md text-figure-md text-[#191c1e] font-semibold">
                            {item.value}
                          </span>
                        </div>
                      ))}

                    {msg.highlightCard.footerNote && (
                      <p className="font-body-sm text-body-sm text-[#3f4948] mt-1 leading-snug">
                        {msg.highlightCard.footerNote}
                      </p>
                    )}
                  </div>
                )}

                <div className="mt-space-sm pt-space-xs flex items-center justify-between text-[#3f4948] border-t border-[#edeef1]">
                  <div className="flex items-center gap-space-xs">
                    <button
                      type="button"
                      onClick={() => toggleHelpful(msg.id)}
                      className={`flex items-center gap-0.5 text-[11px] font-label-sm transition-colors cursor-pointer ${
                        helpfulMap[msg.id] ? 'text-[#1b6968] font-bold' : 'text-[#3f4948] hover:text-[#1b6968]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]">thumb_up</span>
                      <span>{helpfulMap[msg.id] ? 'Helpful (1)' : 'Helpful'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy(msg.id, msg.content)}
                      className="flex items-center gap-0.5 text-[#3f4948] hover:text-[#1b6968] transition-colors text-[11px] font-label-sm cursor-pointer ml-2"
                    >
                      <span className="material-symbols-outlined text-[14px]">content_copy</span>
                      <span>{copiedId === msg.id ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                  <span className="font-label-sm text-label-sm text-[#6f7978]">{msg.timestamp}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Suggested Queries */}
      <div className="mb-space-md">
        <div className="flex items-center justify-between mb-space-xs">
          <span className="font-label-sm text-label-sm text-[#3f4948] uppercase tracking-wider font-semibold">
            Suggested Queries
          </span>
          <span className="font-label-sm text-label-sm text-[#1b6968]">Personalized</span>
        </div>
        <div className="flex gap-space-xs overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => handleSendMessage('Should I switch to the new regime?')}
            className="flex-shrink-0 bg-[#edeef1] hover:bg-[#aeeeec] text-[#191c1e] hover:text-[#00201f] px-space-sm py-1.5 rounded-lg text-left transition-colors font-body-sm text-body-sm shadow-sm flex items-center gap-1 cursor-pointer border border-[#bec9c8]/20"
          >
            <span className="material-symbols-outlined text-[14px] text-[#1b6968]">compare_arrows</span>
            <span>Should I switch to the new regime?</span>
          </button>
          <button
            type="button"
            onClick={() => handleSendMessage('How much extra do I save with NPS?')}
            className="flex-shrink-0 bg-[#edeef1] hover:bg-[#aeeeec] text-[#191c1e] hover:text-[#00201f] px-space-sm py-1.5 rounded-lg text-left transition-colors font-body-sm text-body-sm shadow-sm flex items-center gap-1 cursor-pointer border border-[#bec9c8]/20"
          >
            <span className="material-symbols-outlined text-[14px] text-[#1b6968]">savings</span>
            <span>How much extra do I save with NPS?</span>
          </button>
          <button
            type="button"
            onClick={() => handleSendMessage('Is my HRA fully exempt?')}
            className="flex-shrink-0 bg-[#edeef1] hover:bg-[#aeeeec] text-[#191c1e] hover:text-[#00201f] px-space-sm py-1.5 rounded-lg text-left transition-colors font-body-sm text-body-sm shadow-sm flex items-center gap-1 cursor-pointer border border-[#bec9c8]/20"
          >
            <span className="material-symbols-outlined text-[14px] text-[#1b6968]">home</span>
            <span>Is my HRA fully exempt?</span>
          </button>
          <button
            type="button"
            onClick={() => handleSendMessage('What are Section 80D limits for parents?')}
            className="flex-shrink-0 bg-[#edeef1] hover:bg-[#aeeeec] text-[#191c1e] hover:text-[#00201f] px-space-sm py-1.5 rounded-lg text-left transition-colors font-body-sm text-body-sm shadow-sm flex items-center gap-1 cursor-pointer border border-[#bec9c8]/20"
          >
            <span className="material-symbols-outlined text-[14px] text-[#1b6968]">medical_services</span>
            <span>What are Section 80D limits for parents?</span>
          </button>
        </div>
      </div>

      {/* Input Box */}
      <div className="bg-white rounded-xl p-space-xs shadow-md mb-space-sm border border-[#e1e2e6]">
        <form
          className="flex items-center gap-space-xs"
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
        >
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="Ask a question about your payslip, regimes, or 80C limits..."
              className="w-full bg-[#f3f3f7] rounded-lg pl-3 pr-2 py-2.5 font-body-sm text-body-sm text-[#191c1e] placeholder:text-[#6f7978] focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#1b6968] transition-all"
            />
          </div>
          <button
            type="submit"
            aria-label="Send query"
            className="w-10 h-10 rounded-lg bg-[#1b6968] hover:bg-[#599f9e] text-white flex items-center justify-center flex-shrink-0 transition-transform active:scale-95 shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">send</span>
          </button>
        </form>
      </div>

      <div className="flex items-center justify-center gap-1.5 text-center px-space-sm">
        <span className="material-symbols-outlined text-[14px] text-[#6f7978] flex-shrink-0">info</span>
        <p className="font-body-sm text-body-sm text-[#6f7978] text-[11px]">
          Responses are for tax planning guidance. For complex cases, talk to a CA.
        </p>
      </div>
    </div>
  );
};
