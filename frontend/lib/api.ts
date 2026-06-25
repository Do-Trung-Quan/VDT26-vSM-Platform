/** Base fetch wrapper — tự gắn JWT và handle envelope { statusCode, message, data, meta } */

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<{ data: T; meta: Record<string, unknown> | null }> {
  const token = getToken();

  // Content-Type chỉ set cho non-FormData (FormData cần browser tự set boundary)
  const isFormData = options.body instanceof FormData;
  const headers: HeadersInit = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers ?? {}),
  };

  const res = await fetch(`/api${path}`, { ...options, headers });

  // Handle non-JSON (e.g. 204 No Content)
  const text = await res.text();
  const body = text ? JSON.parse(text) : {};

  if (!res.ok) {
    if (res.status === 401) {
      // Chỉ redirect khi không ở trang login/reset-password
      // (tránh reload trang khi đăng nhập sai mật khẩu)
      const isPublicPath =
        typeof window !== "undefined" &&
        (window.location.pathname === "/login" ||
          window.location.pathname.startsWith("/reset-password"));

      // Không redirect khi đổi mật khẩu — 401 = sai mật khẩu hiện tại (expected error)
      const isPasswordChangePath = path === "/users/me/password";

      if (!isPublicPath && !isPasswordChangePath) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("auth_user");
        document.cookie = "access_token=; max-age=0; path=/";
        window.location.replace("/login");
      }
    }
    const msg = Array.isArray(body.message)
      ? body.message.join(", ")
      : (body.message as string) ?? "Lỗi không xác định";
    throw new ApiError(res.status, msg);
  }

  return { data: body.data as T, meta: body.meta ?? null };
}

export const api = {
  get:    <T>(path: string)                  => apiFetch<T>(path),
  post:   <T>(path: string, body?: unknown)  => apiFetch<T>(path, { method: "POST",   body: JSON.stringify(body) }),
  patch:  <T>(path: string, body?: unknown)  => apiFetch<T>(path, { method: "PATCH",  body: JSON.stringify(body) }),
  delete: <T>(path: string)                  => apiFetch<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, form: FormData)  => apiFetch<T>(path, { method: "PATCH",  body: form }),
};
