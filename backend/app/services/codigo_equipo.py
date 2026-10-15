"""
app/services/codigo_equipo.py

Genera el código interno automático de un equipo: PREFIJO-NNN (ej. GEN-001).
El prefijo sale de la categoría; el número es el siguiente consecutivo
disponible para ese prefijo.
"""
from sqlalchemy.orm import Session

from app.core.catalogos import CATEGORIAS_EQUIPO
from app.models.maquinaria import Maquinaria


def generar_codigo_equipo(db: Session, tipo_equipo: str) -> str:
    prefijo = CATEGORIAS_EQUIPO[tipo_equipo]

    existentes = (
        db.query(Maquinaria.codigo_interno)
        .filter(Maquinaria.codigo_interno.like(f"{prefijo}-%"))
        .all()
    )

    mayor = 0
    for (codigo,) in existentes:
        sufijo = codigo.rsplit("-", 1)[-1]
        if sufijo.isdigit():
            mayor = max(mayor, int(sufijo))

    return f"{prefijo}-{mayor + 1:03d}"