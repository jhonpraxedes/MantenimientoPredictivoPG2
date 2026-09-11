/**
 * src/pages/Lecturas/index.tsx
 *
 * Página de registro e historial de lecturas de sensor.
 * - Card superior: formulario para registrar una nueva lectura.
 *   · Select de máquinas activas (cargado al montar).
 *   · InputNumber para temperatura, presión, vibración, horas de uso.
 *   · TextArea opcional para observaciones.
 *   · Muestra error detallado si el backend responde 422 (validación de rango).
 * - Card inferior: tabla de historial con filtro por máquina.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  message,
  Row,
  Select,
  Space,
  Table,
  Typography,
} from 'antd';
import { LineChartOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { listarMaquinaria, Maquinaria } from '@/services/maquinaria';
import {
  crearLectura,
  FastApiValidationError,
  LecturaPayload,
  LecturaSensor,
  listarLecturas,
} from '@/services/lecturas';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

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
// Tipo de fila enriquecida para la tabla
// ─────────────────────────────────────────────
interface LecturaFila extends LecturaSensor {
  nombreMaquina: string;
}

// ─────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────
const LecturasPage: React.FC = () => {
  // ── Estado ────────────────────────────────
  const [maquinarias, setMaquinarias] = useState<Maquinaria[]>([]);
  const [cargandoMaquinarias, setCargandoMaquinarias] = useState<boolean>(false);

  const [lecturas, setLecturas] = useState<LecturaFila[]>([]);
  const [cargandoLecturas, setCargandoLecturas] = useState<boolean>(false);

  const [filtroMaquinaId, setFiltroMaquinaId] = useState<number | undefined>(undefined);
  const [enviando, setEnviando] = useState<boolean>(false);

  const [form] = Form.useForm<LecturaPayload>();

  // ── Mapa id → nombre de máquina (para cruzar en la tabla) ──
  const mapaNombreMaquina = React.useMemo<Record<number, string>>(() => {
    return maquinarias.reduce<Record<number, string>>((acc, m) => {
      acc[m.id] = m.nombre;
      return acc;
    }, {});
  }, [maquinarias]);

  // ── Carga de máquinas activas ─────────────
  const cargarMaquinarias = useCallback(async (): Promise<void> => {
    setCargandoMaquinarias(true);
    try {
      const datos = await listarMaquinaria('activo');
      setMaquinarias(datos);
    } catch {
      message.error('No se pudo cargar la lista de máquinas.');
    } finally {
      setCargandoMaquinarias(false);
    }
  }, []);

  // ── Carga de lecturas (con filtro opcional) ──
  const cargarLecturas = useCallback(
    async (maquinariaId?: number): Promise<void> => {
      setCargandoLecturas(true);
      try {
        const datos = await listarLecturas(maquinariaId);
        // Enriquecemos cada fila con el nombre de la máquina
        const filas: LecturaFila[] = datos.map((l) => ({
          ...l,
          nombreMaquina: mapaNombreMaquina[l.maquinaria_id] ?? `Máquina #${l.maquinaria_id}`,
        }));
        setLecturas(filas);
      } catch {
        message.error('No se pudo cargar el historial de lecturas.');
      } finally {
        setCargandoLecturas(false);
      }
    },
    [mapaNombreMaquina],
  );

  // Carga inicial
  useEffect(() => {
    cargarMaquinarias();
  }, [cargarMaquinarias]);

  // Recarga lecturas cuando cambia el mapa de máquinas o el filtro
  useEffect(() => {
    cargarLecturas(filtroMaquinaId);
  }, [cargarLecturas, filtroMaquinaId]);

  // ── Envío del formulario ──────────────────
  const handleEnviar = async (values: LecturaPayload): Promise<void> => {
    setEnviando(true);
    try {
      await crearLectura(values);
      message.success('Lectura registrada correctamente.');
      form.resetFields();
      // Recargar historial (con el filtro activo)
      await cargarLecturas(filtroMaquinaId);
    } catch (error: unknown) {
      const httpError = error as {
        response?: { status?: number; data?: FastApiValidationError };
      };
      const status = httpError?.response?.status;

      if (status === 422) {
        // Error de validación de rango desde FastAPI
        const detalle = httpError?.response?.data?.detail;
        if (Array.isArray(detalle) && detalle.length > 0) {
          const msgs = detalle
  .map((d) => d.msg.replace(/^Value error,\s*/i, ''))
  .join(' | ');
          message.error(`Error de validación: ${msgs}`);
        } else {
          message.error('Los datos de la lectura están fuera del rango permitido.');
        }
      } else {
        message.error('No se pudo registrar la lectura. Intenta de nuevo.');
      }
    } finally {
      setEnviando(false);
    }
  };

  // ── Columnas de la tabla de historial ─────
  const columnas: ColumnsType<LecturaFila> = [
    {
      title: 'Fecha y hora',
      dataIndex: 'fecha_hora',
      key: 'fecha_hora',
      width: 160,
      sorter: (a, b) =>
        new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime(),
      defaultSortOrder: 'descend',
      render: (val: string) => formatearFecha(val),
    },
    {
      title: 'Máquina',
      dataIndex: 'nombreMaquina',
      key: 'nombreMaquina',
      ellipsis: true,
    },
    {
      title: 'Temperatura (°C)',
      dataIndex: 'temperatura',
      key: 'temperatura',
      width: 150,
      align: 'right',
      render: (val: number) => val.toFixed(1),
    },
    {
      title: 'Presión aceite (bar)',
      dataIndex: 'presion_aceite',
      key: 'presion_aceite',
      width: 160,
      align: 'right',
      render: (val: number) => val.toFixed(2),
    },
    {
      title: 'Vibración (mm/s)',
      dataIndex: 'vibracion',
      key: 'vibracion',
      width: 150,
      align: 'right',
      render: (val: number) => val.toFixed(2),
    },
    {
      title: 'Horas de uso',
      dataIndex: 'horas_uso',
      key: 'horas_uso',
      width: 120,
      align: 'right',
    },
    {
      title: 'Observaciones',
      dataIndex: 'observaciones',
      key: 'observaciones',
      ellipsis: true,
      render: (val: string | null) =>
        val ? val : <Text type="secondary">—</Text>,
    },
  ];

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return (
    <div style={styles.pageWrapper}>
      {/* Encabezado */}
      <Space align="center" style={{ marginBottom: 20 }}>
        <LineChartOutlined style={styles.headerIcon} />
        <Title level={4} style={styles.title}>
          Lecturas de Sensor
        </Title>
      </Space>

      {/* Card: Formulario de nueva lectura */}
      <Card
        title="Registrar nueva lectura"
        style={styles.card}
        styles={{ body: { paddingBottom: 8 } }}
      >
        <Form<LecturaPayload>
          form={form}
          layout="vertical"
          onFinish={handleEnviar}
        >
          <Row gutter={16}>
            {/* Selección de máquina */}
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="maquinaria_id"
                label="Máquina"
                rules={[{ required: true, message: 'Selecciona una máquina.' }]}
              >
                <Select
                  placeholder="Seleccionar máquina…"
                  loading={cargandoMaquinarias}
                  showSearch
                  optionFilterProp="children"
                  allowClear
                >
                  {maquinarias.map((m) => (
                    <Option key={m.id} value={m.id}>
                      {m.nombre}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            {/* Temperatura */}
            <Col xs={24} sm={12} md={4}>
              <Form.Item
                name="temperatura"
                label="Temperatura (°C)"
                rules={[
                  { required: true, message: 'Requerido.' },
                  { type: 'number', message: 'Debe ser un número.' },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="Ej. 75.5"
                  step={0.1}
                  precision={1}
                />
              </Form.Item>
            </Col>

            {/* Presión de aceite */}
            <Col xs={24} sm={12} md={4}>
              <Form.Item
                name="presion_aceite"
                label="Presión aceite (bar)"
                rules={[
                  { required: true, message: 'Requerido.' },
                  { type: 'number', message: 'Debe ser un número.' },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="Ej. 3.50"
                  step={0.01}
                  precision={2}
                />
              </Form.Item>
            </Col>

            {/* Vibración */}
            <Col xs={24} sm={12} md={4}>
              <Form.Item
                name="vibracion"
                label="Vibración (mm/s)"
                rules={[
                  { required: true, message: 'Requerido.' },
                  { type: 'number', message: 'Debe ser un número.' },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="Ej. 1.20"
                  step={0.01}
                  precision={2}
                />
              </Form.Item>
            </Col>

            {/* Horas de uso */}
            <Col xs={24} sm={12} md={4}>
              <Form.Item
                name="horas_uso"
                label="Horas de uso"
                rules={[
                  { required: true, message: 'Requerido.' },
                  { type: 'number', min: 0, message: 'Debe ser ≥ 0.' },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="Ej. 1250"
                  min={0}
                  precision={0}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Observaciones */}
          <Row gutter={16}>
            <Col xs={24} md={16}>
              <Form.Item name="observaciones" label="Observaciones (opcional)">
                <TextArea
                  rows={2}
                  placeholder="Notas adicionales sobre la lectura…"
                  maxLength={500}
                  showCount
                />
              </Form.Item>
            </Col>

            {/* Botón de envío */}
            <Col
              xs={24}
              md={8}
              style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 24 }}
            >
              <Button
                type="primary"
                htmlType="submit"
                icon={<PlusOutlined />}
                loading={enviando}
                block
              >
                Registrar lectura
              </Button>
            </Col>
          </Row>
        </Form>
      </Card>

      {/* Card: Historial de lecturas */}
      <Card
        title="Historial de lecturas"
        style={{ ...styles.card, marginTop: 20 }}
        extra={
          <Space>
            {/* Filtro por máquina */}
            <Select
              style={{ width: 220 }}
              placeholder="Todas las máquinas"
              allowClear
              loading={cargandoMaquinarias}
              value={filtroMaquinaId}
              onChange={(val: number | undefined) => setFiltroMaquinaId(val)}
            >
              {maquinarias.map((m) => (
                <Option key={m.id} value={m.id}>
                  {m.nombre}
                </Option>
              ))}
            </Select>

            {/* Botón de recarga manual */}
            <Button
              icon={<ReloadOutlined />}
              onClick={() => cargarLecturas(filtroMaquinaId)}
              loading={cargandoLecturas}
            >
              Actualizar
            </Button>
          </Space>
        }
      >
        <Table<LecturaFila>
          columns={columnas}
          dataSource={lecturas}
          rowKey="id"
          loading={cargandoLecturas}
          pagination={{
            pageSize: 15,
            showSizeChanger: true,
            showTotal: (t) => `${t} lecturas`,
          }}
          size="middle"
          scroll={{ x: 900 }}
          bordered
        />
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
    color: '#1677ff',
  },
  title: {
    margin: 0,
  },
  card: {
    borderRadius: 8,
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
  },
};

export default LecturasPage;
