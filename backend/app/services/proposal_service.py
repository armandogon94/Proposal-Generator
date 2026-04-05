from decimal import Decimal

from app.models.pricing import PricingItem


def calculate_totals(items: list[PricingItem], discount_pct: Decimal = Decimal("0")):
    subtotal = Decimal("0")
    discount_items_total = Decimal("0")

    for item in items:
        if not item.is_selected and item.is_optional:
            continue
        if item.item_type == "discount":
            discount_items_total += abs(item.total_price)
        else:
            subtotal += item.total_price

    total_before_discount = subtotal - discount_items_total
    percentage_discount = total_before_discount * (discount_pct / Decimal("100"))
    final_amount = total_before_discount - percentage_discount

    return {
        "subtotal": subtotal,
        "discount_items_total": discount_items_total,
        "percentage_discount": percentage_discount,
        "total_amount": total_before_discount,
        "final_amount": final_amount,
    }
