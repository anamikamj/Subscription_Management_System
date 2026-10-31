"""Product catalog endpoints."""

from fastapi import APIRouter, HTTPException, status
from sqlmodel import select

from app.api.deps import AdminUserDep, CurrentUserDep, SessionDep
from app.models.entities import Product
from app.schemas.products import ProductCreate, ProductRead

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=list[ProductRead])
def list_products(
    current_user: CurrentUserDep,
    session: SessionDep,
):
    products = list(session.exec(select(Product).order_by(Product.id.asc())).all())
    return products


@router.post("", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate,
    current_admin: AdminUserDep,
    session: SessionDep,
):
    """Admin-only: Create a new product."""
    product = Product(
        name=payload.name.strip(),
        product_type=payload.product_type,
        sales_price_paise=payload.sales_price_paise,
        cost_price_paise=payload.cost_price_paise,
        notes=payload.notes,
        is_active=payload.is_active,
    )
    session.add(product)
    session.commit()
    session.refresh(product)
    return product


@router.get("/{product_id}", response_model=ProductRead)
def get_product(
    product_id: int,
    current_user: CurrentUserDep,
    session: SessionDep,
):
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID {product_id} not found.",
        )
    return product
