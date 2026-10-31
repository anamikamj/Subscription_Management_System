"""Authentication endpoints: login, customer self-registration, and current user info."""

from fastapi import APIRouter, HTTPException, status
from sqlmodel import select

from app.api.deps import CurrentUserDep, SessionDep
from app.core.constants import UserRole
from app.core.security import create_access_token, hash_password, verify_password
from app.models.entities import Customer, User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserRead
from app.utils.validators import normalize_email, validate_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, session: SessionDep):
    email = normalize_email(payload.email)
    user = session.exec(select(User).where(User.email == email)).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Please contact support.",
        )

    token = create_access_token(
        subject=user.id,
        extra_claims={"role": user.role.value, "email": user.email},
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserRead(
            id=user.id,
            name=user.name,
            email=user.email,
            role=user.role.value,
            customer_id=user.customer_id,
        ),
    )


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, session: SessionDep):
    pwd_errors = validate_password(payload.password)
    if pwd_errors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="; ".join(pwd_errors),
        )

    email = normalize_email(payload.email)
    existing = session.exec(select(User).where(User.email == email)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists.",
        )

    # Automatically create customer entity for new customer registration
    customer = Customer(
        name=payload.name,
        billing_email=email,
    )
    session.add(customer)
    session.flush()

    user = User(
        name=payload.name,
        email=email,
        password_hash=hash_password(payload.password),
        role=UserRole.CUSTOMER,
        customer_id=customer.id,
        is_active=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    return UserRead(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role.value,
        customer_id=user.customer_id,
    )


@router.get("/me", response_model=UserRead)
def get_me(current_user: CurrentUserDep):
    return UserRead(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        role=current_user.role.value,
        customer_id=current_user.customer_id,
    )
