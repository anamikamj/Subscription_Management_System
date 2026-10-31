"""Seed package for Brightloop database."""

from app.seed.seed_data import seed_database

__all__ = ["seed_database"]

if __name__ == "__main__":
    seed_database()
