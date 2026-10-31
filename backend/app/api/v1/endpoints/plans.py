"""Subscription plan endpoints."""

from fastapi import APIRouter, HTTPException, status
from sqlmodel import select

from app.api.deps import AdminUserDep, CurrentUserDep, SessionDep
from app.models.entities import Plan
from app.schemas.plans import PlanCreate, PlanRead

router = APIRouter(prefix="/plans", tags=["plans"])


@router.get("", response_model=list[PlanRead])
def list_plans(
    current_user: CurrentUserDep,
    session: SessionDep,
):
    plans = list(session.exec(select(Plan).order_by(Plan.id.asc())).all())
    return plans


@router.post("", response_model=PlanRead, status_code=status.HTTP_201_CREATED)
def create_plan(
    payload: PlanCreate,
    current_admin: AdminUserDep,
    session: SessionDep,
):
    """Admin-only: Create a new subscription plan."""
    if payload.available_from and payload.available_to and payload.available_to < payload.available_from:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Plan availability end date cannot be earlier than its start date.",
        )

    plan = Plan(
        name=payload.name.strip(),
        cadence=payload.cadence,
        price_paise=payload.price_paise,
        min_quantity=payload.min_quantity,
        available_from=payload.available_from,
        available_to=payload.available_to,
        auto_close=payload.auto_close,
        allow_early_close=payload.allow_early_close,
        allow_pause=payload.allow_pause,
        allow_renew=payload.allow_renew,
        is_active=payload.is_active,
    )
    session.add(plan)
    session.commit()
    session.refresh(plan)
    return plan


@router.get("/{plan_id}", response_model=PlanRead)
def get_plan(
    plan_id: int,
    current_user: CurrentUserDep,
    session: SessionDep,
):
    plan = session.get(Plan, plan_id)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Plan with ID {plan_id} not found.",
        )
    return plan
