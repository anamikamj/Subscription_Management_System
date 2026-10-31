
"""Central API router."""

from fastapi import APIRouter

api_router = APIRouter()

@api_router.get("/health", tags=["health"])
def api_health_check():
    """Check whether the API is running."""

    return {
        "status": "ok",
        "message": "Brightloop API is running"
    }
