
"""Database initialization helpers."""

from sqlmodel import SQLModel

# Import models so SQLModel registers their tables.
import app.models  # noqa: F401

from app.database.connection import engine


def create_db_and_tables() -> None:
    """Create all registered database tables."""

    SQLModel.metadata.create_all(engine)
