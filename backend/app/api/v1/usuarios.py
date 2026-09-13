"""
app/api/v1/usuarios.py

Router de administración de usuarios.
Todos los endpoints requieren rol 'administrador'.

Endpoints:
  POST /api/v1/usuarios/          – Crea un nuevo usuario.
  GET  /api/v1/usuarios/          – Lista todos los usuarios.
  PUT  /api/v1/usuarios/{id}      – Actualiza nombre / rol / activo de un usuario.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func

from app.core.security import hash_password
from app.deps import CurrentUser, DbSession, require_role
from app.models.usuario import Rol, Usuario
from app.schemas.usuario_admin import (
    UsuarioCreateAdmin,
    UsuarioListOut,
    UsuarioUpdateAdmin,
)

router = APIRouter(prefix="/usuarios", tags=["usuarios"])


# ─────────────────────────────────────────────
# POST /usuarios/   – Crear usuario
# ─────────────────────────────────────────────

@router.post("/", response_model=UsuarioListOut, status_code=201)
def crear_usuario(
    payload: UsuarioCreateAdmin,
    db: DbSession,
    current_user: Usuario = Depends(require_role(Rol.administrador)),
) -> Usuario:
    """
    Crea un nuevo usuario en el sistema.
    - Verifica que el email no esté registrado (comparación en minúsculas).
    - Hashea la contraseña antes de persistir.
    """
    # Verificar unicidad del email (case-insensitive)
    existente = (
        db.query(Usuario)
        .filter(func.lower(Usuario.email) == payload.email.lower())
        .first()
    )
    if existente:
        raise HTTPException(
            status_code=400,
            detail="Ya existe un usuario con ese correo electrónico",
        )

    nuevo_usuario = Usuario(
        nombre=payload.nombre,
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        rol=payload.rol,
    )
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)
    return nuevo_usuario


# ─────────────────────────────────────────────
# GET /usuarios/   – Listar usuarios
# ─────────────────────────────────────────────

@router.get("/", response_model=list[UsuarioListOut])
def listar_usuarios(
    db: DbSession,
    current_user: Usuario = Depends(require_role(Rol.administrador)),
) -> list[Usuario]:
    """
    Retorna todos los usuarios registrados en el sistema sin filtro.
    """
    return db.query(Usuario).all()


# ─────────────────────────────────────────────
# PUT /usuarios/{id}   – Actualizar usuario
# ─────────────────────────────────────────────

@router.put("/{id}", response_model=UsuarioListOut)
def actualizar_usuario(
    id: int,
    payload: UsuarioUpdateAdmin,
    db: DbSession,
    current_user: Usuario = Depends(require_role(Rol.administrador)),
) -> Usuario:
    """
    Actualiza parcialmente un usuario (solo los campos presentes en el payload).
    - 404 si el usuario no existe.
    - 400 si el administrador intenta quitarse a sí mismo el rol de administrador.
    """
    usuario = db.query(Usuario).filter(Usuario.id == id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    cambios = payload.model_dump(exclude_unset=True)

    # Protección: el administrador no puede cambiar su propio rol
    if (
        current_user.id == id
        and "rol" in cambios
        and cambios["rol"] != Rol.administrador
    ):
        raise HTTPException(
            status_code=400,
            detail="No puedes cambiar tu propio rol de administrador",
        )

    for campo, valor in cambios.items():
        setattr(usuario, campo, valor)

    db.commit()
    db.refresh(usuario)
    return usuario