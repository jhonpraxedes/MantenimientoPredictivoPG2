/**
 * src/pages/Login/index.tsx
 *
 * Página de inicio de sesión del Sistema de Mantenimiento Predictivo.
 * - Formulario Ant Design con validación de email y contraseña.
 * - Llama a loginRequest(), guarda el token en memoria y redirige a /dashboard.
 * - Muestra mensaje de error si las credenciales son incorrectas.
 * - Sin layout global (se configura con layout: false en config/routes.ts).
 */

import React, { useState } from 'react';
import { history, useModel } from '@umijs/max';
import { Button, Form, Input, message, Typography } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { loginRequest, setToken, getCurrentUser } from '@/services/auth';
import type { InitialState } from '@/app';

const { Title, Text } = Typography;

// ─────────────────────────────────────────────
// Tipos del formulario
// ─────────────────────────────────────────────
interface LoginFormValues {
  email: string;
  password: string;
}

// ─────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────
const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const { setInitialState } = useModel('@@initialState');
  const [form] = Form.useForm<LoginFormValues>();

  const handleSubmit = async (values: LoginFormValues): Promise<void> => {
    setLoading(true);

    try {
      // 1. Solicitar token al backend
      const loginResponse = await loginRequest(values.email, values.password);

      // 2. Guardar el token en memoria (NO localStorage)
      setToken(loginResponse.access_token);

      // 3. Obtener datos del usuario con el token recién guardado
      const currentUser = await getCurrentUser();

      // 4. Actualizar el estado global de Umi Max (initialState)
      await setInitialState((prevState: InitialState | undefined) => ({
        ...prevState,
        currentUser,
      }));

      message.success(`Bienvenido, ${currentUser.nombre}.`);

      // 5. Redirigir al dashboard
      history.push('/dashboard');
    } catch (error: unknown) {
      // Distinguimos el error 401 (credenciales incorrectas) de otros errores
      const status = (error as { response?: { status?: number } })?.response?.status;

      if (status === 401 || status === 400) {
        message.error('Correo electrónico o contraseña incorrectos.');
      } else {
        message.error('No se pudo conectar con el servidor. Intenta más tarde.');
      }

      // Limpiamos el campo de contraseña para reintentar
      form.setFieldValue('password', '');
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return (
    <div style={styles.pageWrapper}>
      <div style={styles.card}>
        {/* Encabezado */}
        <div style={styles.header}>
          <Title level={3} style={styles.title}>
            Sistema de Mantenimiento Predictivo
          </Title>
          <Text type="secondary" style={styles.subtitle}>
            Gestión de mantenimiento con IA
          </Text>
        </div>

        {/* Formulario */}
        <Form<LoginFormValues>
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
          style={styles.form}
        >
          {/* Campo Email */}
          <Form.Item
            name="email"
            label="Correo electrónico"
            rules={[
              { required: true, message: 'Ingresa tu correo electrónico.' },
              { type: 'email', message: 'Ingresa un correo electrónico válido.' },
            ]}
          >
            <Input
              prefix={<MailOutlined style={styles.inputIcon} />}
              placeholder="usuario@empresa.com"
              size="large"
              autoComplete="username"
            />
          </Form.Item>

          {/* Campo Contraseña */}
          <Form.Item
            name="password"
            label="Contraseña"
            rules={[
              { required: true, message: 'Ingresa tu contraseña.' },
              { min: 1, message: 'La contraseña no puede estar vacía.' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={styles.inputIcon} />}
              placeholder="••••••••"
              size="large"
              autoComplete="current-password"
            />
          </Form.Item>

          {/* Botón de envío */}
          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
              style={styles.submitButton}
            >
              Iniciar sesión
            </Button>
          </Form.Item>
        </Form>

        {/* Pie de la tarjeta */}
        <Text type="secondary" style={styles.footer}>
          © {new Date().getFullYear()} Sistema de Mantenimiento Predictivo
        </Text>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Estilos en línea (evita añadir CSS externo)
// ─────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  pageWrapper: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #001529 0%, #003a8c 100%)',
    padding: '24px',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: '40px 36px 32px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
  },
  header: {
    textAlign: 'center',
    marginBottom: 32,
  },
  title: {
    marginBottom: 6,
    color: '#001529',
    fontWeight: 700,
    fontSize: 20,
    lineHeight: '1.3',
  },
  subtitle: {
    fontSize: 14,
    color: '#8c8c8c',
  },
  form: {
    marginBottom: 8,
  },
  inputIcon: {
    color: '#bfbfbf',
  },
  submitButton: {
    marginTop: 8,
    height: 44,
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 15,
  },
  footer: {
    display: 'block',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 12,
    color: '#bfbfbf',
  },
};

export default LoginPage;
