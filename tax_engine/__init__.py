"""Versioned, auditable direct-tax calculations for Aksh."""
from .models import UserProfile, Comparison, RegimeResult, AuditStep
from .regime_compare import TaxEngine, compare_profile
from .context_builder import build_engine_context

__all__ = ["TaxEngine", "compare_profile", "build_engine_context", "UserProfile", "Comparison", "RegimeResult", "AuditStep"]
