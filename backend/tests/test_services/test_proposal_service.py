from decimal import Decimal
from unittest.mock import MagicMock

from app.services.proposal_service import calculate_totals


def _make_item(item_type: str, quantity: float, unit_price: float,
               is_optional: bool = False, is_selected: bool = True):
    item = MagicMock()
    item.item_type = item_type
    item.quantity = Decimal(str(quantity))
    item.unit_price = Decimal(str(unit_price))
    item.total_price = Decimal(str(quantity)) * Decimal(str(unit_price))
    item.is_optional = is_optional
    item.is_selected = is_selected
    return item


def test_calculate_totals_simple():
    items = [
        _make_item("package", 1, 5000),
        _make_item("hourly", 80, 150),
    ]
    result = calculate_totals(items)
    assert result["subtotal"] == Decimal("17000")
    assert result["final_amount"] == Decimal("17000")


def test_calculate_totals_with_discount_items():
    items = [
        _make_item("package", 1, 10000),
        _make_item("discount", 1, -1000),
    ]
    # discount item total_price is negative
    items[1].total_price = Decimal("-1000")
    result = calculate_totals(items)
    assert result["subtotal"] == Decimal("10000")
    assert result["discount_items_total"] == Decimal("1000")
    assert result["final_amount"] == Decimal("9000")


def test_calculate_totals_with_percentage_discount():
    items = [_make_item("package", 1, 10000)]
    result = calculate_totals(items, discount_pct=Decimal("10"))
    assert result["final_amount"] == Decimal("9000")


def test_calculate_totals_optional_unselected():
    items = [
        _make_item("package", 1, 5000),
        _make_item("addon", 1, 2000, is_optional=True, is_selected=False),
    ]
    result = calculate_totals(items)
    assert result["subtotal"] == Decimal("5000")  # addon excluded


def test_calculate_totals_optional_selected():
    items = [
        _make_item("package", 1, 5000),
        _make_item("addon", 1, 2000, is_optional=True, is_selected=True),
    ]
    result = calculate_totals(items)
    assert result["subtotal"] == Decimal("7000")


def test_calculate_totals_empty():
    result = calculate_totals([])
    assert result["final_amount"] == Decimal("0")
