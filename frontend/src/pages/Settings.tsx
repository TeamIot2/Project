// Settings page: user profile, preferences, environment thresholds, logout

import { useAuth } from "../contexts/AuthContext";
import { useEnvironment } from "../contexts/EnvironmentContext";
import { useI18n } from "../contexts/I18nContext";
import { useTheme } from "../contexts/ThemeContext";
import { LogOut } from "../components/Icons";

export default function Settings() {
  const { user, logout } = useAuth();
  const { currentPreset, mode } = useEnvironment();
  const { locale, t, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();

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
    temperature_c: `${t.sensor_temperature} (°C)`,
    humidity_pct: `${t.sensor_humidity} (%)`,
    pressure_hpa: `${t.sensor_pressure} (hPa)`,
    light_lux: `${t.sensor_light} (lux)`,
    noise_adc: `${t.sensor_noise} (ADC)`,
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>{t.settings_title}</h1>
      </div>

      {/* Profile section */}
      <section className="card settings-section">
        <h2 className="section-title">{t.profile}</h2>
        <div className="profile-info">
          <div className="user-avatar-sm" style={{ width: 56, height: 56, fontSize: '1.25rem' }}>
            {user?.name?.charAt(0).toUpperCase() ?? "U"}
          </div>
          <div className="profile-details">
            <h3>{user?.name ?? "Unknown"}</h3>
            <p className="text-secondary">{user?.email ?? ""}</p>
            <span className={`role-badge role-${user?.role ?? "viewer"}`}>
              {user?.role ?? "viewer"}
            </span>
          </div>
        </div>
      </section>

      {/* Preferences section */}
      <section className="card settings-section">
        <h2 className="section-title">{t.preferences}</h2>
        <div className="pref-list">
          {/* Theme preference */}
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

          {/* Language preference */}
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

          {/* Notifications */}
          <div className="pref-item">
            <div>
              <span className="pref-label">{t.notifications}</span>
              <span className="pref-desc text-secondary">{t.notifications_desc}</span>
            </div>
          </div>

          {/* Data refresh */}
          <div className="pref-item">
            <div>
              <span className="pref-label">{t.data_refresh}</span>
              <span className="pref-desc text-secondary">{t.data_refresh_desc}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Environment thresholds section */}
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
                      {row.goodMin} – {row.goodMax}
                    </span>
                  </td>
                  <td>
                    <span className="range-badge moderate">
                      {row.modMin} – {row.modMax}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Logout */}
      <section className="settings-section">
        <button className="btn btn-outline btn-danger" onClick={logout}>
          <LogOut size={18} />
          <span>{t.sign_out}</span>
        </button>
      </section>
    </div>
  );
}
