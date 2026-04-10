"""User domain model."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class User:
    """Represents an authenticated user in the system."""

    id: int
    email: str
    name: str
    password_hash: str
    role: str = "user"
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

    VALID_ROLES: tuple[str, ...] = field(
        default=("admin", "user", "guest"), init=False, repr=False
    )

    def __post_init__(self) -> None:
        if not self.email or "@" not in self.email:
            raise ValueError(f"Invalid email address: {self.email!r}")
        if self.role not in ("admin", "user", "guest"):
            raise ValueError(f"Invalid role: {self.role!r}")

    def to_dict(self) -> dict:
        """Serialises the user to a public-safe dictionary (omits password_hash)."""
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "role": self.role,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }

    def is_admin(self) -> bool:
        """Returns True when the user has the admin role."""
        return self.role == "admin"

    def update_name(self, new_name: str) -> None:
        """Updates the display name and refreshes the updated_at timestamp."""
        if not new_name.strip():
            raise ValueError("Name must not be empty")
        self.name = new_name.strip()
        self.updated_at = datetime.utcnow()
