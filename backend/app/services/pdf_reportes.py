"""
app/services/pdf_reportes.py

Servicio de generación de reportes PDF usando fpdf2.

Funciones:
  generar_reporte_estado_operativo  – Informe global / filtrado de flota.
  generar_reporte_historico         – Historial de lecturas de una máquina.

Ambas retornan bytes y relanzarán cualquier error interno como RuntimeError.
"""

from datetime import datetime

from fpdf import FPDF

from app.models.alerta import Alerta
from app.models.lectura_sensor import LecturaSensor
from app.models.maquinaria import Maquinaria


# ─────────────────────────────────────────────
# Constantes de diseño
# ─────────────────────────────────────────────
SISTEMA_NOMBRE = "Sistema de Mantenimiento Predictivo"
FONT_FAMILY    = "Helvetica"
COLOR_HEADER   = (30, 80, 160)    # azul corporativo
COLOR_ROW_ALT  = (240, 245, 255)  # azul muy claro para filas alternas
COLOR_NEGRO    = (0, 0, 0)

ESTADO_ALERTA_LABEL: dict[str, str] = {
    "normal":      "Normal",
    "advertencia": "Advertencia",
    "critico":     "Crítico",
}
ESTADO_MAQ_LABEL: dict[str, str] = {
    "activo":   "Activo",
    "inactivo": "Inactivo",
}


# ─────────────────────────────────────────────
# Helpers internos
# ─────────────────────────────────────────────

def _fecha_generacion() -> str:
    return datetime.now().strftime("%d/%m/%Y %H:%M")


def _membrete(pdf: FPDF, subtitulo: str) -> None:
    """Escribe el encabezado estándar en el PDF."""
    pdf.set_font(FONT_FAMILY, "B", 14)
    pdf.set_text_color(*COLOR_HEADER)
    pdf.cell(0, 8, SISTEMA_NOMBRE, ln=True, align="C")

    pdf.set_font(FONT_FAMILY, "B", 11)
    pdf.cell(0, 7, subtitulo, ln=True, align="C")

    pdf.set_font(FONT_FAMILY, "", 9)
    pdf.set_text_color(*COLOR_NEGRO)
    pdf.cell(0, 6, f"Generado: {_fecha_generacion()}", ln=True, align="C")
    pdf.ln(4)


def _encabezado_tabla(pdf: FPDF, columnas: list[tuple[str, float]]) -> None:
    """Dibuja la fila de encabezado de tabla."""
    pdf.set_fill_color(*COLOR_HEADER)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font(FONT_FAMILY, "B", 8)
    for texto, ancho in columnas:
        pdf.cell(ancho, 7, texto, border=1, fill=True, align="C")
    pdf.ln()
    pdf.set_text_color(*COLOR_NEGRO)


def _fila_tabla(
    pdf: FPDF,
    celdas: list[tuple[str, float]],
    fila_par: bool,
) -> None:
    """Dibuja una fila de datos con fondo alterno."""
    if fila_par:
        pdf.set_fill_color(*COLOR_ROW_ALT)
    else:
        pdf.set_fill_color(255, 255, 255)
    pdf.set_font(FONT_FAMILY, "", 8)
    for texto, ancho in celdas:
        pdf.cell(ancho, 6, texto, border=1, fill=True)
    pdf.ln()


def _truncar(texto: str, max_chars: int = 40) -> str:
    """Recorta texto largo para que quepa en una celda."""
    if len(texto) > max_chars:
        return texto[: max_chars - 3] + "..."
    return texto


# ─────────────────────────────────────────────
# Función A: reporte de estado operativo
# ─────────────────────────────────────────────

