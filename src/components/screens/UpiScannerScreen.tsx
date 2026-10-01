import React, { useState } from 'react';
import { SalaryDetails } from '../../types/tax';
import { formatINR } from '../../utils/taxCalculator';

interface UpiScannerScreenProps {
  salary: SalaryDetails;
  onUpdateSalary: (updated: Partial<SalaryDetails>) => void;
  onNavigateTab: (tab: string) => void;
}

export const UpiScannerScreen: React.FC<UpiScannerScreenProps> = ({
  salary,
  onUpdateSalary,
  onNavigateTab,
}) => {
  const [activeMode, setActiveMode] = useState<'scan' | 'upi'>('scan');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanComplete, setScanComplete] = useState<boolean>(false);
  const [advanceTaxAmount, setAdvanceTaxAmount] = useState<number>(14700);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleSimulateScan = () => {
    setIsScanning(true);
    setScanComplete(false);
    setTimeout(() => {
      setIsScanning(false);
      setScanComplete(true);
    }, 1200);
  };

  const handleApplyScannedValues = () => {
    onUpdateSalary({
      basicMonthly: 85000,
      hraMonthly: 42500,
      specialMonthly: 28500,
      epfMonthly: 10200,
    });
    onNavigateTab('salary');
  };

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 1800);
  };

  return (
    <div className="flex flex-col w-full pb-10 space-y-space-lg max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex flex-col space-y-space-xs">
        <div className="flex items-center justify-between">
          <h1 className="font-headline-lg text-headline-lg text-[#191c1e] tracking-tight">
            Scanner &amp; UPI Challan
          </h1>
          <span className="px-space-xs py-0.5 rounded bg-[#aeeeec] text-[#00201f] font-label-sm text-label-sm uppercase tracking-wider">
            Device Sandbox
          </span>
        </div>
        <p className="font-body-md text-body-md text-[#3f4948]">
          OCR capture physical payslips without uploading to any remote server, or generate UPI QR for Challan ITNS 280 tax payments.
        </p>
      </div>

      {/* Segmented Mode Switcher */}
      <div className="p-1 rounded-xl bg-[#edeef1] flex items-center shadow-sm border border-[#bec9c8]/30">
        <button
          type="button"
          onClick={() => setActiveMode('scan')}
          className={`flex-1 py-space-sm px-space-md rounded-lg font-label-lg text-label-lg transition-all flex items-center justify-center gap-space-xs cursor-pointer ${
            activeMode === 'scan'
              ? 'bg-white text-[#1b6968] shadow-sm'
              : 'text-[#3f4948] hover:text-[#191c1e]'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">document_scanner</span>
          <span>Payslip OCR Scanner</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveMode('upi')}
          className={`flex-1 py-space-sm px-space-md rounded-lg font-label-lg text-label-lg transition-all flex items-center justify-center gap-space-xs cursor-pointer ${
            activeMode === 'upi'
              ? 'bg-white text-[#1b6968] shadow-sm'
              : 'text-[#3f4948] hover:text-[#191c1e]'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">qr_code_2</span>
          <span>UPI Tax Challan Pay</span>
        </button>
      </div>

      {activeMode === 'scan' ? (
        <div className="flex flex-col space-y-space-md">
          {/* Scanner Viewfinder Box */}
          <div className="relative w-full rounded-2xl overflow-hidden bg-[#191c1e] text-white p-6 shadow-md border border-[#3f4948] flex flex-col items-center justify-center min-h-[300px]">
            {isScanning ? (
              <div className="flex flex-col items-center justify-center space-y-3 z-10">
                <div className="w-16 h-16 rounded-full border-4 border-[#8cd3d1] border-t-transparent animate-spin" />
                <span className="font-headline-sm text-headline-sm text-white font-semibold">
                  Decrypting Salary Voucher...
                </span>
                <span className="font-body-sm text-body-sm text-[#bec9c8]">
                  Reading Basic, HRA, EPF and TDS Line Items
                </span>
                {/* Laser scan line */}
                <div className="absolute inset-x-0 h-1 bg-[#8cd3d1] shadow-[0_0_15px_#8cd3d1] top-1/2 -translate-y-1/2 animate-pulse" />
              </div>
            ) : scanComplete ? (
              <div className="w-full flex flex-col space-y-3 z-10">
                <div className="flex items-center justify-between pb-2 border-b border-white/20">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#8cd3d1]">task_alt</span>
                    <span className="font-headline-sm text-headline-sm text-white">Voucher Decrypted</span>
                  </div>
                  <span className="font-figure-md text-xs bg-[#8cd3d1]/20 text-[#8cd3d1] px-2 py-0.5 rounded">
                    100% Match
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white/10 p-2 rounded">
                    <span className="text-gray-300 block">Basic Salary</span>
                    <span className="font-figure-md text-sm font-bold text-white">₹85,000.00</span>
                  </div>
                  <div className="bg-white/10 p-2 rounded">
                    <span className="text-gray-300 block">HRA (Rent Allowance)</span>
                    <span className="font-figure-md text-sm font-bold text-[#8cd3d1]">₹42,500.00</span>
                  </div>
                  <div className="bg-white/10 p-2 rounded">
                    <span className="text-gray-300 block">Special Allowance</span>
                    <span className="font-figure-md text-sm font-bold text-white">₹28,500.00</span>
                  </div>
                  <div className="bg-white/10 p-2 rounded">
                    <span className="text-gray-300 block">EPF Deduction</span>
                    <span className="font-figure-md text-sm font-bold text-[#ffdad6]">-₹10,200.00</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleApplyScannedValues}
                  className="w-full mt-2 py-2.5 bg-[#8cd3d1] text-[#002020] font-label-lg font-bold rounded-xl hover:bg-white transition-all flex items-center justify-center gap-1 shadow cursor-pointer"
                >
                  <span>Sync to Salary Ledger</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center space-y-3 p-4">
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-[#8cd3d1]">
                  <span className="material-symbols-outlined text-[36px]">document_scanner</span>
                </div>
                <div className="space-y-1">
                  <h3 className="font-headline-sm text-headline-sm font-bold text-white">
                    Scan or Upload Physical Slip
                  </h3>
                  <p className="font-body-sm text-body-sm text-[#bec9c8] max-w-sm">
                    Hold camera over your salary advice or test with sample corporate voucher. All processing stays 100% on your device.
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleSimulateScan}
                    className="px-4 py-2 bg-[#1b6968] hover:bg-[#599f9e] text-white rounded-lg font-label-lg text-sm font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow"
                  >
                    <span className="material-symbols-outlined text-[18px]">camera_alt</span>
                    <span>Scan Sample Slip</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Privacy Guarantee callout */}
          <div className="bg-white rounded-xl p-space-md shadow-sm border border-[#e1e2e6] flex items-start gap-space-sm">
            <span className="material-symbols-outlined text-[#1b6968] text-[20px] flex-shrink-0 mt-0.5">
              shield_locked
            </span>
            <div className="space-y-0.5">
              <span className="font-label-lg text-label-lg text-[#191c1e] font-semibold">Zero-Cloud Guarantee</span>
              <p className="font-body-sm text-body-sm text-[#3f4948]">
                Tesseract.js OCR engine runs strictly in WebAssembly inside your browser tab. We never transmit your PAN, UAN, or employer name to any server.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col space-y-space-md">
          {/* UPI Tax Payment Card */}
          <div className="bg-white rounded-2xl p-space-md shadow-md border border-[#bec9c8]/40 flex flex-col space-y-space-md">
            <div className="flex items-center justify-between pb-2 border-b border-[#e1e2e6]">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-[#1b6968] text-white flex items-center justify-center font-bold text-sm">
                  ₹
                </span>
                <div>
                  <h3 className="font-headline-sm text-headline-sm font-bold text-[#191c1e]">
                    Challan ITNS 280 • UPI QR
                  </h3>
                  <span className="font-body-sm text-body-sm text-[#3f4948]">Assessment Year 2026-27</span>
                </div>
              </div>
              <span className="bg-[#aeeeec] text-[#00201f] text-xs font-bold px-2 py-0.5 rounded">
                NPCI / RBI Direct
              </span>
            </div>

            {/* Amount input */}
            <div className="bg-[#f3f3f7] p-3 rounded-xl border border-[#e1e2e6]">
              <label className="font-label-sm text-xs text-[#3f4948] uppercase block mb-1">
                Tax Payment Amount (Advance Tax / Self-Assessment)
              </label>
              <div className="flex items-center">
                <span className="text-xl font-bold text-[#191c1e] mr-1">₹</span>
                <input
                  type="number"
                  value={advanceTaxAmount}
                  onChange={(e) => setAdvanceTaxAmount(Number(e.target.value) || 0)}
                  className="font-figure-xl text-2xl font-bold text-[#191c1e] bg-transparent focus:outline-none w-full"
                />
              </div>
            </div>

            {/* Generated UPI QR Code Mock */}
            <div className="flex flex-col items-center justify-center p-4 bg-[#f8f9fc] rounded-xl border border-dashed border-[#1b6968]/40 space-y-2">
              {/* Dynamic QR SVG */}
              <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-200">
                <svg className="w-40 h-40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="100" height="100" fill="white" />
                  {/* Outer corner blocks */}
                  <rect x="10" y="10" width="24" height="24" rx="2" fill="#1b6968" />
                  <rect x="14" y="14" width="16" height="16" fill="white" />
                  <rect x="18" y="18" width="8" height="8" fill="#1b6968" />

                  <rect x="66" y="10" width="24" height="24" rx="2" fill="#1b6968" />
                  <rect x="70" y="14" width="16" height="16" fill="white" />
                  <rect x="74" y="18" width="8" height="8" fill="#1b6968" />

                  <rect x="10" y="66" width="24" height="24" rx="2" fill="#1b6968" />
                  <rect x="14" y="70" width="16" height="16" fill="white" />
                  <rect x="18" y="74" width="8" height="8" fill="#1b6968" />

                  {/* Matrix pattern dots */}
                  <rect x="42" y="12" width="6" height="6" fill="#191c1e" />
                  <rect x="52" y="12" width="6" height="6" fill="#191c1e" />
                  <rect x="42" y="24" width="6" height="6" fill="#191c1e" />
                  <rect x="42" y="42" width="16" height="16" rx="2" fill="#1b6968" />
                  <text x="46" y="54" fill="white" fontSize="10" fontWeight="bold">₹</text>

                  <rect x="12" y="42" width="6" height="6" fill="#191c1e" />
                  <rect x="24" y="42" width="6" height="6" fill="#191c1e" />
                  <rect x="66" y="42" width="6" height="6" fill="#191c1e" />
                  <rect x="78" y="42" width="6" height="6" fill="#191c1e" />
                  <rect x="66" y="54" width="6" height="6" fill="#191c1e" />
                  <rect x="78" y="66" width="6" height="6" fill="#191c1e" />
                  <rect x="66" y="78" width="6" height="6" fill="#191c1e" />
                  <rect x="42" y="66" width="6" height="6" fill="#191c1e" />
                  <rect x="52" y="78" width="6" height="6" fill="#191c1e" />
                  <rect x="78" y="78" width="6" height="6" fill="#191c1e" />
                </svg>
              </div>

              <span className="font-label-sm text-xs font-semibold text-[#1b6968]">
                Scan with Google Pay • PhonePe • Paytm • BHIM
              </span>
              <span className="font-body-sm text-[11px] text-[#6f7978]">
                VPA: incometax.challan@sbi • Ref: ITNS280-AY2026-27
              </span>
            </div>

            {/* Challan Metadata Fields */}
            <div className="space-y-2 pt-1">
              <div className="bg-[#f3f3f7] p-2.5 rounded-lg flex items-center justify-between text-xs border border-[#e1e2e6]">
                <div>
                  <span className="text-[#3f4948] block">Major Head (0021)</span>
                  <span className="font-semibold text-[#191c1e]">Income Tax Other than Companies</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy('head', '0021')}
                  className="text-[#1b6968] font-bold hover:underline cursor-pointer"
                >
                  {copiedField === 'head' ? 'Copied' : 'Copy'}
                </button>
              </div>

              <div className="bg-[#f3f3f7] p-2.5 rounded-lg flex items-center justify-between text-xs border border-[#e1e2e6]">
                <div>
                  <span className="text-[#3f4948] block">Minor Head (100)</span>
                  <span className="font-semibold text-[#191c1e]">Advance Tax (Quarter 3/4)</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy('minor', '100')}
                  className="text-[#1b6968] font-bold hover:underline cursor-pointer"
                >
                  {copiedField === 'minor' ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
