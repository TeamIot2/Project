// Settings page: profile, preferences, custom monitoring modes, thresholds, security

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useEnvironment } from "../contexts/EnvironmentContext";
import { useI18n } from "../contexts/I18nContext";
import { useTheme } from "../contexts/ThemeContext";
import { LogOut } from "../components/Icons";

type CustomMode = {
  id: string;
  name: string;
  focusMetric: string;
  intervalSec: number;
  sensitivity: "low" | "balanced" | "high";
  autoStart: boolean;
};

export default function Settings() {
  const { user, logout } = useAuth();
  const { currentPreset, mode } = useEnvironment();
  const { locale, t, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
  const isCs = locale === "cs";

  const [nickname, setNickname] = useState(user?.name ?? "");
  const [fullName, setFullName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState("");
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [pushAlertsEnabled, setPushAlertsEnabled] = useState(true);
  const [weeklyDigestEnabled, setWeeklyDigestEnabled] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState("30");
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState("30");

  const [customModes, setCustomModes] = useState<CustomMode[]>([
    {
      id: "mode-office-balanced",
      name: "Office Focus",
      focusMetric: "co2_ppm",
      intervalSec: 60,
      sensitivity: "balanced",
      autoStart: true,
    },
    {
      id: "mode-sleep-quiet",
      name: "Quiet Sleep",
      focusMetric: "noise_adc",
      intervalSec: 120,
      sensitivity: "high",
      autoStart: true,
    },
  ]);
  const [newModeName, setNewModeName] = useState("");
  const [newModeMetric, setNewModeMetric] = useState("co2_ppm");
  const [newModeInterval, setNewModeInterval] = useState("60");
  const [newModeSensitivity, setNewModeSensitivity] = useState<"low" | "balanced" | "high">("balanced");
  const [newModeAutoStart, setNewModeAutoStart] = useState(true);
  const [modeMessage, setModeMessage] = useState<string | null>(null);

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!user?.name) return;
    setNickname((prev) => (prev.trim() ? prev : user.name));
    setFullName((prev) => (prev.trim() ? prev : user.name));
  }, [user?.name]);

  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  // Build threshold table rows from current preset
  const thresholdRows = currentPreset
    ? Object.entries(currentPreset.thresholds).map(([key, range]) => ({
        metric: key,
        goodMin: range.good[0],
        goodMax: range.good[1],
        modMin: range.moderate[0],
        modMax: range.moderate[1],
      }))
    : [];

  // Friendly metric labels (translated)
  const metricLabels: Record<string, string> = {
    co2_ppm: `${t.sensor_co2} (ppm)`,
    temperature_c: `${t.sensor_temperature} (C)`,
    humidity_pct: `${t.sensor_humidity} (%)`,
    pressure_hpa: `${t.sensor_pressure} (hPa)`,
    light_lux: `${t.sensor_light} (lux)`,
    noise_adc: `${t.sensor_noise} (ADC)`,
  };

  const displayName = fullName.trim() || user?.name || (isCs ? "Neznamy uzivatel" : "Unknown user");
  const initials = useMemo(() => {
    const parts = displayName.split(" ").filter(Boolean).slice(0, 2);
    if (parts.length === 0) return "U";
    return parts.map((p) => p.charAt(0).toUpperCase()).join("");
  }, [displayName]);

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }

    setAvatarPreview(URL.createObjectURL(file));
    setProfileMessage(isCs ? "Profilovy obrazek byl aktualizovan." : "Profile image updated.");
  }

  function removeAvatar() {
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
      setAvatarPreview(null);
      setProfileMessage(isCs ? "Profilovy obrazek byl odebran." : "Profile image removed.");
    }
  }

  function saveProfile() {
    if (!nickname.trim() || !fullName.trim()) {
      setProfileMessage(isCs ? "Vypln prezdivku a jmeno." : "Fill in nickname and full name.");
      return;
    }

    setProfileMessage(
      isCs
        ? "Profil byl pripraven k ulozeni (demo flow)."
        : "Profile changes are ready to save (demo flow)."
    );
  }

  function createCustomMode() {
    if (!newModeName.trim()) {
      setModeMessage(isCs ? "Zadej nazev custom rezimu." : "Enter a custom mode name.");
      return;
    }

    const parsedInterval = Math.max(10, Number.parseInt(newModeInterval, 10) || 60);

    const newMode: CustomMode = {
      id: `custom-${Date.now()}`,
      name: newModeName.trim(),
      focusMetric: newModeMetric,
      intervalSec: parsedInterval,
      sensitivity: newModeSensitivity,
      autoStart: newModeAutoStart,
    };

    setCustomModes((prev) => [newMode, ...prev]);
    setNewModeName("");
    setNewModeMetric("co2_ppm");
    setNewModeInterval("60");
    setNewModeSensitivity("balanced");
    setNewModeAutoStart(true);
    setModeMessage(isCs ? "Custom rezim byl vytvoren." : "Custom monitoring mode created.");
  }

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>{t.settings_title}</h1>
      </div>

      <section className="card settings-section">
        <h2 className="section-title">{t.profile}</h2>
        <div className="profile-info settings-profile-head">
          <div className="settings-avatar-wrap">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Profile preview" className="settings-avatar-img" />
            ) : (
              <div className="settings-avatar-fallback">{initials}</div>
            )}
          </div>
          <div className="profile-details">
            <h3>{displayName}</h3>
            <p className="text-secondary">{user?.email ?? ""}</p>
            <span className={`role-badge role-${user?.role ?? "viewer"}`}>
              {user?.role ?? "viewer"}
            </span>
          </div>
          <div className="settings-avatar-actions">
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="settings-avatar-input"
            />
            <button className="btn btn-outline btn-sm" onClick={() => avatarInputRef.current?.click()}>
              {isCs ? "Zmenit fotku" : "Change photo"}
            </button>
            {avatarPreview && (
              <button className="btn btn-ghost btn-sm" onClick={removeAvatar}>
                {isCs ? "Odebrat" : "Remove"}
              </button>
            )}
          </div>
        </div>

        <div className="settings-form-grid">
          <div className="form-group">
            <label className="form-label">{isCs ? "Prezdivka" : "Nickname"}</label>
            <input className="form-input" value={nickname} onChange={(e) => setNickname(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">{isCs ? "Cele jmeno" : "Full name"}</label>
            <input className="form-input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" value={user?.email ?? ""} readOnly />
          </div>
          <div className="form-group">
            <label className="form-label">{isCs ? "Telefon" : "Phone"}</label>
            <input
              className="form-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={isCs ? "napr. +420..." : "e.g. +1..."}
            />
          </div>
          <div className="form-group">
            <label className="form-label">{isCs ? "Casove pasmo" : "Time zone"}</label>
            <input className="form-input" value={timezone} onChange={(e) => setTimezone(e.target.value)} />
          </div>
        </div>

        <div className="settings-section-actions">
          <button className="btn btn-primary" onClick={saveProfile}>
            {isCs ? "Ulozit profil" : "Save profile"}
          </button>
          {profileMessage && <p className="settings-inline-message">{profileMessage}</p>}
        </div>
      </section>

      <section className="card settings-section">
        <h2 className="section-title">{t.preferences}</h2>
        <div className="pref-list">
          <div className="pref-item">
            <div>
              <span className="pref-label">{t.theme}</span>
            </div>
            <div className="pref-toggle-group">
              <button
                className={`pref-toggle-btn ${theme === "light" ? "active" : ""}`}
                onClick={() => setTheme("light")}
              >
                {t.theme_light}
              </button>
              <button
                className={`pref-toggle-btn ${theme === "dark" ? "active" : ""}`}
                onClick={() => setTheme("dark")}
              >
                {t.theme_dark}
              </button>
            </div>
          </div>

          <div className="pref-item">
            <div>
              <span className="pref-label">{t.language}</span>
            </div>
            <div className="pref-toggle-group">
              <button
                className={`pref-toggle-btn ${locale === "cs" ? "active" : ""}`}
                onClick={() => setLocale("cs")}
              >
                CZ
              </button>
              <button
                className={`pref-toggle-btn ${locale === "en" ? "active" : ""}`}
                onClick={() => setLocale("en")}
              >
                EN
              </button>
            </div>
          </div>

          <div className="pref-item">
            <div>
              <span className="pref-label">{t.notifications}</span>
              <span className="pref-desc text-secondary">{t.notifications_desc}</span>
            </div>
            <label className="settings-switch">
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={(e) => setNotificationsEnabled(e.target.checked)}
              />
              <span className="settings-switch-slider" />
            </label>
          </div>

          <div className="pref-item">
            <div>
              <span className="pref-label">{isCs ? "Push upozorneni" : "Push alerts"}</span>
              <span className="pref-desc text-secondary">
                {isCs ? "Okamzite varovani pri kritickych hodnotach." : "Instant warnings for critical values."}
              </span>
            </div>
            <label className="settings-switch">
              <input
                type="checkbox"
                checked={pushAlertsEnabled}
                onChange={(e) => setPushAlertsEnabled(e.target.checked)}
              />
              <span className="settings-switch-slider" />
            </label>
          </div>

          <div className="pref-item">
            <div>
              <span className="pref-label">{isCs ? "Tydenni report" : "Weekly digest"}</span>
              <span className="pref-desc text-secondary">
                {isCs ? "Souhrn zmen senzoru jednou tydne." : "One weekly summary of sensor trends."}
              </span>
            </div>
            <label className="settings-switch">
              <input
                type="checkbox"
                checked={weeklyDigestEnabled}
                onChange={(e) => setWeeklyDigestEnabled(e.target.checked)}
              />
              <span className="settings-switch-slider" />
            </label>
          </div>

          <div className="pref-item">
            <div>
              <span className="pref-label">{t.data_refresh}</span>
              <span className="pref-desc text-secondary">{t.data_refresh_desc}</span>
            </div>
            <select className="form-select settings-inline-select" value={refreshInterval} onChange={(e) => setRefreshInterval(e.target.value)}>
              <option value="15">15s</option>
              <option value="30">30s</option>
              <option value="60">60s</option>
              <option value="120">120s</option>
            </select>
          </div>
        </div>
      </section>

      <section className="card settings-section">
        <h2 className="section-title">{isCs ? "Custom monitorovaci rezimy" : "Custom monitoring modes"}</h2>
        <p className="text-secondary">
          {isCs
            ? "Definuj vlastni rezimy podle toho, co chces sledovat a jak citlive ma system reagovat."
            : "Create your own monitoring presets with custom focus, sensitivity, and refresh rate."}
        </p>

        <div className="custom-mode-list">
          {customModes.map((customMode) => (
            <article key={customMode.id} className="custom-mode-card">
              <div className="custom-mode-head">
                <h3>{customMode.name}</h3>
                <span className={`custom-mode-chip ${customMode.autoStart ? "active" : ""}`}>
                  {customMode.autoStart ? (isCs ? "Auto start" : "Auto-start") : (isCs ? "Manual" : "Manual")}
                </span>
              </div>
              <div className="custom-mode-meta">
                <span>{metricLabels[customMode.focusMetric] ?? customMode.focusMetric}</span>
                <span>{customMode.intervalSec}s</span>
                <span>{customMode.sensitivity}</span>
              </div>
            </article>
          ))}
        </div>

        <div className="custom-mode-form">
          <div className="custom-mode-form-grid">
            <div className="form-group">
              <label className="form-label">{isCs ? "Nazev rezimu" : "Mode name"}</label>
              <input
                className="form-input"
                value={newModeName}
                onChange={(e) => setNewModeName(e.target.value)}
                placeholder={isCs ? "napr. Greenhouse Night" : "e.g. Greenhouse Night"}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{isCs ? "Hlavni metrika" : "Primary metric"}</label>
              <select className="form-select" value={newModeMetric} onChange={(e) => setNewModeMetric(e.target.value)}>
                {Object.entries(metricLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{isCs ? "Interval mereni (s)" : "Sampling interval (s)"}</label>
              <input
                className="form-input"
                type="number"
                min={10}
                step={10}
                value={newModeInterval}
                onChange={(e) => setNewModeInterval(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{isCs ? "Citlivost" : "Sensitivity"}</label>
              <select
                className="form-select"
                value={newModeSensitivity}
                onChange={(e) => setNewModeSensitivity(e.target.value as "low" | "balanced" | "high")}
              >
                <option value="low">{isCs ? "Nizka" : "Low"}</option>
                <option value="balanced">{isCs ? "Vyvazena" : "Balanced"}</option>
                <option value="high">{isCs ? "Vysoka" : "High"}</option>
              </select>
            </div>
          </div>
          <label className="custom-mode-checkbox">
            <input type="checkbox" checked={newModeAutoStart} onChange={(e) => setNewModeAutoStart(e.target.checked)} />
            <span>{isCs ? "Spoustet rezim automaticky po startu aplikace" : "Start this mode automatically when app opens"}</span>
          </label>

          <div className="settings-section-actions">
            <button className="btn btn-primary" onClick={createCustomMode}>
              {isCs ? "Vytvorit rezim" : "Create mode"}
            </button>
            {modeMessage && <p className="settings-inline-message">{modeMessage}</p>}
          </div>
        </div>
      </section>

      <section className="card settings-section">
        <h2 className="section-title">
          {t.env_thresholds}
          <span className="section-badge">{mode}</span>
        </h2>
        <div className="table-wrapper">
          <table className="threshold-table">
            <thead>
              <tr>
                <th>{t.metric}</th>
                <th>{t.good_range}</th>
                <th>{t.moderate_range}</th>
              </tr>
            </thead>
            <tbody>
              {thresholdRows.map((row) => (
                <tr key={row.metric}>
                  <td>{metricLabels[row.metric] ?? row.metric}</td>
                  <td>
                    <span className="range-badge good">
                      {row.goodMin} - {row.goodMax}
                    </span>
                  </td>
                  <td>
                    <span className="range-badge moderate">
                      {row.modMin} - {row.modMax}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card settings-section">
        <h2 className="section-title">{isCs ? "Zabezpeceni" : "Security"}</h2>
        <div className="pref-list">
          <div className="pref-item">
            <div>
              <span className="pref-label">{isCs ? "Dvoufaktorove overeni" : "Two-factor authentication"}</span>
              <span className="pref-desc text-secondary">
                {isCs ? "Prihlaseni bude potvrzene druhym krokem." : "Require a second verification step at sign-in."}
              </span>
            </div>
            <label className="settings-switch">
              <input
                type="checkbox"
                checked={twoFactorEnabled}
                onChange={(e) => setTwoFactorEnabled(e.target.checked)}
              />
              <span className="settings-switch-slider" />
            </label>
          </div>
          <div className="pref-item">
            <div>
              <span className="pref-label">{isCs ? "Limit neaktivity relace" : "Session timeout"}</span>
            </div>
            <select className="form-select settings-inline-select" value={sessionTimeout} onChange={(e) => setSessionTimeout(e.target.value)}>
              <option value="15">15 min</option>
              <option value="30">30 min</option>
              <option value="60">60 min</option>
              <option value="120">120 min</option>
            </select>
          </div>
        </div>
      </section>

      <section className="settings-section">
        <button className="btn btn-outline btn-danger" onClick={logout}>
          <LogOut size={18} />
          <span>{t.sign_out}</span>
        </button>
      </section>
    </div>
  );
}
