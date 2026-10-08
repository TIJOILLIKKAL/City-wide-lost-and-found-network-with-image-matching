import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, UserRole } from "@/types";
import { authApi } from "@/api/auth";
import { tokenStorage } from "@/api/client";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string, phone?: string, role?: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const { user, access, refresh } = await authApi.login({ email, password });
        tokenStorage.set(access, refresh);
        set({ user, isAuthenticated: true });
      },

      register: async (email, password, fullName, phone, role = "owner") => {
        const { user, access, refresh } = await authApi.register({
          email,
          password,
          password2: password,
          full_name: fullName,
          phone,
          role,
        });
        tokenStorage.set(access, refresh);
        set({ user, isAuthenticated: true });
      },

      logout: async () => {
        const refresh = tokenStorage.getRefresh();
        if (refresh) {
          try {
            await authApi.logout(refresh);
          } catch {
            // Swallow — server-side blacklist failure doesn't block client logout
          }
        }
        tokenStorage.clear();
        set({ user: null, isAuthenticated: false });
      },

      loadUser: async () => {
        try {
          const user = await authApi.me();
          set({ user, isAuthenticated: true });
        } catch {
          tokenStorage.clear();
          set({ user: null, isAuthenticated: false });
        }
      },
    }),
    {
      name: "auth",
      // Only persist user data, not the token (tokens live in localStorage separately)
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);

// Convenience selectors
export const useUser = () => useAuthStore((s) => s.user);
export const useIsAuthenticated = () => useAuthStore((s) => s.isAuthenticated);
export const useIsAdmin = () => useAuthStore((s) => s.user?.role === "admin");
export const useIsVenueStaff = () =>
  useAuthStore((s) => s.user?.role === "venue_staff" || s.user?.role === "admin");
