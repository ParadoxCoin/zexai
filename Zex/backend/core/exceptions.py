"""
Custom exception classes for better error handling
"""
from fastapi import HTTPException, status
from typing import Optional, Dict, Any


class AIException(Exception):
    """Base exception for AI-related errors"""
    def __init__(self, message: str, error_code: str = None, details: Dict[str, Any] = None):
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        super().__init__(self.message)


class ValidationError(AIException):
    """Validation error"""
    def __init__(self, message: str, field: str = None, value: Any = None):
        super().__init__(message, "VALIDATION_ERROR", {"field": field, "value": value})


class AuthenticationError(AIException):
    """Authentication error"""
    def __init__(self, message: str = "Authentication failed"):
        super().__init__(message, "AUTH_ERROR")


class AuthorizationError(AIException):
    """Authorization error"""
    def __init__(self, message: str = "Access denied"):
        super().__init__(message, "AUTHZ_ERROR")


class DatabaseError(AIException):
    """Database operation error"""
    def __init__(self, message: str, operation: str = None):
        super().__init__(message, "DATABASE_ERROR", {"operation": operation})


class ExternalServiceError(AIException):
    """External service error (AI providers, payment processors, etc.)"""
    def __init__(self, message: str, service: str = None, status_code: int = None):
        super().__init__(message, "EXTERNAL_SERVICE_ERROR", {
            "service": service, 
            "status_code": status_code
        })


class CreditInsufficientError(AIException):
    """Insufficient credits error"""
    def __init__(self, required: float, available: float):
        super().__init__(
            f"Insufficient credits. Required: {required}, Available: {available}",
            "INSUFFICIENT_CREDITS",
            {"required": required, "available": available}
        )


class RateLimitExceededError(AIException):
    """Rate limit exceeded error"""
    def __init__(self, limit: str, retry_after: int = None):
        super().__init__(
            f"Rate limit exceeded: {limit}",
            "RATE_LIMIT_EXCEEDED",
            {"limit": limit, "retry_after": retry_after}
        )


class FileProcessingError(AIException):
    """File processing error"""
    def __init__(self, message: str, file_type: str = None, file_size: int = None):
        super().__init__(message, "FILE_PROCESSING_ERROR", {
            "file_type": file_type,
            "file_size": file_size
        })


class PaymentProcessingError(AIException):
    """Payment processing error"""
    def __init__(self, message: str, payment_method: str = None, transaction_id: str = None):
        super().__init__(message, "PAYMENT_ERROR", {
            "payment_method": payment_method,
            "transaction_id": transaction_id
        })


# Exception to HTTP status mapping
EXCEPTION_STATUS_MAP = {
    ValidationError: status.HTTP_400_BAD_REQUEST,
    AuthenticationError: status.HTTP_401_UNAUTHORIZED,
    AuthorizationError: status.HTTP_403_FORBIDDEN,
    CreditInsufficientError: status.HTTP_402_PAYMENT_REQUIRED,
    RateLimitExceededError: status.HTTP_429_TOO_MANY_REQUESTS,
    DatabaseError: status.HTTP_503_SERVICE_UNAVAILABLE,
    ExternalServiceError: status.HTTP_502_BAD_GATEWAY,
    FileProcessingError: status.HTTP_422_UNPROCESSABLE_ENTITY,
    PaymentProcessingError: status.HTTP_402_PAYMENT_REQUIRED,
}


def convert_to_http_exception(exc: AIException) -> HTTPException:
    """Convert custom exception to HTTPException"""
    status_code = EXCEPTION_STATUS_MAP.get(type(exc), status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    return HTTPException(
        status_code=status_code,
        detail={
            "message": exc.message,
            "error_code": exc.error_code,
            "details": exc.details
        }
    )

