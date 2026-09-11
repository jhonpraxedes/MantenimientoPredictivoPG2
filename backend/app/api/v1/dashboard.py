"""
app/api/v1/dashboard.py

Router de Dashboard.
Endpoint: GET /api/v1/dashboard/resumen
Requiere: usuario autenticado (cualquier rol).
"""

from datetime import datetime
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import func, select

from app.deps import CurrentUser, DbSession
from app.models.alerta import Alerta, EstadoAlerta
from app.models.maquinaria import Maquinaria

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


# ─────────────────────────────────────────────
# Schemas de respuesta (definidos localmente
# para no contaminar el módulo de schemas)
# ─────────────────────────────────────────────

class AlertaCriticaResumen(BaseModel):
    maquinaria_nombre: str
    diagnostico: str
    fecha_generacion: datetime


class DashboardResumen(BaseModel):
    maquinas_total: int
    maquinas_activas: int
    maquinas_inactivas: int
    alertas_normal: int
    alertas_advertencia: int
    alertas_critico: int
    ultimas_alertas_criticas: list[AlertaCriticaResumen]


# ─────────────────────────────────────────────
# Endpoint
# ─────────────────────────────────────────────

@router.get("/resumen", response_model=DashboardResumen)
def obtener_resumen(
    db: DbSession,
    _current_user: CurrentUser,   # solo verifica que esté autenticado
) -> Any:
    """
    Resumen global para el dashboard:
    - Conteo de máquinas (total / activas / inactivas).
    - Conteo de alertas por estado basado en la alerta más reciente de cada máquina activa.
    - Las 5 alertas críticas más recientes con nombre de máquina.
    """

    # ── 1. Conteo de máquinas ──────────────────────────────────────
    total_maquinas: int = db.scalar(select(func.count()).select_from(Maquinaria)) or 0

    activas: int = db.scalar(
        select(func.count()).select_from(Maquinaria).where(Maquinaria.estado == "activo")
    ) or 0

    inactivas: int = total_maquinas - activas

    # ── 2. Alerta más reciente por máquina activa ──────────────────
    # Subconsulta: para cada maquinaria_id, el id de la alerta más reciente
    subq = (
        select(
            Alerta.maquinaria_id,
            func.max(Alerta.fecha_generacion).label("max_fecha"),
        )
        .group_by(Alerta.maquinaria_id)
        .subquery()
    )

    # Join con Maquinaria para filtrar solo las activas
    stmt_alertas_recientes = (
        select(Alerta)
        .join(
            subq,
            (Alerta.maquinaria_id == subq.c.maquinaria_id)
            & (Alerta.fecha_generacion == subq.c.max_fecha),
        )
        .join(Maquinaria, Maquinaria.id == Alerta.maquinaria_id)
        .where(Maquinaria.estado == "activo")
    )

    alertas_recientes: list[Alerta] = list(db.scalars(stmt_alertas_recientes).all())

    # Conteo por estado de la alerta más reciente
    alertas_normal: int = sum(
        1 for a in alertas_recientes if a.estado == EstadoAlerta.normal
    )
    alertas_advertencia: int = sum(
        1 for a in alertas_recientes if a.estado == EstadoAlerta.advertencia
    )
    alertas_critico: int = sum(
        1 for a in alertas_recientes if a.estado == EstadoAlerta.critico
    )

    # ── 3. Últimas 5 alertas críticas (cualquier máquina) ──────────
    stmt_criticas = (
        select(Alerta, Maquinaria.nombre.label("maquinaria_nombre"))
        .join(Maquinaria, Maquinaria.id == Alerta.maquinaria_id)
        .where(Alerta.estado == EstadoAlerta.critico)
        .order_by(Alerta.fecha_generacion.desc())
        .limit(5)
    )

    rows = db.execute(stmt_criticas).all()

    ultimas_criticas: list[AlertaCriticaResumen] = [
        AlertaCriticaResumen(
            maquinaria_nombre=row.maquinaria_nombre,
            diagnostico=row.Alerta.diagnostico,
            fecha_generacion=row.Alerta.fecha_generacion,
        )
        for row in rows
    ]

    return DashboardResumen(
        maquinas_total=total_maquinas,
        maquinas_activas=activas,
        maquinas_inactivas=inactivas,
        alertas_normal=alertas_normal,
        alertas_advertencia=alertas_advertencia,
        alertas_critico=alertas_critico,
        ultimas_alertas_criticas=ultimas_criticas,
    )
