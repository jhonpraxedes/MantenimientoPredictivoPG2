"""
Esquemas Pydantic para el módulo de Maquinaria.
"""
from datetime import datetime

from pydantic import BaseModel

from app.models.maquinaria import EstadoMaquinaria


class MaquinariaBase(BaseModel):
    nombre: str
    codigo_interno: str
    tipo_equipo: str
    modelo_motor: str | None = None
    numero_serie: str | None = None
    ubicacion: str | None = None


class MaquinariaCreate(MaquinariaBase):
    """Payload para crear una nueva máquina."""
    pass


class MaquinariaUpdate(BaseModel):
    """Payload para actualizar una máquina. Todos los campos son opcionales."""
    nombre: str | None = None
    codigo_interno: str | None = None
    tipo_equipo: str | None = None
    modelo_motor: str | None = None
    numero_serie: str | None = None
    ubicacion: str | None = None
    estado: EstadoMaquinaria | None = None


class MaquinariaOut(MaquinariaBase):
    id: int
    estado: EstadoMaquinaria
    fecha_registro: datetime

    model_config = {"from_attributes": True}
