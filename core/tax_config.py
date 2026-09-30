"""Tax rules for the supported Aksh assessment year."""
from dataclasses import dataclass
from decimal import Decimal

D = Decimal
SUPPORTED_TAX_YEAR = "AY2026-27"
CESS_RATE = D("0.04")

@dataclass(frozen=True)
class RegimeConfig:
    standard_deduction: Decimal
    slabs: tuple[tuple[Decimal | None, Decimal], ...]
    rebate_threshold: Decimal
    rebate_maximum: Decimal
    surcharge: tuple[tuple[Decimal, Decimal], ...] = ()

# Slab upper bounds are exclusive. Rules are for a normal individual under 60.
REGIME_CONFIGS = {
    "old": RegimeConfig(
        standard_deduction=D("50000"),
        slabs=((D("250000"), D("0")), (D("500000"), D("0.05")), (D("1000000"), D("0.20")), (None, D("0.30"))),
        rebate_threshold=D("500000"), rebate_maximum=D("12500"),
        surcharge=((D("5000000"), D("0.10")), (D("10000000"), D("0.15")), (D("20000000"), D("0.25")), (D("50000000"), D("0.37"))),
    ),
    "new": RegimeConfig(
        standard_deduction=D("75000"),
        slabs=((D("400000"), D("0")), (D("800000"), D("0.05")), (D("1200000"), D("0.10")), (D("1600000"), D("0.15")), (D("2000000"), D("0.20")), (D("2400000"), D("0.25")), (None, D("0.30"))),
        rebate_threshold=D("1200000"), rebate_maximum=D("60000"),
        surcharge=((D("5000000"), D("0.10")), (D("10000000"), D("0.15")), (D("20000000"), D("0.25")), (D("50000000"), D("0.25"))),
    ),
}

DEDUCTION_LIMITS = {"80c": D("150000"), "80d": D("25000"), "nps": D("50000")}
