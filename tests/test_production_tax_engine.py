import json
from decimal import Decimal
from pathlib import Path

import pytest

from ai.gemma import guard_reply
from ai.prompts import ENGINE_SYSTEM
from tax_engine import TaxEngine, UserProfile, build_engine_context
from tax_engine.rules.loader import validate_all_rule_packs

D = Decimal
FIXTURES = json.loads(Path(__file__).with_name("tax_engine_profiles.json").read_text())

@pytest.mark.parametrize("case", FIXTURES, ids=[case["name"] for case in FIXTURES])
def test_golden_profiles(case):
    comparison = TaxEngine().compare(UserProfile.model_validate(case["profile"]))
    assert comparison.old.total_tax == D(case["expected"]["old_tax"])
    assert comparison.new.total_tax == D(case["expected"]["new_tax"])
    assert comparison.recommended_regime == case["expected"]["winner"]


def test_rule_packs_are_valid_and_cite_sources():
    packs = validate_all_rule_packs()
    assert len(packs) == 2
    assert all(pack.source and isinstance(pack.verified, bool) for pack in packs)
    assert packs[1].verified is False


def test_tax_is_monotonic_in_income():
    engine = TaxEngine()
    previous = D("0")
    for income in range(100000, 3000001, 100000):
        result = engine.calculate(UserProfile.model_validate({"income_sources": {"other_salary": income}}), "NEW")
        assert result.total_tax >= previous
        previous = result.total_tax


def test_hra_zero_rent_and_metro_rules():
    engine = TaxEngine()
    no_rent = engine.calculate(UserProfile.model_validate({"income_sources": {"basic": 800000, "hra_received": 500000}, "city_type": "metro"}), "OLD")
    rent = engine.calculate(UserProfile.model_validate({"income_sources": {"basic": 800000, "hra_received": 500000}, "rent_paid": 600000, "city_type": "metro"}), "OLD")
    non_metro = engine.calculate(UserProfile.model_validate({"income_sources": {"basic": 800000, "hra_received": 500000}, "rent_paid": 600000, "city_type": "non_metro"}), "OLD")
    assert no_rent.hra_exemption == 0
    assert rent.hra_exemption > non_metro.hra_exemption


def test_surcharge_boundaries_and_marginal_relief():
    engine = TaxEngine()
    at = engine.calculate(UserProfile.model_validate({"income_sources": {"other_salary": 5000000}}), "OLD")
    above = engine.calculate(UserProfile.model_validate({"income_sources": {"other_salary": 5000010}}), "OLD")
    assert above.total_tax >= at.total_tax
    assert above.surcharge >= 0


def test_break_even_equalizes_within_ten_rupees():
    profile = UserProfile.model_validate({"income_sources": {"other_salary": 1500000}})
    comparison = TaxEngine().compare(profile)
    assert comparison.break_even_additional is not None
    extra = comparison.break_even_additional
    changed = profile.model_copy(deep=True, update={"deductions": profile.deductions.model_copy(update={"other_old_deductions": extra})})
    result = TaxEngine().calculate(changed, "OLD")
    assert abs(result.total_tax - comparison.new.total_tax) <= 10


def test_caps_are_audited_as_disallowed():
    result = TaxEngine().calculate(UserProfile.model_validate({"income_sources": {"other_salary": 1500000}, "deductions": {"80c": 250000, "health_self": 50000}}), "OLD")
    assert result.disallowed_deductions["80C including employee PF and 80CCD(1)"] == 100000
    assert result.disallowed_deductions["80D"] == 25000


def test_missing_hra_and_business_warning_are_ranked():
    profile = UserProfile.model_validate({"employment_type": "business", "business_income_flag": True, "income_sources": {"basic": 1500000, "hra_received": 500000}})
    comparison = TaxEngine().compare(profile)
    assert comparison.missing_fields[0]["field"] == "rent_paid"
    assert any(item.code == "BUSINESS_SWITCH_RULE" for item in comparison.warnings)


def test_context_and_prompt_contract():
    profile = UserProfile.model_validate({"income_sources": {"other_salary": 1500000}})
    comparison = TaxEngine().compare(profile)
    context = build_engine_context(profile, comparison)
    assert set(context) == {"meta", "user_snapshot", "result", "reasons", "what_if", "suggestions", "warnings", "missing_info", "assumptions"}
    rendered = ENGINE_SYSTEM.format(context=json.dumps(context))
    assert "<ENGINE_RESULT>" in rendered and "</ENGINE_RESULT>" in rendered
    assert "{context}" not in rendered


def test_llm_rupee_guard_flags_unverified_figures():
    reply, flags = guard_reply("You could save ₹999999.", {"result": {"savings": 12000}})
    assert flags == ["999999"]
    assert "left that figure out" in reply
