"""
app/schemas/alerta.py

Esquemas Pydantic para el modelo Alerta.
"""

from datetime import datetime

from pydantic import BaseModel

from app.models.alerta import EstadoAlerta, OrigenAlerta


class AlertaOut(BaseModel):
    id: int
    estado: EstadoAlerta
    diagnostico: str
    origen: OrigenAlerta
    fecha_generacion: datetime

    model_config = {"from_attributes": True}
