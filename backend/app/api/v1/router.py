"""Central API router: aggregates all v1 resource endpoints."""

from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    customers,
    dashboard,
    invoices,
    plans,
    products,
    staff,
    subscriptions,
)

api_router = APIRouter()

@api_router.get("/health", tags=["health"])
def api_health_check():
    """Check whether the API is running."""
    return {
        "status": "ok",
        "message": "Brightloop API is running",
    }

api_router.include_router(auth.router)
api_router.include_router(staff.router)
api_router.include_router(dashboard.router)
api_router.include_router(customers.router)
api_router.include_router(products.router)
api_router.include_router(plans.router)
api_router.include_router(subscriptions.router)
api_router.include_router(invoices.router)
