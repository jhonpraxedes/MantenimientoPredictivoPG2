"""
Punto de entrada principal de la aplicación FastAPI.
"""
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import usuarios, reportes

from app.api.v1 import auth, lecturas, maquinaria, dashboard


app = FastAPI(
    title="Sistema de Mantenimiento Predictivo",
    description="API REST para gestión de mantenimiento predictivo industrial.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---------------------------------------------------------------------------
# CORS
# Los orígenes permitidos se leen de la variable de entorno CORS_ORIGINS
# (lista separada por comas). Si no existe, se permiten solo los orígenes
# de desarrollo local.
#
# Ejemplo en producción:
#   CORS_ORIGINS=https://mi-sistema.netlify.app
# ---------------------------------------------------------------------------
_ORIGENES_LOCALES = [
    "http://localhost:8000",
    "http://localhost:8001",
    "http://127.0.0.1:8000",
    "http://127.0.0.1:8001",
]

_cors_env = os.environ.get("CORS_ORIGINS", "").strip()
ALLOWED_ORIGINS: list[str] = (
    [o.strip().rstrip("/") for o in _cors_env.split(",") if o.strip()]
    if _cors_env
    else _ORIGENES_LOCALES
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(auth.router, prefix="/api/v1")
app.include_router(maquinaria.router, prefix="/api/v1")
app.include_router(lecturas.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(usuarios.router, prefix="/api/v1")
app.include_router(reportes.router, prefix="/api/v1")

@app.get("/health", tags=["Health"])
def health_check() -> dict:
    """Endpoint de salud para monitoreo."""
    return {"status": "ok"}