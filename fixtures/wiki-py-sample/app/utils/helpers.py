"""Shared helper utilities: response formatting and input validation."""

from __future__ import annotations

import re
from datetime import datetime

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def format_response(
    data: object | None = None,
    error: str | None = None,
    status: int = 200,
) -> dict:
    """
    Builds a standardised API response envelope.

    Args:
        data: Payload to include under the 'data' key (only on success).
        error: Error message string (only on failure).
        status: HTTP status code to embed in the response.

    Returns:
        Dict with 'status', and either 'data' or 'error'.
    """
    if error is not None:
        return {"status": status, "error": error}
    return {"status": status, "data": data}


def validate_input(body: dict, required_fields: list[str]) -> dict:
    """
    Checks that all required fields are present and non-empty in body.

    Args:
        body: Request body dict to validate.
        required_fields: List of field names that must be present.

    Returns:
        Dict with 'valid' bool and optional 'error' string.
    """
    for field in required_fields:
        if field not in body or body[field] in (None, ""):
            return {"valid": False, "error": f"'{field}' is required"}
    return {"valid": True}


def validate_email(email: str) -> bool:
    """Returns True when the string matches a basic email pattern."""
    return bool(EMAIL_RE.match(email.strip()))


def iso_now() -> str:
    """Returns the current UTC time as an ISO 8601 string."""
    return datetime.utcnow().isoformat() + "Z"


def paginate(items: list, page: int, per_page: int) -> dict:
    """
    Slices a list into a page and wraps it with pagination metadata.

    Args:
        items: The full list to paginate.
        page: 1-based page index.
        per_page: Number of items per page.

    Returns:
        Dict with 'items', 'page', 'per_page', and 'total'.
    """
    if page < 1:
        raise ValueError("page must be >= 1")
    start = (page - 1) * per_page
    return {
        "items": items[start : start + per_page],
        "page": page,
        "per_page": per_page,
        "total": len(items),
    }
