"""Main FastAPI application."""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.exceptions import (
    BillingNotEligibleError,
    BusinessRuleError,
    DuplicateInvoiceError,
    InvalidTransitionError,
    PermissionDeniedError,
    ValidationError,
)
from app.database.init_db import create_db_and_tables


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run initialization when the application starts."""
    create_db_and_tables()
    yield


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Brightloop Subscription Management System API",
    lifespan=lifespan,
)

# Exception handlers ensuring uniform error contract: {"detail": "...", "errors": [...]}
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    formatted_errors = []
    for err in exc.errors():
        field_path = ".".join(str(p) for p in err.get("loc", []) if p != "body")
        formatted_errors.append({"field": field_path, "message": err.get("msg", "Invalid value")})
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": "Request validation failed.",
            "errors": formatted_errors,
        },
    )


@app.exception_handler(DuplicateInvoiceError)
async def duplicate_invoice_handler(request: Request, exc: DuplicateInvoiceError):
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={
            "detail": exc.message,
            "errors": [{"field": exc.field or "invoice", "message": exc.message}],
        },
    )


@app.exception_handler(PermissionDeniedError)
async def permission_denied_handler(request: Request, exc: PermissionDeniedError):
    return JSONResponse(
        status_code=status.HTTP_403_FORBIDDEN,
        content={"detail": exc.message},
    )


@app.exception_handler(InvalidTransitionError)
async def invalid_transition_handler(request: Request, exc: InvalidTransitionError):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "detail": exc.message,
            "errors": [{"field": exc.field or "status", "message": exc.message}],
        },
    )


@app.exception_handler(ValidationError)
async def domain_validation_handler(request: Request, exc: ValidationError):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "detail": exc.message,
            "errors": [{"field": exc.field or "value", "message": exc.message}],
        },
    )


@app.exception_handler(BillingNotEligibleError)
async def billing_not_eligible_handler(request: Request, exc: BillingNotEligibleError):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "detail": exc.message,
            "errors": [{"field": exc.field or "subscription", "message": exc.message}],
        },
    )


@app.exception_handler(BusinessRuleError)
async def business_rule_handler(request: Request, exc: BusinessRuleError):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "detail": exc.message,
            "errors": [{"field": exc.field or "rule", "message": exc.message}],
        },
    )


# Allow communication with the React frontend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin, "http://localhost:3000", "http://127.0.0.1:5173"],
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
