
"""Database session dependency."""

from collections.abc import Generator

from sqlmodel import Session

from app.database.connection import engine


def get_session() -> Generator[Session, None, None]:
    """Provide a database session for each request."""

    with Session(engine) as session:
        yield session
