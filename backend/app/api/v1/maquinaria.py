"""
Router de Maquinaria: CRUD, baja lógica, catálogo de categorías e imagen.

Endpoints:
  POST   /maquinaria/                     Crea (código automático)   [administrador, supervisor]
  GET    /maquinaria/                     Lista                      [cualquier rol autenticado]
  GET    /maquinaria/categorias           Catálogo de categorías     [cualquier rol autenticado]
  GET    /maquinaria/{id}                 Detalle                    [cualquier rol autenticado]
  PUT    /maquinaria/{id}                 Actualiza                  [administrador, supervisor]
  PATCH  /maquinaria/{id}/desactivar      Baja lógica                [administrador, supervisor]
  PATCH  /maquinaria/{id}/activar         Reactivación               [administrador, supervisor]
  POST   /maquinaria/{id}/imagen          Sube/reemplaza imagen      [administrador, supervisor]
  GET    /maquinaria/{id}/imagen          Descarga la imagen         [cualquier rol autenticado]
"""
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import Response
from sqlalchemy.exc import IntegrityError

from app.core.catalogos import CATEGORIAS_EQUIPO
from app.deps import CurrentUser, DbSession, require_role
from app.models.maquinaria import EstadoMaquinaria, Maquinaria
from app.models.usuario import Rol
from app.schemas.maquinaria import MaquinariaCreate, MaquinariaOut, MaquinariaUpdate
from app.services.codigo_equipo import generar_codigo_equipo

router = APIRouter(prefix="/maquinaria", tags=["Maquinaria"])

_ROLES_GESTION = (Rol.administrador, Rol.supervisor)

_TIPOS_IMAGEN = {"image/jpeg", "image/png", "image/webp"}
_MAX_BYTES_IMAGEN = 2 * 1024 * 1024  # 2 MB


def _obtener_o_404(db, maquinaria_id: int) -> Maquinaria:
    maquinaria = db.query(Maquinaria).filter(Maquinaria.id == maquinaria_id).first()
    if not maquinaria:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maquinaria no encontrada",
        )
    return maquinaria


# ---------------------------------------------------------------------------
# POST / — Crear maquinaria (el código se genera automáticamente)
# ---------------------------------------------------------------------------

@router.post(
    "/",
    response_model=MaquinariaOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(*_ROLES_GESTION))],
)
def crear_maquinaria(payload: MaquinariaCreate, db: DbSession, _: CurrentUser):
    """Registra una nueva máquina; el backend asigna el código interno."""
    # Reintenta si dos altas simultáneas generan el mismo consecutivo
    for _intento in range(3):
        nueva = Maquinaria(
            **payload.model_dump(),
            codigo_interno=generar_codigo_equipo(db, payload.tipo_equipo),
        )
        db.add(nueva)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            continue
        db.refresh(nueva)
        return nueva

    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="No fue posible generar el código del equipo; intente nuevamente",
    )


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
# GET /categorias — Catálogo de categorías
# (debe ir ANTES de /{maquinaria_id}, si no "categorias" se interpreta como un id)
# ---------------------------------------------------------------------------

@router.get("/categorias", response_model=List[str])
def listar_categorias(_: CurrentUser):
    """Devuelve las categorías de equipo disponibles."""
    return list(CATEGORIAS_EQUIPO.keys())


# ---------------------------------------------------------------------------
# GET /{id} — Detalle de una máquina
# ---------------------------------------------------------------------------

@router.get("/{maquinaria_id}", response_model=MaquinariaOut)
def obtener_maquinaria(maquinaria_id: int, _: CurrentUser, db: DbSession):
    """Retorna el detalle de una máquina por su ID."""
    return _obtener_o_404(db, maquinaria_id)


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
    """Actualiza los campos de una máquina existente (el código no se modifica)."""
    maquinaria = _obtener_o_404(db, maquinaria_id)

    datos = payload.model_dump(exclude_unset=True)

    # Solo se valida la categoría si realmente cambia (las máquinas antiguas
    # pueden tener un tipo de texto libre que ya no está en el catálogo).
    nuevo_tipo = datos.get("tipo_equipo")
    if (
        nuevo_tipo is not None
        and nuevo_tipo != maquinaria.tipo_equipo
        and nuevo_tipo not in CATEGORIAS_EQUIPO
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Seleccione una categoría de equipo válida",
        )

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
    maquinaria = _obtener_o_404(db, maquinaria_id)
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
    maquinaria = _obtener_o_404(db, maquinaria_id)
    if maquinaria.estado == EstadoMaquinaria.activo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El equipo ya se encuentra activo",
        )

    maquinaria.estado = EstadoMaquinaria.activo
    db.commit()
    db.refresh(maquinaria)
    return maquinaria


# ---------------------------------------------------------------------------
# POST /{id}/imagen — Subir o reemplazar la imagen
# ---------------------------------------------------------------------------

@router.post(
    "/{maquinaria_id}/imagen",
    response_model=MaquinariaOut,
    dependencies=[Depends(require_role(*_ROLES_GESTION))],
)
def subir_imagen(
    maquinaria_id: int,
    db: DbSession,
    _: CurrentUser,
    archivo: UploadFile = File(...),
):
    """Guarda la imagen de la máquina en la base de datos (JPG, PNG o WebP, máx. 2 MB)."""
    maquinaria = _obtener_o_404(db, maquinaria_id)

    if archivo.content_type not in _TIPOS_IMAGEN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La imagen debe ser JPG, PNG o WebP",
        )

    # Se lee un byte de más para detectar archivos que superan el límite
    datos = archivo.file.read(_MAX_BYTES_IMAGEN + 1)
    if len(datos) > _MAX_BYTES_IMAGEN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La imagen no puede superar los 2 MB",
        )
    if not datos:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo de imagen está vacío",
        )

    maquinaria.imagen = datos
    maquinaria.imagen_tipo = archivo.content_type
    db.commit()
    db.refresh(maquinaria)
    return maquinaria


# ---------------------------------------------------------------------------
# GET /{id}/imagen — Descargar la imagen
# ---------------------------------------------------------------------------

@router.get("/{maquinaria_id}/imagen")
def obtener_imagen(maquinaria_id: int, _: CurrentUser, db: DbSession):
    """Devuelve la imagen de la máquina (requiere sesión, como el resto de la API)."""
    maquinaria = _obtener_o_404(db, maquinaria_id)
    if not maquinaria.imagen:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La máquina no tiene imagen",
        )
    return Response(
        content=maquinaria.imagen,
        media_type=maquinaria.imagen_tipo or "application/octet-stream",
    )