// Settings page: profile, preferences, unified evaluation modes, thresholds, security

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useEnvironment } from "../contexts/EnvironmentContext";
import { useI18n } from "../contexts/I18nContext";
import { useTheme } from "../contexts/ThemeContext";
import { useSettingsState } from "../contexts/SettingsStateContext";
import { LogOut } from "../components/Icons";
import type { EnvironmentMode, ThresholdRange } from "../types";

type ThresholdPoint = {
  ideal: number;
  good: number;
  moderate: number;
  poor: number;
};

type ModeThresholdDrafts = Record<string, Record<string, ThresholdPoint>>;
type StoredModeThresholds = Record<string, Record<string, ThresholdRange | ThresholdPoint>>;
type ModeCardMeta = {
  id: string;
  label: string;
  desc: string;
  bgImage?: string;
  isCreate?: boolean;
  isCustom?: boolean;
};

const CREATE_MODE_ID = "__create_mode__";
const CREATE_MODE_IMAGE_OPTIONS = [
  "/images/silent/silent_06_bedroom.png",
  "/images/silent/silent_07_office.png",
  "/images/silent/silent_02_gym.png",
  "/images/silent/silent_03_nature.png",
  "/images/silent/silent_01_classroom.png",
  "/images/silent/silent_08_factory.png",
  "/images/silent/silent_04_greenhouse.png",
];

function roundThresholdValue(value: number): number {
  return Number.parseFloat(value.toFixed(2));
}

function cloneThresholdPoint(point: ThresholdPoint): ThresholdPoint {
  return {
    ideal: point.ideal,
    good: point.good,
    moderate: point.moderate,
    poor: point.poor,
  };
}

function clonePointThresholds(thresholds: Record<string, ThresholdPoint>): Record<string, ThresholdPoint> {
  return Object.fromEntries(
    Object.entries(thresholds).map(([metricKey, point]) => [metricKey, cloneThresholdPoint(point)])
  );
}

function isThresholdPoint(value: unknown): value is ThresholdPoint {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return ["ideal", "good", "moderate", "poor"].every((key) => typeof candidate[key] === "number");
}

function isThresholdRange(value: unknown): value is ThresholdRange {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  if (!Array.isArray(candidate.good) || !Array.isArray(candidate.moderate)) return false;
  return candidate.good.length === 2 && candidate.moderate.length === 2;
}

function rangeToPoint(range: ThresholdRange): ThresholdPoint {
  const ideal = roundThresholdValue((range.good[0] + range.good[1]) / 2);
  const good = roundThresholdValue(Math.max(range.good[0], range.good[1]));
  const moderate = roundThresholdValue(Math.max(range.moderate[0], range.moderate[1]));
  const step = Math.max(1, roundThresholdValue(Math.abs(moderate - good)));

  return {
    ideal,
    good,
    moderate,
    poor: roundThresholdValue(moderate + step),
  };
}

function thresholdsToPoints(thresholds: Record<string, ThresholdRange>): Record<string, ThresholdPoint> {
  return Object.fromEntries(
    Object.entries(thresholds).map(([metricKey, range]) => [metricKey, rangeToPoint(range)])
  );
}

function storedToPointThresholds(
  storedMode: Record<string, ThresholdRange | ThresholdPoint> | undefined,
  fallbackRanges: Record<string, ThresholdRange>
): Record<string, ThresholdPoint> {
  const fallback = thresholdsToPoints(fallbackRanges);
  if (!storedMode) return fallback;

  const result = clonePointThresholds(fallback);
  for (const [metricKey, storedThreshold] of Object.entries(storedMode)) {
    if (isThresholdPoint(storedThreshold)) {
      result[metricKey] = cloneThresholdPoint(storedThreshold);
      continue;
    }

    if (isThresholdRange(storedThreshold)) {
      result[metricKey] = rangeToPoint(storedThreshold);
    }
  }

  return result;
}

