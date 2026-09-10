"""
Router de Lecturas de Sensor.

Endpoints:
  POST  /lecturas/           Registra una lectura    [cualquier rol autenticado]
  GET   /lecturas/           Lista lecturas           [cualquier rol autenticado]
  GET   /lecturas/{id}       Detalle de una lectura   [cualquier rol autenticado]
"""
from datetime import datetime
from typing import List

from fastapi import APIRouter, HTTPException, Query, status

from app.deps import CurrentUser, DbSession
from app.models.lectura_sensor import LecturaSensor
from app.models.maquinaria import EstadoMaquinaria, Maquinaria
from app.schemas.lectura_sensor import LecturaSensorCreate, LecturaSensorOut

router = APIRouter(prefix="/lecturas", tags=["Lecturas de Sensor"])


# ---------------------------------------------------------------------------
# POST / — Registrar una lectura de sensor
# ---------------------------------------------------------------------------

@router.post("/", response_model=LecturaSensorOut, status_code=status.HTTP_201_CREATED)
def crear_lectura(
    payload: LecturaSensorCreate,
    db: DbSession,
    current_user: CurrentUser,
):
    """
    Registra una nueva lectura de sensores para una máquina activa.
    El usuario_id se toma automáticamente del token JWT; no se recibe en el body.
    """
    # Verificar que la máquina existe
    maquinaria = db.query(Maquinaria).filter(Maquinaria.id == payload.maquinaria_id).first()
    if not maquinaria:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debe seleccionar un equipo para registrar la lectura",
        )

    # Verificar que la máquina esté activa
    if maquinaria.estado != EstadoMaquinaria.activo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El equipo no está activo",
        )

    # Construir el objeto con usuario_id del contexto de seguridad
    nueva_lectura = LecturaSensor(
        **payload.model_dump(),
        usuario_id=current_user.id,
    )
    db.add(nueva_lectura)
    db.commit()
    db.refresh(nueva_lectura)

    # TODO Sprint 3: invocar aquí la evaluación con IA (CU-05)

    return nueva_lectura


# ---------------------------------------------------------------------------
# GET / — Listar lecturas (filtros opcionales)
# ---------------------------------------------------------------------------

@router.get("/", response_model=List[LecturaSensorOut])
def listar_lecturas(
    _: CurrentUser,
    db: DbSession,
    maquinaria_id: int | None = Query(default=None, description="Filtrar por ID de máquina"),
    fecha_desde: datetime | None = Query(default=None, description="Fecha inicial del rango (ISO 8601)"),
    fecha_hasta: datetime | None = Query(default=None, description="Fecha final del rango (ISO 8601)"),
):
    """
    Retorna lecturas de sensores. Soporta filtros opcionales:
      - maquinaria_id: filtra por máquina específica
      - fecha_desde / fecha_hasta: rango temporal de fecha_hora
    """
    query = db.query(LecturaSensor)

    if maquinaria_id is not None:
        query = query.filter(LecturaSensor.maquinaria_id == maquinaria_id)

    if fecha_desde is not None:
        query = query.filter(LecturaSensor.fecha_hora >= fecha_desde)

    if fecha_hasta is not None:
        query = query.filter(LecturaSensor.fecha_hora <= fecha_hasta)

    return query.order_by(LecturaSensor.fecha_hora.desc()).all()


# ---------------------------------------------------------------------------
# GET /{id} — Detalle de una lectura
# ---------------------------------------------------------------------------

@router.get("/{lectura_id}", response_model=LecturaSensorOut)
def obtener_lectura(lectura_id: int, _: CurrentUser, db: DbSession):
    """Retorna el detalle de una lectura por su ID."""
    lectura = db.query(LecturaSensor).filter(LecturaSensor.id == lectura_id).first()
    if not lectura:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lectura no encontrada",
        )
    return lectura
