from fastapi import APIRouter
from app.auth.router import router as auth_router
from app.api.endpoints import farmers, farms, resources, recommendations

router = APIRouter(prefix="/api/v1")
router.include_router(auth_router)
router.include_router(farmers.router)
router.include_router(farms.router)
router.include_router(resources.router)
router.include_router(recommendations.router)

@router.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint to verify the service is running."""
    return {"status": "ok", "service": "agrisense-api"}

@router.get("/ready", tags=["Health"])
async def readiness_check():
    """Readiness check endpoint to verify dependencies (e.g. DB) are ready."""
    # TODO: Add DB ping here
    return {"status": "ready"}
