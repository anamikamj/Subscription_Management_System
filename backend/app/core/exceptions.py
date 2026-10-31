"""Domain exceptions. Merge these into your existing core/exceptions.py."""


class BusinessRuleError(Exception):
    """Base class for violations of a Brightloop business rule."""


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