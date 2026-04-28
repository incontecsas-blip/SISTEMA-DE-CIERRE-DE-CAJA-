import axios from 'axios';

const api = axios.create({ baseURL: '/api', timeout: 15000 });

export default api;

export const authAPI = {
  login: (pin: string) => api.post('/auth/login', { pin }),
  logout: () => api.post('/auth/logout'),
};

export const ventasAPI = {
  getAll: (params?: Record<string, string>) => api.get('/ventas', { params }),
  create: (data: unknown) => api.post('/ventas', data),
  delete: (id: number) => api.delete(`/ventas/${id}`),
};

export const gastosAPI = {
  getAll: (params?: Record<string, string>) => api.get('/gastos', { params }),
  create: (data: unknown) => api.post('/gastos', data),
  delete: (id: number) => api.delete(`/gastos/${id}`),
};

export const cierresAPI = {
  getAll: (params?: Record<string, string>) => api.get('/cierres', { params }),
  create: (data: unknown) => api.post('/cierres', data),
  delete: (id: number) => api.delete(`/cierres/${id}`),
};

export const depositosAPI = {
  getAll: (params?: Record<string, string>) => api.get('/depositos', { params }),
  create: (data: unknown) => api.post('/depositos', data),
  delete: (id: number) => api.delete(`/depositos/${id}`),
};

export const usuariosAPI = {
  getAll: () => api.get('/usuarios'),
  create: (data: unknown) => api.post('/usuarios', data),
  update: (id: number, data: unknown) => api.put(`/usuarios/${id}`, data),
  delete: (id: number) => api.delete(`/usuarios/${id}`),
};

export const configAPI = {
  get: () => api.get('/config'),
  save: (data: unknown) => api.put('/config', data),
};

export const auditoriaAPI = {
  getAll: () => api.get('/auditoria'),
  clear: () => api.delete('/auditoria'),
};
