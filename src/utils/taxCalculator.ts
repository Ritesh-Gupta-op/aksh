import { SalaryDetails, TaxRegimeResult, ComparisonResult } from '../types/tax';

export const DEFAULT_SALARY: SalaryDetails = {
  basicMonthly: 85000,
  hraMonthly: 42500,
  specialMonthly: 28500,
  bonusAnnual: 0, // monthly gross: 85k + 42.5k + 28.5k = 1,56,000 (annual ~ 18.72L + bonus or 20.52L CTC)
  epfMonthly: 10200, // 12% of 85,000
  profTaxAnnual: 2400,
  rentMonthly: 25000,
  isMetro: true,
  epfPercentage: 12,
  employerNpsPercentage: 5,
  voluntary80C: 27600,
  section80D: 25000,
  additionalNps80CCD1B: 0,
};

export function formatINR(val: number): string {
  const rounded = Math.round(val);
  return new Intl.NumberFormat('en-IN').format(rounded);
}

export function formatINRLakh(val: number): string {
  if (val >= 100000) {
    return `₹${(val / 100000).toFixed(2)}L`;
  }
  return `₹${formatINR(val)}`;
}

export function calculateHRAExemption(
  basicAnnual: number,
  hraAnnual: number,
  rentAnnual: number,
  isMetro: boolean
): number {
  if (rentAnnual <= 0) return 0;
  
  // 1. Actual HRA received
  const condition1 = hraAnnual;
  // 2. 50% of basic (metro) or 40% (non-metro)
  const condition2 = basicAnnual * (isMetro ? 0.5 : 0.4);
  // 3. Rent paid minus 10% of basic
  const condition3 = Math.max(0, rentAnnual - basicAnnual * 0.1);

  return Math.max(0, Math.min(condition1, condition2, condition3));
}

function calculateOldRegimeTax(taxableIncome: number): number {
  if (taxableIncome <= 250000) return 0;
  
  let tax = 0;
  if (taxableIncome > 1000000) {
    tax += (taxableIncome - 1000000) * 0.3;
    tax += 500000 * 0.2; // 5L to 10L
    tax += 250000 * 0.05; // 2.5L to 5L
  } else if (taxableIncome > 500000) {
    tax += (taxableIncome - 500000) * 0.2;
    tax += 250000 * 0.05;
  } else {
    tax += (taxableIncome - 250000) * 0.05;
  }

  // Rebate u/s 87A for Old Regime if <= 5L
  if (taxableIncome <= 500000) {
    return 0;
  }

  return tax;
}

function calculateNewRegimeTax(taxableIncome: number): number {
  // Slabs for FY 2025-26 under Sec 115BAC:
  // 0 - 3L: Nil
  // 3L - 7L: 5%
  // 7L - 10L: 10%
  // 10L - 12L: 15%
  // 12L - 15L: 20%
  // > 15L: 30%
  
  if (taxableIncome <= 300000) return 0;

  // Rebate u/s 87A: Nil tax if taxable income <= 7,00,000
  if (taxableIncome <= 700000) {
    return 0;
  }

  let tax = 0;
  if (taxableIncome > 1500000) {
    tax += (taxableIncome - 1500000) * 0.3;
    tax += 300000 * 0.2; // 12L to 15L
    tax += 200000 * 0.15; // 10L to 12L
    tax += 300000 * 0.1; // 7L to 10L
    tax += 400000 * 0.05; // 3L to 7L
  } else if (taxableIncome > 1200000) {
    tax += (taxableIncome - 1200000) * 0.2;
    tax += 200000 * 0.15;
    tax += 300000 * 0.1;
    tax += 400000 * 0.05;
  } else if (taxableIncome > 1000000) {
    tax += (taxableIncome - 1000000) * 0.15;
    tax += 300000 * 0.1;
    tax += 400000 * 0.05;
  } else if (taxableIncome > 700000) {
    tax += (taxableIncome - 700000) * 0.1;
    tax += 400000 * 0.05;
  }

  // Marginal relief if income is just above 7,00,000
  const excessIncome = taxableIncome - 700000;
  if (excessIncome > 0 && tax > excessIncome) {
    tax = excessIncome;
  }

  return tax;
}

