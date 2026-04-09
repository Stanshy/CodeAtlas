"""Product service: CRUD operations for the product catalogue."""

from __future__ import annotations

from ..models.product import Product

_PRODUCT_STORE: dict[int, Product] = {}
_NEXT_ID: int = 1


def get_all(page: int = 1, per_page: int = 20) -> dict:
    """
    Returns a paginated list of all products.

    Args:
        page: 1-based page number.
        per_page: Number of items per page.

    Returns:
        Dict with 'items', 'page', 'per_page', and 'total'.
    """
    all_products = sorted(_PRODUCT_STORE.values(), key=lambda p: p.id)
    start = (page - 1) * per_page
    end = start + per_page
    return {
        "items": [p.to_dict() for p in all_products[start:end]],
        "page": page,
        "per_page": per_page,
        "total": len(all_products),
    }


def get_by_id(product_id: int) -> dict | None:
    """
    Fetches a single product by its primary key.

    Args:
        product_id: Integer ID of the product.

    Returns:
        Product dict or None if not found.
    """
    product = _PRODUCT_STORE.get(product_id)
    return product.to_dict() if product else None


def create(name: str, price: float, description: str = "", stock: int = 0) -> dict:
    """
    Creates and persists a new product.

    Args:
        name: Product display name.
        price: Unit price (must be >= 0).
        description: Optional long description.
        stock: Initial stock quantity.

    Returns:
        Newly created product dict.

    Raises:
        ValueError: If name is empty or price is negative.
    """
    global _NEXT_ID
    product = Product(
        id=_NEXT_ID,
        name=name,
        price=price,
        description=description,
        stock=stock,
    )
    _PRODUCT_STORE[_NEXT_ID] = product
    _NEXT_ID += 1
    return product.to_dict()


def delete(product_id: int) -> bool:
    """Removes a product by ID. Returns True if it existed."""
    return _PRODUCT_STORE.pop(product_id, None) is not None


def update_stock(product_id: int, delta: int) -> dict | None:
    """
    Adjusts the stock count by delta (positive to add, negative to remove).

    Returns the updated product dict, or None if not found.
    """
    product = _PRODUCT_STORE.get(product_id)
    if product is None:
        return None
    new_stock = product.stock + delta
    if new_stock < 0:
        raise ValueError("Stock cannot go below zero")
    product.stock = new_stock
    return product.to_dict()
