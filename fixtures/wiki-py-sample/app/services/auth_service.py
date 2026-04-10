"""Authentication service: user creation, login, and password hashing."""

from __future__ import annotations

import hashlib
import os

from ..models.user import User

_USER_STORE: dict[int, User] = {}
_NEXT_ID: int = 1


def authenticate(email: str, password: str) -> dict | None:
    """
    Verifies credentials and returns a session token payload on success.

    Args:
        email: The user's email address.
        password: The plaintext password to verify.

    Returns:
        A dict with token information, or None if credentials are invalid.
    """
    user = next((u for u in _USER_STORE.values() if u.email == email), None)
    if user is None:
        return None

    if user.password_hash != hash_password(password):
        return None

    token = _generate_token(user.id)
    return {"token": token, "user": user.to_dict()}


def create_user(email: str, password: str, name: str, role: str = "user") -> dict:
    """
    Creates and persists a new user account.

    Args:
        email: Unique email address for the account.
        password: Plaintext password (will be hashed before storage).
        name: Display name for the user.
        role: Role string; defaults to 'user'.

    Returns:
        Public user dict (no password hash).

    Raises:
        ValueError: If the email is already registered.
    """
    global _NEXT_ID
    if any(u.email == email for u in _USER_STORE.values()):
        raise ValueError(f"Email already registered: {email}")

    user = User(
        id=_NEXT_ID,
        email=email,
        name=name,
        password_hash=hash_password(password),
        role=role,
    )
    _USER_STORE[_NEXT_ID] = user
    _NEXT_ID += 1
    return user.to_dict()


def hash_password(password: str) -> str:
    """Returns a deterministic SHA-256 hex digest of the password."""
    salt = "wiki-py-fixture-salt"
    return hashlib.sha256(f"{salt}{password}".encode()).hexdigest()


def _generate_token(user_id: int) -> str:
    """Generates a pseudo-random session token bound to the user id."""
    raw = f"{user_id}:{os.urandom(16).hex()}"
    return hashlib.sha256(raw.encode()).hexdigest()
