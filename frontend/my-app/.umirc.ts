import { defineConfig } from '@umijs/max';
export default defineConfig({
  antd: {
  theme: {
  
    token: {
      colorPrimary: '#8cb62286',
      colorInfo: '#c3eb2591',
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
    {
    name: 'Usuarios',
    path: '/usuarios',
    component: './Usuarios',
    access: 'esAdministrador',
    icon: 'TeamOutlined',
  },
  {
    name: 'Reportes',
    path: '/reportes',
    component: './Reportes',
    access: 'esAdminOSupervisor',
    icon: 'FilePdfOutlined',
  },
  ],
  npmClient: 'pnpm', locale: false,
});