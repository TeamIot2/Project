// Main application layout: sidebar (desktop), bottom nav (mobile), header, content area

import { useState, useRef, useEffect, type CSSProperties } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useEnvironment } from "../contexts/EnvironmentContext";
import { useI18n } from "../contexts/I18nContext";
import { useTheme } from "../contexts/ThemeContext";
import { useDualViewPreference } from "../contexts/DualViewPreferenceContext";
import { useVisualStyle } from "../contexts/StyleContext";
import { useSettingsState } from "../contexts/SettingsStateContext";
import { DUAL_VIEW_MEDIA_QUERY } from "../constants/dualView";
import { usePanelType } from "./DualViewShell";
import { Home, BarChart2, Cpu, Settings, Moon, Sun, Briefcase, Activity, LogOut, ChevronDown, Globe, Tree, GraduationCap, Factory, Sprout } from "./Icons";
import type { EnvironmentMode } from "../types";
import type { Translations } from "../i18n/translations";
import { withMockModeSuffix } from "../utils/modeLabels";

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
function getEnvModes(
  t: Translations,
  getModeLabel: (modeId: EnvironmentMode, fallback: string) => string
): { id: EnvironmentMode; icon: typeof Moon; label: string }[] {
  return [
    { id: "office", icon: Briefcase, label: getModeLabel("office", t.env_office) },
    { id: "sleep", icon: Moon, label: getModeLabel("sleep", t.env_sleep) },
    { id: "sport", icon: Activity, label: getModeLabel("sport", t.env_sport) },
    { id: "outdoor", icon: Tree, label: getModeLabel("outdoor", t.env_outdoor) },
  ];
}

// Icon lookup for all known modes (preset + custom fallback)
const modeIconMap: Record<string, typeof Moon> = {
  sleep: Moon,
  office: Briefcase,
  sport: Activity,
  outdoor: Tree,
  school: GraduationCap,
  factory: Factory,
  greenhouse: Sprout,
};

