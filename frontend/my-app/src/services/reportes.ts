/**
 * src/services/reportes.ts
 *
 * Servicios para la descarga de reportes PDF generados por el backend.
 * Usa API_BASE_URL importado de auth.ts para no redefinirlo.
 * El header Authorization lo agrega automáticamente el interceptor de app.tsx.
 *
 * Ambas funciones:
 *  1. Hacen la petición GET con responseType: 'blob'.
 *  2. Crean una URL temporal con URL.createObjectURL(blob).
 *  3. Simulan un clic en un <a> invisible para disparar la descarga.
 *  4. Revocan la URL temporal con URL.revokeObjectURL.
 *  5. Si falla, relanzar el error para que el componente lo maneje.
 */

import { request } from '@umijs/max';
import { API_BASE_URL } from '@/services/auth';

// ─────────────────────────────────────────────
// Helper interno: descarga un Blob como archivo
// ─────────────────────────────────────────────
function _descargarBlob(blob: Blob, nombreArchivo: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nombreArchivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────
// Funciones de servicio
// ─────────────────────────────────────────────

/**
 * Descarga el reporte de estado operativo de la flota en PDF.
 * Si se provee maquinariaId, el reporte incluye solo esa máquina.
 * Sin maquinariaId → reporte global de toda la flota.
 *
 * @param maquinariaId - ID de la máquina a filtrar (opcional)
 */
export async function descargarReporteEstadoOperativo(
  maquinariaId?: number,
): Promise<void> {
  try {
    const params: Record<string, number> = {};
    if (maquinariaId !== undefined) {
      params.maquinaria_id = maquinariaId;
    }

    const blob = await request<Blob>(
      `${API_BASE_URL}/api/v1/reportes/estado-operativo`,
      {
        method: 'GET',
        params,
        responseType: 'blob',
        skipErrorHandler: true,
      },
    );

    _descargarBlob(blob, 'reporte_estado_operativo.pdf');
  } catch (error) {
    throw error;
  }
}

/**
 * Descarga el reporte histórico de diagnósticos de una máquina en PDF.
 * El rango de fechas es opcional; si se omite, incluye todas las lecturas.
 *
 * @param maquinariaId - ID de la máquina (requerido)
 * @param fechaDesde   - Fecha inicio en formato YYYY-MM-DD (opcional)
 * @param fechaHasta   - Fecha fin en formato YYYY-MM-DD (opcional)
 */
export async function descargarReporteHistorico(
  maquinariaId: number,
  fechaDesde?: string,
  fechaHasta?: string,
): Promise<void> {
  try {
    const params: Record<string, string | number> = {
      maquinaria_id: maquinariaId,
    };
    if (fechaDesde) params.fecha_desde = fechaDesde;
    if (fechaHasta) params.fecha_hasta = fechaHasta;

    const blob = await request<Blob>(
      `${API_BASE_URL}/api/v1/reportes/historico-diagnosticos`,
      {
        method: 'GET',
        params,
        responseType: 'blob',
        skipErrorHandler: true,
      },
    );

    _descargarBlob(blob, `reporte_historico_${maquinariaId}.pdf`);
  } catch (error) {
    throw error;
  }
}