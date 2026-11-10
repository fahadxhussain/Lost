import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Attach Authorization Token to outgoing requests
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('@auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const authApi = {
  register: (data) => apiClient.post('/auth/register', data),
  verifyOtp: (data) => apiClient.post('/auth/verify-otp', data),
  login: (data) => apiClient.post('/auth/login', data),
  getMe: () => apiClient.get('/auth/me'),
};

export const categoriesApi = {
  getAll: () => apiClient.get('/categories'),
};

export const reportsApi = {
  create: (formData) =>
    apiClient.post('/reports', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getAll: (params) => apiClient.get('/reports', { params }),
  getById: (id) => apiClient.get(`/reports/${id}`),
  getMyReports: () => apiClient.get('/reports/me'),
  updateStatus: (id, status) => apiClient.patch(`/reports/${id}/status`, { status }),
  getMatches: (reportId) => apiClient.get(`/reports/${reportId}/matches`),
};

export const searchApi = {
  search: (params) => apiClient.get('/reports/search', { params }),
};

export const chatApi = {
  getConversations: () => apiClient.get('/conversations'),
  getMessages: (conversationId) => apiClient.get(`/conversations/${conversationId}/messages`),
  sendMessage: (conversationId, content) =>
    apiClient.post(`/conversations/${conversationId}/messages`, { content }),
};

export default apiClient;
