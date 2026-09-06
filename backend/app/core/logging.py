import logging
import structlog
import sys
from app.config.settings import settings

def setup_logging() -> None:
    """Configure structured logging for the application."""
    
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
    
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.stdlib.add_log_level,
            structlog.stdlib.add_logger_name,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer() if settings.ENVIRONMENT == "production" else structlog.dev.ConsoleRenderer(),
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )
    
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter("%(message)s"))
    root_logger = logging.getLogger()
    root_logger.addHandler(handler)
    root_logger.setLevel(log_level)
    
    # Uvicorn loggers
    for _log in ["uvicorn", "uvicorn.error", "uvicorn.access"]:
        logging.getLogger(_log).handlers.clear()
        logging.getLogger(_log).propagate = True
