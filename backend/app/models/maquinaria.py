"""
Modelo SQLAlchemy para la entidad Maquinaria.
"""
import enum
from datetime import datetime

from sqlalchemy import Column, DateTime, Enum, Integer, String
from sqlalchemy.orm import relationship

from app.db.base import Base


class EstadoMaquinaria(str, enum.Enum):
    activo = "activo"
    inactivo = "inactivo"


class Maquinaria(Base):
    __tablename__ = "maquinaria"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(150), nullable=False)
    codigo_interno = Column(String(100), unique=True, index=True, nullable=False)
    tipo_equipo = Column(String(100), nullable=False)
    modelo_motor = Column(String(100), nullable=True)
    numero_serie = Column(String(100), nullable=True)
    ubicacion = Column(String(200), nullable=True)
    estado = Column(
        Enum(EstadoMaquinaria),
        default=EstadoMaquinaria.activo,
        nullable=False,
    )
    fecha_registro = Column(DateTime, default=datetime.utcnow)

    # Relación inversa: lecturas asociadas a esta máquina
    lecturas = relationship("LecturaSensor", back_populates="maquinaria")
    alertas = relationship("Alerta", back_populates="maquinaria", cascade="all, delete-orphan")