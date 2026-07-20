// Tiny fetch wrapper for the custom backend API (same origin).
// Attaches the session bearer token (if signed in) so the server can enforce RBAC.

function authHeader(): Record<string, string> {
  try {
    const raw = sessionStorage.getItem("partner_os_session");
    if (raw) {
      const { token } = JSON.parse(raw) as { token?: string };
      if (token) return { Authorization: `Bearer ${token}` };
    }
  } catch {
    /* ignore */
  }
  return {};
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { ...authHeader() };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(path, {
    method,
    headers: Object.keys(headers).length ? headers : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}`);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => req<T>("GET", path),
  post: <T>(path: string, body: unknown) => req<T>("POST", path, body),
  put: <T>(path: string, body: unknown) => req<T>("PUT", path, body),
  patch: <T>(path: string, body: unknown) => req<T>("PATCH", path, body),
  del: (path: string) => req<void>("DELETE", path),
};
