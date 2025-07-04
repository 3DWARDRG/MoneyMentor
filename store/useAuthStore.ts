// stores/useAuthStore.ts
import { create } from 'zustand';

type AuthState = {
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  isAuthenticated: false,
  login: (token) =>
    set({
      token,
      isAuthenticated: true,
    }),
  logout: () =>
    set({
      token: null,
      isAuthenticated: false,
    }),
}));
