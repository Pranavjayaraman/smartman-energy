import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api` 
  : '/api';

const API = axios.create({
  baseURL: API_BASE,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const loginUser = async (username, password) => {
  const res = await API.post('/auth/login', { username, password });
  return res.data;
};

export const getMe = async () => {
  const res = await API.get('/auth/me');
  return res.data;
};

export const getUsers = async () => {
  const res = await API.get('/auth/users');
  return res.data;
};

export const updateUser = async (id, data) => {
  const res = await API.put(`/auth/users/${id}`, data);
  return res.data;
};

export const getMeters = async (params) => {
  const res = await API.get('/meters', { params });
  return res.data;
};

export const createMeter = async (meterData) => {
  const res = await API.post('/meters', meterData);
  return res.data;
};

export const updateMeter = async (code, meterData) => {
  const res = await API.put(`/meters/${code}`, meterData);
  return res.data;
};

export const getReadings = async (date, area) => {
  const res = await API.get('/readings', { params: { date, area } });
  return res.data;
};

export const saveReadings = async (payload) => {
  const res = await API.post('/readings', payload);
  return res.data;
};

export const getDashboardData = async (params) => {
  const res = await API.get('/dashboard', { params });
  return res.data;
};

export const getAuditLogs = async (limit = 100) => {
  const res = await API.get('/audit', { params: { limit } });
  return res.data;
};

export const getDatabaseStatus = async () => {
  const res = await API.get('/backup/status');
  return res.data;
};

export const getBackupsList = async () => {
  const res = await API.get('/backup/list');
  return res.data;
};

export const createManualBackup = async (reason = 'MANUAL_DASHBOARD') => {
  const res = await API.post('/backup/create', { reason });
  return res.data;
};

export const downloadBackupBlob = async (filename) => {
  const res = await API.get(`/backup/download/${filename}`, {
    responseType: 'blob'
  });
  return res.data;
};

export const restoreBackup = async (filename) => {
  const res = await API.post(`/backup/restore/${filename}`);
  return res.data;
};

export const downloadExcelBlob = async (params = {}) => {
  const res = await API.get('/export/excel', {
    params,
    responseType: 'blob'
  });
  return res.data;
};

export const exportExcelURL = (startDate, endDate, year) => {
  const token = localStorage.getItem('token');
  const query = new URLSearchParams();
  if (startDate) query.append('startDate', startDate);
  if (endDate) query.append('endDate', endDate);
  if (year) query.append('year', year);
  if (token) query.append('token', token);
  return `${API_BASE}/export/excel?${query.toString()}`;
};

export default API;
