const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:1337';
const TOKEN_KEY = 'srh-hub-jwt';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, { method = 'GET', body, params } = {}) {
  const url = new URL(`${API_URL}/api${path}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  }

  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const responseBody = await res.json().catch(() => null);

  if (!res.ok) {
    const message = responseBody?.error?.message || res.statusText;
    throw new ApiError(message, res.status);
  }

  return responseBody;
}

export const api = {
  get: (path, params) => request(path, { method: 'GET', params }),
  // Strapi's content-type routes expect the payload wrapped in { data: ... }.
  post: (path, data) => request(path, { method: 'POST', body: { data } }),
  put: (path, data) => request(path, { method: 'PUT', body: { data } }),
  del: (path) => request(path, { method: 'DELETE' }),
  // Plugin routes (e.g. /auth/local) take the payload unwrapped.
  postRaw: (path, body) => request(path, { method: 'POST', body }),
};

/** Uploads a single file via the Upload plugin's content-API and returns the created file record. */
export async function uploadFile(file) {
  const formData = new FormData();
  formData.append('files', file);

  const token = getToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const res = await fetch(`${API_URL}/api/upload`, { method: 'POST', headers, body: formData });
  const body = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(body?.error?.message || res.statusText, res.status);
  }
  return body[0];
}

/** Uploads one or more files via the Upload plugin's content-API and returns the created file records. */
export async function uploadFiles(files) {
  const formData = new FormData();
  Array.from(files).forEach((file) => formData.append('files', file));

  const token = getToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const res = await fetch(`${API_URL}/api/upload`, { method: 'POST', headers, body: formData });
  const body = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(body?.error?.message || res.statusText, res.status);
  }
  return body;
}

export { API_URL };
