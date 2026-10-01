"""Scenario helpers for callers that need a focused what-if table."""
from decimal import Decimal
from .models import UserProfile, ScenarioResult
from .regime_compare import compare_profile

def sensitivity(profile: UserProfile) -> list[ScenarioResult]:
    return compare_profile(profile).sensitivity
