import axios from "axios";
import { useAuthStore } from "@/store/auth";

const api = axios.create({ baseURL: "" });

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config as typeof error.config & { _retry?: boolean };
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        try {
          const { data } = await axios.post("/api/v1/auth/token/refresh/", {
            refresh: refreshToken,
          });
          useAuthStore.getState().setAccessToken(data.access);
          original.headers.Authorization = `Bearer ${data.access}`;
          return api(original);
        } catch {
          useAuthStore.getState().logout();
          window.location.href = "/login";
        }
      } else {
        useAuthStore.getState().logout();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
