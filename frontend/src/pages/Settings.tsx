// Settings page: profile, preferences, unified environments, thresholds, security

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useLocation } from "react-router-dom";
import { apiPatch } from "../api";
import { useAuth } from "../contexts/AuthContext";
import { useEnvironment } from "../contexts/EnvironmentContext";
import { useI18n } from "../contexts/I18nContext";
import { useTheme } from "../contexts/ThemeContext";
import { useSettingsState } from "../contexts/SettingsStateContext";
import { ModalPortal } from "../components/ModalPortal";
import type { EnvironmentMode, ThresholdRange, User } from "../types";
import {
  clonePointThresholds,
  cloneThresholdPoint,
  BEDROOM_MODE_ID,
  MODE_THRESHOLD_STORAGE_KEY,
  OFFICE_FROM_BEDROOM_MIGRATION_KEY,
  notifyModeThresholdsUpdated,
  normalizeThresholdPointForMetric,
  parseThresholdNumber,
  storedThresholdToPoint,
  thresholdsToPoints,
  UNICORN_MODE_ID,
  type StoredModeThresholds,
  type StoredThresholdValue,
  type ThresholdPoint,
} from "../utils/modeThresholdStorage";
import { resolveAvatarSrc } from "../utils/avatar";
import { withMockModeSuffix } from "../utils/modeLabels";
import { getTimeZoneOptions } from "../utils/timeZone";

type ModeThresholdDrafts = Record<string, Record<string, ThresholdPoint>>;
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

