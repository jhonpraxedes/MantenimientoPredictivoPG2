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
  /** Si no es null, la máquina tiene imagen guardada */
  imagen_tipo: string | null;
}

/**
 * Payload para crear o editar una máquina.
 * El código interno NO se envía: lo genera el backend.
 */
export interface MaquinariaPayload {
  nombre: string;
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
 * Obtiene el catálogo de categorías de equipo.
 */
export async function listarCategorias(): Promise<string[]> {
  return request<string[]>(`${API_BASE_URL}/api/v1/maquinaria/categorias`, {
    method: 'GET',
  });
}

/**
 * Crea una nueva máquina en el sistema (el backend asigna el código).
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
 * Actualiza los campos de una máquina existente.
 *
 * @param id - ID de la máquina a actualizar
 * @param payload - Campos a modificar (todos opcionales)
 */
export async function actualizarMaquinaria(
  id: number,
  payload: Partial<MaquinariaPayload>,
): Promise<Maquinaria> {
  return request<Maquinaria>(`${API_BASE_URL}/api/v1/maquinaria/${id}`, {
    method: 'PUT',
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

/**
 * Sube (o reemplaza) la imagen de una máquina.
 * El campo del formulario se llama "archivo", igual que en el backend.
 *
 * @param id - ID de la máquina
 * @param archivo - Archivo JPG, PNG o WebP (máx. 2 MB)
 */
export async function subirImagenMaquinaria(
  id: number,
  archivo: File,
): Promise<Maquinaria> {
  const formData = new FormData();
  formData.append('archivo', archivo);

  return request<Maquinaria>(`${API_BASE_URL}/api/v1/maquinaria/${id}/imagen`, {
    method: 'POST',
    data: formData,
    skipErrorHandler: true,
  });
}

/**
 * Descarga la imagen de una máquina como Blob. Se pide con el token porque
 * el endpoint requiere sesión (una etiqueta <img> no puede enviarlo).
 *
 * @param id - ID de la máquina
 */
export async function obtenerImagenMaquinaria(id: number): Promise<Blob> {
  return request<Blob>(`${API_BASE_URL}/api/v1/maquinaria/${id}/imagen`, {
    method: 'GET',
    responseType: 'blob',
    skipErrorHandler: true,
  });
}