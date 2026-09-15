"""
Script de siembra de datos sintéticos para demostración.

Genera lecturas de sensor de los últimos 5 días para las máquinas activas:
  - La PRIMERA máquina activa recibe una tendencia de deterioro progresivo
    (temperatura, presión y vibración empeorando con el tiempo).
  - Las DEMÁS máquinas activas reciben lecturas estables dentro de rango normal.

IMPORTANTE: Estas alertas se generan con reglas de umbral fijas (NO con la IA
de Abacus.ai), para no consumir llamadas reales de la API en datos ficticios.
Esto debe declararse explícitamente en la documentación de la tesis como
datos sintéticos de demostración, no como lecturas de campo reales.

Uso:
    cd backend
    python -m scripts.seed_lecturas_demo
"""
import random
from datetime import datetime, timedelta

from app.db.base import SessionLocal
from app.models.maquinaria import Maquinaria, EstadoMaquinaria
from app.models.usuario import Usuario, Rol
from app.models.lectura_sensor import LecturaSensor
from app.models.alerta import Alerta, EstadoAlerta, OrigenAlerta

DIAS_HISTORIAL = 5
LECTURAS_POR_DIA = 2  # una cada 12 horas


def _evaluar_por_reglas(temperatura: float, presion_aceite: float, vibracion: float) -> str:
    """Mismas reglas de contingencia que usa el backend real."""
    if temperatura > 130 or presion_aceite < 10 or vibracion > 8:
        return "critico"
    elif temperatura > 100 or vibracion > 5:
        return "advertencia"
    return "normal"


def _generar_serie_deterioro(n_puntos: int) -> list[dict]:
    """Genera valores que empeoran progresivamente (para la máquina 'problemática')."""
    serie = []
    for i in range(n_puntos):
        progreso = i / max(n_puntos - 1, 1)  # 0.0 al inicio, 1.0 al final
        temperatura = 72 + progreso * 45 + random.uniform(-2, 2)      # 72°C → ~117°C
        presion_aceite = 42 - progreso * 25 + random.uniform(-1, 1)   # 42 → ~17 bar
        vibracion = 1.5 + progreso * 5.5 + random.uniform(-0.3, 0.3)  # 1.5 → ~7 mm/s
        horas_uso = 1200 + i * 6
        serie.append({
            "temperatura": round(temperatura, 1),
            "presion_aceite": round(presion_aceite, 2),
            "vibracion": round(vibracion, 2),
            "horas_uso": round(horas_uso, 1),
        })
    return serie


def _generar_serie_estable(n_puntos: int) -> list[dict]:
    """Genera valores estables dentro de rango normal (para las demás máquinas)."""
    serie = []
    for i in range(n_puntos):
        serie.append({
            "temperatura": round(random.uniform(68, 82), 1),
            "presion_aceite": round(random.uniform(35, 45), 2),
            "vibracion": round(random.uniform(1.0, 2.5), 2),
            "horas_uso": round(1500 + i * 4, 1),
        })
    return serie


def sembrar() -> None:
    db = SessionLocal()
    try:
        maquinas = (
            db.query(Maquinaria)
            .filter(Maquinaria.estado == EstadoMaquinaria.activo)
            .order_by(Maquinaria.id)
            .all()
        )
        if not maquinas:
            print("No hay máquinas activas. Crea al menos una antes de sembrar datos.")
            return

        usuario_admin = (
            db.query(Usuario).filter(Usuario.rol == Rol.administrador).first()
        )
        if not usuario_admin:
            print("No se encontró ningún usuario administrador para asociar las lecturas.")
            return

        n_puntos = DIAS_HISTORIAL * LECTURAS_POR_DIA
        ahora = datetime.utcnow()

        total_lecturas = 0

        for idx, maquina in enumerate(maquinas):
            es_problematica = idx == 0
            serie = (
                _generar_serie_deterioro(n_puntos)
                if es_problematica
                else _generar_serie_estable(n_puntos)
            )

            print(
                f"Sembrando {n_puntos} lecturas para '{maquina.nombre}' "
                f"({'tendencia de deterioro' if es_problematica else 'estable'})..."
            )

            for i, valores in enumerate(serie):
                # Distribuye las lecturas retrocediendo desde "ahora"
                horas_atras = (n_puntos - i) * (24 / LECTURAS_POR_DIA)
                fecha_hora = ahora - timedelta(hours=horas_atras)

                lectura = LecturaSensor(
                    maquinaria_id=maquina.id,
                    usuario_id=usuario_admin.id,
                    temperatura=valores["temperatura"],
                    presion_aceite=valores["presion_aceite"],
                    vibracion=valores["vibracion"],
                    horas_uso=valores["horas_uso"],
                    observaciones="[Dato sintético de demostración]",
                    fecha_hora=fecha_hora,
                )
                db.add(lectura)
                db.flush()  # para obtener lectura.id antes del commit final

                estado = _evaluar_por_reglas(
                    valores["temperatura"], valores["presion_aceite"], valores["vibracion"]
                )
                diagnostico = (
                    "Evaluación generada por reglas de contingencia sobre datos "
                    "sintéticos de demostración (no evaluado por IA)."
                )
                alerta = Alerta(
                    lectura_id=lectura.id,
                    maquinaria_id=maquina.id,
                    estado=EstadoAlerta(estado),
                    diagnostico=diagnostico,
                    origen=OrigenAlerta.reglas,
                    fecha_generacion=fecha_hora,
                )
                db.add(alerta)
                total_lecturas += 1

        db.commit()
        print(f"\nListo. Se generaron {total_lecturas} lecturas sintéticas en total.")

    except Exception as exc:
        db.rollback()
        print(f"Error al sembrar datos: {exc!r}")
    finally:
        db.close()


if __name__ == "__main__":
    sembrar()