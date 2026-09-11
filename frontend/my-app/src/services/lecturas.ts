/**
 * src/services/lecturas.ts
 *
 * Servicios para el módulo de Lecturas de Sensor.
 * Usa API_BASE_URL importado de auth.ts para no redefinirlo.
 * El header Authorization lo agrega automáticamente el interceptor de app.tsx.
 */

import { request } from '@umijs/max';
import { API_BASE_URL } from '@/services/auth';

// ─────────────────────────────────────────────
// Interfaces TypeScript
// ─────────────────────────────────────────────

/** Lectura de sensor devuelta por el backend (GET /api/v1/lecturas/) */
export interface LecturaSensor {
  id: number;
  maquinaria_id: number;
  usuario_id: number;
  temperatura: number;
  presion_aceite: number;
  vibracion: number;
  horas_uso: number;
  observaciones: string | null;
  fecha_hora: string; // ISO 8601, ej. "2024-05-10T14:30:00"
}

/** Payload para crear una nueva lectura (POST /api/v1/lecturas/) */
export interface LecturaPayload {
  maquinaria_id: number;
  temperatura: number;
  presion_aceite: number;
  vibracion: number;
  horas_uso: number;
  observaciones?: string;
}

/** Estructura del error de validación 422 de FastAPI */
export interface FastApiValidationError {
  detail: Array<{
    loc: (string | number)[];
    msg: string;
    type: string;
  }>;
}

// ─────────────────────────────────────────────
// Funciones de servicio
// ─────────────────────────────────────────────

/**
 * Lista todas las lecturas, opcionalmente filtradas por máquina.
 *
 * @param maquinariaId - ID de la máquina a filtrar (opcional)
 */
export async function listarLecturas(
  maquinariaId?: number,
): Promise<LecturaSensor[]> {
  const params: Record<string, number> = {};
  if (maquinariaId !== undefined) {
    params.maquinaria_id = maquinariaId;
  }

  return request<LecturaSensor[]>(`${API_BASE_URL}/api/v1/lecturas/`, {
    method: 'GET',
    params,
  });
}

/**
 * Crea una nueva lectura de sensor.
 *
 * @param payload - Datos de la lectura a registrar
 */
export async function crearLectura(
  payload: LecturaPayload,
): Promise<LecturaSensor> {
  return request<LecturaSensor>(`${API_BASE_URL}/api/v1/lecturas/`, {
    method: 'POST',
    data: payload,
    // skipErrorHandler permite capturar el 422 manualmente en el componente
    skipErrorHandler: true,
  });
}
