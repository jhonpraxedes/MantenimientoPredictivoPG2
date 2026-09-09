import React from 'react';
import { useModel } from '@umijs/max';
import { Card, Typography, Tag, Space } from 'antd';
import { UserOutlined } from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

const DashboardPage: React.FC = () => {
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser;

  const roleColors: Record<string, string> = {
    administrador: 'red',
    supervisor: 'orange',
    tecnico: 'blue',
  };

  const currentRole = currentUser?.rol ?? 'Sin rol asignado';
  const tagColor = roleColors[currentRole] ?? 'default';

  return (
    <div style={{ padding: 24 }}>
      <Card bordered={false} style={{ maxWidth: 800 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Title level={3} style={{ marginBottom: 0 }}>
            <UserOutlined style={{ marginRight: 8 }} />
            Bienvenido, {currentUser?.nombre ?? 'Usuario'}
          </Title>

          <div>
            <Text type="secondary" style={{ marginRight: 8 }}>
              Rol en el sistema:
            </Text>
            <Tag color={tagColor}>
              {currentRole.toUpperCase()}
            </Tag>
          </div>

          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            Esta es una vista provisional para la Fase 1. El tablero analítico principal de monitoreo y alertas de mantenimiento predictivo se implementará en el Sprint 3.
          </Paragraph>
        </Space>
      </Card>
    </div>
  );
};

export default DashboardPage;
