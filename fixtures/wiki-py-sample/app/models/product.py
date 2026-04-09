"""Product domain model."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class Product:
    """Represents a product in the catalogue."""

    id: int
    name: str
    price: float
    description: str = ""
    stock: int = 0
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

    def __post_init__(self) -> None:
        if not self.name.strip():
            raise ValueError("Product name must not be empty")
        if self.price < 0:
            raise ValueError(f"Price must be non-negative, got {self.price}")
        if self.stock < 0:
            raise ValueError(f"Stock must be non-negative, got {self.stock}")

    def to_dict(self) -> dict:
        """Serialises the product to a dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "price": self.price,
            "description": self.description,
            "stock": self.stock,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }

    def is_in_stock(self) -> bool:
        """Returns True when at least one unit is available."""
        return self.stock > 0

    def apply_discount(self, percent: float) -> float:
        """Calculates the discounted price without mutating the model."""
        if not 0 <= percent <= 100:
            raise ValueError(f"Discount percent must be 0-100, got {percent}")
        return round(self.price * (1 - percent / 100), 2)
