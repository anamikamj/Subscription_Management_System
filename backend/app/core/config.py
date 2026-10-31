
"""Application configuration and environment settings."""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


# Absolute path to the backend directory.
BACKEND_DIR = Path(__file__).resolve().parents[2]

# Local SQLite database location.
DATABASE_PATH = BACKEND_DIR / "data" / "brightloop.db"
DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)


class Settings(BaseSettings):
    """Central application settings."""

    app_name: str = "Brightloop Subscription Management API"
    app_version: str = "0.1.0"
    app_env: str = "development"

    database_url: str = (
        f"sqlite:///{DATABASE_PATH.as_posix()}"
    )

    frontend_origin: str = "http://localhost:5173"
    secret_key: str = "l6fGo7LD0S_BK_0Ivil8aBm8n6pqBYguIesPiHH46EJFTK3EHB9Vj17xVL1JZ7wN"
    access_token_minutes: int = 60

    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