export default function Settings() {
  const { user, logout } = useAuth();
  const { presets } = useEnvironment();
  const { locale, t, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
  const isCs = locale === "cs";

  const {
    nickname, setNickname,
    fullName, setFullName,
    phone, setPhone,
    timezone, setTimezone,
    profileMessage, setProfileMessage,
    notificationChannel, setNotificationChannel,
    criticalAlertsEnabled, setCriticalAlertsEnabled,
    customModes, setCustomModes,
    newModeName, setNewModeName,
    expandedModeId, setExpandedModeId,
    avatarPreview, handleAvatarChange, removeAvatar, avatarInputRef,
    toggleFavoriteMode, isFavorite,
  } = useSettingsState();

  const [newModeImage, setNewModeImage] = useState<string>(CREATE_MODE_IMAGE_OPTIONS[0]);
  const [modeThresholdDrafts, setModeThresholdDrafts] = useState<ModeThresholdDrafts>({});
  const [modeSettingsMessage, setModeSettingsMessage] = useState<string | null>(null);
  const [showDisableCriticalAlertsModal, setShowDisableCriticalAlertsModal] = useState(false);

  const defaultThresholdTemplate = useMemo(() => {
    if (presets.length === 0) return {};
    const basePreset = presets.find((preset) => preset.id === "office") ?? presets[0];
    return basePreset.thresholds;
  }, [presets]);

  useEffect(() => {
    if (!user?.name) return;
    if (!nickname.trim()) setNickname(user.name);
    if (!fullName.trim()) setFullName(user.name);
  }, [user?.name]); // Intentional: only run on user name change

  useEffect(() => {
    if (presets.length === 0) return;

    setModeThresholdDrafts((prev) => {
      const next: ModeThresholdDrafts = { ...prev };
      let changed = false;
      let storedDrafts: StoredModeThresholds = {};

      try {
        const raw = localStorage.getItem("modeThresholdDrafts");
        if (raw) {
          storedDrafts = JSON.parse(raw) as StoredModeThresholds;
        }
      } catch {
        storedDrafts = {};
      }

      for (const preset of presets) {
        if (!next[preset.id]) {
          next[preset.id] = storedToPointThresholds(storedDrafts[preset.id], preset.thresholds);
          changed = true;
        }
      }

      for (const customMode of customModes) {
        if (!next[customMode.id]) {
          next[customMode.id] = storedToPointThresholds(storedDrafts[customMode.id], defaultThresholdTemplate);
          changed = true;
        }
      }

      if (!next[CREATE_MODE_ID]) {
        next[CREATE_MODE_ID] = storedToPointThresholds(storedDrafts[CREATE_MODE_ID], defaultThresholdTemplate);
        changed = true;
      }

      return changed ? next : prev;
    });
  }, [customModes, defaultThresholdTemplate, presets]);

  // Friendly metric labels (translated)
  const metricLabels: Record<string, string> = {
    co2_ppm: `${t.sensor_co2} (ppm)`,
    temperature_c: `${t.sensor_temperature} (C)`,
    humidity_pct: `${t.sensor_humidity} (%)`,
    pressure_hpa: `${t.sensor_pressure} (hPa)`,
    light_lux: `${t.sensor_light} (lux)`,
    noise_adc: `${t.sensor_noise} (ADC)`,
    sound_level_adc: `${t.sensor_noise} (ADC)`,
  };

  const displayName = fullName.trim() || user?.name || (isCs ? "Neznamy uzivatel" : "Unknown user");
  const notificationOptions = [
    {
      id: "none",
      label: isCs ? "Bez oznameni" : "No notifications",
      desc: isCs ? "Aplikace nebude posilat bezna oznameni." : "The app will not send regular notifications.",
    },
    {
      id: "in_app",
      label: isCs ? "V aplikaci" : "In-app notifications",
      desc: isCs ? "Upozorneni pouze uvnitr aplikace." : "Notifications shown only inside the app.",
    },
    {
      id: "email",
      label: isCs ? "E-mail" : "Email notifications",
      desc: isCs ? "Oznameni budou posilana i na e-mail." : "Notifications will also be sent by email.",
    },
  ] as const;

  const initials = useMemo(() => {
    const parts = displayName.split(" ").filter(Boolean).slice(0, 2);
    if (parts.length === 0) return "U";
    return parts.map((p) => p.charAt(0).toUpperCase()).join("");
  }, [displayName]);

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

  function disableCriticalAlertsWithConfirm() {
    setCriticalAlertsEnabled(false);
    closeDisableCriticalAlertsModal();
  }

  function closeDisableCriticalAlertsModal() {
    setShowDisableCriticalAlertsModal(false);
  }

  function openDisableCriticalAlertsModal() {
    setShowDisableCriticalAlertsModal(true);
  }

  const modeCards: Record<string, { label: string; desc: string; bgImage: string }> = {
    sleep: {
      label: "Sleep",
      desc: isCs ? "Optimalni podminky pro spanek a regeneraci." : "Optimal conditions for sleep and recovery.",
      bgImage: "/images/silent/silent_06_bedroom.png",
    },
    office: {
      label: "Office",
      desc: isCs ? "Podpora soustredeni a produktivity." : "Support focus and productivity.",
      bgImage: "/images/silent/silent_07_office.png",
    },
    sport: {
      label: "Gym",
      desc: isCs ? "Podminky pro fyzickou aktivitu." : "Conditions for physical activity.",
      bgImage: "/images/silent/silent_02_gym.png",
    },
    outdoor: {
      label: "Outside",
      desc: isCs ? "Venkovni mestske nebo prirodni prostredi." : "Outdoor urban or natural environment.",
      bgImage: "/images/silent/silent_03_nature.png",
    },
    school: {
      label: "School",
      desc: isCs ? "Podminky pro uceni a vyuku." : "Conditions for learning and teaching.",
      bgImage: "/images/silent/silent_01_classroom.png",
    },
    factory: {
      label: "Factory",
      desc: isCs ? "Prumyslove a vyrobni prostredi." : "Industrial and manufacturing environment.",
      bgImage: "/images/silent/silent_08_factory.png",
    },
    greenhouse: {
      label: "Greenhouse",
      desc: isCs ? "Optimalni klima pro pestovani rostlin." : "Optimal climate for growing plants.",
      bgImage: "/images/silent/silent_04_greenhouse.png",
    },
  };

  const presetModeIds = useMemo(() => new Set(presets.map((preset) => preset.id)), [presets]);
  const isPresetModeId = (modeId: string): modeId is EnvironmentMode => presetModeIds.has(modeId as EnvironmentMode);

  const unifiedModeCards: ModeCardMeta[] = useMemo(() => {
    const presetCards: ModeCardMeta[] = presets.map((preset) => {
      const info = modeCards[preset.id];
      return {
        id: preset.id,
        label: info?.label ?? preset.name,
        desc: info?.desc ?? preset.description,
        bgImage: info?.bgImage,
      };
    });

    const customCards: ModeCardMeta[] = customModes.map((customMode, index) => ({
      id: customMode.id,
      label: customMode.name,
      desc: customMode.description ?? (isCs ? "Vlastni rezim pro vlastni pravidla mereni." : "Custom mode with your own measurement rules."),
      bgImage: customMode.bgImage ?? CREATE_MODE_IMAGE_OPTIONS[index % CREATE_MODE_IMAGE_OPTIONS.length],
      isCustom: true,
    }));

    return [
      ...presetCards,
      ...customCards,
      {
        id: CREATE_MODE_ID,
        label: isCs ? "Vytvorit novy rezim" : "Create new mode",
        desc: isCs
          ? "Pridat novou karticku modu s vlastnimi hodnotami a preferencemi."
          : "Add a new mode card with your own values and preferences.",
        isCreate: true,
      },
    ];
  }, [customModes, isCs, presets]);

  const expandedCustomMode = expandedModeId ? customModes.find((customMode) => customMode.id === expandedModeId) ?? null : null;
  const activeExpandedCard = expandedModeId ? unifiedModeCards.find((card) => card.id === expandedModeId) ?? null : null;
  const expandedDraft = expandedModeId ? modeThresholdDrafts[expandedModeId] : null;
  const isCreateEditorExpanded = expandedModeId === CREATE_MODE_ID;

  function ensureModeDraft(modeId: string) {
    setModeThresholdDrafts((prev) => {
      if (prev[modeId]) return prev;
      return {
        ...prev,
        [modeId]: thresholdsToPoints(defaultThresholdTemplate),
      };
    });
  }

  function toggleModeEditor(modeId: string) {
    ensureModeDraft(modeId);
    setExpandedModeId((prev) => (prev === modeId ? null : modeId));
    setModeSettingsMessage(null);
  }

  function updateModeThreshold(
    modeId: string,
    metricKey: string,
    thresholdKey: keyof ThresholdPoint,
    rawValue: string
  ) {
    const parsed = Number.parseFloat(rawValue);
    if (!Number.isFinite(parsed)) return;

    setModeThresholdDrafts((prev) => {
      const modeDraft = prev[modeId];
      if (!modeDraft) return prev;

      const metricThreshold = modeDraft[metricKey];
      if (!metricThreshold) return prev;

      return {
        ...prev,
        [modeId]: {
          ...modeDraft,
          [metricKey]: {
            ...metricThreshold,
            [thresholdKey]: parsed,
          },
        },
      };
    });
    setModeSettingsMessage(null);
  }

  function resetModeEditor(modeId: string) {
    const sourceThresholds = isPresetModeId(modeId)
      ? presets.find((preset) => preset.id === modeId)?.thresholds ?? defaultThresholdTemplate
      : defaultThresholdTemplate;

    setModeThresholdDrafts((prev) => ({
      ...prev,
      [modeId]: thresholdsToPoints(sourceThresholds),
    }));
    setModeSettingsMessage(
      isCs ? "Hodnoty režimu byly resetovány na výchozí." : "Mode values were reset to defaults."
    );
  }

  function saveModeEditor(modeId: string) {
    const draft = modeThresholdDrafts[modeId];
    if (!draft) return;

    if (modeId === CREATE_MODE_ID) {
      if (!newModeName.trim()) {
        setModeSettingsMessage(isCs ? "Zadejte nazev noveho rezimu." : "Enter a name for the new mode.");
        return;
      }

      const newCustomModeId = `custom-${Date.now()}`;
      const selectedImageIndex = Math.max(0, CREATE_MODE_IMAGE_OPTIONS.indexOf(newModeImage));
      const nextImageIndex = (selectedImageIndex + 1) % CREATE_MODE_IMAGE_OPTIONS.length;

      setCustomModes((prev) => [
        ...prev,
        {
          id: newCustomModeId,
          name: newModeName.trim().slice(0, 50),
          description: isCs ? "Uzivatelsky vytvoreny vyhodnocovaci rezim." : "User-created evaluation mode.",
          bgImage: newModeImage,
          focusMetric: "co2_ppm",
          intervalSec: 60,
          sensitivity: "balanced",
          autoStart: false,
        },
      ]);

      setModeThresholdDrafts((prev) => ({
        ...prev,
        [newCustomModeId]: clonePointThresholds(draft),
        [CREATE_MODE_ID]: thresholdsToPoints(defaultThresholdTemplate),
      }));

      try {
        const raw = localStorage.getItem("modeThresholdDrafts");
        const stored = raw ? (JSON.parse(raw) as StoredModeThresholds) : {};
        localStorage.setItem(
          "modeThresholdDrafts",
          JSON.stringify({
            ...stored,
            [newCustomModeId]: draft,
            [CREATE_MODE_ID]: thresholdsToPoints(defaultThresholdTemplate),
          })
        );
      } catch {
        // Keep local state even if localStorage is unavailable.
        setModeSettingsMessage(t.storage_error);
      }

      setExpandedModeId(newCustomModeId);
      setNewModeName("");
      setNewModeImage(CREATE_MODE_IMAGE_OPTIONS[nextImageIndex]);
      setModeSettingsMessage(isCs ? "Novy rezim byl vytvoren." : "New mode was created.");
      return;
    }

    try {
      const raw = localStorage.getItem("modeThresholdDrafts");
      const stored = raw ? (JSON.parse(raw) as StoredModeThresholds) : {};
      localStorage.setItem(
        "modeThresholdDrafts",
        JSON.stringify({
          ...stored,
          [modeId]: draft,
        })
      );
      setModeSettingsMessage(
        isCs ? "Hodnoty režimu byly uloženy lokálně." : "Mode values were saved locally."
      );
    } catch {
      setModeSettingsMessage(t.storage_error);
    }
  }

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>{isCs ? "Vyhodnocovací režimy" : "Evaluation modes"}</h1>
      </div>

      <section className="card settings-section">
        <p className="text-secondary" style={{ marginBottom: "0.75rem" }}>
          {isCs
            ? "Klikněte na kartu režimu. Pod ní se rozbalí jeho individuální nastavení a prahy, které můžete upravit."
            : "Click a mode card to expand its individual settings and thresholds, then edit its values."}
        </p>
        <div className="modes-grid">
          {unifiedModeCards.map((card) => {
            const isExpanded = expandedModeId === card.id;
            return (
              <button
                key={card.id}
                className={`mode-card ${isExpanded ? "expanded" : ""} ${card.isCreate ? "mode-card-create" : ""}`}
                onClick={() => toggleModeEditor(card.id)}
                style={{ "--mode-card-bg-image": card.bgImage ? `url(${card.bgImage})` : "none" } as CSSProperties}
                aria-expanded={isExpanded}
              >
                <span className="mode-card-name">{card.label}</span>
                <span className="mode-card-desc">{card.desc}</span>
                {isFavorite(card.id) && <span className="mode-card-badge-fav">{t.favorite}</span>}
                {isExpanded && <span className="mode-card-badge">{isCs ? "Úprava" : "Editing"}</span>}
              </button>
            );
          })}
        </div>

        {expandedModeId && expandedDraft && (
          <div className="mode-editor-panel">
            <div className="mode-editor-head">
              <div className="mode-editor-title-row">
                <h3 className="mode-editor-title">
                  {isCs
                    ? `Nastavení režimu: ${activeExpandedCard?.label ?? (expandedCustomMode?.name ?? expandedModeId)}`
                    : `Mode settings: ${activeExpandedCard?.label ?? (expandedCustomMode?.name ?? expandedModeId)}`}
                </h3>
                {expandedModeId !== CREATE_MODE_ID && (
                  isFavorite(expandedModeId) ? (
                    <button
                      className="btn btn-outline btn-sm mode-fav-btn"
                      onClick={() => toggleFavoriteMode(expandedModeId)}
                    >
                      {t.remove_from_favorites}
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary btn-sm mode-fav-btn"
                      onClick={() => toggleFavoriteMode(expandedModeId)}
                    >
                      {t.add_to_favorites}
                    </button>
                  )
                )}
              </div>
              <p className="mode-editor-description">
                {activeExpandedCard?.desc ?? (isCs ? "Upravte hodnoty podle vasich potreb." : "Adjust values to match your needs.")}
              </p>
            </div>

            {isCreateEditorExpanded && (
              <div className="mode-create-fields">
                <div className="form-group">
                  <label className="form-label">{isCs ? "Nazev noveho rezimu" : "New mode name"}</label>
                  <input
                    className="form-input"
                    value={newModeName}
                    maxLength={50}
                    onChange={(event) => setNewModeName(event.target.value.slice(0, 50))}
                    placeholder={isCs ? "napr. Focus Plus" : "e.g. Focus Plus"}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{isCs ? "Obrazek karty" : "Card image"}</label>
                  <select
                    className="form-select"
                    value={newModeImage}
                    onChange={(event) => setNewModeImage(event.target.value)}
                  >
                    {CREATE_MODE_IMAGE_OPTIONS.map((imagePath, index) => (
                      <option key={imagePath} value={imagePath}>
                        {isCs ? `Motiv ${index + 1}` : `Theme ${index + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="mode-editor-grid">
              {Object.entries(expandedDraft).map(([metricKey, threshold]) => (
                <article key={metricKey} className="mode-editor-card">
                  <h4 className="mode-editor-metric">{metricLabels[metricKey] ?? metricKey}</h4>
                  <div className="mode-editor-inputs">
                    <label className="mode-editor-input-group">
                      <span>{isCs ? "Idealni hodnota" : "Ideal value"}</span>
                      <input
                        type="number"
                        className="form-input mode-editor-input"
                        value={threshold.ideal}
                        onChange={(event) => updateModeThreshold(expandedModeId, metricKey, "ideal", event.target.value)}
                      />
                    </label>
                    <label className="mode-editor-input-group">
                      <span>{isCs ? "Dobra hodnota" : "Good value"}</span>
                      <input
                        type="number"
                        className="form-input mode-editor-input"
                        value={threshold.good}
                        onChange={(event) => updateModeThreshold(expandedModeId, metricKey, "good", event.target.value)}
                      />
                    </label>
                    <label className="mode-editor-input-group">
                      <span>{isCs ? "Stredni hodnota" : "Moderate value"}</span>
                      <input
                        type="number"
                        className="form-input mode-editor-input"
                        value={threshold.moderate}
                        onChange={(event) => updateModeThreshold(expandedModeId, metricKey, "moderate", event.target.value)}
                      />
                    </label>
                    <label className="mode-editor-input-group">
                      <span>{isCs ? "Spatna hodnota" : "Poor value"}</span>
                      <input
                        type="number"
                        className="form-input mode-editor-input"
                        value={threshold.poor}
                        onChange={(event) => updateModeThreshold(expandedModeId, metricKey, "poor", event.target.value)}
                      />
                    </label>
                  </div>
                </article>
              ))}
            </div>

            <div className="mode-editor-actions">
              <button className="btn btn-primary btn-sm mode-editor-action-btn" onClick={() => saveModeEditor(expandedModeId)}>
                {isCs ? "Uložit hodnoty" : "Save values"}
              </button>
              <button className="btn btn-outline btn-sm mode-editor-action-btn" onClick={() => resetModeEditor(expandedModeId)}>
                {isCs ? "Resetovat režim" : "Reset mode"}
              </button>
              {modeSettingsMessage && <p className="mode-editor-note">{modeSettingsMessage}</p>}
            </div>
          </div>
        )}

      </section>

      <div className="page-header settings-group-header">
        <h1>{isCs ? "Uživatelský profil" : "User profile"}</h1>
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
          {profileMessage && <p className="settings-inline-message">{(t as unknown as Record<string, string>)[profileMessage] ?? profileMessage}</p>}
        </div>
      </section>

      <section className="card settings-section">
        <h2 className="section-title">{t.preferences}</h2>
        <div className="settings-preferences-grid">
          <div className="settings-preference-row">
            <div className="settings-preference-copy">
              <span className="settings-preference-label">{t.theme}</span>
              <span className="settings-preference-desc">
                {isCs ? "Vyberte preferovany vzhled aplikace." : "Choose your preferred app appearance."}
              </span>
            </div>
            <div className="pref-toggle-group settings-segmented-control">
              <button
                type="button"
                className={`pref-toggle-btn ${theme === "light" ? "active" : ""}`}
                onClick={() => setTheme("light")}
              >
                {t.theme_light}
              </button>
              <button
                type="button"
                className={`pref-toggle-btn ${theme === "dark" ? "active" : ""}`}
                onClick={() => setTheme("dark")}
              >
                {t.theme_dark}
              </button>
            </div>
          </div>

          <div className="settings-preference-row">
            <div className="settings-preference-copy">
              <span className="settings-preference-label">{t.language}</span>
              <span className="settings-preference-desc">
                {isCs ? "Zvolte jazyk aplikace." : "Choose the app language."}
              </span>
            </div>
            <div className="pref-toggle-group settings-segmented-control">
              <button
                type="button"
                className={`pref-toggle-btn ${locale === "cs" ? "active" : ""}`}
                onClick={() => setLocale("cs")}
              >
                CZ
              </button>
              <button
                type="button"
                className={`pref-toggle-btn ${locale === "en" ? "active" : ""}`}
                onClick={() => setLocale("en")}
              >
                EN
              </button>
            </div>
          </div>

          <div className="settings-preference-row settings-preference-row-wide">
            <div className="settings-preference-copy">
              <span className="settings-preference-label">
                {isCs ? "Notifikace a alerty" : "Notifications and alerts"}
              </span>
              <span className="settings-preference-desc">
                {isCs
                  ? "Vyberte, kam se budou posilat bezna oznameni."
                  : "Choose where regular notifications should be delivered."}
              </span>
            </div>
            <div
              className="settings-notification-options"
              role="radiogroup"
              aria-label={isCs ? "Rezim oznameni" : "Notification mode"}
            >
              {notificationOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`settings-notification-option ${notificationChannel === option.id ? "active" : ""}`}
                  onClick={() => setNotificationChannel(option.id)}
                  role="radio"
                  aria-checked={notificationChannel === option.id}
                >
                  <span className="settings-notification-option-label">{option.label}</span>
                  <span className="settings-notification-option-desc">{option.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="settings-preference-row settings-critical-alert-row">
            <div className="settings-preference-copy">
              <span className="settings-preference-label">
                {isCs ? "Mereni nebezpecnych hodnot" : "Dangerous-value alerts"}
              </span>
              <span className={`settings-preference-desc ${!criticalAlertsEnabled ? "settings-preference-desc-danger" : ""}`}>
                {criticalAlertsEnabled
                  ? (isCs
                    ? "Alerty na kriticke hodnoty jsou zapnute."
                    : "Alerts for critical values are currently enabled.")
                  : (isCs
                    ? "Alerty na kriticke hodnoty jsou vypnute."
                    : "Alerts for critical values are currently disabled.")}
              </span>
            </div>
            <div className="settings-critical-alert-cta">
              {criticalAlertsEnabled ? (
                <button
                  type="button"
                  className="btn btn-danger btn-sm settings-critical-alert-btn"
                  onClick={openDisableCriticalAlertsModal}
                >
                  {isCs ? "Vypnout kriticke alerty" : "Disable critical alerts"}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-outline btn-sm settings-critical-alert-btn"
                  onClick={() => setCriticalAlertsEnabled(true)}
                >
                  {isCs ? "Znovu zapnout kriticke alerty" : "Enable critical alerts"}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {showDisableCriticalAlertsModal && (
        <div className="modal-overlay" onClick={closeDisableCriticalAlertsModal}>
          <div
            className="modal-card settings-alert-confirm-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="modal-text">
              {isCs
                ? "Opravdu chcete vypnout notifikace o mereni nebezpecnych hodnot? Muzete je kdykoliv znovu zapnout."
                : "Are you sure you want to disable dangerous-value measurement alerts? You can enable them again anytime."}
            </p>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={closeDisableCriticalAlertsModal}>
                {isCs ? "Zrusit" : "Cancel"}
              </button>
              <button className="btn btn-danger" onClick={disableCriticalAlertsWithConfirm}>
                {isCs ? "Ano, vypnout" : "Yes, disable"}
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="settings-section settings-signout-section">
        <button className="btn btn-danger settings-signout-btn" onClick={logout}>
          <LogOut size={18} />
          <span>{t.sign_out}</span>
        </button>
      </section>
    </div>
  );
}
