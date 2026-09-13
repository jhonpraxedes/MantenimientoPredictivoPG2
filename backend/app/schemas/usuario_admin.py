"""
app/schemas/usuario_admin.py

Esquemas Pydantic para la administración de usuarios.
Usados exclusivamente por los endpoints de /api/v1/usuarios.
"""

from datetime import datetime

from pydantic import BaseModel, EmailStr

from app.models.usuario import Rol


class UsuarioCreateAdmin(BaseModel):
    """Payload para crear un usuario desde el panel de administración."""
    nombre: str
    email: EmailStr
    password: str
    rol: Rol


class UsuarioUpdateAdmin(BaseModel):
    """Payload parcial para actualizar un usuario (todos los campos son opcionales)."""
    nombre: str | None = None
    rol: Rol | None = None
    activo: bool | None = None


class UsuarioListOut(BaseModel):
    """Representación de un usuario en las respuestas de listado/creación/actualización."""
    id: int
    nombre: str
    email: str
    rol: Rol
    activo: bool
    fecha_creacion: datetime

    model_config = {"from_attributes": True}