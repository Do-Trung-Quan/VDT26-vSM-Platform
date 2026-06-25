import { api } from "../api";
import type { Role } from "../types";

export interface LoginResponseData {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    fullName: string;
    role: Role;
    departmentId: string;
  };
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResponseData>("/auth/login", { email, password }),

  refresh: (refreshToken: string) =>
    api.post<LoginResponseData>("/auth/refresh", { refreshToken }),

  logout: (refreshToken: string) =>
    api.post<null>("/auth/logout", { refreshToken }),

  forgotPassword: (email: string) =>
    api.post<null>("/auth/forgot-password", { email }),

  resetPassword: (email: string, otpCode: string, newPassword: string) =>
    api.post<null>("/auth/reset-password", { email, otpCode, newPassword }),
};
