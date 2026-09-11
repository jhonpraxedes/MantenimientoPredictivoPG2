"""
Router de Maquinaria — CRUD + baja lógica.

Endpoints:
  POST   /maquinaria/            Crea una máquina        [administrador, supervisor]
  GET    /maquinaria/            Lista máquinas           [cualquier rol autenticado]
  GET    /maquinaria/{id}        Detalle de una máquina   [cualquier rol autenticado]
  PUT    /maquinaria/{id}        Actualiza una máquina    [administrador, supervisor]
  PATCH  /maquinaria/{id}/desactivar  Baja lógica         [administrador, supervisor]
"""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.deps import CurrentUser, DbSession, require_role
from app.models.maquinaria import EstadoMaquinaria, Maquinaria
from app.models.usuario import Rol
from app.schemas.maquinaria import MaquinariaCreate, MaquinariaOut, MaquinariaUpdate

router = APIRouter(prefix="/maquinaria", tags=["Maquinaria"])

_ROLES_GESTION = (Rol.administrador, Rol.supervisor)


# ---------------------------------------------------------------------------
# POST / — Crear maquinaria
# ---------------------------------------------------------------------------

@router.post(
    "/",
    response_model=MaquinariaOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(*_ROLES_GESTION))],
)
def crear_maquinaria(payload: MaquinariaCreate, db: DbSession, _: CurrentUser):
    """Registra una nueva máquina en el sistema."""
    existente = (
        db.query(Maquinaria)
        .filter(Maquinaria.codigo_interno == payload.codigo_interno)
        .first()
    )
    if existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El código ingresado ya pertenece a otra unidad",
        )

    nueva = Maquinaria(**payload.model_dump())
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return nueva


# ---------------------------------------------------------------------------
# GET / — Listar maquinaria (con filtro opcional por estado)
# ---------------------------------------------------------------------------

@router.get("/", response_model=List[MaquinariaOut])
def listar_maquinaria(
    _: CurrentUser,
    db: DbSession,
    estado: EstadoMaquinaria | None = Query(default=None, description="Filtrar por estado: activo | inactivo"),
):
    """Retorna la lista de máquinas. Todos los roles autenticados pueden consultarla."""
    query = db.query(Maquinaria)
    if estado is not None:
        query = query.filter(Maquinaria.estado == estado)
    return query.all()


# ---------------------------------------------------------------------------
# GET /{id} — Detalle de una máquina
# ---------------------------------------------------------------------------

@router.get("/{maquinaria_id}", response_model=MaquinariaOut)
def obtener_maquinaria(maquinaria_id: int, _: CurrentUser, db: DbSession):
    """Retorna el detalle de una máquina por su ID."""
    maquinaria = db.query(Maquinaria).filter(Maquinaria.id == maquinaria_id).first()
    if not maquinaria:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maquinaria no encontrada",
        )
    return maquinaria


# ---------------------------------------------------------------------------
# PUT /{id} — Actualizar campos
# ---------------------------------------------------------------------------

@router.put(
    "/{maquinaria_id}",
    response_model=MaquinariaOut,
    dependencies=[Depends(require_role(*_ROLES_GESTION))],
)
def actualizar_maquinaria(
    maquinaria_id: int,
    payload: MaquinariaUpdate,
    db: DbSession,
    _: CurrentUser,
):
    """Actualiza los campos de una máquina existente."""
    maquinaria = db.query(Maquinaria).filter(Maquinaria.id == maquinaria_id).first()
    if not maquinaria:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maquinaria no encontrada",
        )

    # Si se intenta cambiar el código interno, verificar unicidad
    if payload.codigo_interno and payload.codigo_interno != maquinaria.codigo_interno:
        duplicado = (
            db.query(Maquinaria)
            .filter(Maquinaria.codigo_interno == payload.codigo_interno)
            .first()
        )
        if duplicado:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El código ingresado ya pertenece a otra unidad",
            )

    datos = payload.model_dump(exclude_unset=True)
    for campo, valor in datos.items():
        setattr(maquinaria, campo, valor)

    db.commit()
    db.refresh(maquinaria)
    return maquinaria


# ---------------------------------------------------------------------------
# PATCH /{id}/desactivar — Baja lógica
# ---------------------------------------------------------------------------

@router.patch(
    "/{maquinaria_id}/desactivar",
    response_model=MaquinariaOut,
    dependencies=[Depends(require_role(*_ROLES_GESTION))],
)
def desactivar_maquinaria(
    maquinaria_id: int,
    db: DbSession,
    _: CurrentUser,
):
    """Cambia el estado de la máquina a 'inactivo' (baja lógica, sin borrado físico)."""
    maquinaria = db.query(Maquinaria).filter(Maquinaria.id == maquinaria_id).first()
    if not maquinaria:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maquinaria no encontrada",
        )
    if maquinaria.estado == EstadoMaquinaria.inactivo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El equipo ya se encuentra inactivo",
        )

    maquinaria.estado = EstadoMaquinaria.inactivo
    db.commit()
    db.refresh(maquinaria)
    return maquinaria

# ---------------------------------------------------------------------------
# PATCH /{id}/activar — Reactivación
# ---------------------------------------------------------------------------

@router.patch(
    "/{maquinaria_id}/activar",
    response_model=MaquinariaOut,
    dependencies=[Depends(require_role(*_ROLES_GESTION))],
)
def activar_maquinaria(
    maquinaria_id: int,
    db: DbSession,
    _: CurrentUser,
):
    """Reactiva una máquina previamente desactivada."""
    maquinaria = db.query(Maquinaria).filter(Maquinaria.id == maquinaria_id).first()
    if not maquinaria:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maquinaria no encontrada",
        )
    if maquinaria.estado == EstadoMaquinaria.activo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El equipo ya se encuentra activo",
        )

    maquinaria.estado = EstadoMaquinaria.activo
    db.commit()
    db.refresh(maquinaria)
    return maquinaria