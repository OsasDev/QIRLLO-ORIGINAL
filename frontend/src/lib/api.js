import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL}/api`;

// Create axios instance
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('qirllo_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('qirllo_token');
      localStorage.removeItem('qirllo_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
};

// Users API
export const usersApi = {
  getAll: (role) => api.get('/users', { params: { role } }),
  getTeachers: () => api.get('/teachers'),
  getParents: () => api.get('/parents'),
};

// Students API
export const studentsApi = {
  getAll: (params) => api.get('/students', { params }),
  getById: (id) => api.get(`/students/${id}`),
  create: (data) => api.post('/students', data),
  update: (id, data) => api.put(`/students/${id}`, data),
  delete: (id) => api.delete(`/students/${id}`),
};

// Classes API
export const classesApi = {
  getAll: (params) => api.get('/classes', { params }),
  getById: (id) => api.get(`/classes/${id}`),
  create: (data) => api.post('/classes', data),
  update: (id, data) => api.put(`/classes/${id}`, data),
  delete: (id) => api.delete(`/classes/${id}`),
};

// Subjects API
export const subjectsApi = {
  getAll: (params) => api.get('/subjects', { params }),
  create: (data) => api.post('/subjects', data),
  update: (id, data) => api.put(`/subjects/${id}`, data),
  delete: (id) => api.delete(`/subjects/${id}`),
};

// Grades API
export const gradesApi = {
  getAll: (params) => api.get('/grades', { params }),
  create: (data) => api.post('/grades', data),
  createBulk: (data) => api.post('/grades/bulk', data),
  submit: (id) => api.put(`/grades/${id}/submit`),
  submitBulk: (subjectId, term) => api.put('/grades/submit-bulk', null, { params: { subject_id: subjectId, term } }),
  approve: (id) => api.put(`/grades/${id}/approve`),
  approveBulk: (params) => api.put('/grades/approve-bulk', null, { params }),
};

// Messages API
export const messagesApi = {
  getAll: (folder) => api.get('/messages', { params: { folder } }),
  getById: (id) => api.get(`/messages/${id}`),
  send: (data) => api.post('/messages', data),
  getUnreadCount: () => api.get('/messages/unread/count'),
};

// Announcements API
export const announcementsApi = {
  getAll: () => api.get('/announcements'),
  create: (data) => api.post('/announcements', data),
  delete: (id) => api.delete(`/announcements/${id}`),
};

// Dashboard API
export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
};

// Seed API
export const seedApi = {
  seed: () => api.post('/seed'),
};

export default api;
