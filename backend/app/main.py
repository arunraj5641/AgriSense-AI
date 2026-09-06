from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.router import router as api_router
from app.config.settings import settings
from app.core.logging import setup_logging
import uvicorn
import structlog

setup_logging()
logger = structlog.get_logger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url="/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

@app.get("/health", tags=["Health"])
async def root_health_check():
    return {"status": "ok", "service": "agrisense-api"}

@app.on_event("startup")
async def startup_event():
    logger.info("Starting up FastAPI application", environment=settings.ENVIRONMENT)

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
