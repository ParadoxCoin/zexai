"""
Centralized logging configuration
Uses loguru for structured logging
"""
from loguru import logger
import sys
from core.config import settings


def setup_logger():
    """
    Configure loguru logger with appropriate settings
    """
    import os
    # Ensure logs directory exists at the very beginning
    os.makedirs("logs", exist_ok=True)
    # Force stdout to be utf-8 on Windows
    try:
        import sys
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
    
    # Remove default handler
    logger.remove()
    
    # Add console handler with custom format
    logger.add(
        sys.stdout,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
        level="DEBUG" if settings.DEBUG else "INFO",
        colorize=True
    )
    
    # Add file handler for errors
    logger.add(
        "logs/error.log",
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
        level="ERROR",
        rotation="10 MB",
        retention="30 days",
        compression="zip"
    )
    
    # Add file handler for all logs
    logger.add(
        "logs/app.log",
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
        level="INFO",
        rotation="50 MB",
        retention="7 days",
        compression="zip"
    )
    
    return logger


# Initialize logger
app_logger = setup_logger()

