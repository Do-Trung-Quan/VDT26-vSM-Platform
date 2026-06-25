import { api } from "../api";
import type { Department } from "../types";

export interface PaginatedDeptsData {
  items: Department[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListDeptsParams {
  page?:   number;
  limit?:  number;
  name?:   string;
  status?: "all" | "active" | "deleted";
}

export const departmentsApi = {
  list: (params: ListDeptsParams = {}) => {
    const qs = new URLSearchParams();
    qs.set("page",  String(params.page  ?? 1));
    qs.set("limit", String(params.limit ?? 100));
    if (params.name)   qs.set("name",   params.name);
    if (params.status) qs.set("status", params.status);
    // TransformResponseInterceptor tách items → data, {total,...} → meta
    return api.get<Department[]>(`/admin/departments?${qs}`);
  },

  create: (body: { name: string; address: string; description?: string }) =>
    api.post<Department>("/admin/departments", body),

  update: (id: string, body: { name?: string; address?: string; description?: string }) =>
    api.patch<Department>(`/admin/departments/${id}`, body),

  softDelete: (id: string) =>
    api.delete<null>(`/admin/departments/${id}`),

  restore: (id: string) =>
    api.post<Department>(`/admin/departments/${id}/restore`),
};
