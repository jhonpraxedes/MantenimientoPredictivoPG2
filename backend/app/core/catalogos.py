"""
Catálogos fijos del sistema.

CATEGORIAS_EQUIPO: categoría -> prefijo usado para generar el código
automático del equipo (ej. Generador -> GEN-001).
"""

CATEGORIAS_EQUIPO: dict[str, str] = {
    "Generador": "GEN",
    "Retroexcavadora": "RETRO",
    "Excavadora": "EXC",
    "Cargador frontal": "CARG",
    "Tractor": "TRAC",
    "Motoniveladora": "MOTO",
    "Camión": "CAM",
    "Compresor": "COMP",
    "Bomba": "BOM",
    "Montacargas": "MONT",
    "Otro": "OTRO",
}