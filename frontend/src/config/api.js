/**
 * API base URL and credentialed fetch for protected routes.
 * Uses session cookie (credentials: 'include').
 */
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8080';

export async function authFetch(path, options = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const res = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  return res;
}

export { API_BASE };
