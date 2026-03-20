// Main application layout: sidebar (desktop), bottom nav (mobile), header, content area

import { useState, useRef, useEffect } from "react";
import { Outlet, NavLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useEnvironment } from "../contexts/EnvironmentContext";
import { useI18n } from "../contexts/I18nContext";
import { useTheme } from "../contexts/ThemeContext";
import { useVisualStyle } from "../contexts/StyleContext";
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
  const { activeStyle, setStyle, allStyles } = useVisualStyle();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isFigmaStyle = activeStyle.id === 16;
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
              {item.to === "/devices" && (
                <span className="nav-badge">99</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-widget">
          <div className="sidebar-widget-env" style={{ borderLeftColor: `var(--env-${mode})` }}>
            <span className="sidebar-widget-mode">{envModes.find(e => e.id === mode)?.label}</span>
            <span className="sidebar-widget-status">&#9679; Active</span>
          </div>
        </div>

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
          {/* Environment pills — visible on mobile only */}
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

          {/* Brand — visible only for Figma style */}
          {isFigmaStyle && (
            <div className="figma-brand">
              <div className="figma-brand-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12 L6 8 L10 16 L14 6 L18 14 L22 10" />
                </svg>
              </div>
              <div className="figma-brand-text">
                <span className="figma-brand-name">Team2App</span>
                <span className="figma-brand-subtitle">Internet of Things</span>
              </div>
            </div>
          )}

          {/* Style switcher — visible on desktop only; show selected styles */}
          <div className="style-switcher">
            {allStyles.filter(s => [4, 7, 9, 16].includes(s.id)).map(s => (
              <button
                key={s.id}
                className={`style-btn ${activeStyle.id === s.id ? "active" : ""}`}
                style={{ "--btn-accent": s.accent } as React.CSSProperties}
                onClick={() => setStyle(s.id)}
                title={s.name}
              >
                {s.id}
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
              <Globe size={14} />
              <span>{locale === "cs" ? "CZ" : "EN"}</span>
            </button>

            {/* Theme toggle */}
            <button
              className="btn-icon"
              onClick={toggleTheme}
              title={theme === "light" ? t.theme_dark : t.theme_light}
            >
              {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
            </button>

            {/* User menu */}
            <button
              className="user-menu-trigger"
              onClick={() => setUserMenuOpen((prev) => !prev)}
              aria-expanded={userMenuOpen}
              aria-haspopup="menu"
            >
              <div className="user-avatar-sm">
                {isFigmaStyle ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                ) : (
                  user?.name?.charAt(0).toUpperCase() ?? "U"
                )}
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
