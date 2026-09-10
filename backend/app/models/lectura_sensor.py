"""
Modelo SQLAlchemy para la entidad LecturaSensor.
Registra las lecturas de sensores capturadas por un usuario para una máquina.
"""
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, Text
from sqlalchemy.orm import relationship

from app.db.base import Base


class LecturaSensor(Base):
    __tablename__ = "lecturas_sensores"

    id = Column(Integer, primary_key=True, index=True)

    # Claves foráneas
    maquinaria_id = Column(Integer, ForeignKey("maquinaria.id"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)

    # Métricas de sensores
    temperatura = Column(Float, nullable=False, comment="Temperatura en °C")
    presion_aceite = Column(Float, nullable=False, comment="Presión de aceite en PSI")
    vibracion = Column(Float, nullable=False, comment="Vibración en mm/s")
    horas_uso = Column(Float, nullable=False, comment="Horas de uso acumuladas")

    # Campo opcional de texto libre
    observaciones = Column(Text, nullable=True)

    # Marca de tiempo automática
    fecha_hora = Column(DateTime, default=datetime.utcnow)

    # Relaciones ORM
    maquinaria = relationship("Maquinaria", back_populates="lecturas")
    usuario = relationship("Usuario", back_populates="lecturas")
