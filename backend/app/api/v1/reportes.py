"""
app/api/v1/reportes.py

Router de generación de reportes PDF.
Accesible para roles: administrador y supervisor.

Endpoints:
  GET /api/v1/reportes/estado-operativo         – Reporte de flota (global o por máquina).
  GET /api/v1/reportes/historico-diagnosticos   – Historial de lecturas de una máquina.
"""

from datetime import date, datetime, time
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response

from app.deps import DbSession, require_role
from app.models.alerta import Alerta
from app.models.lectura_sensor import LecturaSensor
from app.models.maquinaria import Maquinaria
from app.models.usuario import Rol, Usuario
from app.services.pdf_reportes import (
    generar_reporte_estado_operativo,
    generar_reporte_historico,
)

router = APIRouter(prefix="/reportes", tags=["reportes"])

_require_admin_o_supervisor = Depends(require_role(Rol.administrador, Rol.supervisor))


# ─────────────────────────────────────────────
# GET /reportes/estado-operativo
# ─────────────────────────────────────────────

@router.get("/estado-operativo")
def reporte_estado_operativo(
    db: DbSession,
    _current_user: Usuario = _require_admin_o_supervisor,
    maquinaria_id: Optional[int] = Query(
        None, description="ID de máquina (opcional). Sin valor = flota completa."
    ),
) -> Response:
    """
    Genera y descarga un PDF con el estado operativo de la flota.
    """
    if maquinaria_id is not None:
        maquina = db.query(Maquinaria).filter(Maquinaria.id == maquinaria_id).first()
        if not maquina:
            raise HTTPException(status_code=404, detail="Máquina no encontrada")
        maquinarias: list[Maquinaria] = [maquina]
    else:
        maquinarias = db.query(Maquinaria).all()

    alertas_por_maquinaria: dict[int, Alerta | None] = {}
    for maq in maquinarias:
        alerta = (
            db.query(Alerta)
            .filter(Alerta.maquinaria_id == maq.id)
            .order_by(Alerta.fecha_generacion.desc())
            .first()
        )
        alertas_por_maquinaria[maq.id] = alerta

    try:
        pdf_bytes = generar_reporte_estado_operativo(maquinarias, alertas_por_maquinaria)
    except RuntimeError:
        raise HTTPException(
            status_code=500,
            detail="No fue posible compilar el reporte; intente nuevamente",
        )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": 'attachment; filename="reporte_estado_operativo.pdf"'
        },
    )


# ─────────────────────────────────────────────
# GET /reportes/historico-diagnosticos
# ─────────────────────────────────────────────

@router.get("/historico-diagnosticos")
def reporte_historico_diagnosticos(
    db: DbSession,
    _current_user: Usuario = _require_admin_o_supervisor,
    maquinaria_id: int = Query(..., description="ID de la máquina (requerido)."),
    fecha_desde: Optional[date] = Query(None, description="Fecha inicio (YYYY-MM-DD)."),
    fecha_hasta: Optional[date] = Query(None, description="Fecha fin (YYYY-MM-DD)."),
) -> Response:
    """
    Genera y descarga un PDF con el historial cronológico de lecturas de una máquina.
    """
    maquina = db.query(Maquinaria).filter(Maquinaria.id == maquinaria_id).first()
    if not maquina:
        raise HTTPException(status_code=404, detail="Máquina no encontrada")

    query = db.query(LecturaSensor).filter(
        LecturaSensor.maquinaria_id == maquinaria_id
    )
    if fecha_desde is not None:
        query = query.filter(LecturaSensor.fecha_hora >= fecha_desde)
    if fecha_hasta is not None:
        fin_del_dia = datetime.combine(fecha_hasta, time.max)
        query = query.filter(LecturaSensor.fecha_hora <= fin_del_dia)

    lecturas: list[LecturaSensor] = query.order_by(LecturaSensor.fecha_hora.asc()).all()

    if not lecturas:
        raise HTTPException(
            status_code=400,
            detail="El equipo seleccionado no posee historial de registros",
        )

    lectura_ids = [l.id for l in lecturas]
    alertas_lista: list[Alerta] = (
        db.query(Alerta).filter(Alerta.lectura_id.in_(lectura_ids)).all()
    )
    alertas: dict[int, Alerta] = {a.lectura_id: a for a in alertas_lista}

    try:
        pdf_bytes = generar_reporte_historico(maquina, lecturas, alertas)
    except RuntimeError:
        raise HTTPException(
            status_code=500,
            detail="No fue posible compilar el reporte; intente nuevamente",
        )

    nombre_archivo = f"reporte_historico_{maquina.codigo_interno or maquinaria_id}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{nombre_archivo}"'
        },
    )