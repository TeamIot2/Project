// Authentication context: login, logout, session restoration, protected routes

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { apiPost, apiGet } from "../api";
import type { User } from "../types";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  completeTokenLogin: (token: string) => Promise<void>;
  updateCurrentUser: (nextUser: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Restore session on mount
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (!storedToken) {
      setLoading(false);
      return;
    }
    apiGet<User>("/auth/me")
      .then((userData) => {
        setUser(userData);
        setToken(storedToken);
      })
      .catch(() => {
        // Token invalid, clear it
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      const result = await apiPost<{ token: string; user: User }>("/auth/login", {
        email,
        password,
      });
      localStorage.setItem("token", result.token);
      setToken(result.token);
      setUser(result.user);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const completeTokenLogin = useCallback(async (nextToken: string) => {
    setError(null);
    setLoading(true);
    try {
      localStorage.setItem("token", nextToken);
      const userData = await apiGet<User>("/auth/me");
      setToken(nextToken);
      setUser(userData);
    } catch (err) {
      localStorage.removeItem("token");
      setToken(null);
      setUser(null);
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateCurrentUser = useCallback((nextUser: User) => {
    setUser(nextUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        loading,
        error,
        login,
        completeTokenLogin,
        updateCurrentUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Route wrapper that redirects unauthenticated users to /login.
 */
export function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>{document.documentElement.lang === "cs" ? "Načítání..." : "Loading..."}</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
