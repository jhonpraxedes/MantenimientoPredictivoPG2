"""
Punto de entrada principal de la aplicación FastAPI.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import auth, lecturas, maquinaria, dashboard

app = FastAPI(
    title="Sistema de Mantenimiento Predictivo",
    description="API REST para gestión de mantenimiento predictivo industrial.",
    version="1.0.0",
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
app.include_router(auth.router, prefix="/api/v1")
app.include_router(maquinaria.router, prefix="/api/v1")
app.include_router(lecturas.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")

@app.get("/health", tags=["Health"])
def health_check() -> dict:
    """Endpoint de salud para monitoreo."""
    return {"status": "ok"}