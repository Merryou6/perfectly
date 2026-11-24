import Taro from "@tarojs/taro";
import { create } from "zustand";
import { request, TOKEN_KEY, USER_KEY } from "@/services/request";
import type { User } from "@/types";

interface AuthState {
  token: string;
  user: User | null;
  loading: boolean;
  setSession: (token: string, user: User) => void;
  clearSession: () => void;
  restoreSession: () => Promise<void>;
}

const storedUser = Taro.getStorageSync<User>(USER_KEY);
const storedToken = Taro.getStorageSync<string>(TOKEN_KEY);

export const useAuthStore = create<AuthState>((set) => ({
  token: storedToken || "",
  user: storedUser || null,
  loading: false,
  setSession: (token, user) => {
    Taro.setStorageSync(TOKEN_KEY, token);
    Taro.setStorageSync(USER_KEY, user);
    set({ token, user });
  },
  clearSession: () => {
    Taro.removeStorageSync(TOKEN_KEY);
    Taro.removeStorageSync(USER_KEY);
    set({ token: "", user: null });
  },
  restoreSession: async () => {
    const token = Taro.getStorageSync<string>(TOKEN_KEY);
    if (!token) {
      set({ token: "", user: null });
      return;
    }
    set({ loading: true });
    try {
      const user = await request<User>({ path: "/auth/me", auth: true });
      set({ token, user, loading: false });
      Taro.setStorageSync(USER_KEY, user);
    } catch {
      Taro.removeStorageSync(TOKEN_KEY);
      Taro.removeStorageSync(USER_KEY);
      set({ token: "", user: null, loading: false });
    }
  },
}));
