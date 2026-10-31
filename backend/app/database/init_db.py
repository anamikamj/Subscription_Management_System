
"""Database initialization helpers."""

from sqlmodel import SQLModel

from app.database.connection import engine


def create_db_and_tables() -> None:
    """Create all registered database tables."""

    SQLModel.metadata.create_all(engine)
