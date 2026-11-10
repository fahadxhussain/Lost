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
let expiringSession;
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}
apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (
    token &&
    !/^\/auth\/(login|register|verify-otp|resend-otp|forgot-password|reset-password)$/.test(
      config.url,
    )
  )
    config.headers.Authorization = `Bearer ${token}`;
  return config;
});
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && error.config?.headers?.Authorization)
      try {
        const currentToken = await AsyncStorage.getItem(TOKEN_KEY);
        if (
          currentToken &&
          error.config.headers.Authorization === `Bearer ${currentToken}`
        ) {
          if (!expiringSession)
            expiringSession = Promise.resolve()
              .then(() => onUnauthorized?.())
              .finally(() => {
                expiringSession = null;
              });
          await expiringSession;
        }
      } catch {
        /* Preserve the original API error. */
      }
    return Promise.reject(error);
  },
);
export function errorMessage(error) {
  const status = error?.response?.status;
  const url = error?.config?.url || "";
  const message = error?.response?.data?.message;
  const safeMessage =
    typeof message === "string" &&
    message.trim().length > 0 &&
    message.length <= 350 &&
    !/[<>\n]|prisma|sql|ECONN|TypeError|stack|constraint|\.js:\d/i.test(message)
      ? message
      : null;
  if (error?.userFacing) return error.message;
  if (["ECONNABORTED", "ETIMEDOUT"].includes(error?.code))
    return "The server took too long to respond. Check your connection and try again. If you were publishing or sending, check whether it went through before retrying.";
  if (status === 429) {
    const retry = Number(error.response.headers?.["retry-after"]);
    return Number.isFinite(retry) && retry > 0
      ? `Too many attempts. Please wait ${Math.ceil(retry / 60)} minute${retry > 60 ? "s" : ""} before trying again.`
      : safeMessage ||
          "Too many attempts. Please wait a few minutes before trying again.";
  }
  if (status >= 500)
    return "The campus server is having trouble right now. Please try again later. If you were publishing or sending, check whether it went through before retrying.";
  if (status === 413)
    return "This upload is too large. Choose a photo of 10 MB or less, or continue without a photo.";
  if (status === 401)
    return error?.config?.url === "/auth/login"
      ? "The email or password is incorrect. Check both and try again."
      : "Your session has expired. Please sign in again.";
  if (status === 404)
    return url.startsWith("/auth/")
      ? "We could not find that student account. Check your email or create an account first."
      : url.startsWith("/conversations/")
        ? "This conversation is no longer available. Go back to Messages and refresh."
        : "This item is no longer available. Go back to the feed or My items and refresh.";
  // Keep useful operational errors, but never render stack traces, HTML or DB details.
  if (safeMessage) return safeMessage;
  if (status === 403)
    return "You do not have access to this action. Make sure your campus email is verified and try again.";
  if (status === 409)
    return "This action conflicts with an existing record. Refresh first; if you are registering, try signing in instead.";
  if (status === 400 || status === 422)
    return "Some details could not be accepted. Check your entries and try again.";
  if (error?.request || error?.code === "ERR_NETWORK")
    return "Cannot reach the campus server. Check your internet connection and try again.";
  return "Something went wrong. Please try again.";
}
export function userError(message) {
  const error = new Error(message);
  error.userFacing = true;
  return error;
}
export const authApi = {
  register: (data) => apiClient.post("/auth/register", data),
  verifyOtp: (data) => apiClient.post("/auth/verify-otp", data),
  resendOtp: (data) => apiClient.post("/auth/resend-otp", data),
  login: (data) => apiClient.post("/auth/login", data),
  getMe: () => apiClient.get("/auth/me"),
  updateProfile: (data) =>
    apiClient.patch("/auth/me", data, uploadConfig(data)),
  forgotPassword: (email) => apiClient.post("/auth/forgot-password", { email }),
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
