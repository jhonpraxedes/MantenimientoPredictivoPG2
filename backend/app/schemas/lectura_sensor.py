"""
Esquemas Pydantic para el módulo de LecturaSensor.
Incluye validadores de rango para los valores de los sensores.
"""
from datetime import datetime

from pydantic import BaseModel, field_validator

from app.schemas.alerta import AlertaOut

_MENSAJE_RANGO = "Verifique los valores de sensores ingresados; están fuera de rango operativo"


class LecturaSensorBase(BaseModel):
    maquinaria_id: int
    temperatura: float
    presion_aceite: float
    vibracion: float
    horas_uso: float
    observaciones: str | None = None


class LecturaSensorCreate(LecturaSensorBase):
    """
    Payload para registrar una lectura de sensor.
    El campo usuario_id es inyectado por el endpoint a partir del usuario
    autenticado; no debe enviarse en el body.
    """

    @field_validator("temperatura")
    @classmethod
    def validar_temperatura(cls, v: float) -> float:
        if not (0 <= v <= 150):
            raise ValueError(_MENSAJE_RANGO)
        return v

    @field_validator("presion_aceite")
    @classmethod
    def validar_presion_aceite(cls, v: float) -> float:
        if v < 0:
            raise ValueError(_MENSAJE_RANGO)
        return v

    @field_validator("vibracion")
    @classmethod
    def validar_vibracion(cls, v: float) -> float:
        if v < 0:
            raise ValueError(_MENSAJE_RANGO)
        return v

    @field_validator("horas_uso")
    @classmethod
    def validar_horas_uso(cls, v: float) -> float:
        if v < 0:
            raise ValueError(_MENSAJE_RANGO)
        return v


class LecturaSensorOut(LecturaSensorBase):
    id: int
    usuario_id: int
    fecha_hora: datetime
    alerta: AlertaOut | None = None
    model_config = {"from_attributes": True}
