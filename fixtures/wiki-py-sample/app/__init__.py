"""
wiki-py-sample — Flask-like application factory.

This package demonstrates a typical Python web application structure
for CodeAtlas wiki export testing.
"""

from __future__ import annotations

from .routes import auth, products
from .utils.helpers import format_response


APP_VERSION = "1.0.0"
APP_NAME = "wiki-py-sample"


def create_app(config: dict | None = None) -> dict:
    """
    Application factory that registers all route blueprints.

    Args:
        config: Optional mapping of configuration overrides.

    Returns:
        A dict representing the application context.
    """
    cfg = {
        "DEBUG": False,
        "SECRET_KEY": "change-me-in-production",
        "DATABASE_URL": "sqlite:///app.db",
    }
    if config:
        cfg.update(config)

    registered_routes = [
        *auth.get_routes(),
        *products.get_routes(),
    ]

    return {
        "name": APP_NAME,
        "version": APP_VERSION,
        "config": cfg,
        "routes": registered_routes,
        "route_count": len(registered_routes),
    }


def get_version() -> str:
    """Returns the application version string."""
    return APP_VERSION
