
"""Main FastAPI application."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.database.init_db import create_db_and_tables


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run initialization when the application starts."""

    create_db_and_tables()

    yield

    # Application shutdown operations can go here.


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Brightloop Subscription Management System API",
    lifespan=lifespan,
)


# Allow communication with the React frontend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Register all API v1 routes.
app.include_router(
    api_router,
    prefix="/api",
)


@app.get("/", tags=["health"])
def root():
    return {
        "message": "Welcome to Brightloop Subscription Management API",
        "docs": "/docs",
    }


@app.get("/health", tags=["health"])
def health_check():
    return {
        "status": "ok",
        "message": "Backend is running successfully",
    }
