/**
 * src/pages/Perfil/index.tsx
 *
 * "Mi cuenta": permite al usuario autenticado cambiar su contraseña.
 */

import React, { useState } from 'react';
import { Button, Card, Form, Input, message, Space, Typography } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { cambiarMiPassword } from '@/services/usuarios';

const { Title } = Typography;

interface FormPassword {
  password_actual: string;
  password_nueva: string;
  confirmar: string;
}

const PerfilPage: React.FC = () => {
  const [form] = Form.useForm<FormPassword>();
  const [guardando, setGuardando] = useState<boolean>(false);

  const handleGuardar = async (values: FormPassword): Promise<void> => {
    setGuardando(true);
    try {
      await cambiarMiPassword({
        password_actual: values.password_actual,
        password_nueva: values.password_nueva,
      });
      message.success('Contraseña actualizada correctamente.');
      form.resetFields();
    } catch (error: unknown) {
      const detail = (error as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail;
      message.error(detail ?? 'No se pudo cambiar la contraseña. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Space align="center" style={{ marginBottom: 20 }}>
        <LockOutlined style={{ fontSize: 22 }} />
        <Title level={4} style={{ margin: 0 }}>
          Cambiar contraseña
        </Title>
      </Space>

      <Card style={{ maxWidth: 480, borderRadius: 8 }}>
        <Form<FormPassword>
          form={form}
          layout="vertical"
          onFinish={handleGuardar}
        >
          <Form.Item
            name="password_actual"
            label="Contraseña actual"
            rules={[{ required: true, message: 'Ingresa tu contraseña actual.' }]}
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>

          <Form.Item
            name="password_nueva"
            label="Nueva contraseña"
            rules={[
              { required: true, message: 'Ingresa la nueva contraseña.' },
              { min: 8, message: 'La contraseña debe tener al menos 8 caracteres.' },
            ]}
          >
            <Input.Password
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
            />
          </Form.Item>

          <Form.Item
            name="confirmar"
            label="Confirmar nueva contraseña"
            dependencies={['password_nueva']}
            rules={[
              { required: true, message: 'Confirma la nueva contraseña.' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password_nueva') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Las contraseñas no coinciden.'));
                },
              }),
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" loading={guardando}>
              Guardar contraseña
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default PerfilPage;