def generar_reporte_estado_operativo(
    maquinarias: list[Maquinaria],
    alertas_por_maquinaria: dict[int, Alerta | None],
) -> bytes:
    """
    Genera un PDF con el estado operativo de la flota.
    Retorna los bytes del PDF.
    Relanza cualquier excepción interna como RuntimeError.
    """
    try:
        pdf = FPDF(orientation="L", unit="mm", format="A4")
        pdf.set_auto_page_break(auto=True, margin=15)
        pdf.add_page()
        pdf.set_margins(10, 10, 10)

        _membrete(pdf, "Informe de Estado Operativo de Flota")

        columnas: list[tuple[str, float]] = [
            ("Nombre",           60.0),
            ("Código interno",   35.0),
            ("Tipo de equipo",   45.0),
            ("Estado máquina",   30.0),
            ("Estado alerta",    28.0),
            ("Diagnóstico",      79.0),
        ]
        _encabezado_tabla(pdf, columnas)

        for idx, maq in enumerate(maquinarias):
            alerta = alertas_por_maquinaria.get(maq.id)
            estado_alerta = (
                ESTADO_ALERTA_LABEL.get(alerta.estado.value, alerta.estado.value)
                if alerta
                else "Sin evaluar"
            )
            diagnostico = _truncar(alerta.diagnostico, 55) if alerta else "—"
            estado_maq = ESTADO_MAQ_LABEL.get(
                maq.estado.value if hasattr(maq.estado, "value") else str(maq.estado),
                str(maq.estado),
            )

            celdas: list[tuple[str, float]] = [
                (_truncar(maq.nombre, 35),              60.0),
                (maq.codigo_interno or "—",              35.0),
                (_truncar(maq.tipo_equipo or "—", 28),  45.0),
                (estado_maq,                             30.0),
                (estado_alerta,                          28.0),
                (diagnostico,                            79.0),
            ]
            _fila_tabla(pdf, celdas, fila_par=(idx % 2 == 1))

        if not maquinarias:
            pdf.set_font(FONT_FAMILY, "I", 10)
            pdf.cell(0, 10, "No se encontraron máquinas para el reporte.", ln=True, align="C")

        return bytes(pdf.output())

    except Exception as exc:
        raise RuntimeError("Error al generar el PDF") from exc


# ─────────────────────────────────────────────
# Función B: reporte histórico de una máquina
# ─────────────────────────────────────────────

def generar_reporte_historico(
    maquinaria: Maquinaria,
    lecturas: list[LecturaSensor],
    alertas: dict[int, Alerta],
) -> bytes:
    """
    Genera un PDF con el historial cronológico de lecturas de una máquina.
    Retorna los bytes del PDF.
    Relanza cualquier excepción interna como RuntimeError.
    """
    try:
        pdf = FPDF(orientation="L", unit="mm", format="A4")
        pdf.set_auto_page_break(auto=True, margin=15)
        pdf.add_page()
        pdf.set_margins(10, 10, 10)

        _membrete(pdf, f"Historial de Diagnosticos-{maquinaria.nombre}")

        pdf.set_font(FONT_FAMILY, "", 9)
        pdf.cell(
            0, 5,
            f"Codigo interno: {maquinaria.codigo_interno or '—'}    |    Tipo: {maquinaria.tipo_equipo or '—'}",
            ln=True,
        )
        pdf.ln(3)

        columnas: list[tuple[str, float]] = [
            ("Fecha y hora",          38.0),
            ("Temp. (°C)",            22.0),
            ("Presion aceite (bar)",  30.0),
            ("Vibracion (mm/s)",      28.0),
            ("Horas uso",             22.0),
            ("Estado alerta",         28.0),
            ("Diagnostico",          109.0),
        ]
        _encabezado_tabla(pdf, columnas)

        for idx, lectura in enumerate(lecturas):
            alerta = alertas.get(lectura.id)
            estado_alerta = (
                ESTADO_ALERTA_LABEL.get(alerta.estado.value, alerta.estado.value)
                if alerta
                else "Sin evaluar"
            )
            diagnostico = _truncar(alerta.diagnostico, 75) if alerta else "—"

            try:
                fecha_str = lectura.fecha_hora.strftime("%d/%m/%Y %H:%M")
            except AttributeError:
                fecha_str = str(lectura.fecha_hora)

            celdas: list[tuple[str, float]] = [
                (fecha_str,                        38.0),
                (f"{lectura.temperatura:.1f}",     22.0),
                (f"{lectura.presion_aceite:.2f}",  30.0),
                (f"{lectura.vibracion:.2f}",       28.0),
                (str(lectura.horas_uso),           22.0),
                (estado_alerta,                    28.0),
                (diagnostico,                     109.0),
            ]
            _fila_tabla(pdf, celdas, fila_par=(idx % 2 == 1))

        return bytes(pdf.output())

    except Exception as exc:
        raise RuntimeError("Error al generar el PDF") from exc