export interface SalaryDetails {
  basicMonthly: number;
  hraMonthly: number;
  specialMonthly: number;
  bonusAnnual: number;
  epfMonthly: number;
  profTaxAnnual: number;
  rentMonthly: number;
  isMetro: boolean;
  
  // Investments / Deductions
  epfPercentage: number; // default 12%
  employerNpsPercentage: number; // default 5%
  voluntary80C: number; // default 27600
  section80D: number; // default 25000
  additionalNps80CCD1B: number; // default 0 or 50000
}

export interface TaxRegimeResult {
  grossAnnual: number;
  hraExemption: number;
  standardDeduction: number;
  section80C: number;
  section80D: number;
  section80CCD1B: number;
  section80CCD2: number;
  totalDeductions: number;
  taxableIncome: number;
  taxBeforeCess: number;
  cess: number;
  totalAnnualTax: number;
  monthlyTds: number;
  annualTakeHome: number;
  monthlyTakeHome: number;
  effectiveTaxRate: number;
}

export interface ComparisonResult {
  oldRegime: TaxRegimeResult;
  newRegime: TaxRegimeResult;
  savings: number; // positive means Old saves more, negative means New saves more
  recommended: 'OLD' | 'NEW';
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  content: string;
  timestamp: string;
  highlightCard?: {
    title: string;
    items?: { label: string; value: string }[];
    savingsTag?: string;
    footerNote?: string;
  };
}
