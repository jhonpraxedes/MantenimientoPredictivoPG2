import { defineConfig } from '@umijs/max';

export default defineConfig({
  antd: {},
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