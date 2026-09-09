/**
 * src/access.ts
 *
 * Control de acceso basado en roles (RBAC) para Umi Max.
 * Umi Max llama a esta función con el initialState global y expone
 * los permisos retornados en el hook useAccess() y en la propiedad
 * "access" de las rutas en config/routes.ts.
 *
 * Roles posibles del backend: "administrador" | "supervisor" | "tecnico"
 */

import type { InitialState } from './app';

export default function access(initialState: InitialState | undefined) {
  const rol = initialState?.currentUser?.rol;

  return {
    /** El usuario tiene rol "administrador" */
    esAdministrador: rol === 'administrador',

    /** El usuario tiene rol "supervisor" */
    esSupervisor: rol === 'supervisor',

    /** El usuario tiene rol "tecnico" */
    esTecnico: rol === 'tecnico',

    /** El usuario es administrador O supervisor (útil para secciones de gestión) */
    esAdminOSupervisor: rol === 'administrador' || rol === 'supervisor',

    /** Cualquier usuario autenticado (sin importar rol) */
    estaAutenticado: !!rol,
  };
}
