"""
Esquemas Pydantic para el módulo de Maquinaria.
"""
from datetime import datetime

from pydantic import BaseModel, field_validator

from app.core.catalogos import CATEGORIAS_EQUIPO
from app.models.maquinaria import EstadoMaquinaria


class MaquinariaBase(BaseModel):
    nombre: str
    tipo_equipo: str
    modelo_motor: str | None = None
    numero_serie: str | None = None
    ubicacion: str | None = None


class MaquinariaCreate(MaquinariaBase):
    """Payload para crear una máquina. El código interno NO se recibe: lo genera el backend."""

    @field_validator("tipo_equipo")
    @classmethod
    def validar_categoria(cls, v: str) -> str:
        if v not in CATEGORIAS_EQUIPO:
            raise ValueError("Seleccione una categoría de equipo válida")
        return v


class MaquinariaUpdate(BaseModel):
    """Payload para actualizar una máquina. Todos los campos son opcionales.
    El código interno no se puede modificar."""
    nombre: str | None = None
    tipo_equipo: str | None = None
    modelo_motor: str | None = None
    numero_serie: str | None = None
    ubicacion: str | None = None
    estado: EstadoMaquinaria | None = None


class MaquinariaOut(MaquinariaBase):
    id: int
    codigo_interno: str
    estado: EstadoMaquinaria
    fecha_registro: datetime
    imagen_tipo: str | None = None  # si no es None, la máquina tiene imagen

    model_config = {"from_attributes": True}