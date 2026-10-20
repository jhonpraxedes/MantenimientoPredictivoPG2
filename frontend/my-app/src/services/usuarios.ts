/**
 * src/services/usuarios.ts
 *
 * Servicios para el módulo de administración de usuarios.
 * Usa API_BASE_URL importado de auth.ts para no redefinirlo.
 * El header Authorization lo agrega automáticamente el interceptor de app.tsx.
 */

import { request } from '@umijs/max';
import { API_BASE_URL } from '@/services/auth';

// ─────────────────────────────────────────────
// Interfaces TypeScript
// ─────────────────────────────────────────────

/** Roles posibles de un usuario del sistema */
export type RolAdmin = 'administrador' | 'supervisor' | 'tecnico';

/** Usuario devuelto por el backend (GET /api/v1/usuarios/, POST, PUT) */
export interface UsuarioAdmin {
  id: number;
  nombre: string;
  email: string;
  rol: RolAdmin;
  activo: boolean;
  fecha_creacion: string; // ISO 8601
}

/** Payload para crear un nuevo usuario (POST /api/v1/usuarios/) */
export interface UsuarioCreatePayload {
  nombre: string;
  email: string;
  password: string;
  rol: RolAdmin;
}

/** Payload parcial para actualizar un usuario (PUT /api/v1/usuarios/{id}) */
export interface UsuarioUpdatePayload {
  nombre?: string;
  rol?: RolAdmin;
  activo?: boolean;
}

// ─────────────────────────────────────────────
// Funciones de servicio
// ─────────────────────────────────────────────

/**
 * Lista todos los usuarios registrados en el sistema.
 * Requiere rol administrador (backend lo valida).
 */
export async function listarUsuarios(): Promise<UsuarioAdmin[]> {
  return request<UsuarioAdmin[]>(`${API_BASE_URL}/api/v1/usuarios/`, {
    method: 'GET',
  });
}

/**
 * Crea un nuevo usuario en el sistema.
 * Requiere rol administrador (backend lo valida).
 *
 * @param payload - Datos del usuario a crear
 */
export async function crearUsuario(
  payload: UsuarioCreatePayload,
): Promise<UsuarioAdmin> {
  return request<UsuarioAdmin>(`${API_BASE_URL}/api/v1/usuarios/`, {
    method: 'POST',
    data: payload,
    skipErrorHandler: true,
  });
}

/**
 * Actualiza parcialmente un usuario existente.
 * Requiere rol administrador (backend lo valida).
 *
 * @param id      - ID del usuario a actualizar
 * @param payload - Campos a modificar (todos opcionales)
 */
export async function actualizarUsuario(
  id: number,
  payload: UsuarioUpdatePayload,
): Promise<UsuarioAdmin> {
  return request<UsuarioAdmin>(`${API_BASE_URL}/api/v1/usuarios/${id}`, {
    method: 'PUT',
    data: payload,
    skipErrorHandler: true,
  });
}


// ─────────────────────────────────────────────
// Contraseñas
// ─────────────────────────────────────────────

/** Payload para que el propio usuario cambie su contraseña */
export interface CambiarPasswordPayload {
  password_actual: string;
  password_nueva: string;
}

/**
 * El usuario autenticado cambia su propia contraseña.
 * PATCH /api/v1/usuarios/me/password
 */
export async function cambiarMiPassword(
  payload: CambiarPasswordPayload,
): Promise<{ detail: string }> {
  return request<{ detail: string }>(
    `${API_BASE_URL}/api/v1/usuarios/me/password`,
    {
      method: 'PATCH',
      data: payload,
      skipErrorHandler: true,
    },
  );
}

/**
 * El administrador restablece la contraseña de otro usuario.
 * PATCH /api/v1/usuarios/{id}/password
 */
export async function restablecerPassword(
  id: number,
  password_nueva: string,
): Promise<{ detail: string }> {
  return request<{ detail: string }>(
    `${API_BASE_URL}/api/v1/usuarios/${id}/password`,
    {
      method: 'PATCH',
      data: { password_nueva },
      skipErrorHandler: true,
    },
  );
}