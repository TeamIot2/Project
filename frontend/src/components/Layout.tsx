// Main application layout: sidebar (desktop), bottom nav (mobile), header, content area

import { useState, useRef, useEffect } from "react";
import { Outlet, NavLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useEnvironment } from "../contexts/EnvironmentContext";
import { useI18n } from "../contexts/I18nContext";
import { useTheme } from "../contexts/ThemeContext";
import { Home, BarChart2, Cpu, Settings, Moon, Sun, Briefcase, Activity, LogOut, ChevronDown, Globe, Tree } from "./Icons";
import type { EnvironmentMode } from "../types";
import type { Translations } from "../i18n/translations";

// Navigation items — labels resolved via translations
function getNavItems(t: Translations) {
  return [
    { to: "/", icon: Home, label: t.nav_dashboard, end: true },
    { to: "/history", icon: BarChart2, label: t.nav_history },
    { to: "/devices", icon: Cpu, label: t.nav_devices },
    { to: "/settings", icon: Settings, label: t.nav_settings },
  ];
}

// Environment mode config — labels resolved via translations
function getEnvModes(t: Translations): { id: EnvironmentMode; icon: typeof Moon; label: string }[] {
  return [
    { id: "office", icon: Briefcase, label: t.env_office },
    { id: "sleep", icon: Moon, label: t.env_sleep },
    { id: "sport", icon: Activity, label: t.env_sport },
    { id: "outdoor", icon: Tree, label: t.env_outdoor },
  ];
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { mode, setEnvironment } = useEnvironment();
  const { locale, t, setLocale } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const navItems = getNavItems(t);
  const envModes = getEnvModes(t);

  // Close user menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && e.target && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="app-layout">
      {/* Desktop sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon">IoT</span>
          <span className="brand-name">PLACEHOLDERname</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "active" : ""}`
              }
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar-sm">
              {user?.name?.charAt(0).toUpperCase() ?? "U"}
            </div>
            <div className="user-info">
              <span className="user-name">{user?.name ?? "User"}</span>
              <span className="user-role">{user?.role ?? "viewer"}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="main-wrapper">
        {/* Header */}
        <header className="app-header">
          <div className="env-selector">
            {envModes.map((env) => (
              <button
                key={env.id}
                className={`env-pill ${mode === env.id ? "active" : ""} env-${env.id}`}
                onClick={() => setEnvironment(env.id)}
              >
                <env.icon size={14} />
                <span>{env.label}</span>
              </button>
            ))}
          </div>

          <div className="header-right" ref={menuRef}>
            {/* Language toggle */}
            <button
              className="lang-toggle"
              onClick={() => setLocale(locale === "cs" ? "en" : "cs")}
              title={t.language}
            >
              <Globe size={16} />
              <span>{locale === "cs" ? "CZ" : "EN"}</span>
            </button>

            {/* Theme toggle */}
            <button
              className="btn-icon"
              onClick={toggleTheme}
              title={theme === "light" ? t.theme_dark : t.theme_light}
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            {/* User menu */}
            <button
              className="user-menu-trigger"
              onClick={() => setUserMenuOpen((prev) => !prev)}
              aria-expanded={userMenuOpen}
              aria-haspopup="menu"
            >
              <div className="user-avatar-sm">
                {user?.name?.charAt(0).toUpperCase() ?? "U"}
              </div>
              <span className="user-menu-name">{user?.name ?? "User"}</span>
              <ChevronDown size={16} />
            </button>

            {userMenuOpen && (
              <div className="user-dropdown">
                <div className="dropdown-header">
                  <span className="dropdown-name">{user?.name}</span>
                  <span className="dropdown-email">{user?.email}</span>
                </div>
                <hr className="dropdown-divider" />
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setUserMenuOpen(false);
                    logout();
                  }}
                >
                  <LogOut size={16} />
                  <span>{t.sign_out}</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="main-content">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="bottom-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `bottom-nav-item ${isActive ? "active" : ""}`
            }
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
