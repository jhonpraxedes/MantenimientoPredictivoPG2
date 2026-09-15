/**
 * src/pages/Usuarios/index.tsx
 *
 * Página de administración de usuarios del sistema.
 * Accesible solo para el rol "administrador".
 *
 * Funcionalidades:
 *  - Tabla con todos los usuarios (nombre, email, rol con Tag, estado con Tag).
 *  - Modal "Nuevo usuario": crea un usuario con nombre, email, password y rol.
 *  - Modal "Editar usuario": cambia nombre, rol y activo del usuario seleccionado.
 *    El Select de rol queda deshabilitado si la fila es el usuario logueado
 *    (restricción visual que espeja la del backend).
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useModel } from '@umijs/max';
import {
  Button,
  Card,
  Form,
  Input,
  message,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { PlusOutlined, TeamOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  actualizarUsuario,
  crearUsuario,
  listarUsuarios,
  RolAdmin,
  UsuarioAdmin,
  UsuarioCreatePayload,
  UsuarioUpdatePayload,
} from '@/services/usuarios';
import type { InitialState } from '@/app';

const { Title } = Typography;
const { Option } = Select;

// ─────────────────────────────────────────────
// Paleta de colores y etiquetas por rol
// ─────────────────────────────────────────────
const COLOR_ROL: Record<RolAdmin, string> = {
  administrador: 'red',
  supervisor:    'blue',
  tecnico:       'green',
};

const LABEL_ROL: Record<RolAdmin, string> = {
  administrador: 'Administrador',
  supervisor:    'Supervisor',
  tecnico:       'Técnico',
};

// ─────────────────────────────────────────────
// Select de rol con soporte de Tooltip cuando está deshabilitado
// (componente controlado: recibe value/onChange de Form.Item)
// ─────────────────────────────────────────────
interface SelectRolProps {
  value?: RolAdmin;
  onChange?: (value: RolAdmin) => void;
  disabled?: boolean;
  tooltip?: string;
}

const SelectRolConTooltip: React.FC<SelectRolProps> = ({
  value,
  onChange,
  disabled,
  tooltip,
}) => (
  <Tooltip title={tooltip}>
    <span style={{ display: 'block' }}>
      <Select
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder="Seleccionar rol…"
        style={{ width: '100%' }}
      >
        <Option value="administrador">Administrador</Option>
        <Option value="supervisor">Supervisor</Option>
        <Option value="tecnico">Técnico</Option>
      </Select>
    </span>
  </Tooltip>
);

// ─────────────────────────────────────────────
// Tipos de formulario
// ─────────────────────────────────────────────
type FormCrear  = UsuarioCreatePayload;
type FormEditar = { nombre: string; rol: RolAdmin; activo: boolean };

// ─────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────
const UsuariosPage: React.FC = () => {
  // ── Usuario logueado (para protección de rol propio) ──
  const { initialState } = useModel('@@initialState');
  const currentUser = (initialState as InitialState | undefined)?.currentUser;

  // ── Estado local ──────────────────────────────────────
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [cargando, setCargando] = useState<boolean>(false);

  const [modalCrearVisible, setModalCrearVisible]   = useState<boolean>(false);
  const [creando, setCreando]                       = useState<boolean>(false);

  const [modalEditarVisible, setModalEditarVisible] = useState<boolean>(false);
  const [usuarioEditar, setUsuarioEditar]           = useState<UsuarioAdmin | null>(null);
  const [guardando, setGuardando]                   = useState<boolean>(false);

  const [formCrear]  = Form.useForm<FormCrear>();
  const [formEditar] = Form.useForm<FormEditar>();

  // ── Carga de usuarios ─────────────────────────────────
  const cargarUsuarios = useCallback(async (): Promise<void> => {
    setCargando(true);
    try {
      const datos = await listarUsuarios();
      setUsuarios(datos);
    } catch {
      message.error('No se pudo cargar la lista de usuarios.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarUsuarios();
  }, [cargarUsuarios]);

  // ── Crear usuario ──────────────────────────────────────
  const handleCrear = async (values: FormCrear): Promise<void> => {
    setCreando(true);
    try {
      await crearUsuario(values);
      message.success('Usuario creado correctamente.');
      setModalCrearVisible(false);
      formCrear.resetFields();
      await cargarUsuarios();
    } catch (error: unknown) {
      const detail = (error as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail;
      message.error(detail ?? 'No se pudo crear el usuario. Intenta de nuevo.');
    } finally {
      setCreando(false);
    }
  };

  // ── Abrir modal de edición ─────────────────────────────
  const abrirEditar = (usuario: UsuarioAdmin): void => {
    setUsuarioEditar(usuario);
    formEditar.setFieldsValue({ nombre: usuario.nombre, rol: usuario.rol, activo: usuario.activo });
    setModalEditarVisible(true);
  };

  // ── Guardar edición ────────────────────────────────────
  const handleEditar = async (values: FormEditar): Promise<void> => {
    if (!usuarioEditar) return;
    setGuardando(true);
    try {
      const payload: UsuarioUpdatePayload = {
        nombre: values.nombre,
        rol:    values.rol,
        activo: values.activo,
      };
      await actualizarUsuario(usuarioEditar.id, payload);
      message.success('Usuario actualizado correctamente.');
      setModalEditarVisible(false);
      setUsuarioEditar(null);
      await cargarUsuarios();
    } catch (error: unknown) {
      const detail = (error as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail;
      message.error(detail ?? 'No se pudo actualizar el usuario. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  // ── Columnas de la tabla ───────────────────────────────
  const columnas: ColumnsType<UsuarioAdmin> = [
    {
      title:     'Nombre',
      dataIndex: 'nombre',
      key:       'nombre',
      ellipsis:  true,
    },
    {
      title:     'Email',
      dataIndex: 'email',
      key:       'email',
      ellipsis:  true,
    },
    {
      title:     'Rol',
      dataIndex: 'rol',
      key:       'rol',
      width:     140,
      render:    (rol: RolAdmin) => (
        <Tag color={COLOR_ROL[rol]}>{LABEL_ROL[rol]}</Tag>
      ),
    },
    {
      title:     'Estado',
      dataIndex: 'activo',
      key:       'activo',
      width:     100,
      render:    (activo: boolean) =>
        activo
          ? <Tag color="success">Activo</Tag>
          : <Tag color="default">Inactivo</Tag>,
    },
    {
      title:  'Acciones',
      key:    'acciones',
      width:  110,
      render: (_: unknown, record: UsuarioAdmin) => (
        <Button size="small" onClick={() => abrirEditar(record)}>
          Editar
        </Button>
      ),
    },
  ];

  // ── ¿El usuario a editar es el propio usuario logueado? ─
  const esUsuarioActual = usuarioEditar?.id === currentUser?.id;

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return (
    <div style={styles.pageWrapper}>
      {/* Encabezado */}
      <Space align="center" style={{ marginBottom: 20 }}>
        <TeamOutlined style={styles.headerIcon} />
        <Title level={4} style={styles.title}>
          Administración de Usuarios
        </Title>
      </Space>

      <Card
        style={styles.card}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              formCrear.resetFields();
              setModalCrearVisible(true);
            }}
          >
            Nuevo usuario
          </Button>
        }
      >
        <Table<UsuarioAdmin>
          columns={columnas}
          dataSource={usuarios}
          rowKey="id"
          loading={cargando}
          pagination={{
            pageSize: 15,
            showSizeChanger: true,
            showTotal: (t) => `${t} usuarios`,
          }}
          size="middle"
          bordered
          scroll={{ x: 700 }}
        />
      </Card>

      {/* ── Modal: Crear usuario ── */}
      <Modal
        title="Nuevo usuario"
        open={modalCrearVisible}
        onCancel={() => {
          setModalCrearVisible(false);
          formCrear.resetFields();
        }}
        onOk={() => formCrear.submit()}
        okText="Crear"
        cancelText="Cancelar"
        confirmLoading={creando}
        destroyOnClose
      >
        <Form<FormCrear>
          form={formCrear}
          layout="vertical"
          onFinish={handleCrear}
          style={{ marginTop: 12 }}
        >
          <Form.Item
            name="nombre"
            label="Nombre completo"
            rules={[
              { required: true, whitespace: true, message: 'Ingresa el nombre.' },
            ]}
          >
            <Input placeholder="Ej. Juan Pérez" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Ingresa el email.' },
              { type: 'email', message: 'Ingresa un email válido.' },
            ]}
          >
            <Input placeholder="usuario@empresa.com" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Contraseña"
            rules={[
              { required: true, message: 'Ingresa una contraseña.' },
              { min: 8, message: 'La contraseña debe tener al menos 8 caracteres.' },
            ]}
          >
            <Input.Password placeholder="Mínimo 8 caracteres" />
          </Form.Item>

          <Form.Item
            name="rol"
            label="Rol"
            rules={[{ required: true, message: 'Selecciona un rol.' }]}
          >
            <Select placeholder="Seleccionar rol…">
              <Option value="administrador">Administrador</Option>
              <Option value="supervisor">Supervisor</Option>
              <Option value="tecnico">Técnico</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Modal: Editar usuario ── */}
      <Modal
        title={`Editar: ${usuarioEditar?.nombre ?? ''}`}
        open={modalEditarVisible}
        onCancel={() => {
          setModalEditarVisible(false);
          setUsuarioEditar(null);
        }}
        onOk={() => formEditar.submit()}
        okText="Guardar"
        cancelText="Cancelar"
        confirmLoading={guardando}
        width={400}
        destroyOnClose
      >
        <Form<FormEditar>
          form={formEditar}
          layout="vertical"
          onFinish={handleEditar}
          style={{ marginTop: 12 }}
        >
          <Form.Item
            name="nombre"
            label="Nombre completo"
            rules={[{ required: true, whitespace: true, message: 'Ingresa el nombre.' }]}
          >
            <Input placeholder="Ej. Juan Pérez" />
          </Form.Item>

          <Form.Item name="rol" label="Rol">
            <SelectRolConTooltip
              disabled={esUsuarioActual}
              tooltip={
                esUsuarioActual
                  ? 'No puedes cambiar tu propio rol de administrador'
                  : ''
              }
            />
          </Form.Item>

          <Form.Item name="activo" label="Estado" valuePropName="checked">
            <Switch checkedChildren="Activo" unCheckedChildren="Inactivo" />
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

export default UsuariosPage;