/**
 * src/pages/Reportes/index.tsx
 *
 * Página de descarga de reportes PDF.
 * Accesible para roles: administrador y supervisor.
 *
 * Contiene dos Card:
 *  1. "Reporte de estado operativo": Select opcional de máquina → descarga PDF.
 *  2. "Histórico de diagnósticos": Select obligatorio de máquina + RangePicker
 *     opcional de fechas → descarga PDF.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  Col,
  DatePicker,
  message,
  Row,
  Select,
  Space,
  Typography,
} from 'antd';
import { FilePdfOutlined } from '@ant-design/icons';
import type { RangePickerProps } from 'antd/es/date-picker';
import dayjs from 'dayjs';
import { listarMaquinaria, Maquinaria } from '@/services/maquinaria';
import {
  descargarReporteEstadoOperativo,
  descargarReporteHistorico,
} from '@/services/reportes';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

// ─────────────────────────────────────────────
// Helper: extrae el detail de un error HTTP
// ─────────────────────────────────────────────
function extraerDetalle(error: unknown): string | undefined {
  return (error as { response?: { data?: { detail?: string }; status?: number } })
    ?.response?.data?.detail;
}

function esError400(error: unknown): boolean {
  return (
    (error as { response?: { status?: number } })?.response?.status === 400
  );
}

// ─────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────
const ReportesPage: React.FC = () => {
  // ── Máquinas (compartidas por ambas Cards) ──
  const [maquinarias, setMaquinarias]             = useState<Maquinaria[]>([]);
  const [cargandoMaquinarias, setCargandoMaquinarias] = useState<boolean>(false);

  // ── Estado Card 1: Estado operativo ─────────
  const [maquinaEstado, setMaquinaEstado]         = useState<number | undefined>(undefined);
  const [descargandoEstado, setDescargandoEstado] = useState<boolean>(false);

  // ── Estado Card 2: Histórico ─────────────────
  const [maquinaHistorico, setMaquinaHistorico]   = useState<number | undefined>(undefined);
  const [rangoFechas, setRangoFechas]             = useState<[string, string] | undefined>(undefined);
  const [descargandoHistorico, setDescargandoHistorico] = useState<boolean>(false);

  // ── Carga de máquinas ─────────────────────────
  const cargarMaquinarias = useCallback(async (): Promise<void> => {
    setCargandoMaquinarias(true);
    try {
      const datos = await listarMaquinaria();
      setMaquinarias(datos);
    } catch {
      message.error('No se pudo cargar la lista de máquinas.');
    } finally {
      setCargandoMaquinarias(false);
    }
  }, []);

  useEffect(() => {
    cargarMaquinarias();
  }, [cargarMaquinarias]);

  // ── Descarga: Estado operativo ───────────────
  const handleDescargarEstado = async (): Promise<void> => {
    setDescargandoEstado(true);
    try {
      await descargarReporteEstadoOperativo(maquinaEstado);
      message.success('Reporte de estado operativo descargado correctamente.');
    } catch (error: unknown) {
      const detalle = extraerDetalle(error);
      message.error(detalle ?? 'No se pudo generar el reporte. Intenta de nuevo.');
    } finally {
      setDescargandoEstado(false);
    }
  };

  // ── Descarga: Histórico ───────────────────────
  const handleDescargarHistorico = async (): Promise<void> => {
    if (!maquinaHistorico) {
      message.warning('Selecciona una máquina para generar el historial.');
      return;
    }
    setDescargandoHistorico(true);
    try {
      await descargarReporteHistorico(
        maquinaHistorico,
        rangoFechas?.[0],
        rangoFechas?.[1],
      );
      message.success('Reporte histórico descargado correctamente.');
    } catch (error: unknown) {
      if (esError400(error)) {
        const detalle = extraerDetalle(error);
        message.error(detalle ?? 'El equipo no posee historial de registros.');
      } else {
        message.error('No se pudo generar el reporte. Intenta de nuevo.');
      }
    } finally {
      setDescargandoHistorico(false);
    }
  };

  // ── Handler de RangePicker ────────────────────
  const handleRangoFechas: RangePickerProps['onChange'] = (_, dateStrings) => {
    if (dateStrings[0] && dateStrings[1]) {
      // dayjs garantiza formato YYYY-MM-DD
      setRangoFechas([
        dayjs(dateStrings[0]).format('YYYY-MM-DD'),
        dayjs(dateStrings[1]).format('YYYY-MM-DD'),
      ]);
    } else {
      setRangoFechas(undefined);
    }
  };

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return (
    <div style={styles.pageWrapper}>
      {/* Encabezado */}
      <Space align="center" style={{ marginBottom: 24 }}>
        <FilePdfOutlined style={styles.headerIcon} />
        <Title level={4} style={styles.title}>
          Reportes PDF
        </Title>
      </Space>

      {/* ── Card 1: Estado operativo ── */}
      <Card
        title="Reporte de estado operativo"
        style={styles.card}
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          Genera un informe con el estado actual de la flota y la última alerta de cada máquina.
          Si no seleccionas ninguna máquina, el reporte incluirá toda la flota.
        </Text>

        <Row gutter={16} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Select
              style={{ width: '100%' }}
              placeholder="Toda la flota"
              allowClear
              loading={cargandoMaquinarias}
              value={maquinaEstado}
              onChange={(val: number | undefined) => setMaquinaEstado(val)}
            >
              {maquinarias.map((m) => (
                <Option key={m.id} value={m.id}>
                  {m.nombre}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Button
              type="primary"
              icon={<FilePdfOutlined />}
              loading={descargandoEstado}
              onClick={handleDescargarEstado}
              block
            >
              Descargar PDF
            </Button>
          </Col>
        </Row>
      </Card>

      {/* ── Card 2: Histórico de diagnósticos ── */}
      <Card
        title="Histórico de diagnósticos"
        style={{ ...styles.card, marginTop: 20 }}
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          Genera un informe cronológico de todas las lecturas y diagnósticos de una máquina.
          La máquina es obligatoria; el rango de fechas es opcional.
        </Text>

        <Row gutter={[16, 12]} align="middle">
          {/* Selector de máquina (obligatorio) */}
          <Col xs={24} sm={12} md={8}>
            <Select
              style={{ width: '100%' }}
              placeholder="Seleccionar máquina…"
              allowClear
              loading={cargandoMaquinarias}
              value={maquinaHistorico}
              onChange={(val: number | undefined) => setMaquinaHistorico(val)}
            >
              {maquinarias.map((m) => (
                <Option key={m.id} value={m.id}>
                  {m.nombre}
                </Option>
              ))}
            </Select>
          </Col>

          {/* Rango de fechas (opcional) */}
          <Col xs={24} sm={12} md={10}>
            <RangePicker
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              placeholder={['Fecha desde', 'Fecha hasta']}
              onChange={handleRangoFechas}
            />
          </Col>

          {/* Botón de descarga */}
          <Col xs={24} sm={24} md={6}>
            <Button
              type="primary"
              icon={<FilePdfOutlined />}
              loading={descargandoHistorico}
              onClick={handleDescargarHistorico}
              disabled={!maquinaHistorico}
              block
            >
              Descargar PDF
            </Button>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

// ─────────────────────────────────────────────
// Estilos
// ─────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  pageWrapper: {
    padding: '24px',
  },
  headerIcon: {
    fontSize: 22,
    color:    '#1677ff',
  },
  title: {
    margin: 0,
  },
  card: {
    borderRadius: 8,
    boxShadow:    '0 1px 4px rgba(0,0,0,0.08)',
  },
};

export default ReportesPage;