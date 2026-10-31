"""Domain exceptions. Used across business rules, services, and API handlers."""

from typing import Optional


class BusinessRuleError(Exception):
    """Base class for violations of a Brightloop business rule."""

    def __init__(self, message: str, field: Optional[str] = None):
        super().__init__(message)
        self.message = str(message)
        self.field = field


class ValidationError(BusinessRuleError):
    pass


class InvalidTransitionError(BusinessRuleError):
    pass


class PermissionDeniedError(BusinessRuleError):
    pass


class BillingNotEligibleError(BusinessRuleError):
    pass


class DuplicateInvoiceError(BusinessRuleError):
    pass