export default function Layout() {
  const { user, logout } = useAuth();
  const { mode, setEnvironment } = useEnvironment();
  const { activeStyle } = useVisualStyle();
  const { locale, t, setLocale } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const { dualViewEnabled, setDualViewEnabled } = useDualViewPreference();
  const { favoriteModes, modeMetaOverrides } = useSettingsState();
  const panelType = usePanelType();
  const location = useLocation();
  const navigate = useNavigate();
  const [isDualViewAvailable, setIsDualViewAvailable] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(DUAL_VIEW_MEDIA_QUERY).matches;
  });
  const [isDesktopUI, setIsDesktopUI] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(min-width: 960px)").matches;
  });
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [envModalOpen, setEnvModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navItems = getNavItems(t);
  const getModeLabel = (modeId: EnvironmentMode, fallback: string) =>
    withMockModeSuffix(modeId, modeMetaOverrides[modeId]?.name ?? fallback);
  const envModes = getEnvModes(t, getModeLabel);
  const figmaTab = location.pathname === "/history" ? "history"
    : location.pathname === "/devices" ? "devices"
    : location.pathname === "/settings" ? "settings"
    : "measure";
  const showPersistentFigmaDesktop = activeStyle.id === 16 && isDesktopUI && panelType !== "mobile" && figmaTab !== "measure";
  const figmaModes: { id: EnvironmentMode; label: string; icon: typeof Moon; gradient: string; bgImage: string }[] = [
    { id: "sleep",      label: getModeLabel("sleep", t.env_sleep),           icon: Moon,          gradient: "linear-gradient(135deg, #7C3AED, #A78BFA)", bgImage: "/images/silent/silent_06_bedroom.png" },
    { id: "office",     label: getModeLabel("office", t.env_office),         icon: Briefcase,     gradient: "linear-gradient(135deg, #38BDF8, #BAE6FD)", bgImage: "/images/silent/silent_07_office.png" },
    { id: "school",     label: getModeLabel("school", t.env_school),         icon: GraduationCap, gradient: "linear-gradient(135deg, #FACC15, #FDE68A)", bgImage: "/images/silent/silent_01_classroom.png" },
    { id: "outdoor",    label: getModeLabel("outdoor", t.env_outdoor),       icon: Tree,          gradient: "linear-gradient(135deg, #1E3A2F, #2D5040)", bgImage: "/images/silent/silent_03_nature.png" },
    { id: "sport",      label: getModeLabel("sport", t.env_sport),           icon: Activity,      gradient: "linear-gradient(135deg, #F97316, #FCA044)", bgImage: "/images/silent/silent_02_gym.png" },
    { id: "factory",    label: getModeLabel("factory", t.env_factory),       icon: Factory,       gradient: "linear-gradient(135deg, #6B7280, #9CA3AF)", bgImage: "/images/silent/silent_08_factory.png" },
    { id: "greenhouse", label: getModeLabel("greenhouse", t.env_greenhouse), icon: Sprout,        gradient: "linear-gradient(135deg, #16A34A, #4ADE80)", bgImage: "/images/silent/silent_04_greenhouse.png" },
  ];
  const modeAccentColor: Record<string, string> = {
    sleep: "#A78BFA",
    office: "#38BDF8",
    school: "#FACC15",
    outdoor: "#2D5040",
    sport: "#F97316",
    factory: "#9CA3AF",
    greenhouse: "#4ADE80",
  };
  const accentColor = modeAccentColor[mode] ?? "#FDE68A";
  const FIGMA_ACTIVE_CARD_WIDTH = 356;
  const FIGMA_SIDE_CARD_WIDTH = 228;

  function getFigmaCardScale(absDiff: number): number {
    if (absDiff === 0) return 1;
    if (absDiff === 1) return 1;
    if (absDiff === 2) return 0.92;
    return 0.84;
  }

  function getFigmaCardWidth(absDiff: number): number {
    return (absDiff === 0 ? FIGMA_ACTIVE_CARD_WIDTH : FIGMA_SIDE_CARD_WIDTH) * getFigmaCardScale(absDiff);
  }

  function getFigmaCardOffset(diff: number): number {
    const sign = diff < 0 ? -1 : 1;
    const absDiff = Math.abs(diff);
    if (absDiff === 0) return 0;

    let offset = FIGMA_ACTIVE_CARD_WIDTH / 2 - getFigmaCardWidth(1) / 4;
    if (absDiff === 1) return sign * offset;

    let previousWidth = getFigmaCardWidth(1);
    for (let depth = 2; depth <= absDiff; depth += 1) {
      const currentWidth = getFigmaCardWidth(depth);
      offset += previousWidth / 2 - currentWidth / 4;
      previousWidth = currentWidth;
    }

    return sign * offset;
  }

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

  useEffect(() => {
    const mql = window.matchMedia(DUAL_VIEW_MEDIA_QUERY);
    setIsDualViewAvailable(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsDualViewAvailable(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 960px)");
    setIsDesktopUI(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktopUI(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  function setFigmaTab(tab: "measure" | "history" | "devices" | "settings") {
    const paths = { measure: "/", history: "/history", devices: "/devices", settings: "/settings" };
    navigate(paths[tab]);
  }

  return (
    <div className="app-layout">
      {/* Desktop sidebar */}
      <aside className="sidebar">
        <NavLink to="/" end className="sidebar-brand sidebar-brand-link" aria-label="Team2App home">
          <span className="brand-icon">IoT</span>
          <span className="brand-name">Team2App</span>
        </NavLink>

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
          {/* Brand */}
          <div className="figma-brand">
            <button
              type="button"
              className="figma-brand-home"
              onClick={() => setFigmaTab("measure")}
              aria-label="Team2App home"
            >
              <div className="figma-brand-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12 L6 8 L10 16 L14 6 L18 14 L22 10" />
                </svg>
              </div>
              <div className="figma-brand-text">
                <span className="figma-brand-name">Team2App</span>
                <span className="figma-brand-subtitle">Internet of Things</span>
              </div>
            </button>
            {isDualViewAvailable && (
              <label className="dual-view-toggle" title={locale === "cs" ? "Povolit dual view" : "Enable dual view"}>
                <input
                  type="checkbox"
                  checked={dualViewEnabled}
                  onChange={(e) => setDualViewEnabled(e.target.checked)}
                />
                <span>Dual View</span>
              </label>
            )}
          </div>

          {/* Favorite mode quick-select buttons */}
          <div className="env-selector">
            {[0, 1, 2].map((slotIndex) => {
              const favModeId = favoriteModes[slotIndex];
              if (!favModeId) return null;
              const IconComp = modeIconMap[favModeId] ?? Activity;
              const isActive = mode === favModeId;
              return (
                <button
                  key={favModeId}
                  className={`env-pill ${isActive ? "active" : ""} env-${favModeId}`}
                  onClick={() => setEnvironment(favModeId as EnvironmentMode)}
                  title={favModeId}
                >
                  <IconComp size={14} />
                </button>
              );
            })}
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
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
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
                    navigate("/settings#user-profile");
                  }}
                >
                  <Settings size={16} />
                  <span>{locale === "cs" ? "Nastavení profilu" : "Profile settings"}</span>
                </button>
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
          {showPersistentFigmaDesktop ? (
            <div className="figma-desktop" style={{ "--figma-accent": accentColor } as CSSProperties}>
              <section className="figma-carousel">
                <button
                  className="figma-arrow figma-arrow-left"
                  onClick={() => {
                    const modes = figmaModes.map(m => m.id);
                    const idx = modes.indexOf(mode);
                    const prev = (idx - 1 + modes.length) % modes.length;
                    setEnvironment(modes[prev]);
                  }}
                  aria-label="Previous"
                >
                  &lt;
                </button>

                <div className="figma-carousel-track">
                  {figmaModes.map((m, i) => {
                    const activeIdx = figmaModes.findIndex(fm => fm.id === mode);
                    const len = figmaModes.length;
                    let diff = i - activeIdx;
                    if (diff > len / 2) diff -= len;
                    if (diff < -len / 2) diff += len;
                    const absDiff = Math.abs(diff);
                    const isActive = diff === 0;
                    const translateX = getFigmaCardOffset(diff);
                    const scale = getFigmaCardScale(absDiff);

                    return (
                      <button
                        key={m.id}
                        className={`figma-mode-card ${isActive ? "active" : ""}`}
                        data-env={m.id}
                        onClick={() => setEnvironment(m.id)}
                        style={{
                          transform: `translateX(${translateX}px) scale(${scale})`,
                          opacity: 1,
                          zIndex: 10 - absDiff,
                          filter: isActive ? "none" : `brightness(${1 - absDiff * 0.05}) saturate(${1 - absDiff * 0.08})`,
                        }}
                      >
                        <img src={m.bgImage} alt="" className="figma-mode-bg" />
                        <div className="figma-mode-overlay" style={{ background: m.gradient }} />
                        <m.icon size={isActive ? 44 : 36} className="figma-mode-icon" />
                        <span className="figma-mode-label">{m.label}</span>
                      </button>
                    );
                  })}
                </div>

                <button
                  className="figma-arrow figma-arrow-right"
                  onClick={() => {
                    const modes = figmaModes.map(m => m.id);
                    const idx = modes.indexOf(mode);
                    const next = (idx + 1) % modes.length;
                    setEnvironment(modes[next]);
                  }}
                  aria-label="Next"
                >
                  &gt;
                </button>
              </section>

              <div className="figma-dots">
                {figmaModes.map((m) => (
                  <span
                    key={m.id}
                    className={`figma-dot ${mode === m.id ? "active" : ""}`}
                    onClick={() => setEnvironment(m.id)}
                  />
                ))}
              </div>

              <nav className="figma-tabs">
                <button className="figma-tab" onClick={() => setFigmaTab("measure")}>{t.nav_dashboard}</button>
                <button className={`figma-tab ${figmaTab === "history" ? "active" : ""}`} onClick={() => setFigmaTab("history")}>{t.nav_history}</button>
                <button className={`figma-tab ${figmaTab === "devices" ? "active" : ""}`} onClick={() => setFigmaTab("devices")}>{t.nav_devices}</button>
                <button className={`figma-tab ${figmaTab === "settings" ? "active" : ""}`} onClick={() => setFigmaTab("settings")}>{t.nav_settings}</button>
              </nav>

              <section className="figma-content">
                <Outlet />
              </section>
            </div>
          ) : (
            <Outlet />
          )}
        </main>

        {isDesktopUI && panelType !== "mobile" && (
          <footer className="desktop-rights-footer">
            © 2026 Team2App. All rights reserved.
          </footer>
        )}
      </div>

      {/* Custom environment mode modal */}
      {envModalOpen && (
        <div className="env-modal-overlay" onClick={() => setEnvModalOpen(false)}>
          <div className="env-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{locale === "cs" ? "Vlastní režim" : "Custom Mode"}</h2>
            <p>{locale === "cs"
              ? "Vytvořte si vlastní režim prostředí s nastavením prahových hodnot pro jednotlivé senzory."
              : "Create a custom environment mode with your own sensor threshold settings."
            }</p>
            <div className="env-modal-placeholder">
              <div className="env-modal-field">
                <label>CO₂ (ppm)</label>
                <input type="range" min="400" max="2000" defaultValue="800" disabled />
              </div>
              <div className="env-modal-field">
                <label>{locale === "cs" ? "Teplota (°C)" : "Temperature (°C)"}</label>
                <input type="range" min="15" max="35" defaultValue="22" disabled />
              </div>
              <div className="env-modal-field">
                <label>{locale === "cs" ? "Vlhkost (%)" : "Humidity (%)"}</label>
                <input type="range" min="20" max="80" defaultValue="50" disabled />
              </div>
            </div>
            <div className="env-modal-actions">
              <button className="btn btn-outline" onClick={() => setEnvModalOpen(false)}>
                {locale === "cs" ? "Zavřít" : "Close"}
              </button>
              <button className="btn btn-primary" disabled>
                {locale === "cs" ? "Uložit (připravujeme)" : "Save (coming soon)"}
              </button>
            </div>
          </div>
        </div>
      )}

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
