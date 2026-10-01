"""Rule-based, engine-backed suggestions."""
from decimal import Decimal
from .models import Comparison

def suggestions(comparison: Comparison) -> list[dict[str, object]]:
    items: list[dict[str, object]] = []
    if comparison.recommended_regime == "OLD" and comparison.break_even_additional and comparison.break_even_additional > 0:
        items.append({"action": "Check eligible old-regime deductions", "rupee_impact": comparison.break_even_additional, "deadline": "Before filing the return"})
    if comparison.recommended_regime == "NEW":
        items.append({"action": "Keep the simpler new-regime records ready", "rupee_impact": Decimal("0"), "deadline": "Before filing the return"})
    return items
