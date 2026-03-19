const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8080';

export function apiUrl(path) {
  const base = API_BASE.replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

export async function authFetch(path, options = {}) {
  const url = apiUrl(path);
  const headers = { ...options.headers };
  if (options.body instanceof FormData) {
    // Let browser set Content-Type with boundary for multipart
  } else if (headers['Content-Type'] === undefined) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers,
  });
  return res;
}