export function computeTaxComparison(salary: SalaryDetails): ComparisonResult {
  const basicAnnual = salary.basicMonthly * 12;
  const hraAnnual = salary.hraMonthly * 12;
  const specialAnnual = salary.specialMonthly * 12;
  
  // Gross annual is monthly earnings * 12 plus any annual bonus
  const grossAnnual = basicAnnual + hraAnnual + specialAnnual + salary.bonusAnnual;
  
  // Mandatory EPF based on selected EPF percentage
  const epfAnnual = basicAnnual * (salary.epfPercentage / 100);
  
  // Employer NPS under Section 80CCD(2)
  const employerNpsAnnual = basicAnnual * (salary.employerNpsPercentage / 100);

  // --- OLD REGIME COMPUTATION ---
  const rentAnnual = salary.rentMonthly * 12;
  const hraExemption = calculateHRAExemption(basicAnnual, hraAnnual, rentAnnual, salary.isMetro);
  const oldStdDeduction = 50000;
  const profTax = salary.profTaxAnnual;

  const total80C = Math.min(150000, epfAnnual + (salary.voluntary80C || 0));
  const total80D = Math.min(75000, salary.section80D || 0);
  const total80CCD1B = Math.min(50000, salary.additionalNps80CCD1B || 0);
  const total80CCD2 = employerNpsAnnual;

  const oldTotalDeductions =
    hraExemption +
    oldStdDeduction +
    profTax +
    total80C +
    total80D +
    total80CCD1B +
    total80CCD2;

  const oldTaxableIncome = Math.max(0, grossAnnual - oldTotalDeductions);
  const oldTaxBeforeCess = calculateOldRegimeTax(oldTaxableIncome);
  const oldCess = oldTaxBeforeCess * 0.04;
  const oldTotalTax = Math.round(oldTaxBeforeCess + oldCess);
  const oldMonthlyTds = Math.round(oldTotalTax / 12);
  const oldAnnualTakeHome = grossAnnual - oldTotalTax - epfAnnual - profTax;
  const oldMonthlyTakeHome = Math.round(oldAnnualTakeHome / 12);
  const oldEffectiveRate = grossAnnual > 0 ? (oldTotalTax / grossAnnual) * 100 : 0;

  const oldResult: TaxRegimeResult = {
    grossAnnual,
    hraExemption,
    standardDeduction: oldStdDeduction,
    section80C: total80C,
    section80D: total80D,
    section80CCD1B: total80CCD1B,
    section80CCD2: total80CCD2,
    totalDeductions: oldTotalDeductions,
    taxableIncome: oldTaxableIncome,
    taxBeforeCess: oldTaxBeforeCess,
    cess: oldCess,
    totalAnnualTax: oldTotalTax,
    monthlyTds: oldMonthlyTds,
    annualTakeHome: oldAnnualTakeHome,
    monthlyTakeHome: oldMonthlyTakeHome,
    effectiveTaxRate: parseFloat(oldEffectiveRate.toFixed(1)),
  };

  // --- NEW REGIME COMPUTATION ---
  const newStdDeduction = 75000;
  // In new regime, only employer NPS 80CCD(2) and standard deduction are permitted for salaried
  const newTotalDeductions = newStdDeduction + total80CCD2;
  const newTaxableIncome = Math.max(0, grossAnnual - newTotalDeductions);
  const newTaxBeforeCess = calculateNewRegimeTax(newTaxableIncome);
  const newCess = newTaxBeforeCess * 0.04;
  const newTotalTax = Math.round(newTaxBeforeCess + newCess);
  const newMonthlyTds = Math.round(newTotalTax / 12);
  const newAnnualTakeHome = grossAnnual - newTotalTax - epfAnnual - profTax;
  const newMonthlyTakeHome = Math.round(newAnnualTakeHome / 12);
  const newEffectiveRate = grossAnnual > 0 ? (newTotalTax / grossAnnual) * 100 : 0;

  const newResult: TaxRegimeResult = {
    grossAnnual,
    hraExemption: 0,
    standardDeduction: newStdDeduction,
    section80C: 0,
    section80D: 0,
    section80CCD1B: 0,
    section80CCD2: total80CCD2,
    totalDeductions: newTotalDeductions,
    taxableIncome: newTaxableIncome,
    taxBeforeCess: newTaxBeforeCess,
    cess: newCess,
    totalAnnualTax: newTotalTax,
    monthlyTds: newMonthlyTds,
    annualTakeHome: newAnnualTakeHome,
    monthlyTakeHome: newMonthlyTakeHome,
    effectiveTaxRate: parseFloat(newEffectiveRate.toFixed(1)),
  };

  const savings = newTotalTax - oldTotalTax; // positive means old saves more
  const recommended = savings >= 0 ? 'OLD' : 'NEW';

  return {
    oldRegime: oldResult,
    newRegime: newResult,
    savings,
    recommended,
  };
}
