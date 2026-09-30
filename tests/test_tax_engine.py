import unittest
from decimal import Decimal

from core.deductions import eligible_deductions
from core.simulator import simulate
from core.tax_engine import calculate_tax, compare_regimes

D = Decimal

class TaxEngineTests(unittest.TestCase):
    def test_zero_and_standard_deduction(self):
        self.assertEqual(calculate_tax({"gross_salary": 0}, "new").total_tax, D("0.00"))
        result = calculate_tax({"gross_salary": 70000}, "old")
        self.assertEqual(result.taxable_income, D("20000.00"))
        self.assertEqual(result.total_tax, D("0.00"))

    def test_new_regime_slab_boundaries(self):
        for boundary in (400000, 800000, 1200000, 1600000, 2000000, 2400000):
            below = calculate_tax({"gross_salary": boundary - 1 + 75000}, "new")
            at = calculate_tax({"gross_salary": boundary + 75000}, "new")
            above = calculate_tax({"gross_salary": boundary + 1 + 75000}, "new")
            self.assertLessEqual(below.tax_before_rebate, at.tax_before_rebate)
            self.assertGreaterEqual(above.tax_before_rebate, at.tax_before_rebate)

    def test_progressive_new_tax(self):
        result = calculate_tax({"gross_salary": 1375000}, "new")
        self.assertEqual(result.taxable_income, D("1300000.00"))
        self.assertEqual(result.tax_before_rebate, D("75000.00"))
        self.assertEqual(result.total_tax, D("78000.00"))

    def test_old_slabs_and_rebate(self):
        result = calculate_tax({"gross_salary": 550000}, "old")
        self.assertEqual(result.taxable_income, D("500000.00"))
        self.assertEqual(result.rebate, D("12500.00"))
        self.assertEqual(result.total_tax, D("0.00"))
        self.assertEqual(calculate_tax({"gross_salary": 1050000}, "old").taxable_income, D("1000000.00"))

    def test_deduction_caps_and_categories(self):
        breakdown = eligible_deductions({"80c": 200000, "80d": 40000, "nps": 60000}, "old")
        self.assertEqual(breakdown.eligible_80c, D("150000"))
        self.assertEqual(breakdown.eligible_80d, D("25000"))
        self.assertEqual(breakdown.eligible_nps, D("50000"))
        self.assertEqual(eligible_deductions({"80c": 200000}, "new").total_eligible, D("0"))

    def test_tds_is_not_deduction(self):
        result = calculate_tax({"gross_salary": 1375000, "tds": 50000}, "new")
        self.assertEqual(result.taxable_income, D("1300000.00"))
        self.assertEqual(result.balance_tax_payable, D("28000.00"))

    def test_comparison(self):
        result = compare_regimes({"gross_salary": 1500000})
        self.assertIn(result["lower_tax_regime"], {"old", "new", "same"})
        self.assertEqual(result["tax_difference"], result["old_regime"].total_tax - result["new_regime"].total_tax)

    def test_simulator_uses_engine_and_caps(self):
        base = {"gross_salary": 1500000}
        unchanged = simulate(base, "old", {"additional_80c": 0})
        self.assertEqual(unchanged["baseline_tax"], unchanged["scenario_tax"])
        scenario = simulate(base, "old", {"additional_80c": 100000})
        self.assertLessEqual(scenario["scenario_taxable_income"], scenario["baseline_taxable_income"])
        no_effect = simulate(base, "new", {"additional_80c": 100000, "additional_nps": 100000})
        self.assertEqual(no_effect["tax_saving"], D("0.00"))

    def test_negative_values_and_unknown_rules_fail(self):
        with self.assertRaises(ValueError):
            calculate_tax({"gross_salary": -1})
        with self.assertRaises(ValueError):
            calculate_tax({"gross_salary": 1}, "invalid")
        with self.assertRaises(ValueError):
            calculate_tax({"gross_salary": 1}, tax_year="AY2025-26")
        with self.assertRaises(ValueError):
            simulate({"gross_salary": 1}, changes={"crypto": 1})

if __name__ == "__main__":
    unittest.main()
