import api from "./client";
import type { AuthUser } from "@/types";

export const authApi = {
  login: (email: string, password: string) =>
    api
      .post<{ access: string; refresh: string; user: AuthUser }>("/api/v1/auth/login/", {
        email,
        password,
      })
      .then((r) => r.data),

  logout: (refresh: string) =>
    api.post("/api/v1/auth/logout/", { refresh }),
};
