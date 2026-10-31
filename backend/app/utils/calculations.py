"""Money maths. Integer paise and basis points only - no floats.

Order of operations (per the billing rules):
    subtotal -> discount -> taxable amount -> tax (per line, half-up) -> total
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence

from app.core.exceptions import ValidationError

BPS_DENOMINATOR = 10_000


@dataclass(frozen=True)
class LineInput:
    quantity: int
    unit_price_paise: int
    tax_rate_bps: int = 0


@dataclass(frozen=True)
class LineAmounts:
    quantity: int
    unit_price_paise: int
    tax_rate_bps: int
    line_subtotal_paise: int
    discount_paise: int
    taxable_amount_paise: int
    tax_amount_paise: int
    line_total_paise: int


@dataclass(frozen=True)
class InvoiceAmounts:
    lines: list[LineAmounts]
    subtotal_paise: int
    discount_paise: int
    tax_paise: int
    total_paise: int


def tax_half_up(taxable_paise: int, tax_bps: int) -> int:
    """Half-up rounded tax. Valid because both inputs are non-negative."""
    return (taxable_paise * tax_bps + BPS_DENOMINATOR // 2) // BPS_DENOMINATOR


def percentage_of(amount_paise: int, rate_bps: int) -> int:
    """amount * rate, half-up rounded to a paisa."""
    return (amount_paise * rate_bps + BPS_DENOMINATOR // 2) // BPS_DENOMINATOR


def allocate_proportionally(total: int, weights: Sequence[int]) -> list[int]:
    """Split `total` across `weights` so the parts always sum to `total`
    (largest-remainder method, ties resolved to the earlier line)."""
    n = len(weights)
    weight_sum = sum(weights)
    if total == 0 or weight_sum == 0:
        return [0] * n
    shares = [total * w // weight_sum for w in weights]
    leftover = total - sum(shares)
    order = sorted(range(n), key=lambda i: ((total * weights[i]) % weight_sum, -i), reverse=True)
    for i in order[:leftover]:
        shares[i] += 1
    return shares


def outstanding_balance(total_paise: int, paid_paise: int) -> int:
    return total_paise - paid_paise


def _validate(line: LineInput) -> None:
    if line.quantity <= 0:
        raise ValidationError("Quantity must be greater than zero")
    if line.unit_price_paise <= 0:
        raise ValidationError("Unit price must be positive")
    if line.tax_rate_bps < 0:
        raise ValidationError("Tax rate must be non-negative")


def calculate_invoice(
    lines: Sequence[LineInput],
    *,
    discount_rate_bps: int = 0,
    fixed_discount_paise: int = 0,
) -> InvoiceAmounts:
    """Compute every amount for an invoice.

    Discount is invoice-level (a % in bps, or a fixed paise amount, not both),
    computed on the subtotal and then allocated across lines in proportion to
    their subtotals, so each line is taxed on its own discounted amount.
    """
    if not lines:
        raise ValidationError("An invoice needs at least one line")
    if discount_rate_bps and fixed_discount_paise:
        raise ValidationError("Discounts cannot be combined")
    if not 0 <= discount_rate_bps <= BPS_DENOMINATOR:
        raise ValidationError("Percentage discount must be between 0% and 100%")
    if fixed_discount_paise < 0:
        raise ValidationError("Discount cannot be negative")

    for line in lines:
        _validate(line)

    subtotals = [l.quantity * l.unit_price_paise for l in lines]
    subtotal = sum(subtotals)

    if discount_rate_bps:
        discount = percentage_of(subtotal, discount_rate_bps)
    else:
        if fixed_discount_paise > subtotal:
            raise ValidationError("Fixed discount cannot exceed the invoice amount")
        discount = fixed_discount_paise

    line_discounts = allocate_proportionally(discount, subtotals)

    results: list[LineAmounts] = []
    for line, sub, disc in zip(lines, subtotals, line_discounts):
        taxable = sub - disc
        tax = tax_half_up(taxable, line.tax_rate_bps)
        results.append(
            LineAmounts(
                quantity=line.quantity,
                unit_price_paise=line.unit_price_paise,
                tax_rate_bps=line.tax_rate_bps,
                line_subtotal_paise=sub,
                discount_paise=disc,
                taxable_amount_paise=taxable,
                tax_amount_paise=tax,
                line_total_paise=taxable + tax,
            )
        )

    tax_total = sum(r.tax_amount_paise for r in results)  # sum of rounded line taxes
    return InvoiceAmounts(
        lines=results,
        subtotal_paise=subtotal,
        discount_paise=discount,
        tax_paise=tax_total,
        total_paise=subtotal - discount + tax_total,
    )