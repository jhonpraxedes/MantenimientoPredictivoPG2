"""
app/services/ia_diagnostico.py

Servicio de evaluación de lecturas de sensor mediante IA (Abacus.ai).
Incluye fallback automático por reglas de umbral si la IA falla.

Retorna un dict con claves:
  - "estado"      : "normal" | "advertencia" | "critico"
  - "diagnostico" : str con la explicación breve
  - "origen"      : "ia" | "reglas"
"""

import json
import os
from pathlib import Path

from dotenv import load_dotenv

# ── Carga del .env desde backend/.env ────────────────────────────
# Estructura de directorios:
#   backend/
#     app/
#       services/
#         ia_diagnostico.py   ← __file__  (parents[0] = services/)
#                                          parents[1] = app/
#                                          parents[2] = backend/
_ENV_PATH = Path(__file__).parents[2] / ".env"
load_dotenv(dotenv_path=_ENV_PATH)

# Importaciones de modelos (se usan solo como type hints; no generan ciclos)
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.lectura_sensor import LecturaSensor
    from app.models.maquinaria import Maquinaria


# ─────────────────────────────────────────────
# Constantes
# ─────────────────────────────────────────────
_ESTADOS_VALIDOS = {"normal", "advertencia", "critico"}

_SYSTEM_MESSAGE = (
    "Eres un experto en mantenimiento predictivo de motores diesel industriales. "
    "Recibirás datos de telemetría de una máquina: la lectura actual y el historial "
    "cronológico de las últimas lecturas. Tu tarea es analizar la tendencia del "
    "historial en comparación con la lectura actual y diagnosticar el estado de la máquina. "
    "Responde ÚNICAMENTE con un JSON válido con exactamente estas dos claves:\n"
    '{"estado": "normal|advertencia|critico", "diagnostico": "texto breve de máximo 2 oraciones '
    'explicando la razón, mencionando si detectas una tendencia relevante"}\n'
    "Sin texto adicional antes ni después del JSON. Sin markdown. Solo el JSON puro."
)


# ─────────────────────────────────────────────
# Fallback por reglas de umbral
# ─────────────────────────────────────────────
def _evaluar_por_reglas(
    temperatura: float,
    presion_aceite: float,
    vibracion: float,
) -> dict[str, str]:
    """Evaluación de contingencia basada en umbrales fijos."""
    if temperatura > 130 or presion_aceite < 10 or vibracion > 8:
        estado = "critico"
    elif temperatura > 100 or vibracion > 5:
        estado = "advertencia"
    else:
        estado = "normal"

    return {
        "estado": estado,
        "diagnostico": (
            "Evaluación generada automáticamente por reglas de contingencia "
            "(IA no disponible)."
        ),
        "origen": "reglas",
    }


# ─────────────────────────────────────────────
# Función principal
# ─────────────────────────────────────────────
def evaluar_lectura_con_ia(
    lectura_actual: "LecturaSensor",
    historial: "list[LecturaSensor]",
    maquinaria: "Maquinaria",
) -> dict[str, str]:
    """
    Evalúa el estado de una lectura usando la API de Abacus.ai.

    Parámetros
    ----------
    lectura_actual : LecturaSensor
        La lectura recién creada a evaluar.
    historial : list[LecturaSensor]
        Hasta 5 lecturas anteriores de la misma máquina, ordenadas
        cronológicamente (más antigua primero → más reciente al final).
    maquinaria : Maquinaria
        Objeto ORM de la máquina a la que pertenece la lectura.

    Retorna
    -------
    dict con claves "estado", "diagnostico" y "origen".
    Nunca lanza excepciones: si la IA falla, aplica reglas de contingencia.
    """

    # ── 1. Leer API key ────────────────────────────────────────────
    api_key = os.environ.get("API_KEY_ABACUS", "").strip()

    if not api_key:
        print("[ia_diagnostico] WARNING: API_KEY_ABACUS no configurada; usando reglas.")
        return _evaluar_por_reglas(
            lectura_actual.temperatura,
            lectura_actual.presion_aceite,
            lectura_actual.vibracion,
        )

    # ── 2. Construir prompt ────────────────────────────────────────
    # Historial: ordenado cronológicamente (más antiguo primero)
    historial_ordenado = sorted(historial, key=lambda l: l.fecha_hora)

    if historial_ordenado:
        historial_texto = "\n".join(
            f"  - {l.fecha_hora.strftime('%Y-%m-%d %H:%M')}: "
            f"temp={l.temperatura}°C, "
            f"presión={l.presion_aceite} bar, "
            f"vibración={l.vibracion} mm/s"
            for l in historial_ordenado
        )
    else:
        historial_texto = "  (Sin lecturas previas disponibles)"

    prompt = (
        f"Máquina: {maquinaria.nombre} | Tipo: {maquinaria.tipo_equipo}\n\n"
        f"Lectura ACTUAL ({lectura_actual.fecha_hora.strftime('%Y-%m-%d %H:%M')}):\n"
        f"  - Temperatura     : {lectura_actual.temperatura} °C\n"
        f"  - Presión de aceite: {lectura_actual.presion_aceite} bar\n"
        f"  - Vibración        : {lectura_actual.vibracion} mm/s\n"
        f"  - Horas de uso     : {lectura_actual.horas_uso} h\n\n"
        f"Historial de lecturas previas (cronológico, más antigua primero):\n"
        f"{historial_texto}\n\n"
        f"Analiza la tendencia y proporciona el diagnóstico en el formato JSON indicado."
    )

    # ── 3. Llamar a la API de Abacus.ai ───────────────────────────
    try:
        from abacusai import ApiClient  # importación diferida para no fallar si no está instalada

        client = ApiClient(api_key=api_key)

        result = client.evaluate_prompt(
            prompt=prompt,
            system_message=_SYSTEM_MESSAGE,
            llm_name="OPENAI_GPT4O",
            temperature=0.2,
            max_tokens=300,
        )

        # Extraer el texto de la respuesta (distintas versiones de la lib)
        if hasattr(result, "content") and isinstance(result.content, str):
            raw_text: str = result.content.strip()
        elif hasattr(result, "text") and isinstance(result.text, str):
            raw_text = result.text.strip()
        else:
            raw_text = str(result).strip()

        # ── 4. Parsear JSON ────────────────────────────────────────
        # Elimina bloques de código markdown si la IA los añade por error
        if raw_text.startswith("```"):
            raw_text = raw_text.split("```")[1]
            if raw_text.startswith("json"):
                raw_text = raw_text[4:]
            raw_text = raw_text.strip()

        parsed: dict = json.loads(raw_text)

        estado_ia: str = parsed.get("estado", "").lower()
        diagnostico_ia: str = str(parsed.get("diagnostico", "")).strip()

        # Validar que el estado sea uno de los 3 valores válidos
        if estado_ia not in _ESTADOS_VALIDOS or not diagnostico_ia:
            raise ValueError(f"Respuesta IA inválida: estado='{estado_ia}'")

        return {
            "estado": estado_ia,
            "diagnostico": diagnostico_ia,
            "origen": "ia",
        }

    except Exception as exc:  # noqa: BLE001
        # Fallback: cualquier error (red, parseo, clave inválida, etc.)
        print(f"[ia_diagnostico] ERROR al llamar a la IA: {exc!r}. Aplicando reglas.")
        return _evaluar_por_reglas(
            lectura_actual.temperatura,
            lectura_actual.presion_aceite,
            lectura_actual.vibracion,
        )
