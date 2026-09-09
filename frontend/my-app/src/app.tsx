/**
 * src/app.tsx
 *
 * Configuración en tiempo de ejecución de Umi Max:
 *  - getInitialState : carga el usuario autenticado al arrancar la app.
 *  - requestConfig   : interceptores HTTP (Authorization + manejo 401).
 *  - layout          : configuración del layout global (ProLayout).
 */

import { history, RequestConfig, RunTimeLayoutConfig } from '@umijs/max';
import { message } from 'antd';
import {
  clearToken,
  getCurrentUser,
  getToken,
  UsuarioActual,
} from '@/services/auth';

// ─────────────────────────────────────────────
// Tipo del estado global de la aplicación
// ─────────────────────────────────────────────
export interface InitialState {
  currentUser?: UsuarioActual;
}

// ─────────────────────────────────────────────
// getInitialState
// Se ejecuta una vez al iniciar la SPA.
// Si hay un token en memoria, intenta obtener el usuario actual.
// ─────────────────────────────────────────────
export async function getInitialState(): Promise<InitialState> {
  const token = getToken();

  if (!token) {
    // Sin token → no hay sesión activa
    return { currentUser: undefined };
  }

  try {
    const currentUser = await getCurrentUser();
    return { currentUser };
  } catch {
    // Token inválido o expirado: limpiamos y dejamos la app sin sesión
    clearToken();
    return { currentUser: undefined };
  }
}

// ─────────────────────────────────────────────
// requestConfig
// Interceptores globales de HTTP para @umijs/max.
// ─────────────────────────────────────────────
export const request: RequestConfig = {
  // Timeout global de 15 s
  timeout: 15_000,

  // ── Interceptores de REQUEST ──────────────────
  requestInterceptors: [
    (config) => {
      const token = getToken();
      if (token) {
        // Añadimos el header Authorization a todas las peticiones salientes
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${token}`,
        };
      }
      return config;
    },
  ],

  // ── Interceptores de RESPONSE ─────────────────
  responseInterceptors: [
    [
      // Interceptor de éxito: dejamos pasar la respuesta tal cual
      (response) => response,

      // Interceptor de error: capturamos 401 para redirigir al login
      (error: { response?: { status?: number }; message?: string }) => {
        const status = error?.response?.status;

        if (status === 401) {
          // Sesión expirada o token inválido
          clearToken();
          message.error('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.');
          history.push('/login');
        } else if (status === 403) {
          message.error('No tienes permiso para realizar esta acción.');
        } else if (status === 500) {
          message.error('Error interno del servidor. Intenta más tarde.');
        }

        return Promise.reject(error);
      },
    ],
  ],
};

// ─────────────────────────────────────────────
// layout (RunTimeLayoutConfig)
// Configuración del ProLayout con menú y avatar de usuario.
// ─────────────────────────────────────────────

/** Etiqueta amigable para cada rol */
const etiquetaRol: Record<string, string> = {
  administrador: 'Administrador',
  supervisor: 'Supervisor',
  tecnico: 'Técnico',
};

export const layout: RunTimeLayoutConfig = ({ initialState, setInitialState }) => {
  const currentUser = (initialState as InitialState | undefined)?.currentUser;

  return {
    // ── Identidad del sistema ──────────────────
    title: 'Sistema de Mantenimiento Predictivo',
    logo: '/logo.png', // ajusta la ruta si tienes otro logo

    // ── Comportamiento de rutas ────────────────
    // Redirige al login si no hay usuario autenticado y la ruta no es pública
    onPageChange: () => {
      const { location } = history;
      if (!currentUser && location.pathname !== '/login') {
        history.push('/login');
      }
    },

    // ── Menú de avatar (esquina superior derecha) ──
    avatarProps: currentUser
      ? {
          src: undefined, // sin avatar de foto; muestra iniciales
          title: currentUser.nombre,
          size: 'small',
          render: (_props, dom) => (
            <span style={{ cursor: 'pointer' }}>
              {dom}
              <span
                style={{
                  marginLeft: 8,
                  fontSize: 12,
                  color: 'rgba(0,0,0,0.45)',
                }}
              >
                {etiquetaRol[currentUser.rol] ?? currentUser.rol}
              </span>
            </span>
          ),
          menuItems: [
            {
              key: 'logout',
              icon: '🔒',
              label: 'Cerrar sesión',
              onClick: async () => {
                clearToken();
                await setInitialState((s: InitialState | undefined) => ({
                  ...s,
                  currentUser: undefined,
                }));
                message.success('Sesión cerrada correctamente.');
                history.push('/login');
              },
            },
          ],
        }
      : undefined,

    // ── Pie de página ──────────────────────────
    footerRender: () => (
      <div style={{ textAlign: 'center', padding: '12px 0', color: '#999', fontSize: 12 }}>
        Sistema de Mantenimiento Predictivo © {new Date().getFullYear()}
      </div>
    ),

    // ── Rutas sin layout (páginas públicas) ───
    // Las rutas con layout: false en config/routes.ts se excluyen automáticamente.
  };
};
