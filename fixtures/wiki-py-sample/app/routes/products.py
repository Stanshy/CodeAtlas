"""Product routes: list, get, and create products."""

from __future__ import annotations

from ..services.product_service import get_all, get_by_id, create
from ..utils.helpers import format_response, validate_input


def list_products(query_params: dict | None = None) -> dict:
    """
    GET /products

    Returns a paginated list of products.

    Args:
        query_params: Optional dict with 'page' and 'per_page' keys.

    Returns:
        Formatted response dict with product list.
    """
    params = query_params or {}
    page = int(params.get("page", 1))
    per_page = int(params.get("per_page", 20))

    products = get_all(page=page, per_page=per_page)
    return format_response(data=products, status=200)


def get_product(product_id: int) -> dict:
    """
    GET /products/<product_id>

    Returns a single product by ID.

    Args:
        product_id: Integer primary key of the product.

    Returns:
        Formatted response dict with product or 404 error.
    """
    product = get_by_id(product_id)
    if product is None:
        return format_response(error=f"Product {product_id} not found", status=404)
    return format_response(data=product, status=200)


def create_product(request_body: dict) -> dict:
    """
    POST /products

    Creates a new product record.

    Args:
        request_body: Dict with 'name', 'price', and optional 'description'.

    Returns:
        Formatted response dict with created product or validation error.
    """
    validation = validate_input(request_body, required_fields=["name", "price"])
    if not validation["valid"]:
        return format_response(error=validation["error"], status=400)

    try:
        product = create(
            name=request_body["name"],
            price=float(request_body["price"]),
            description=request_body.get("description", ""),
        )
        return format_response(data=product, status=201)
    except (ValueError, TypeError) as exc:
        return format_response(error=str(exc), status=422)


def get_routes() -> list[dict]:
    """Returns the route definitions for the products blueprint."""
    return [
        {"method": "GET", "path": "/products", "handler": "list_products"},
        {"method": "GET", "path": "/products/<product_id>", "handler": "get_product"},
        {"method": "POST", "path": "/products", "handler": "create_product"},
    ]
