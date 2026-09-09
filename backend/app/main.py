"""
Punto de entrada de la aplicación FastAPI.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.auth import router as auth_router

app = FastAPI(
    title="Sistema de Mantenimiento Predictivo",
    description="API REST para gestión de mantenimiento predictivo industrial.",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---------------------------------------------------------------------------
# CORS — ajusta origins según tu entorno
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # restringe en producción a los dominios permitidos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(auth_router, prefix="/api/v1")

# Agrega aquí futuros routers con el mismo prefijo:
# from app.api.v1.equipos import router as equipos_router
# app.include_router(equipos_router, prefix="/api/v1")


@app.get("/health", tags=["Health"])
def health_check() -> dict:
    """Endpoint de salud para monitoreo."""
    return {"status": "ok"}
