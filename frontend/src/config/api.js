const API_BASE =
  process.env.REACT_APP_API_URL !== undefined && process.env.REACT_APP_API_URL !== ''
    ? process.env.REACT_APP_API_URL
    : '';

export function apiUrl(path) {
  const base = (API_BASE || '').replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}

export async function authFetch(path, options = {}) {
  const url = path.startsWith('http') ? path : apiUrl(path);
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

export { API_BASE };
