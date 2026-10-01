"""Break-even helpers exposed independently from regime comparison."""
from decimal import Decimal
from .models import UserProfile
from .regime_compare import _break_even, _calculate

def solve_break_even(profile: UserProfile, pack: dict, new_tax: Decimal, current_old_deductions: Decimal):
    """Return (total old deductions, additional amount, flip suggestion)."""
    return _break_even(profile, pack, new_tax, current_old_deductions)
