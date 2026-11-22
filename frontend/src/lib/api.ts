export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

/** Fired when a request that needs a session gets a 401, so the UI can send the user to log in. */
export const UNAUTHORIZED_EVENT = "azeel:unauthorized";

function failure(status: number, body: unknown): ApiError {
  let detail = "Something went wrong. Please try again.";
  if (body && typeof body === "object" && "detail" in body) {
    const d = (body as { detail: unknown }).detail;
    if (typeof d === "string") detail = d;
    else if (Array.isArray(d) && d[0]?.msg) detail = String(d[0].msg);
  }
  if (status === 429) detail = detail.startsWith("Too many") ? detail : "Too many requests. Please wait a moment.";
  return new ApiError(detail, status);
}

// The session lives in an httpOnly cookie set by the API, so scripts (and any injected script) never see a token.
async function request<T>(path: string, options: RequestInit = {}, opts: { silent401?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };
  if (options.body && !(options.body instanceof FormData)) headers["Content-Type"] = "application/json";
  let res: Response;
  try { res = await fetch(`${API_URL}${path}`, { ...options, headers, credentials: "include" }); }
  catch { throw new ApiError("Cannot reach the server. Check your connection and try again.", 0); }
  if (!res.ok) {
    let body: unknown = null;
    try { body = await res.json(); } catch {}
    if (res.status === 401 && !opts.silent401 && typeof window !== "undefined") window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    throw failure(res.status, body);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface User { id: string; name: string; email: string; profile_picture: string | null; theme: "light" | "dark"; email_verified: boolean; created_at: string }
export interface FileRecord { id: string; original_filename: string; file_type: string; row_count: number; column_count: number; size_bytes: number; uploaded_at: string }
export interface ColumnInfo { name: string; dtype: string; missing_count: number; missing_pct: number; unique_count: number }
export interface DataPreview { file: FileRecord; columns: ColumnInfo[]; duplicate_rows: number; total_rows: number; total_columns: number; preview_rows: Record<string, unknown>[]; page: number; page_size: number; total_pages: number }
export interface SummaryStat { column: string; mean: number | null; median: number | null; minimum: number | null; maximum: number | null; std_dev: number | null; nulls: number; unique: number; dtype: string }
export interface AnalyticsResponse { file: FileRecord; numeric_stats: SummaryStat[]; categorical_stats: SummaryStat[]; duplicate_rows: number; total_missing_cells: number }
export interface ChartDataset { chart_type: "bar" | "pie" | "histogram" | "line" | "area"; title: string; labels: string[]; values: number[]; column: string }

export const api = {
  auth: {
    signup: (name: string, email: string, password: string) => request<User>("/api/auth/signup", { method: "POST", body: JSON.stringify({ name, email, password }) }, { silent401: true }),
    login: (email: string, password: string, remember: boolean) => request<User>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password, remember }) }, { silent401: true }),
    logout: () => request<void>("/api/auth/logout", { method: "POST" }, { silent401: true }),
    me: () => request<User>("/api/auth/me", {}, { silent401: true }),
    updateProfile: (p: { name?: string; theme?: "light" | "dark"; profile_picture?: string }) => request<User>("/api/auth/me", { method: "PUT", body: JSON.stringify(p) }),
    changePassword: (current_password: string, new_password: string) => request<void>("/api/auth/change-password", { method: "POST", body: JSON.stringify({ current_password, new_password }) }),
    forgotPassword: (email: string) => request<{ message: string }>("/api/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }, { silent401: true }),
    resetPassword: (token: string, new_password: string) => request<void>("/api/auth/reset-password", { method: "POST", body: JSON.stringify({ token, new_password }) }, { silent401: true }),
    verifyEmail: (token: string) => request<void>("/api/auth/verify-email", { method: "POST", body: JSON.stringify({ token }) }, { silent401: true }),
    resendVerification: () => request<void>("/api/auth/resend-verification", { method: "POST" }),
    deleteAccount: (password: string) => request<void>("/api/auth/delete-account", { method: "POST", body: JSON.stringify({ password }) }),
  },
  files: {
    upload: (file: File, onProgress?: (pct: number) => void) =>
      new Promise<FileRecord>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const fd = new FormData(); fd.append("file", file);
        xhr.open("POST", `${API_URL}/api/files/upload`);
        xhr.withCredentials = true;
        xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100)); };
        xhr.onload = () => {
          let body: unknown = null;
          try { body = JSON.parse(xhr.responseText); } catch {}
          if (xhr.status >= 200 && xhr.status < 300) return resolve(body as FileRecord);
          if (xhr.status === 401) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
          reject(failure(xhr.status, body));
        };
        xhr.onerror = () => reject(new ApiError("Cannot reach the server during upload.", 0));
        xhr.send(fd);
      }),
    list: () => request<FileRecord[]>("/api/files"),
    delete: (id: string) => request<void>(`/api/files/${id}`, { method: "DELETE" }),
  },
  analytics: {
    preview: (id: string, page = 1, size = 20, search = "", sortBy = "", sortDir: "asc" | "desc" = "asc") => {
      const q = new URLSearchParams({ page: String(page), page_size: String(size), sort_dir: sortDir });
      if (search) q.set("search", search);
      if (sortBy) q.set("sort_by", sortBy);
      return request<DataPreview>(`/api/analytics/${id}/preview?${q}`);
    },
    summary: (id: string) => request<AnalyticsResponse>(`/api/analytics/${id}/summary`),
    charts: (id: string) => request<ChartDataset[]>(`/api/analytics/${id}/charts`),
  },
  reports: {
    download: async (id: string, format: "csv" | "excel" | "pdf", name: string) => {
      let res: Response;
      try { res = await fetch(`${API_URL}/api/reports/${id}/${format}`, { credentials: "include" }); }
      catch { throw new ApiError("Cannot reach the server.", 0); }
      if (!res.ok) { let b: unknown = null; try { b = await res.json(); } catch {} throw failure(res.status, b); }
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a"); a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    },
  },
  public: {
    contact: (p: { name: string; email: string; message: string; website: string }) => request<{ message: string }>("/api/public/contact", { method: "POST", body: JSON.stringify(p) }, { silent401: true }),
    subscribe: (email: string, website: string) => request<{ message: string }>("/api/public/subscribe", { method: "POST", body: JSON.stringify({ email, website }) }, { silent401: true }),
  },
};
