/**
 * src/services/maquinaria.ts
 *
 * Servicios para el módulo de Maquinaria.
 * Usa API_BASE_URL importado de auth.ts para no redefinirlo.
 * El header Authorization lo agrega automáticamente el interceptor de app.tsx.
 */

import { request } from '@umijs/max';
import { API_BASE_URL } from '@/services/auth';

// ─────────────────────────────────────────────
// Interfaces TypeScript
// ─────────────────────────────────────────────

/** Estados posibles de una máquina */
export type EstadoMaquinaria = 'activo' | 'inactivo';

/** Máquina devuelta por el backend (GET /api/v1/maquinaria/) */
export interface Maquinaria {
  id: number;
  nombre: string;
  codigo_interno: string;
  tipo_equipo: string;
  modelo_motor: string | null;
  numero_serie: string | null;
  ubicacion: string | null;
  estado: EstadoMaquinaria;
  fecha_registro: string;
}

/** Payload para crear una nueva máquina (POST /api/v1/maquinaria/) */
export interface MaquinariaPayload {
  nombre: string;
  codigo_interno: string;
  tipo_equipo: string;
  modelo_motor?: string;
  numero_serie?: string;
  ubicacion?: string;
}

// ─────────────────────────────────────────────
// Funciones de servicio
// ─────────────────────────────────────────────

/**
 * Lista todas las máquinas, opcionalmente filtradas por estado.
 *
 * @param estado - 'activo' | 'inactivo' | undefined (sin filtro)
 */
export async function listarMaquinaria(
  estado?: EstadoMaquinaria,
): Promise<Maquinaria[]> {
  const params: Record<string, string> = {};
  if (estado) {
    params.estado = estado;
  }

  return request<Maquinaria[]>(`${API_BASE_URL}/api/v1/maquinaria/`, {
    method: 'GET',
    params,
  });
}

/**
 * Crea una nueva máquina en el sistema.
 *
 * @param payload - Datos de la máquina a crear
 */
export async function crearMaquinaria(
  payload: MaquinariaPayload,
): Promise<Maquinaria> {
  return request<Maquinaria>(`${API_BASE_URL}/api/v1/maquinaria/`, {
    method: 'POST',
    data: payload,
  });
}

/**
 * Desactiva una máquina (cambia su estado a "inactivo").
 *
 * @param id - ID de la máquina a desactivar
 */
export async function desactivarMaquinaria(id: number): Promise<Maquinaria> {
  return request<Maquinaria>(
    `${API_BASE_URL}/api/v1/maquinaria/${id}/desactivar`,
    {
      method: 'PATCH',
    },
  );
}
/**
 * Reactiva una máquina previamente desactivada.
 *
 * @param id - ID de la máquina a reactivar
 */
export async function activarMaquinaria(id: number): Promise<Maquinaria> {
  return request<Maquinaria>(
    `${API_BASE_URL}/api/v1/maquinaria/${id}/activar`,
    {
      method: 'PATCH',
    },
  );
}