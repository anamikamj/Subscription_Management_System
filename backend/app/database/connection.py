
"""SQLModel engine configuration."""

from sqlmodel import create_engine

from app.core.config import settings


# SQLite requires this option for FastAPI's request handling.
connect_args = {
    "check_same_thread": False
}

# Create the database engine.
engine = create_engine(
    settings.database_url,
    echo=False,
    connect_args=connect_args,
)


def test_database_connection():
    """Check whether the database connection works."""

    with engine.connect() as connection:
        connection.exec_driver_sql("SELECT 1")

    return True
