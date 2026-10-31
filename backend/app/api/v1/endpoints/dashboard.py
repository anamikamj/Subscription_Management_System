"""Dashboard metrics endpoint."""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Query

from app.api.deps import CurrentUserDep, SessionDep
from app.core.constants import UserRole
from app.schemas.dashboard import DashboardSummary
from app.services.dashboard_service import get_dashboard_summary

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def dashboard_summary(
    current_user: CurrentUserDep,
    session: SessionDep,
    from_date: Optional[date] = Query(default=None),
    to_date: Optional[date] = Query(default=None),
    customer_id: Optional[int] = Query(default=None),
):
    """Get active subscriptions count, revenue, outstanding, and overdue metrics."""
    # Force customer role to view only their own metrics
    if current_user.role == UserRole.CUSTOMER:
        customer_id = current_user.customer_id

    summary = get_dashboard_summary(
        session,
        from_date=from_date,
        to_date=to_date,
        customer_id=customer_id,
    )
    return summary
