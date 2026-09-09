/**
 * src/services/auth.ts
 *
 * Servicios de autenticación para el Sistema de Mantenimiento Predictivo.
 * El token JWT se guarda en una variable de módulo en memoria (NO localStorage/sessionStorage).
 * Las URLs se construyen con API_BASE_URL para no depender de un proxy en Umi Max.
 */

import { request } from '@umijs/max';

// ─────────────────────────────────────────────
// Constante de base URL del backend
// ─────────────────────────────────────────────
export const API_BASE_URL = 'http://127.0.0.1:8000';

// ─────────────────────────────────────────────
// Interfaces TypeScript
// ─────────────────────────────────────────────

/** Roles posibles según el backend */
export type RolUsuario = 'administrador' | 'supervisor' | 'tecnico';

/** Usuario autenticado devuelto por GET /api/v1/auth/me */
export interface UsuarioActual {
  id: number;
  nombre: string;
  email: string;
  rol: RolUsuario;
  activo: boolean;
  fecha_creacion: string;
}

/** Respuesta devuelta por POST /api/v1/auth/login */
export interface LoginResponse {
  access_token: string;
  token_type: 'bearer';
}

// ─────────────────────────────────────────────
// Token en memoria (NO localStorage)
// Exportado para que app.tsx y los interceptores lo lean.
// ─────────────────────────────────────────────
let _token: string | null = null;

/** Devuelve el token JWT actual almacenado en memoria. */
export function getToken(): string | null {
  return _token;
}

/** Guarda el token JWT en memoria. */
export function setToken(token: string): void {
  _token = token;
}

/** Elimina el token JWT de memoria (logout). */
export function clearToken(): void {
  _token = null;
}

// ─────────────────────────────────────────────
// Funciones de servicio
// ─────────────────────────────────────────────

/**
 * Inicia sesión enviando credenciales como application/x-www-form-urlencoded.
 * El backend espera el campo "username" (no "email").
 *
 * @param email   - Correo electrónico del usuario
 * @param password - Contraseña del usuario
 * @returns       Promise con el access_token y token_type
 */
export async function loginRequest(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const body = new URLSearchParams();
  body.append('username', email); // el backend usa "username"
  body.append('password', password);

  const response = await request<LoginResponse>(
    `${API_BASE_URL}/api/v1/auth/login`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      // Pasamos el body como string para evitar que @umijs/max lo serialice como JSON
      data: body.toString(),
      // Omitimos el interceptor de Authorization para esta ruta pública
      skipErrorHandler: true,
    },
  );

  return response;
}

/**
 * Obtiene los datos del usuario autenticado actualmente.
 * Requiere que el token ya esté guardado en memoria (_token).
 *
 * @returns Promise con los datos del UsuarioActual
 */
export async function getCurrentUser(): Promise<UsuarioActual> {
  const response = await request<UsuarioActual>(
    `${API_BASE_URL}/api/v1/auth/me`,
    {
      method: 'GET',
      // El interceptor de request en app.tsx añade el header Authorization automáticamente.
    },
  );

  return response;
}
