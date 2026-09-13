/**
 * src/pages/Dashboard/index.tsx
 *
 * Panel de control del Sistema de Mantenimiento Predictivo.
 * Muestra:
 *  - Estadísticas de flota (total / activas / inactivas).
 *  - Gráfico de torta: estado de la flota (Recharts).
 *  - Gráfico de torta: distribución de alertas por estado (Recharts).
 *  - Tabla de las últimas alertas críticas.
 */

import React, { useEffect, useState } from 'react';
import { useModel } from '@umijs/max';
import {
  Card,
  Col,
  Empty,
  message,
  Row,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  DashboardOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  AlertaCriticaResumen,
  DashboardResumen,
  obtenerResumenDashboard,
} from '@/services/dashboard';
import type { InitialState } from '@/app';

const { Title, Text } = Typography;

// ─────────────────────────────────────────────
// Paleta de colores
// ─────────────────────────────────────────────
const COLOR_ACTIVO      = '#1677ff';
const COLOR_INACTIVO    = '#d9d9d9';
const COLOR_NORMAL      = '#52c41a';
const COLOR_ADVERTENCIA = '#faad14';
const COLOR_CRITICO     = '#ff4d4f';

// ─────────────────────────────────────────────
// Utilidad: formatea fecha ISO a legible
// ─────────────────────────────────────────────
function formatearFecha(iso: string): string {
  try {
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

// ─────────────────────────────────────────────
// Columnas de la tabla de alertas críticas
// ─────────────────────────────────────────────
const columnasAlertas: ColumnsType<AlertaCriticaResumen> = [
  {
    title: 'Máquina',
    dataIndex: 'maquinaria_nombre',
    key: 'maquinaria_nombre',
    ellipsis: true,
    width: 180,
  },
  {
    title: 'Diagnóstico',
    dataIndex: 'diagnostico',
    key: 'diagnostico',
    ellipsis: true,
  },
  {
    title: 'Fecha',
    dataIndex: 'fecha_generacion',
    key: 'fecha_generacion',
    width: 160,
    render: (val: string) => formatearFecha(val),
  },
];

// ─────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────
const DashboardPage: React.FC = () => {
  const { initialState } = useModel('@@initialState');
  const currentUser = (initialState as InitialState | undefined)?.currentUser;

  const [resumen, setResumen] = useState<DashboardResumen | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);

  // ── Carga de datos ────────────────────────
  useEffect(() => {
    let cancelado = false;

    const cargar = async (): Promise<void> => {
      try {
        const datos = await obtenerResumenDashboard();
        if (!cancelado) setResumen(datos);
      } catch {
        if (!cancelado) message.error('No se pudo cargar el resumen del dashboard.');
      } finally {
        if (!cancelado) setCargando(false);
      }
    };

    cargar();
    return () => { cancelado = true; };
  }, []);

  // ── Datos para los gráficos ───────────────
  const datosFlota = resumen
    ? [
        { name: 'Activas',   value: resumen.maquinas_activas,   color: COLOR_ACTIVO   },
        { name: 'Inactivas', value: resumen.maquinas_inactivas, color: COLOR_INACTIVO },
      ].filter((d) => d.value > 0)
    : [];

  const datosAlertas = resumen
    ? [
        { name: 'Normal',      value: resumen.alertas_normal,      color: COLOR_NORMAL      },
        { name: 'Advertencia', value: resumen.alertas_advertencia,  color: COLOR_ADVERTENCIA },
        { name: 'Crítico',     value: resumen.alertas_critico,      color: COLOR_CRITICO     },
      ].filter((d) => d.value > 0)
    : [];

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return (
    <div style={styles.pageWrapper}>
      {/* Encabezado con saludo */}
      <div style={styles.header}>
        <DashboardOutlined style={styles.headerIcon} />
        <Title level={4} style={styles.title}>
          Dashboard
        </Title>
      </div>
      {currentUser && (
        <Text type="secondary" style={styles.saludo}>
          Bienvenido, <strong>{currentUser.nombre}</strong> — {currentUser.email}
        </Text>
      )}

      {/* Contenido con Spin mientras carga */}
      <Spin spinning={cargando} size="large" tip="Cargando resumen…">

        {/* ── Fila 1: Estadísticas de flota ── */}
        <Row gutter={[16, 16]} style={styles.section}>
          <Col xs={24} sm={8}>
            <Card style={styles.card}>
              <Statistic
                title="Total de máquinas"
                value={resumen?.maquinas_total ?? 0}
                valueStyle={{ color: '#262626', fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card style={styles.card}>
              <Statistic
                title="Activas"
                value={resumen?.maquinas_activas ?? 0}
                valueStyle={{ color: COLOR_NORMAL, fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card style={styles.card}>
              <Statistic
                title="Inactivas"
                value={resumen?.maquinas_inactivas ?? 0}
                valueStyle={{ color: '#8c8c8c', fontWeight: 700 }}
              />
            </Card>
          </Col>
        </Row>

        {/* ── Fila 2: Gráficos de torta ── */}
        <Row gutter={[16, 16]} style={styles.section}>
          {/* Gráfico 1: Estado de la flota */}
          <Col xs={24} md={12}>
            <Card title="Estado de la flota" style={styles.card}>
              {datosFlota.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={datosFlota}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ name, percent }) =>
                        `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                    >
                      {datosFlota.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} máquinas`, '']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Empty description="Sin datos de flota" style={{ padding: 40 }} />
              )}
            </Card>
          </Col>

          {/* Gráfico 2: Distribución de alertas */}
          <Col xs={24} md={12}>
            <Card title="Distribución de alertas" style={styles.card}>
              {datosAlertas.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={datosAlertas}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ name, percent }) =>
                          `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                    >
                      {datosAlertas.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} máquinas`, '']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Empty description="Sin alertas registradas aún" style={{ padding: 40 }} />
              )}
            </Card>
          </Col>
        </Row>

        {/* ── Fila 3: Alertas críticas recientes ── */}
        <Row style={styles.section}>
          <Col xs={24}>
            <Card
              title={
                <span>
                  <ExclamationCircleOutlined style={{ color: COLOR_CRITICO, marginRight: 8 }} />
                  Alertas críticas recientes
                  {resumen && resumen.alertas_critico > 0 && (
                    <Tag color="error" style={{ marginLeft: 10 }}>
                      {resumen.alertas_critico} activas
                    </Tag>
                  )}
                </span>
              }
              style={styles.card}
            >
              {resumen?.ultimas_alertas_criticas.length === 0 ? (
                <Empty description="No hay alertas críticas registradas" />
              ) : (
                <Table<AlertaCriticaResumen>
                  columns={columnasAlertas}
                  dataSource={resumen?.ultimas_alertas_criticas ?? []}
                  rowKey={(r) => `${r.maquinaria_nombre}-${r.fecha_generacion}`}
                  pagination={false}
                  size="middle"
                  bordered
                  scroll={{ x: 600 }}
                />
              )}
            </Card>
          </Col>
        </Row>

      </Spin>
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
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  headerIcon: {
    fontSize: 22,
    color: '#1677ff',
  },
  title: {
    margin: 0,
  },
  saludo: {
    display: 'block',
    marginBottom: 24,
    fontSize: 14,
  },
  section: {
    marginBottom: 16,
  },
  card: {
    borderRadius: 8,
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    height: '100%',
  },
};

export default DashboardPage;