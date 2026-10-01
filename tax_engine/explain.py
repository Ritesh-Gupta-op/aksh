"""Stable reason codes for prompt-safe explanations."""
REASON_TEMPLATES = {
    "REBATE_87A_NEW": "The New Regime result includes the Section 87A rebate.",
    "OLD_DEDUCTIONS_USED": "Eligible Old Regime deductions reduced taxable income.",
    "HRA_EXEMPTION": "Verified rent, salary, and city inputs produced an HRA exemption.",
    "UNVERIFIED_RULE_PACK": "The selected financial-year rule pack needs legal verification.",
}

def reason(code: str, detail: str | None = None) -> dict[str, str]:
    return {"code": code, "detail": detail or REASON_TEMPLATES.get(code, "The engine recorded this reason.")}
