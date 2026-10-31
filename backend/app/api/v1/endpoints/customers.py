"""Customer management endpoints."""

from fastapi import APIRouter, HTTPException, status
from sqlmodel import select

from app.api.deps import CurrentUserDep, SessionDep, StaffOrAdminDep
from app.core.constants import UserRole
from app.core.permissions import check_customer_access
from app.models.entities import Customer
from app.schemas.customers import CustomerCreate, CustomerRead, CustomerUpdate
from app.utils.validators import normalize_email

router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("", response_model=list[CustomerRead])
def list_customers(
    current_user: CurrentUserDep,
    session: SessionDep,
):
    """List customers. Admin and Staff see all; Customers see only their own record."""
    if current_user.role == UserRole.CUSTOMER:
        if not current_user.customer_id:
            return []
        cust = session.get(Customer, current_user.customer_id)
        return [cust] if cust else []

    customers = list(session.exec(select(Customer).order_by(Customer.id.asc())).all())
    return customers


@router.post("", response_model=CustomerRead, status_code=status.HTTP_201_CREATED)
def create_customer(
    payload: CustomerCreate,
    current_user: StaffOrAdminDep,
    session: SessionDep,
):
    """Admin and Staff: Create a new customer."""
    email = normalize_email(payload.billing_email)
    existing = session.exec(select(Customer).where(Customer.billing_email == email)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A customer with this email address already exists.",
        )

    customer = Customer(
        name=payload.name.strip(),
        billing_email=email,
        phone=payload.phone.strip() if payload.phone else None,
        address=payload.address.strip() if payload.address else None,
    )
    session.add(customer)
    session.commit()
    session.refresh(customer)
    return customer


@router.get("/{customer_id}", response_model=CustomerRead)
def get_customer(
    customer_id: int,
    current_user: CurrentUserDep,
    session: SessionDep,
):
    check_customer_access(current_user, customer_id)
    customer = session.get(Customer, customer_id)
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer with ID {customer_id} not found.",
        )
    return customer


@router.put("/{customer_id}", response_model=CustomerRead)
def update_customer(
    customer_id: int,
    payload: CustomerUpdate,
    current_user: StaffOrAdminDep,
    session: SessionDep,
):
    customer = session.get(Customer, customer_id)
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer with ID {customer_id} not found.",
        )

    if payload.billing_email:
        email = normalize_email(payload.billing_email)
        existing = session.exec(
            select(Customer).where(Customer.billing_email == email, Customer.id != customer_id)
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Another customer with this email address already exists.",
            )
        customer.billing_email = email

    if payload.name:
        customer.name = payload.name.strip()
    if payload.phone is not None:
        customer.phone = payload.phone.strip() if payload.phone else None
    if payload.address is not None:
        customer.address = payload.address.strip() if payload.address else None

    session.add(customer)
    session.commit()
    session.refresh(customer)
    return customer
