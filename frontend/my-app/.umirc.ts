import { defineConfig } from '@umijs/max';
export default defineConfig({
  antd: {
  theme: {
  
    token: {
      colorPrimary: '#2563EB',
      colorInfo: '#2563EB',
      colorBgLayout: '#F3F4F6',
      colorBgContainer: '#FFFFFF',
      colorBgElevated: '#FFFFFF',
      colorText: '#1F2933',
      colorTextSecondary: '#64748B',
      colorBorderSecondary: '#E2E8F0',
      borderRadius: 8,
    },
  },
}, 
  access: {},
  model: {},
  initialState: {},
  request: {},
  layout: {
    title: 'Sistema de Mantenimiento Predictivo',
  },
  routes: [
    {
      path: '/',
      redirect: '/dashboard',
    },
    {
      path: '/login',
      component: './Login',
      layout: false,
    },
    {
      name: 'Dashboard',
      path: '/dashboard',
      component: './Dashboard',
      access: 'estaAutenticado',
      icon: 'DashboardOutlined',
    },
    {
      name: 'Maquinaria',
      path: '/maquinaria',
      component: './Maquinaria',
      access: 'estaAutenticado',
      icon: 'ToolOutlined',
    },
    {
      name: 'Lecturas',
      path: '/lecturas',
      component: './Lecturas',
      access: 'estaAutenticado',
      icon: 'LineChartOutlined',
    },
  ],
  npmClient: 'pnpm',
});