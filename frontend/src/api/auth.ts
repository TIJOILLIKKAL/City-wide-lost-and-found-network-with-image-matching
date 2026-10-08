import { apiClient } from "./client";
import type { AuthResponse, LoginRequest, RegisterRequest, User } from "@/types";

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<AuthResponse>("/auth/login/", data).then((r) => r.data),

  register: (data: RegisterRequest) =>
    apiClient.post<AuthResponse>("/auth/register/", data).then((r) => r.data),

  logout: (refresh: string) =>
    apiClient.post("/auth/logout/", { refresh }),

  me: () =>
    apiClient.get<User>("/auth/me/").then((r) => r.data),

  refreshToken: (refresh: string) =>
    apiClient.post<{ access: string; refresh: string }>("/auth/token/refresh/", { refresh }).then((r) => r.data),
};
