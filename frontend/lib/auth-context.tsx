"use client";
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { authApi } from "./api/auth";
import { usersApi } from "./api/users";
import type { Role, User } from "./types";

/** Minimal session — lưu vào localStorage, dùng để restore token khi reload */
export interface AuthUser {
  id: string;
  fullName: string;
  role: Role;
  departmentId: string;
}

interface AuthContextType {
  user: AuthUser | null;       // session data (từ localStorage)
  profile: User | null;        // full User kèm avatarUrl (từ getProfile, memory only)
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>; // re-fetch profile sau khi update avatar/info
}

const AuthContext = createContext<AuthContextType | null>(null);

function setTokenCookie(token: string) {
  document.cookie = `access_token=${token}; path=/; max-age=${7 * 24 * 3600}; SameSite=Lax`;
}
function clearTokenCookie() {
  document.cookie = "access_token=; path=/; max-age=0";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,      setUser]      = useState<AuthUser | null>(null);
  const [profile,   setProfile]   = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /** Lấy User đầy đủ (kèm signed avatarUrl) từ /users/me — không lưu vào localStorage */
  const fetchProfile = useCallback(async () => {
    try {
      const { data } = await usersApi.getProfile();
      setProfile(data);
    } catch {
      setProfile(null);
    }
  }, []);

  /** Re-fetch profile sau khi update avatar/thông tin — dùng bởi các page con */
  const refreshUser = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  // Restore session từ localStorage khi app khởi động
  useEffect(() => {
    const token   = localStorage.getItem("access_token");
    const userStr = localStorage.getItem("auth_user");
    if (token && userStr) {
      try {
        setUser(JSON.parse(userStr) as AuthUser);
        // Lấy ngay profile đầy đủ (signed avatarUrl luôn fresh)
        fetchProfile().finally(() => setIsLoading(false));
      } catch {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, [fetchProfile]);

  const login = async (email: string, password: string) => {
    const { data } = await authApi.login(email, password);
    localStorage.setItem("access_token",  data.accessToken);
    localStorage.setItem("refresh_token", data.refreshToken);
    localStorage.setItem("auth_user",     JSON.stringify(data.user));
    setTokenCookie(data.accessToken);
    setUser(data.user);
    // Lấy profile đầy đủ ngay sau khi login
    await fetchProfile();
  };

  const logout = async () => {
    const rt = localStorage.getItem("refresh_token");
    if (rt) { try { await authApi.logout(rt); } catch {} }
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("auth_user");
    clearTokenCookie();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
