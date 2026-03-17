import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authFetch } from '../config/api';

const AuthContext = createContext(null);

const NETWORK_ERROR_MESSAGE =
  'Unable to reach the server. Make sure the backend is running and CORS is configured for this frontend origin.';

function wrapAuthFetch(fn) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err.name === 'TypeError' && (err.message === 'Failed to fetch' || err.message.includes('fetch'))) {
        throw new Error(NETWORK_ERROR_MESSAGE);
      }
      throw err;
    }
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const checkAuth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await wrapAuthFetch(authFetch)('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
      setError(err.message || 'Could not check login status.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = useCallback(async (email, password) => {
    setError(null);
    const res = await wrapAuthFetch(authFetch)('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Login failed.');
    }
    setUser(data.user);
    return data.user;
  }, []);

  const signup = useCallback(async (email, password) => {
    setError(null);
    const res = await wrapAuthFetch(authFetch)('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Signup failed.');
    }
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    setError(null);
    try {
      await authFetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      // still clear local state
    }
    setUser(null);
  }, []);

  const value = {
    user,
    loading,
    error,
    login,
    signup,
    logout,
    checkAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
