/**
 * src/pages/Maquinaria/index.tsx
 *
 * Página de gestión de maquinaria.
 * - Tabla con todas las máquinas registradas.
 * - Botón "Nueva máquina" (solo visible para esAdminOSupervisor).
 * - Modal con formulario de creación.
 * - Botón "Editar" con modal de edición (solo visible para esAdminOSupervisor).
 * - Acción "Activar"/"Desactivar" con Popconfirm (solo visible para esAdminOSupervisor).
 * - Tag "Solo lectura" si el usuario no tiene permisos de gestión.
 * - Recarga automática tras crear, editar, activar o desactivar.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useAccess } from '@umijs/max';
import {
  Button,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  StopOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  activarMaquinaria,
  actualizarMaquinaria,
  crearMaquinaria,
  desactivarMaquinaria,
  listarMaquinaria,
  Maquinaria,
  MaquinariaPayload,
} from '@/services/maquinaria';

const { Title, Text } = Typography;

// ─────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────
const MaquinariaPage: React.FC = () => {
  const access = useAccess();
  const puedeGestionar = access.esAdminOSupervisor;

  // ── Estado ────────────────────────────────
  const [maquinarias, setMaquinarias] = useState<Maquinaria[]>([]);
  const [cargandoTabla, setCargandoTabla] = useState<boolean>(false);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [guardando, setGuardando] = useState<boolean>(false);
  const [desactivandoId, setDesactivandoId] = useState<number | null>(null);
  const [form] = Form.useForm<MaquinariaPayload>();

  const [modalEditarVisible, setModalEditarVisible] = useState<boolean>(false);
  const [maquinariaEditar, setMaquinariaEditar] = useState<Maquinaria | null>(null);
  const [editando, setEditando] = useState<boolean>(false);
  const [formEditar] = Form.useForm<MaquinariaPayload>();

  // ── Carga de datos ────────────────────────
  const cargarMaquinarias = useCallback(async (): Promise<void> => {
    setCargandoTabla(true);
    try {
      const datos = await listarMaquinaria();
      setMaquinarias(datos);
    } catch {
      message.error('No se pudo cargar la lista de maquinaria.');
    } finally {
      setCargandoTabla(false);
    }
  }, []);

  useEffect(() => {
    cargarMaquinarias();
  }, [cargarMaquinarias]);

  // ── Crear máquina ─────────────────────────
  const handleCrear = async (values: MaquinariaPayload): Promise<void> => {
    setGuardando(true);
    try {
      await crearMaquinaria(values);
      message.success(`Máquina "${values.nombre}" creada correctamente.`);
      setModalVisible(false);
      form.resetFields();
      await cargarMaquinarias();
    } catch {
      message.error('No se pudo crear la máquina. Verifica los datos e intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  // ── Editar máquina ────────────────────────
  const abrirEditar = (maquinaria: Maquinaria): void => {
    setMaquinariaEditar(maquinaria);
    formEditar.setFieldsValue({
      nombre: maquinaria.nombre,
      codigo_interno: maquinaria.codigo_interno,
      tipo_equipo: maquinaria.tipo_equipo,
      modelo_motor: maquinaria.modelo_motor ?? undefined,
      numero_serie: maquinaria.numero_serie ?? undefined,
      ubicacion: maquinaria.ubicacion ?? undefined,
    });
    setModalEditarVisible(true);
  };

  const handleEditar = async (values: MaquinariaPayload): Promise<void> => {
    if (!maquinariaEditar) return;
    setEditando(true);
    try {
      await actualizarMaquinaria(maquinariaEditar.id, values);
      message.success('Máquina actualizada correctamente.');
      setModalEditarVisible(false);
      setMaquinariaEditar(null);
      await cargarMaquinarias();
    } catch {
      message.error('No se pudo actualizar la máquina. Intenta de nuevo.');
    } finally {
      setEditando(false);
    }
  };

  // ── Desactivar máquina ────────────────────
  const handleDesactivar = async (id: number, nombre: string): Promise<void> => {
    setDesactivandoId(id);
    try {
      await desactivarMaquinaria(id);
      message.success(`Máquina "${nombre}" desactivada correctamente.`);
      await cargarMaquinarias();
    } catch {
      message.error('No se pudo desactivar la máquina. Intenta de nuevo.');
    } finally {
      setDesactivandoId(null);
    }
  };

  // ── Activar máquina ───────────────────────
  const handleActivar = async (id: number, nombre: string): Promise<void> => {
    setDesactivandoId(id);
    try {
      await activarMaquinaria(id);
      message.success(`Máquina "${nombre}" reactivada correctamente.`);
      await cargarMaquinarias();
    } catch {
      message.error('No se pudo reactivar la máquina. Intenta de nuevo.');
    } finally {
      setDesactivandoId(null);
    }
  };

  // ── Columnas de la tabla ──────────────────
  const columnas: ColumnsType<Maquinaria> = [
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      sorter: (a, b) => a.nombre.localeCompare(b.nombre),
      ellipsis: true,
    },
    {
      title: 'Código interno',
      dataIndex: 'codigo_interno',
      key: 'codigo_interno',
      width: 150,
    },
    {
      title: 'Tipo de equipo',
      dataIndex: 'tipo_equipo',
      key: 'tipo_equipo',
      ellipsis: true,
    },
    {
      title: 'Ubicación',
      dataIndex: 'ubicacion',
      key: 'ubicacion',
      ellipsis: true,
      render: (val: string | null) => val ?? <Text type="secondary">—</Text>,
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      width: 110,
      filters: [
        { text: 'Activo', value: 'activo' },
        { text: 'Inactivo', value: 'inactivo' },
      ],
      onFilter: (value, record) => record.estado === value,
      render: (estado: Maquinaria['estado']) => (
        <Tag color={estado === 'activo' ? 'success' : 'error'}>
          {estado === 'activo' ? 'Activo' : 'Inactivo'}
        </Tag>
      ),
    },
    // Columna de acciones: solo visible si el usuario puede gestionar
    ...(puedeGestionar
      ? [
          {
            title: 'Acciones',
            key: 'acciones',
            width: 210,
            render: (_: unknown, record: Maquinaria) => (
              <Space>
                <Button size="small" onClick={() => abrirEditar(record)}>
                  Editar
                </Button>
                {record.estado === 'activo' ? (
                  <Popconfirm
                    title="¿Desactivar máquina?"
                    description={`Esta acción cambiará el estado de "${record.nombre}" a inactivo.`}
                    okText="Sí, desactivar"
                    cancelText="Cancelar"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => handleDesactivar(record.id, record.nombre)}
                  >
                    <Button
                      danger
                      size="small"
                      icon={<StopOutlined />}
                      loading={desactivandoId === record.id}
                    >
                      Desactivar
                    </Button>
                  </Popconfirm>
                ) : (
                  <Popconfirm
                    title="¿Reactivar máquina?"
                    description={`Esta acción cambiará el estado de "${record.nombre}" a activo.`}
                    okText="Sí, activar"
                    cancelText="Cancelar"
                    onConfirm={() => handleActivar(record.id, record.nombre)}
                  >
                    <Button
                      size="small"
                      icon={<PlusOutlined />}
                      loading={desactivandoId === record.id}
                    >
                      Activar
                    </Button>
                  </Popconfirm>
                )}
              </Space>
            ),
          } as ColumnsType<Maquinaria>[number],
        ]
      : []),
  ];

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return (
    <div style={styles.pageWrapper}>
      {/* Encabezado */}
      <div style={styles.header}>
        <Space align="center">
          <ToolOutlined style={styles.headerIcon} />
          <Title level={4} style={styles.title}>
            Gestión de Maquinaria
          </Title>
          {!puedeGestionar && (
            <Tooltip title="Tu rol no permite crear ni desactivar máquinas.">
              <Tag color="default">Solo lectura</Tag>
            </Tooltip>
          )}
        </Space>

        {puedeGestionar && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setModalVisible(true)}
          >
            Nueva máquina
          </Button>
        )}
      </div>

      {/* Tabla */}
      <Table<Maquinaria>
        columns={columnas}
        dataSource={maquinarias}
        rowKey="id"
        loading={cargandoTabla}
        pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `${t} máquinas` }}
        bordered
        size="middle"
        scroll={{ x: 800 }}
      />

      {/* Modal de creación */}
      <Modal
        title="Nueva máquina"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        destroyOnClose
        width={560}
      >
        <Form<MaquinariaPayload>
          form={form}
          layout="vertical"
          onFinish={handleCrear}
          style={{ marginTop: 8 }}
        >
          <Form.Item
            name="nombre"
            label="Nombre"
            rules={[{ required: true, message: 'El nombre es obligatorio.' }]}
          >
            <Input placeholder="Ej. Compresor de aire #3" maxLength={120} />
          </Form.Item>

          <Form.Item
            name="codigo_interno"
            label="Código interno"
            rules={[{ required: true, message: 'El código interno es obligatorio.' }]}
          >
            <Input placeholder="Ej. COMP-003" maxLength={50} />
          </Form.Item>

          <Form.Item
            name="tipo_equipo"
            label="Tipo de equipo"
            rules={[{ required: true, message: 'El tipo de equipo es obligatorio.' }]}
          >
            <Input placeholder="Ej. Compresor, Bomba, Generador…" maxLength={80} />
          </Form.Item>

          <Form.Item name="modelo_motor" label="Modelo de motor">
            <Input placeholder="Ej. WEG W22 15 CV (opcional)" maxLength={80} />
          </Form.Item>

          <Form.Item name="numero_serie" label="Número de serie">
            <Input placeholder="Ej. SN-20240101-001 (opcional)" maxLength={80} />
          </Form.Item>

          <Form.Item name="ubicacion" label="Ubicación">
            <Input placeholder="Ej. Planta Baja – Sector A (opcional)" maxLength={120} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button
                onClick={() => {
                  setModalVisible(false);
                  form.resetFields();
                }}
              >
                Cancelar
              </Button>
              <Button type="primary" htmlType="submit" loading={guardando}>
                Crear máquina
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal de edición */}
      <Modal
        title="Editar máquina"
        open={modalEditarVisible}
        onCancel={() => {
          setModalEditarVisible(false);
          setMaquinariaEditar(null);
        }}
        footer={null}
        destroyOnClose
        width={560}
      >
        <Form<MaquinariaPayload>
          form={formEditar}
          layout="vertical"
          onFinish={handleEditar}
          style={{ marginTop: 8 }}
        >
          <Form.Item
            name="nombre"
            label="Nombre"
            rules={[{ required: true, message: 'El nombre es obligatorio.' }]}
          >
            <Input maxLength={120} />
          </Form.Item>

          <Form.Item
            name="codigo_interno"
            label="Código interno"
            rules={[{ required: true, message: 'El código interno es obligatorio.' }]}
          >
            <Input maxLength={50} />
          </Form.Item>

          <Form.Item
            name="tipo_equipo"
            label="Tipo de equipo"
            rules={[{ required: true, message: 'El tipo de equipo es obligatorio.' }]}
          >
            <Input maxLength={80} />
          </Form.Item>

          <Form.Item name="modelo_motor" label="Modelo de motor">
            <Input maxLength={80} />
          </Form.Item>

          <Form.Item name="numero_serie" label="Número de serie">
            <Input maxLength={80} />
          </Form.Item>

          <Form.Item name="ubicacion" label="Ubicación">
            <Input maxLength={120} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button
                onClick={() => {
                  setModalEditarVisible(false);
                  setMaquinariaEditar(null);
                }}
              >
                Cancelar
              </Button>
              <Button type="primary" htmlType="submit" loading={editando}>
                Guardar cambios
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerIcon: {
    fontSize: 22,
    color: '#1677ff',
  },
  title: {
    margin: 0,
  },
};

export default MaquinariaPage;
