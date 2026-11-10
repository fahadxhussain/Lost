import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { io } from "socket.io-client";

export const TOKEN_KEY = "@auth_token";
export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL ||
  `http://${Platform.OS === "android" ? "10.0.2.2" : "localhost"}:5000/api/v1`
).replace(/\/$/, "");
export const SOCKET_URL = API_BASE_URL.replace(/\/api\/v1$/, "");
export function createChatSocket(token) {
  return io(SOCKET_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
  });
}
const apiClient = axios.create({ baseURL: API_BASE_URL, timeout: 15000 });
let onUnauthorized;
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}
apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && error.config?.headers?.Authorization)
      await onUnauthorized?.();
    return Promise.reject(error);
  },
);
export function errorMessage(error) {
  return (
    error.response?.data?.message ||
    (error.request
      ? "Cannot reach the campus server. Check your connection and try again."
      : error.message || "Something went wrong. Please try again.")
  );
}
export const authApi = {
  register: (data) => apiClient.post("/auth/register", data),
  verifyOtp: (data) => apiClient.post("/auth/verify-otp", data),
  resendOtp: (data) => apiClient.post("/auth/resend-otp", data),
  login: (data) => apiClient.post("/auth/login", data),
  getMe: () => apiClient.get("/auth/me"),
};
export const categoriesApi = { getAll: () => apiClient.get("/categories") };
function uploadConfig(data) {
  // Browsers supply the boundary; React Native's XHR adapter needs this header.
  return typeof FormData !== "undefined" &&
    data instanceof FormData &&
    Platform.OS !== "web"
    ? { headers: { "Content-Type": "multipart/form-data" } }
    : {};
}
export const reportsApi = {
  create: (data) => apiClient.post("/reports", data, uploadConfig(data)),
  getAll: (params) => apiClient.get("/reports", { params }),
  getById: (id) => apiClient.get(`/reports/${id}`),
  getMyReports: (params) => apiClient.get("/reports/me", { params }),
  update: (id, data) =>
    apiClient.patch(`/reports/${id}`, data, uploadConfig(data)),
  updateStatus: (id, status) =>
    apiClient.patch(`/reports/${id}/status`, { status }),
  getMatches: (id) => apiClient.get(`/reports/${id}/matches`),
};
export const searchApi = {
  search: (params) => apiClient.get("/reports/search", { params }),
};
export const notificationsApi = {
  getAll: (params) => apiClient.get("/notifications", { params }),
  getUnreadCount: () => apiClient.get("/notifications/unread-count"),
  markRead: (id) => apiClient.patch(`/notifications/${id}/read`),
  markAllRead: () => apiClient.patch("/notifications/read-all"),
};
export const chatApi = {
  getConversations: () => apiClient.get("/conversations"),
  createConversation: (data) => apiClient.post("/conversations", data),
  getMessages: (id) =>
    apiClient.get(`/conversations/${id}/messages`, { params: { limit: 100 } }),
  sendMessage: (id, content) =>
    apiClient.post(`/conversations/${id}/messages`, { content }),
};
export default apiClient;