const ENVIRONMENT_NAME_MAX_LENGTH = 50;
const ENVIRONMENT_DESCRIPTION_MAX_LENGTH = 120;
const UNSAFE_TEXT_PATTERN = /[<>\\{}[\]`]/;
const CONTROL_TEXT_PATTERN = /[\u0000-\u001F\u007F]/;
const PROFILE_SCROLL_OFFSET_PX = 18;
const RECOMMENDED_CZ_THRESHOLD_POINTS: Record<string, ThresholdPoint> = {
  co2_ppm: { ideal: 0, tolerancePct: 0, lowerBad: null, upperBad: 1500, notification: 1000, critical: 2000 },
  temperature_c: { ideal: 21, tolerancePct: 0, lowerBad: 10, upperBad: 30, notification: 28, critical: 35 },
  humidity_pct: { ideal: 45, tolerancePct: 0, lowerBad: 25, upperBad: 75, notification: 70, critical: 90 },
  pressure_hpa: { ideal: 1013, tolerancePct: 0, lowerBad: 970, upperBad: 1050, notification: 1045, critical: 1070 },
  light_lux: { ideal: 500, tolerancePct: 0, lowerBad: 50, upperBad: 1200, notification: 1000, critical: 2000 },
  noise_adc: { ideal: 30, tolerancePct: 0, lowerBad: null, upperBad: 75, notification: 70, critical: 85 },
  sound_level_adc: { ideal: 30, tolerancePct: 0, lowerBad: null, upperBad: 75, notification: 70, critical: 85 },
};

function normalizeEnvironmentText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function hasUnsafeText(value: string): boolean {
  return UNSAFE_TEXT_PATTERN.test(value) || CONTROL_TEXT_PATTERN.test(value);
}

function findScrollParent(element: HTMLElement): HTMLElement | Window {
  let parent = element.parentElement;

  while (parent) {
    const style = window.getComputedStyle(parent);
    const overflowY = style.overflowY;
    if ((overflowY === "auto" || overflowY === "scroll") && parent.scrollHeight > parent.clientHeight) {
      return parent;
    }
    parent = parent.parentElement;
  }

  return window;
}

function scrollElementIntoVisibleStart(element: HTMLElement): void {
  const scrollParent = findScrollParent(element);

  if (scrollParent === window) {
    const targetTop = window.scrollY + element.getBoundingClientRect().top - PROFILE_SCROLL_OFFSET_PX;
    window.scrollTo({ top: Math.max(0, targetTop), behavior: "auto" });
    return;
  }

  const scrollElement = scrollParent as HTMLElement;
  const parentRect = scrollElement.getBoundingClientRect();
  const targetTop =
    scrollElement.scrollTop +
    element.getBoundingClientRect().top -
    parentRect.top -
    PROFILE_SCROLL_OFFSET_PX;

  scrollElement.scrollTo({ top: Math.max(0, targetTop), behavior: "auto" });
}

function scrollToUserProfileHeading(): void {
  const target = document.getElementById("user-profile");
  if (!target) return;
  scrollElementIntoVisibleStart(target);
}

function storedToPointThresholds(
  storedMode: Record<string, StoredThresholdValue> | undefined,
  fallbackRanges: Record<string, ThresholdRange>
): Record<string, ThresholdPoint> {
  const fallback = thresholdsToPoints(fallbackRanges);
  if (!storedMode) return fallback;

  const storedPoints: Record<string, ThresholdPoint> = {};
  for (const [metricKey, storedThreshold] of Object.entries(storedMode)) {
    const normalizedThreshold = storedThresholdToPoint(storedThreshold);
    if (normalizedThreshold) {
      storedPoints[metricKey] = normalizeThresholdPointForMetric(metricKey, normalizedThreshold);
    }
  }

  return clonePointThresholds({
    ...fallback,
    ...clonePointThresholds(storedPoints),
  });
}

export default function Settings() {
  const { user, updateCurrentUser } = useAuth();
  const { presets } = useEnvironment();
  const { locale, t, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const isCs = locale === "cs";

  const {
    nickname, setNickname,
    timezone, setTimezone,
    profileMessage, setProfileMessage,
    setNotificationChannel,
    inAppNotificationsEnabled, setInAppNotificationsEnabled,
    emailNotificationsEnabled, setEmailNotificationsEnabled,
    criticalAlertsEnabled, setCriticalAlertsEnabled,
    customModes, setCustomModes,
    modeMetaOverrides, setModeMetaOverrides,
    newModeName, setNewModeName,
    expandedModeId, setExpandedModeId,
    avatarPreview, setAvatarFromUser, handleAvatarChange, removeAvatar, avatarInputRef,
    toggleFavoriteMode, isFavorite,
  } = useSettingsState();

  const [newModeImage, setNewModeImage] = useState<string>(CREATE_MODE_IMAGE_OPTIONS[0]);
  const [modeThresholdDrafts, setModeThresholdDrafts] = useState<ModeThresholdDrafts>({});
  const [modeSettingsMessage, setModeSettingsMessage] = useState<string | null>(null);
  const [modeNameDraft, setModeNameDraft] = useState("");
  const [modeDescriptionDraft, setModeDescriptionDraft] = useState("");
  const [showDisableCriticalAlertsModal, setShowDisableCriticalAlertsModal] = useState(false);
  const [showDeleteProfileModal, setShowDeleteProfileModal] = useState(false);
  const [deleteEnvironmentTargetId, setDeleteEnvironmentTargetId] = useState<string | null>(null);
  const timeZoneOptions = useMemo(() => getTimeZoneOptions(locale, timezone), [locale, timezone]);

  const defaultThresholdTemplate = useMemo(() => {
    if (presets.length === 0) return {};
    const basePreset = presets.find((preset) => preset.id === "office") ?? presets[0];
    return basePreset.thresholds;
  }, [presets]);

  useEffect(() => {
    if (!user?.name) return;
    if (!nickname.trim()) setNickname(user.name);
  }, [user?.name]); // Intentional: only run on user name change

  useEffect(() => {
    setAvatarFromUser(user?.avatar_url ?? null);
  }, [setAvatarFromUser, user?.avatar_url, user?.id]);

  useEffect(() => {
    if (location.hash !== "#user-profile") return;

    const timeoutIds: number[] = [];
    const scheduleScroll = (delayMs: number) => {
      const timeoutId = window.setTimeout(() => {
        requestAnimationFrame(scrollToUserProfileHeading);
      }, delayMs);
      timeoutIds.push(timeoutId);
    };

    scheduleScroll(0);
    scheduleScroll(80);
    scheduleScroll(240);
    scheduleScroll(500);

    return () => {
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, [location.hash, location.key, expandedModeId, modeThresholdDrafts]);

  useEffect(() => {
    if (presets.length === 0) return;

    setModeThresholdDrafts((prev) => {
      const next: ModeThresholdDrafts = { ...prev };
      let changed = false;
      let storedDrafts: StoredModeThresholds = {};

      try {
        const raw = localStorage.getItem(MODE_THRESHOLD_STORAGE_KEY);
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

  useEffect(() => {
    const bedroomDraft = modeThresholdDrafts[BEDROOM_MODE_ID];
    if (!bedroomDraft) return;

    try {
      if (localStorage.getItem(OFFICE_FROM_BEDROOM_MIGRATION_KEY) === "done") return;
    } catch {
      return;
    }

    setModeThresholdDrafts((prev) => {
      const currentBedroomDraft = prev[BEDROOM_MODE_ID];
      if (!currentBedroomDraft) return prev;
      const copiedBedroomDraft = clonePointThresholds(currentBedroomDraft);

      if (JSON.stringify(prev[UNICORN_MODE_ID]) === JSON.stringify(copiedBedroomDraft)) {
        try {
          localStorage.setItem(OFFICE_FROM_BEDROOM_MIGRATION_KEY, "done");
        } catch {
          // No-op: state already has the desired values.
        }
        return prev;
      }

      const next = {
        ...prev,
        [UNICORN_MODE_ID]: copiedBedroomDraft,
      };

      try {
        const raw = localStorage.getItem(MODE_THRESHOLD_STORAGE_KEY);
        const stored = raw ? (JSON.parse(raw) as StoredModeThresholds) : {};
        localStorage.setItem(
          MODE_THRESHOLD_STORAGE_KEY,
          JSON.stringify({
            ...stored,
            [UNICORN_MODE_ID]: next[UNICORN_MODE_ID],
          })
        );
        localStorage.setItem(OFFICE_FROM_BEDROOM_MIGRATION_KEY, "done");
        notifyModeThresholdsUpdated();
      } catch {
        // Keep the in-memory copy if localStorage is unavailable.
      }

      return next;
    });
  }, [modeThresholdDrafts]);

  // Friendly metric labels (translated)
  const metricLabels: Record<string, string> = {
    co2_ppm: `${t.sensor_co2} (ppm)`,
    temperature_c: `${t.sensor_temperature} (C)`,
    humidity_pct: `${t.sensor_humidity} (%)`,
    pressure_hpa: `${t.sensor_pressure} (hPa)`,
    light_lux: `${t.sensor_light} (lux)`,
    noise_adc: `${t.sensor_noise} (dB)`,
    sound_level_adc: `${t.sensor_noise} (dB)`,
  };

  const displayName = nickname.trim() || user?.name || (isCs ? "Neznámý uživatel" : "Unknown user");
  const avatarPreviewSrc = resolveAvatarSrc(avatarPreview);
  const notificationOptions = [
    {
      id: "none",
      label: isCs ? "Bez notifikací" : "No notifications",
      desc: isCs ? "Aplikace nebude posílat běžné notifikace." : "The app will not send regular notifications.",
    },
    {
      id: "in_app",
      label: isCs ? "V aplikaci" : "In-app notifications",
      desc: isCs ? "Upozornění pouze uvnitř aplikace." : "Notifications shown only inside the app.",
    },
    {
      id: "email",
      label: isCs ? "E-mail" : "Email notifications",
      desc: isCs ? "Notifikace budou posílány i na e-mail." : "Notifications will also be sent by email.",
    },
  ] as const;

  const isNotificationOptionActive = (optionId: (typeof notificationOptions)[number]["id"]) => {
    if (optionId === "none") return !inAppNotificationsEnabled && !emailNotificationsEnabled;
    if (optionId === "in_app") return inAppNotificationsEnabled;
    return emailNotificationsEnabled;
  };

  const handleNotificationOptionClick = (optionId: (typeof notificationOptions)[number]["id"]) => {
    if (optionId === "none") {
      setNotificationChannel("none");
      return;
    }

    if (optionId === "in_app") {
      setInAppNotificationsEnabled(!inAppNotificationsEnabled);
      return;
    }

    setEmailNotificationsEnabled(!emailNotificationsEnabled);
  };

  const initials = useMemo(() => {
    const parts = displayName.split(" ").filter(Boolean).slice(0, 2);
    if (parts.length === 0) return "U";
    return parts.map((p) => p.charAt(0).toUpperCase()).join("");
  }, [displayName]);

  async function saveProfile() {
    if (!nickname.trim()) {
      setProfileMessage(isCs ? "Vyplňte jméno." : "Fill in name.");
      return;
    }

    try {
      const updatedUser = await apiPatch<User>("/auth/me", {
        name: nickname.trim(),
        avatar_url: avatarPreview,
        timezone,
      });
      updateCurrentUser(updatedUser);
      setNickname(updatedUser.name);
      setTimezone(updatedUser.timezone ?? timezone);
      setProfileMessage(isCs ? "Profil byl uložen." : "Profile saved.");
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      setProfileMessage(isCs ? `Profil se nepodařilo uložit: ${detail}` : `Profile could not be saved: ${detail}`);
    }
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

  function closeDeleteProfileModal() {
    setShowDeleteProfileModal(false);
  }

  function openDeleteProfileModal() {
    setShowDeleteProfileModal(true);
  }

  function confirmDeleteProfile() {
    closeDeleteProfileModal();
    setProfileMessage(isCs ? "Smazání profilu bylo potvrzeno (demo režim)." : "Profile deletion was confirmed (demo flow).");
  }

  const modeCards: Record<string, { label: string; desc: string; bgImage: string }> = {
    sleep: {
      label: t.env_sleep,
      desc: t.env_sleep_desc,
      bgImage: "/images/silent/silent_06_bedroom.png",
    },
    office: {
      label: t.env_office,
      desc: t.env_office_desc,
      bgImage: "/images/silent/silent_07_office.png",
    },
    sport: {
      label: t.env_sport,
      desc: t.env_sport_desc,
      bgImage: "/images/silent/silent_02_gym.png",
    },
    outdoor: {
      label: t.env_outdoor,
      desc: t.env_outdoor_desc,
      bgImage: "/images/silent/silent_03_nature.png",
    },
    school: {
      label: t.env_school,
      desc: t.env_school_desc,
      bgImage: "/images/silent/silent_01_classroom.png",
    },
    factory: {
      label: t.env_factory,
      desc: t.env_factory_desc,
      bgImage: "/images/silent/silent_08_factory.png",
    },
    greenhouse: {
      label: t.env_greenhouse,
      desc: t.env_greenhouse_desc,
      bgImage: "/images/silent/silent_04_greenhouse.png",
    },
  };

  const presetModeIds = useMemo(() => new Set(presets.map((preset) => preset.id)), [presets]);
  const isPresetModeId = (modeId: string): modeId is EnvironmentMode => presetModeIds.has(modeId as EnvironmentMode);

  const unifiedModeCards: ModeCardMeta[] = useMemo(() => {
    const presetCards: ModeCardMeta[] = presets.map((preset) => {
      const info = modeCards[preset.id];
      const override = modeMetaOverrides[preset.id];
      return {
        id: preset.id,
        label: withMockModeSuffix(preset.id, override?.name ?? info?.label ?? preset.name),
        desc: override?.description ?? info?.desc ?? preset.description,
        bgImage: info?.bgImage,
      };
    });

    const customCards: ModeCardMeta[] = customModes.map((customMode, index) => {
      const override = modeMetaOverrides[customMode.id];
      return {
        id: customMode.id,
        label: override?.name ?? customMode.name,
        desc: override?.description ?? customMode.description ?? (isCs ? "Vlastní prostředí s vlastními pravidly měření." : "Custom environment with your own measurement rules."),
        bgImage: customMode.bgImage ?? CREATE_MODE_IMAGE_OPTIONS[index % CREATE_MODE_IMAGE_OPTIONS.length],
        isCustom: true,
      };
    });

    return [
      ...presetCards,
      ...customCards,
      {
        id: CREATE_MODE_ID,
        label: isCs ? "Nové prostředí" : "New environment",
        desc: isCs
          ? "Přidat novou kartu prostředí s vlastními hodnotami a preferencemi."
          : "Add a new environment card with your own values and preferences.",
        isCreate: true,
      },
    ];
  }, [customModes, isCs, modeMetaOverrides, presets]);

  const expandedCustomMode = expandedModeId ? customModes.find((customMode) => customMode.id === expandedModeId) ?? null : null;
  const activeExpandedCard = expandedModeId ? unifiedModeCards.find((card) => card.id === expandedModeId) ?? null : null;
  const expandedDraft = expandedModeId ? modeThresholdDrafts[expandedModeId] : null;
  const isCreateEditorExpanded = expandedModeId === CREATE_MODE_ID;
  const canDeleteExpandedMode = Boolean(expandedCustomMode);
  const canRestorePresetMeta = Boolean(
    expandedModeId &&
    expandedModeId !== CREATE_MODE_ID &&
    !expandedCustomMode &&
    modeMetaOverrides[expandedModeId]
  );
  const deleteEnvironmentTarget = deleteEnvironmentTargetId
    ? customModes.find((customMode) => customMode.id === deleteEnvironmentTargetId) ?? null
    : null;

  useEffect(() => {
    if (!expandedModeId || expandedModeId === CREATE_MODE_ID) {
      setModeNameDraft("");
      setModeDescriptionDraft("");
      return;
    }

    const card = unifiedModeCards.find((item) => item.id === expandedModeId);
    setModeNameDraft(card?.label ?? "");
    setModeDescriptionDraft(card?.desc ?? "");
  }, [expandedModeId, unifiedModeCards]);

  function validateEnvironmentName(rawName: string, modeId: string): string | null {
    const nextName = normalizeEnvironmentText(rawName);

    if (!nextName) {
      setModeSettingsMessage(isCs ? "Název prostředí nesmí být prázdný." : "Environment name cannot be empty.");
      return null;
    }

    if (nextName.length < 2) {
      setModeSettingsMessage(isCs ? "Název prostředí musí mít alespoň 2 znaky." : "Environment name must be at least 2 characters.");
      return null;
    }

    if (nextName.length > ENVIRONMENT_NAME_MAX_LENGTH) {
      setModeSettingsMessage(
        isCs
          ? `Název prostředí může mít maximálně ${ENVIRONMENT_NAME_MAX_LENGTH} znaků.`
          : `Environment name can be at most ${ENVIRONMENT_NAME_MAX_LENGTH} characters.`
      );
      return null;
    }

    if (hasUnsafeText(nextName)) {
      setModeSettingsMessage(
        isCs
          ? "Název prostředí obsahuje nepovolené znaky."
          : "Environment name contains unsupported characters."
      );
      return null;
    }

    const normalizedCandidate = nextName.toLocaleLowerCase(locale);
    const duplicate = unifiedModeCards
      .filter((card) => !card.isCreate && card.id !== modeId)
      .some((card) => normalizeEnvironmentText(card.label).toLocaleLowerCase(locale) === normalizedCandidate);

    if (duplicate) {
      setModeSettingsMessage(
        isCs
          ? "Prostředí s tímto názvem už existuje."
          : "An environment with this name already exists."
      );
      return null;
    }

    return nextName;
  }

  function validateEnvironmentDescription(rawDescription: string): string | null {
    const nextDescription = normalizeEnvironmentText(rawDescription);

    if (nextDescription.length > ENVIRONMENT_DESCRIPTION_MAX_LENGTH) {
      setModeSettingsMessage(
        isCs
          ? `Popis prostředí může mít maximálně ${ENVIRONMENT_DESCRIPTION_MAX_LENGTH} znaků.`
          : `Environment description can be at most ${ENVIRONMENT_DESCRIPTION_MAX_LENGTH} characters.`
      );
      return null;
    }

    if (hasUnsafeText(nextDescription)) {
      setModeSettingsMessage(
        isCs
          ? "Popis prostředí obsahuje nepovolené znaky."
          : "Environment description contains unsupported characters."
      );
      return null;
    }

    return nextDescription;
  }

  function getPresetDefaultMeta(modeId: string): { name: string; description: string } {
    const preset = presets.find((item) => item.id === modeId);
    const card = modeCards[modeId];
    return {
      name: card?.label ?? preset?.name ?? modeId,
      description: card?.desc ?? preset?.description ?? "",
    };
  }

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

  function saveEnvironmentDetails(modeId: string): boolean {
    if (modeId === CREATE_MODE_ID) return true;

    const nextName = validateEnvironmentName(modeNameDraft, modeId);
    if (!nextName) return false;

    const nextDescription = validateEnvironmentDescription(modeDescriptionDraft);
    if (nextDescription === null) return false;

    if (expandedCustomMode) {
      setCustomModes((prev) =>
        prev.map((customMode) =>
          customMode.id === modeId
            ? {
                ...customMode,
                name: nextName,
                description: nextDescription || undefined,
              }
            : customMode
        )
      );
      setModeMetaOverrides((prev) => {
        if (!prev[modeId]) return prev;
        const next = { ...prev };
        delete next[modeId];
        return next;
      });
    } else {
      const defaults = getPresetDefaultMeta(modeId);
      setModeMetaOverrides((prev) => {
        const next = { ...prev };
        const override = {
          ...(nextName !== defaults.name ? { name: nextName } : {}),
          ...(nextDescription && nextDescription !== defaults.description ? { description: nextDescription } : {}),
        };

        if (Object.keys(override).length === 0) {
          delete next[modeId];
        } else {
          next[modeId] = override;
        }

        return next;
      });
    }

    return true;
  }

  function restorePresetDetails(modeId: string) {
    const defaults = getPresetDefaultMeta(modeId);
    setModeMetaOverrides((prev) => {
      if (!prev[modeId]) return prev;
      const next = { ...prev };
      delete next[modeId];
      return next;
    });
    setModeNameDraft(defaults.name);
    setModeDescriptionDraft(defaults.description);
    setModeSettingsMessage(
      isCs ? "Název a popis prostředí byly vráceny na výchozí hodnoty." : "Environment name and description were restored."
    );
  }

  function openDeleteEnvironmentModal(modeId: string) {
    const modeToDelete = customModes.find((customMode) => customMode.id === modeId);
    if (!modeToDelete) {
      setModeSettingsMessage(
        isCs
          ? "Vestavěné prostředí nejde smazat, aby zůstaly zachované režimy aplikace."
          : "Built-in environments cannot be deleted because the app depends on them."
      );
      return;
    }

    setDeleteEnvironmentTargetId(modeId);
  }

  function closeDeleteEnvironmentModal() {
    setDeleteEnvironmentTargetId(null);
  }

  function confirmDeleteEnvironment() {
    if (!deleteEnvironmentTargetId) return;
    deleteCustomEnvironment(deleteEnvironmentTargetId);
  }

  function deleteCustomEnvironment(modeId: string) {
    const modeToDelete = customModes.find((customMode) => customMode.id === modeId);
    if (!modeToDelete) {
      closeDeleteEnvironmentModal();
      setModeSettingsMessage(
        isCs
          ? "Vestavěné prostředí nejde smazat, aby zůstaly zachované režimy aplikace."
          : "Built-in environments cannot be deleted because the app depends on them."
      );
      return;
    }

    setCustomModes((prev) => prev.filter((customMode) => customMode.id !== modeId));
    setModeMetaOverrides((prev) => {
      if (!prev[modeId]) return prev;
      const next = { ...prev };
      delete next[modeId];
      return next;
    });
    setModeThresholdDrafts((prev) => {
      if (!prev[modeId]) return prev;
      const next = { ...prev };
      delete next[modeId];
      return next;
    });

    if (isFavorite(modeId)) {
      toggleFavoriteMode(modeId);
    }

    let storageError = false;
    try {
      const raw = localStorage.getItem(MODE_THRESHOLD_STORAGE_KEY);
      const stored = raw ? (JSON.parse(raw) as StoredModeThresholds) : {};
      delete stored[modeId];
      localStorage.setItem(MODE_THRESHOLD_STORAGE_KEY, JSON.stringify(stored));
      notifyModeThresholdsUpdated();
    } catch {
      storageError = true;
    }

    closeDeleteEnvironmentModal();
    setExpandedModeId(null);
    setModeSettingsMessage(storageError ? t.storage_error : (isCs ? "Prostředí bylo smazáno." : "Environment was deleted."));
  }

  function updateModeThreshold(
    modeId: string,
    metricKey: string,
    thresholdKey: keyof ThresholdPoint,
    rawValue: string
  ) {
    const parsed = parseThresholdNumber(rawValue);
    if (thresholdKey === "ideal" && parsed === null) return;
    const nextValue = thresholdKey === "tolerancePct"
      ? Math.max(0, Math.min(99, Math.round(parsed ?? 0)))
      : parsed;

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
            [thresholdKey]: nextValue,
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
      isCs ? "Hodnoty prostředí byly resetovány na výchozí." : "Environment values were reset to defaults."
    );
  }

  function applyRecommendedThresholds(modeId: string) {
    const currentDraft = modeThresholdDrafts[modeId];
    if (!currentDraft) return;

    setModeThresholdDrafts((prev) => ({
      ...prev,
      [modeId]: Object.fromEntries(
        Object.keys(currentDraft).map((metricKey) => [
          metricKey,
          cloneThresholdPoint(RECOMMENDED_CZ_THRESHOLD_POINTS[metricKey] ?? {
            ideal: 50,
            tolerancePct: 0,
            lowerBad: 0,
            upperBad: 100,
            notification: 90,
            critical: 120,
          }),
        ])
      ),
    }));

    setModeSettingsMessage(
      isCs
        ? "Doporučené hodnoty byly přednastaveny podle běžných podmínek v ČR."
        : "Recommended values were preset for typical Czech indoor conditions."
    );
  }

  function saveModeEditor(modeId: string) {
    const draft = modeThresholdDrafts[modeId];
    if (!draft) return;

    if (modeId === CREATE_MODE_ID) {
      const validatedNewModeName = validateEnvironmentName(newModeName, CREATE_MODE_ID);
      if (!validatedNewModeName) return;

      let newCustomModeId = `custom-${Date.now()}`;
      let suffix = 1;
      const existingModeIds = new Set([
        ...presets.map((preset) => preset.id),
        ...customModes.map((customMode) => customMode.id),
      ]);
      while (existingModeIds.has(newCustomModeId)) {
        newCustomModeId = `custom-${Date.now()}-${suffix}`;
        suffix += 1;
      }
      const selectedImageIndex = Math.max(0, CREATE_MODE_IMAGE_OPTIONS.indexOf(newModeImage));
      const nextImageIndex = (selectedImageIndex + 1) % CREATE_MODE_IMAGE_OPTIONS.length;

      setCustomModes((prev) => [
        ...prev,
        {
          id: newCustomModeId,
          name: validatedNewModeName,
          description: isCs ? "Uživatelsky vytvořené prostředí." : "User-created environment.",
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
        const raw = localStorage.getItem(MODE_THRESHOLD_STORAGE_KEY);
        const stored = raw ? (JSON.parse(raw) as StoredModeThresholds) : {};
        localStorage.setItem(
          MODE_THRESHOLD_STORAGE_KEY,
          JSON.stringify({
            ...stored,
            [newCustomModeId]: clonePointThresholds(draft),
            [CREATE_MODE_ID]: thresholdsToPoints(defaultThresholdTemplate),
          })
        );
        notifyModeThresholdsUpdated();
      } catch {
        // Keep local state even if localStorage is unavailable.
        setModeSettingsMessage(t.storage_error);
      }

      setExpandedModeId(newCustomModeId);
      setNewModeName("");
      setNewModeImage(CREATE_MODE_IMAGE_OPTIONS[nextImageIndex]);
      setModeSettingsMessage(isCs ? "Nové prostředí bylo vytvořeno." : "New environment was created.");
      return;
    }

    if (!saveEnvironmentDetails(modeId)) return;

    try {
      const raw = localStorage.getItem(MODE_THRESHOLD_STORAGE_KEY);
      const stored = raw ? (JSON.parse(raw) as StoredModeThresholds) : {};
      localStorage.setItem(
        MODE_THRESHOLD_STORAGE_KEY,
        JSON.stringify({
          ...stored,
          [modeId]: clonePointThresholds(draft),
        })
      );
      notifyModeThresholdsUpdated();
      setModeSettingsMessage(
        isCs ? "Prostředí bylo uloženo." : "Environment was saved."
      );
    } catch {
      setModeSettingsMessage(t.storage_error);
    }
  }

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>{isCs ? "Prostředí" : "Environments"}</h1>
      </div>

      <section className="card settings-section">
        <p className="text-secondary" style={{ marginBottom: "0.75rem" }}>
          {isCs
            ? "Klikněte na kartu prostředí. Pod ní se rozbalí jeho individuální nastavení a prahy, které můžete upravit."
            : "Click an environment card to expand its individual settings and thresholds, then edit its values."}
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

        {modeSettingsMessage && (!expandedModeId || !expandedDraft) && (
          <p className="mode-editor-note mode-editor-note-global">{modeSettingsMessage}</p>
        )}

        {expandedModeId && expandedDraft && (
          <div className="mode-editor-panel">
            <div className="mode-editor-head">
              <div className="mode-editor-title-row">
                <h3 className="mode-editor-title">
                  {isCs
                    ? `Nastavení prostředí: ${activeExpandedCard?.label ?? (expandedCustomMode?.name ?? expandedModeId)}`
                    : `Environment settings: ${activeExpandedCard?.label ?? (expandedCustomMode?.name ?? expandedModeId)}`}
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
                {activeExpandedCard?.desc ?? (isCs ? "Upravte hodnoty podle vašich potřeb." : "Adjust values to match your needs.")}
              </p>
            </div>

            {isCreateEditorExpanded && (
              <div className="mode-create-fields">
                <div className="form-group">
                  <label className="form-label">{isCs ? "Název nového prostředí" : "New environment name"}</label>
                  <input
                    className="form-input"
                    value={newModeName}
                    maxLength={ENVIRONMENT_NAME_MAX_LENGTH}
                    onChange={(event) => {
                      setNewModeName(event.target.value.slice(0, ENVIRONMENT_NAME_MAX_LENGTH));
                      setModeSettingsMessage(null);
                    }}
                    placeholder={isCs ? "např. Focus Plus" : "e.g. Focus Plus"}
                  />
                </div>
                <div className="mode-create-image-column">
                  <div
                    className="mode-image-preview"
                    aria-label={isCs ? "Náhled obrázku karty" : "Card image preview"}
                  >
                    <img
                      src={newModeImage}
                      alt=""
                      className="mode-image-preview-img"
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
              </div>
            )}

            {!isCreateEditorExpanded && (
              <div className="mode-meta-fields">
                <div className="form-group">
                  <label className="form-label">{isCs ? "Název prostředí" : "Environment name"}</label>
                  <input
                    className="form-input"
                    value={modeNameDraft}
                    maxLength={ENVIRONMENT_NAME_MAX_LENGTH}
                    onChange={(event) => {
                      setModeNameDraft(event.target.value.slice(0, ENVIRONMENT_NAME_MAX_LENGTH));
                      setModeSettingsMessage(null);
                    }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{isCs ? "Popis prostředí" : "Environment description"}</label>
                  <input
                    className="form-input"
                    value={modeDescriptionDraft}
                    maxLength={ENVIRONMENT_DESCRIPTION_MAX_LENGTH}
                    onChange={(event) => {
                      setModeDescriptionDraft(event.target.value.slice(0, ENVIRONMENT_DESCRIPTION_MAX_LENGTH));
                      setModeSettingsMessage(null);
                    }}
                  />
                </div>
              </div>
            )}

            <div className="mode-editor-grid">
              {Object.entries(expandedDraft).map(([metricKey, threshold]) => (
                <article key={metricKey} className="mode-editor-card">
                  <h4 className="mode-editor-metric">{metricLabels[metricKey] ?? metricKey}</h4>
                  <div className="mode-editor-inputs">
                    <label className="mode-editor-input-group">
                      <span>{isCs ? "Ideální hodnota" : "Ideal value"}</span>
                      <input
                        type="number"
                        className="form-input mode-editor-input"
                        value={threshold.ideal}
                        onChange={(event) => updateModeThreshold(expandedModeId, metricKey, "ideal", event.target.value)}
                      />
                    </label>
                    <label className="mode-editor-input-group mode-editor-input-group-tolerance">
                      <span className="mode-editor-tolerance-label">
                        <span>{isCs ? "!TOLERANCE HODNOCENÍ %" : "!SCORING TOLERANCE %"}</span>
                        <output>{threshold.tolerancePct}</output>
                      </span>
                      <input
                        type="range"
                        className="mode-editor-tolerance-slider"
                        min="0"
                        max="99"
                        step="1"
                        value={threshold.tolerancePct}
                        onChange={(event) => updateModeThreshold(expandedModeId, metricKey, "tolerancePct", event.target.value)}
                      />
                    </label>
                    <label className="mode-editor-input-group">
                      <span>{isCs ? "Minimální hodnota" : "Minimum value"}</span>
                      <input
                        type="number"
                        className="form-input mode-editor-input"
                        value={threshold.lowerBad ?? ""}
                        onChange={(event) => updateModeThreshold(expandedModeId, metricKey, "lowerBad", event.target.value)}
                      />
                    </label>
                    <label className="mode-editor-input-group">
                      <span>{isCs ? "Maximální hodnota" : "Maximum value"}</span>
                      <input
                        type="number"
                        className="form-input mode-editor-input"
                        value={threshold.upperBad ?? ""}
                        onChange={(event) => updateModeThreshold(expandedModeId, metricKey, "upperBad", event.target.value)}
                      />
                    </label>
                    <label className="mode-editor-input-group mode-editor-input-group-notification">
                      <span>{isCs ? "NOTIFIKOVAT PŘI DOSAŽENÍ HODNOTY" : "Notify when value is reached"}</span>
                      <input
                        type="number"
                        className="form-input mode-editor-input mode-editor-input-notification"
                        value={threshold.notification ?? ""}
                        onChange={(event) => updateModeThreshold(expandedModeId, metricKey, "notification", event.target.value)}
                      />
                    </label>
                    <label className="mode-editor-input-group mode-editor-input-group-critical">
                      <span>{isCs ? "Kritická hodnota" : "Critical value"}</span>
                      <input
                        type="number"
                        className="form-input mode-editor-input mode-editor-input-critical"
                        value={threshold.critical ?? ""}
                        onChange={(event) => updateModeThreshold(expandedModeId, metricKey, "critical", event.target.value)}
                      />
                    </label>
                  </div>
                </article>
              ))}
            </div>

            <div className="mode-editor-actions">
              <button className="btn btn-primary btn-sm mode-editor-action-btn" onClick={() => saveModeEditor(expandedModeId)}>
                {isCs ? "Uložit prostředí" : "Save environment"}
              </button>
              <button className="btn btn-outline btn-sm mode-editor-action-btn" onClick={() => resetModeEditor(expandedModeId)}>
                {isCs ? "Resetovat prostředí" : "Reset environment"}
              </button>
              {canRestorePresetMeta && (
                <button className="btn btn-ghost btn-sm mode-editor-action-btn" onClick={() => restorePresetDetails(expandedModeId)}>
                  {isCs ? "Vrátit výchozí název" : "Restore default name"}
                </button>
              )}
              <button className="btn btn-outline btn-sm mode-editor-action-btn" onClick={() => applyRecommendedThresholds(expandedModeId)}>
                {isCs ? "Doporučené hodnoty" : "Recommended values"}
              </button>
              {canDeleteExpandedMode && (
                <button className="btn btn-danger btn-sm mode-editor-action-btn" onClick={() => openDeleteEnvironmentModal(expandedModeId)}>
                  {isCs ? "Smazat prostředí" : "Delete environment"}
                </button>
              )}
              {modeSettingsMessage && <p className="mode-editor-note">{modeSettingsMessage}</p>}
            </div>
          </div>
        )}

      </section>

      <div id="user-profile" className="page-header settings-group-header">
        <h1>{isCs ? "Uživatelský profil" : "User profile"}</h1>
      </div>

      <section className="card settings-section">
        <h2 className="section-title">{t.profile}</h2>
        <div className="profile-info settings-profile-head">
          <div className="settings-avatar-wrap">
            {avatarPreviewSrc ? (
              <img src={avatarPreviewSrc} alt="Profile preview" className="settings-avatar-img" />
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
              {isCs ? "Změnit fotku" : "Change photo"}
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
            <label className="form-label">{isCs ? "Jméno" : "Name"}</label>
            <input className="form-input" value={nickname} onChange={(e) => setNickname(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" value={user?.email ?? ""} readOnly />
          </div>
          <div className="form-group">
            <label className="form-label">{isCs ? "Časové pásmo" : "Time zone"}</label>
            <select className="form-select" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
              {timeZoneOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="settings-section-actions">
          <button className="btn btn-primary" onClick={saveProfile}>
            {isCs ? "Uložit profil" : "Save profile"}
          </button>
          {profileMessage && <p className="settings-inline-message">{(t as unknown as Record<string, string>)[profileMessage] ?? profileMessage}</p>}
        </div>

        <div className="settings-profile-danger-row">
          <div className="settings-preference-copy">
            <span className="settings-preference-label">{isCs ? "Smazání profilu" : "Delete profile"}</span>
            <span className="settings-preference-desc">
              {isCs
                ? "Trvale smaže tento uživatelský profil."
                : "Permanently deletes this user profile."}
            </span>
          </div>
          <div className="settings-critical-alert-cta">
            <button
              type="button"
              className="btn btn-danger btn-sm settings-critical-alert-btn"
              onClick={openDeleteProfileModal}
            >
              {isCs ? "Smazat profil" : "Delete profile"}
            </button>
          </div>
        </div>
      </section>

      <section className="card settings-section">
        <h2 className="section-title">{t.preferences}</h2>
        <div className="settings-preferences-grid">
          <div className="settings-preference-row">
            <div className="settings-preference-copy">
              <span className="settings-preference-label">{t.theme}</span>
              <span className="settings-preference-desc">
                {isCs ? "Vyberte preferovaný vzhled aplikace." : "Choose your preferred app appearance."}
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
                {isCs ? "Notifikace" : "Notifications and alerts"}
              </span>
              <span className="settings-preference-desc">
                {isCs
                  ? "Vyberte, jaké notifikace si přejete dostávat."
                  : "Choose which notifications you want to receive."}
              </span>
            </div>
            <div
              className="settings-notification-options"
              role="group"
              aria-label={isCs ? "Nastavení notifikací" : "Notification settings"}
            >
              {notificationOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`settings-notification-option ${isNotificationOptionActive(option.id) ? "active" : ""}`}
                  onClick={() => handleNotificationOptionClick(option.id)}
                  aria-pressed={isNotificationOptionActive(option.id)}
                >
                  <span className="settings-notification-option-label">{option.label}</span>
                  <span className="settings-notification-option-desc">{option.desc}</span>
                </button>
              ))}
              <button
                type="button"
                className={`settings-notification-option settings-notification-danger-option ${!criticalAlertsEnabled ? "is-disabled" : ""}`}
                onClick={criticalAlertsEnabled ? openDisableCriticalAlertsModal : () => setCriticalAlertsEnabled(true)}
                aria-pressed={criticalAlertsEnabled}
              >
                <span className="settings-notification-option-label">
                  {criticalAlertsEnabled
                    ? (isCs ? "Vypnout kritické výstrahy" : "Disable critical alerts")
                    : (isCs ? "Zapnout kritické výstrahy" : "Enable critical alerts")}
                </span>
                <span className="settings-notification-option-desc">
                  {criticalAlertsEnabled
                    ? (isCs ? "Výstrahy na kritické hodnoty jsou zapnuté." : "Critical-value alerts are enabled.")
                    : (isCs ? "Výstrahy na kritické hodnoty jsou vypnuté." : "Critical-value alerts are disabled.")}
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {showDisableCriticalAlertsModal && (
        <ModalPortal>
          <div className="modal-overlay" onClick={closeDisableCriticalAlertsModal}>
            <div
              className="modal-card settings-alert-confirm-modal"
              onClick={(event) => event.stopPropagation()}
            >
              <p className="modal-text">
                {isCs
                  ? "Opravdu chcete vypnout notifikace o měření nebezpečných hodnot? Můžete je kdykoliv znovu zapnout."
                  : "Are you sure you want to disable dangerous-value measurement alerts? You can enable them again anytime."}
              </p>
              <div className="modal-actions">
                <button className="btn btn-outline" onClick={closeDisableCriticalAlertsModal}>
                  {isCs ? "Zrušit" : "Cancel"}
                </button>
                <button className="btn btn-danger" onClick={disableCriticalAlertsWithConfirm}>
                  {isCs ? "Ano, vypnout" : "Yes, disable"}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {deleteEnvironmentTarget && (
        <ModalPortal>
          <div className="modal-overlay" onClick={closeDeleteEnvironmentModal}>
            <div
              className="modal-card settings-alert-confirm-modal"
              onClick={(event) => event.stopPropagation()}
            >
              <p className="modal-text">
                {isCs
                  ? `Opravdu si přejete trvale smazat prostředí "${deleteEnvironmentTarget.name}"? Smažou se i jeho uložené hodnoty.`
                  : `Are you sure you want to permanently delete the environment "${deleteEnvironmentTarget.name}"? Its saved values will also be removed.`}
              </p>
              <div className="modal-actions">
                <button className="btn btn-outline" onClick={closeDeleteEnvironmentModal}>
                  {isCs ? "Zrušit" : "Cancel"}
                </button>
                <button className="btn btn-danger" onClick={confirmDeleteEnvironment}>
                  {isCs ? "Ano, smazat prostředí" : "Yes, delete environment"}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {showDeleteProfileModal && (
        <ModalPortal>
          <div className="modal-overlay" onClick={closeDeleteProfileModal}>
            <div
              className="modal-card settings-alert-confirm-modal"
              onClick={(event) => event.stopPropagation()}
            >
              <p className="modal-text">
                {isCs
                  ? "Opravdu si přejete trvale smazat svůj profil?"
                  : "Are you sure you want to permanently delete your profile?"}
              </p>
              <div className="modal-actions">
                <button className="btn btn-outline" onClick={closeDeleteProfileModal}>
                  {isCs ? "Zrušit" : "Cancel"}
                </button>
                <button className="btn btn-danger" onClick={confirmDeleteProfile}>
                  {isCs ? "Ano, smazat profil" : "Yes, delete profile"}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}

