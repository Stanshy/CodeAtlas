"""Authentication routes: login and register."""

from __future__ import annotations

from ..services.auth_service import authenticate, create_user
from ..utils.helpers import format_response, validate_input


def login_route(request_body: dict) -> dict:
    """
    POST /auth/login

    Validates credentials and returns a session token on success.

    Args:
        request_body: Dict containing 'email' and 'password'.

    Returns:
        Formatted response dict with token or error.
    """
    validation = validate_input(request_body, required_fields=["email", "password"])
    if not validation["valid"]:
        return format_response(error=validation["error"], status=400)

    result = authenticate(
        email=request_body["email"],
        password=request_body["password"],
    )
    if result is None:
        return format_response(error="Invalid credentials", status=401)

    return format_response(data=result, status=200)


def register_route(request_body: dict) -> dict:
    """
    POST /auth/register

    Creates a new user account.

    Args:
        request_body: Dict containing 'email', 'password', and 'name'.

    Returns:
        Formatted response dict with created user or error.
    """
    validation = validate_input(
        request_body, required_fields=["email", "password", "name"]
    )
    if not validation["valid"]:
        return format_response(error=validation["error"], status=400)

    try:
        user = create_user(
            email=request_body["email"],
            password=request_body["password"],
            name=request_body["name"],
        )
        return format_response(data=user, status=201)
    except ValueError as exc:
        return format_response(error=str(exc), status=409)


def get_routes() -> list[dict]:
    """Returns the route definitions for the auth blueprint."""
    return [
        {"method": "POST", "path": "/auth/login", "handler": "login_route"},
        {"method": "POST", "path": "/auth/register", "handler": "register_route"},
    ]
