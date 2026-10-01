"""Health and education cess."""
from decimal import Decimal
from .models import AuditStep
D = Decimal

def health_education_cess(tax_after_surcharge: D, pack: dict) -> tuple[D, AuditStep]:
    rate = D(str(pack["cess_rate"]))
    result = tax_after_surcharge * rate
    return result, AuditStep(label="Health and education cess", formula="(tax + surcharge) × cess rate", inputs={"base": tax_after_surcharge, "rate": rate}, result=result, legal_reference="Finance Act cess provision")
