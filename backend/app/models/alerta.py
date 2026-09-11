"""
app/models/alerta.py

Modelo SQLAlchemy para las alertas generadas tras evaluar una lectura de sensor.
Relaciones:
  - Alerta ←→ LecturaSensor : uno a uno  (alerta.lectura / lectura.alerta)
  - Alerta ←→ Maquinaria    : muchos a uno (alerta.maquinaria / maquinaria.alertas)
"""

import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base  


# ─────────────────────────────────────────────
# Enums Python (espejados como tipos ENUM en PG)
# ─────────────────────────────────────────────

class EstadoAlerta(str, enum.Enum):
    normal      = "normal"
    advertencia = "advertencia"
    critico     = "critico"


class OrigenAlerta(str, enum.Enum):
    ia      = "ia"
    reglas  = "reglas"


# ─────────────────────────────────────────────
# Modelo
# ─────────────────────────────────────────────

class Alerta(Base):
    __tablename__ = "alertas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # FK único → relación 1:1 con LecturaSensor
    lectura_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("lecturas_sensores.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )

    # FK → relación N:1 con Maquinaria
    maquinaria_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("maquinaria.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    estado: Mapped[EstadoAlerta] = mapped_column(
        Enum(EstadoAlerta, name="estado_alerta_enum"),
        nullable=False,
    )

    diagnostico: Mapped[str] = mapped_column(Text, nullable=False)

    origen: Mapped[OrigenAlerta] = mapped_column(
        Enum(OrigenAlerta, name="origen_alerta_enum"),
        nullable=False,
    )

    fecha_generacion: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    # ── Relationships ─────────────────────────
    lectura: Mapped["LecturaSensor"] = relationship(  # type: ignore[name-defined]
        "LecturaSensor",
        back_populates="alerta",
    )

    maquinaria: Mapped["Maquinaria"] = relationship(  # type: ignore[name-defined]
        "Maquinaria",
        back_populates="alertas",
    )
