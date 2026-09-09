"""
Esquemas Pydantic para el dominio de Usuario y Autenticación.
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from app.models.usuario import Rol


# ---------------------------------------------------------------------------
# Base compartida
# ---------------------------------------------------------------------------
class UsuarioBase(BaseModel):
    nombre: str = Field(..., max_length=150, examples=["Ana García"])
    email: EmailStr
    rol: Rol = Rol.tecnico
    activo: bool = True


# ---------------------------------------------------------------------------
# Creación (incluye password en texto plano, solo para escritura)
# ---------------------------------------------------------------------------
class UsuarioCreate(UsuarioBase):
    password: str = Field(
        ..., min_length=8, description="Contraseña en texto plano (mínimo 8 caracteres)"
    )


# ---------------------------------------------------------------------------
# Actualización parcial
# ---------------------------------------------------------------------------
class UsuarioUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=150)
    email: Optional[EmailStr] = None
    rol: Optional[Rol] = None
    activo: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=8)


# ---------------------------------------------------------------------------
# Respuesta (nunca expone password_hash)
# ---------------------------------------------------------------------------
class UsuarioOut(UsuarioBase):
    id: int
    fecha_creacion: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Tokens JWT
# ---------------------------------------------------------------------------
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    """Payload decodificado del JWT."""
    sub: Optional[str] = None   # email del usuario
    exp: Optional[int] = None
