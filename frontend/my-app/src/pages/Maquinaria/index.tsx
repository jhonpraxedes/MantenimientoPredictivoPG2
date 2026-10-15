/**
 * src/pages/Maquinaria/index.tsx
 *
 * Página de gestión de maquinaria.
 * - Tabla con miniatura, código automático, categoría y estado.
 * - Alta con categoría de un catálogo, imagen opcional y código generado por el backend.
 * - Edición (el código se muestra pero no se puede cambiar) y reemplazo de imagen.
 * - Activar / desactivar con confirmación.
 * - Acciones de gestión solo visibles para esAdminOSupervisor.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useAccess } from '@umijs/max';
import {
  Button,
  Form,
  Image,
  Input,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  Upload,
} from 'antd';
import {
  PictureOutlined,
  PlusOutlined,
  StopOutlined,
  ToolOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  activarMaquinaria,
  actualizarMaquinaria,
  crearMaquinaria,
  desactivarMaquinaria,
  listarCategorias,
  listarMaquinaria,
  Maquinaria,
  MaquinariaPayload,
  obtenerImagenMaquinaria,
  subirImagenMaquinaria,
} from '@/services/maquinaria';

const { Title, Text } = Typography;

// ─────────────────────────────────────────────
// Validación de imagen en el navegador
// (el backend vuelve a validar: esto solo evita viajes inútiles)
// ─────────────────────────────────────────────
const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES_IMAGEN = 2 * 1024 * 1024; // 2 MB

function validarImagen(archivo: File): boolean {
  if (!TIPOS_IMAGEN.includes(archivo.type)) {
    message.error('La imagen debe ser JPG, PNG o WebP.');
    return false;
  }
  if (archivo.size > MAX_BYTES_IMAGEN) {
    message.error('La imagen no puede superar los 2 MB.');
    return false;
  }
  return true;
}

function extraerDetalle(error: unknown): string | undefined {
  const detalle = (error as { response?: { data?: { detail?: unknown } } })
    ?.response?.data?.detail;
  return typeof detalle === 'string' ? detalle : undefined;
}

// ─────────────────────────────────────────────
// Placeholder cuando la máquina no tiene imagen
// ─────────────────────────────────────────────
const SinImagen: React.FC<{ ancho?: number }> = ({ ancho = 40 }) => (
  <div
    style={{
      width: ancho,
      height: ancho,
      borderRadius: 4,
      background: '#f0f0f0',
      color: '#bfbfbf',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <PictureOutlined />
  </div>
);

// ─────────────────────────────────────────────
// Imagen de una máquina.
// Se descarga con el token (una etiqueta <img> normal no puede enviarlo)
// y se muestra mediante una URL temporal del navegador.
// "version" fuerza la recarga cuando se reemplaza la imagen.
// ─────────────────────────────────────────────
interface ImagenMaquinaProps {
  id: number;
  version: number;
  ancho?: number;
}

const ImagenMaquina: React.FC<ImagenMaquinaProps> = ({ id, version, ancho = 40 }) => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    let urlObjeto: string | null = null;

    obtenerImagenMaquinaria(id)
      .then((blob) => {
        if (cancelado) return;
        urlObjeto = URL.createObjectURL(blob);
        setUrl(urlObjeto);
      })
      .catch(() => {
        if (!cancelado) setUrl(null);
      });

    return () => {
      cancelado = true;
      if (urlObjeto) URL.revokeObjectURL(urlObjeto);
    };
  }, [id, version]);

  if (!url) return <SinImagen ancho={ancho} />;

  return (
    <Image
      src={url}
      width={ancho}
      height={ancho}
      style={{ objectFit: 'cover', borderRadius: 4 }}
    />
  );
};

// ─────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────
const MaquinariaPage: React.FC = () => {
  const access = useAccess();
  const puedeGestionar = access.esAdminOSupervisor;

  // ── Estado general ────────────────────────
  const [maquinarias, setMaquinarias] = useState<Maquinaria[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [cargandoTabla, setCargandoTabla] = useState<boolean>(false);
  const [desactivandoId, setDesactivandoId] = useState<number | null>(null);
  /** Se incrementa al subir una imagen para que las miniaturas se recarguen */
  const [versionImagenes, setVersionImagenes] = useState<number>(0);

  // ── Estado del modal de creación ──────────
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [guardando, setGuardando] = useState<boolean>(false);
  const [archivoCrear, setArchivoCrear] = useState<File | null>(null);
  const [form] = Form.useForm<MaquinariaPayload>();

  // ── Estado del modal de edición ───────────
  const [modalEditarVisible, setModalEditarVisible] = useState<boolean>(false);
  const [maquinariaEditar, setMaquinariaEditar] = useState<Maquinaria | null>(null);
  const [editando, setEditando] = useState<boolean>(false);
  const [archivoEditar, setArchivoEditar] = useState<File | null>(null);
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

  const cargarCategorias = useCallback(async (): Promise<void> => {
    try {
      const datos = await listarCategorias();
      setCategorias(datos);
    } catch {
      message.error('No se pudo cargar el catálogo de categorías.');
    }
  }, []);

  useEffect(() => {
    cargarMaquinarias();
    cargarCategorias();
  }, [cargarMaquinarias, cargarCategorias]);

  // ── Cerrar modales (limpian formulario y archivo elegido) ──
  const cerrarModalCrear = (): void => {
    setModalVisible(false);
    setArchivoCrear(null);
    form.resetFields();
  };

  const cerrarModalEditar = (): void => {
    setModalEditarVisible(false);
    setMaquinariaEditar(null);
    setArchivoEditar(null);
  };

  // ── Crear máquina ─────────────────────────
  const handleCrear = async (values: MaquinariaPayload): Promise<void> => {
    setGuardando(true);
    try {
      const creada = await crearMaquinaria(values);

      let imagenOk = true;
      if (archivoCrear) {
        try {
          await subirImagenMaquinaria(creada.id, archivoCrear);
          setVersionImagenes((v) => v + 1);
        } catch (error: unknown) {
          imagenOk = false;
          message.warning(
            `La máquina se creó con el código ${creada.codigo_interno}, pero no se pudo subir la imagen: ` +
              `${extraerDetalle(error) ?? 'inténtalo de nuevo desde Editar.'}`,
          );
        }
      }
      if (imagenOk) {
        message.success(`Máquina creada con el código ${creada.codigo_interno}.`);
      }

      cerrarModalCrear();
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
    setArchivoEditar(null);
    formEditar.setFieldsValue({
      nombre: maquinaria.nombre,
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

      let imagenOk = true;
      if (archivoEditar) {
        try {
          await subirImagenMaquinaria(maquinariaEditar.id, archivoEditar);
          setVersionImagenes((v) => v + 1);
        } catch (error: unknown) {
          imagenOk = false;
          message.warning(
            `Los datos se guardaron, pero no se pudo subir la imagen: ` +
              `${extraerDetalle(error) ?? 'inténtalo de nuevo.'}`,
          );
        }
      }
      if (imagenOk) {
        message.success('Máquina actualizada correctamente.');
      }

      cerrarModalEditar();
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

  // ── Opciones de categoría ─────────────────
  const opcionesCrear = categorias.map((c) => ({ label: c, value: c }));

  // En edición se conserva el tipo actual aunque sea un texto libre antiguo
  // que ya no está en el catálogo.
  const opcionesEditar = (
    maquinariaEditar && !categorias.includes(maquinariaEditar.tipo_equipo)
      ? [maquinariaEditar.tipo_equipo, ...categorias]
      : categorias
  ).map((c) => ({ label: c, value: c }));

  // ── Columnas de la tabla ──────────────────
  const columnas: ColumnsType<Maquinaria> = [
    {
      title: 'Imagen',
      key: 'imagen',
      width: 80,
      render: (_: unknown, record: Maquinaria) =>
        record.imagen_tipo ? (
          <ImagenMaquina id={record.id} version={versionImagenes} />
        ) : (
          <SinImagen />
        ),
    },
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
      title: 'Categoría',
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
        scroll={{ x: 900 }}
      />

      {/* ── Modal de creación ── */}
      <Modal
        title="Nueva máquina"
        open={modalVisible}
        onCancel={cerrarModalCrear}
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
            <Input placeholder="Ej. Generador de la bodega 2" maxLength={120} />
          </Form.Item>

          <Form.Item
            name="tipo_equipo"
            label="Categoría del equipo"
            extra="El código interno se asigna automáticamente al guardar."
            rules={[{ required: true, message: 'Selecciona una categoría.' }]}
          >
            <Select
              placeholder="Seleccionar categoría…"
              options={opcionesCrear}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>

          <Form.Item name="modelo_motor" label="Modelo de motor">
            <Input placeholder="Ej. CAT C4.4 (opcional)" maxLength={80} />
          </Form.Item>

          <Form.Item name="numero_serie" label="Número de serie">
            <Input placeholder="Ej. SN-20240101-001 (opcional)" maxLength={80} />
          </Form.Item>

          <Form.Item name="ubicacion" label="Ubicación">
            <Input placeholder="Ej. Planta Baja – Sector A (opcional)" maxLength={120} />
          </Form.Item>

          <Form.Item label="Imagen (opcional)" extra="JPG, PNG o WebP, máximo 2 MB.">
            <Upload
              accept=".jpg,.jpeg,.png,.webp"
              maxCount={1}
              listType="picture"
              beforeUpload={(archivo) => {
                if (!validarImagen(archivo)) return Upload.LIST_IGNORE;
                setArchivoCrear(archivo);
                return false; // no se sube aquí: se envía al guardar
              }}
              onRemove={() => setArchivoCrear(null)}
            >
              <Button icon={<UploadOutlined />}>Seleccionar imagen</Button>
            </Upload>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={cerrarModalCrear}>Cancelar</Button>
              <Button type="primary" htmlType="submit" loading={guardando}>
                Crear máquina
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Modal de edición ── */}
      <Modal
        title="Editar máquina"
        open={modalEditarVisible}
        onCancel={cerrarModalEditar}
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
          <Form.Item label="Código interno" extra="El código es fijo y no se puede modificar.">
            <Input value={maquinariaEditar?.codigo_interno} disabled />
          </Form.Item>

          <Form.Item
            name="nombre"
            label="Nombre"
            rules={[{ required: true, message: 'El nombre es obligatorio.' }]}
          >
            <Input maxLength={120} />
          </Form.Item>

          <Form.Item
            name="tipo_equipo"
            label="Categoría del equipo"
            rules={[{ required: true, message: 'Selecciona una categoría.' }]}
          >
            <Select options={opcionesEditar} showSearch optionFilterProp="label" />
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

          {maquinariaEditar?.imagen_tipo && (
            <Form.Item label="Imagen actual">
              <ImagenMaquina
                id={maquinariaEditar.id}
                version={versionImagenes}
                ancho={80}
              />
            </Form.Item>
          )}

          <Form.Item
            label={
              maquinariaEditar?.imagen_tipo
                ? 'Reemplazar imagen (opcional)'
                : 'Imagen (opcional)'
            }
            extra="JPG, PNG o WebP, máximo 2 MB."
          >
            <Upload
              accept=".jpg,.jpeg,.png,.webp"
              maxCount={1}
              listType="picture"
              beforeUpload={(archivo) => {
                if (!validarImagen(archivo)) return Upload.LIST_IGNORE;
                setArchivoEditar(archivo);
                return false;
              }}
              onRemove={() => setArchivoEditar(null)}
            >
              <Button icon={<UploadOutlined />}>Seleccionar imagen</Button>
            </Upload>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={cerrarModalEditar}>Cancelar</Button>
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