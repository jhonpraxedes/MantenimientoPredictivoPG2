/**
 * src/services/dashboard.ts
 *
 * Servicios para el módulo de Dashboard.
 * Importa API_BASE_URL desde auth.ts (no la redefine).
 * El header Authorization lo agrega automáticamente el interceptor de app.tsx.
 */

import { request } from '@umijs/max';
import { API_BASE_URL } from '@/services/auth';

// ─────────────────────────────────────────────
// Interfaces TypeScript
// ─────────────────────────────────────────────

/** Una alerta crítica reciente, tal como viene en el resumen del dashboard */
export interface AlertaCriticaResumen {
  maquinaria_nombre: string;
  diagnostico: string;
  fecha_generacion: string; // ISO 8601
}

/** Respuesta completa de GET /api/v1/dashboard/resumen */
export interface DashboardResumen {
  maquinas_total: number;
  maquinas_activas: number;
  maquinas_inactivas: number;
  alertas_normal: number;
  alertas_advertencia: number;
  alertas_critico: number;
  ultimas_alertas_criticas: AlertaCriticaResumen[];
}

// ─────────────────────────────────────────────
// Función de servicio
// ─────────────────────────────────────────────

/**
 * Obtiene el resumen global para el dashboard.
 * Requiere usuario autenticado (el interceptor agrega Authorization).
 */
export async function obtenerResumenDashboard(): Promise<DashboardResumen> {
  return request<DashboardResumen>(
    `${API_BASE_URL}/api/v1/dashboard/resumen`,
    { method: 'GET' },
  );
}
