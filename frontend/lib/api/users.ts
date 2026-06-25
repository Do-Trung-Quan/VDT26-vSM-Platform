import { api } from "../api";
import type { User, Role } from "../types";

export interface PaginatedUsersData {
  items: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListUsersParams {
  page?: number;
  limit?: number;
  keyword?: string;
  departmentId?: string;
  isActive?: boolean;
}

export const usersApi = {
  list: (params: ListUsersParams = {}) => {
    const qs = new URLSearchParams();
    qs.set("page",  String(params.page  ?? 1));
    qs.set("limit", String(params.limit ?? 20));
    if (params.keyword)                       qs.set("keyword",      params.keyword);
    if (params.departmentId)                  qs.set("departmentId", params.departmentId);
    if (params.isActive !== undefined)        qs.set("isActive",     String(params.isActive));
    // TransformResponseInterceptor tách items → data, {total,page,...} → meta
    return api.get<User[]>(`/admin/users?${qs}`);
  },

  create: (body: { email: string; fullName: string; employeeId: string; departmentId: string; role: Role }) =>
    api.post<User>("/admin/users", body),

  update: (id: string, body: { role?: Role; departmentId?: string }) =>
    api.patch<User>(`/admin/users/${id}`, body),

  setStatus: (id: string, isActive: boolean) =>
    api.patch<null>(`/admin/users/${id}/status`, { isActive }),

  getProfile: () => api.get<User>("/users/me"),

  changePassword: (oldPassword: string, newPassword: string) =>
    api.patch<null>("/users/me/password", { oldPassword, newPassword }),

  updateAvatar: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.upload<{ avatarUrl: string }>("/users/me/avatar", form);
  },
};
