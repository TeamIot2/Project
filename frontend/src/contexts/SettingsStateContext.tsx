// Shared settings state so desktop and mobile panels stay in sync in dual view

import { createContext, useContext, useState, useRef, useEffect, useCallback, type ReactNode, type ChangeEvent } from "react";
import { useAuth } from "./AuthContext";
import { normalizeTimeZone } from "../utils/timeZone";

type NotificationChannel = "none" | "in_app" | "email" | "both";

type CustomMode = {
  id: string;
  name: string;
  description?: string;
  bgImage?: string;
  focusMetric: string;
  intervalSec: number;
  sensitivity: "low" | "balanced" | "high";
  autoStart: boolean;
};

type ModeMetaOverride = {
  name?: string;
  description?: string;
};

type ModeMetaOverrides = Record<string, ModeMetaOverride>;

interface SettingsState {
  nickname: string;
  setNickname: (v: string) => void;
  timezone: string;
  setTimezone: (v: string) => void;
  profileMessage: string | null;
  setProfileMessage: (v: string | null) => void;

  notificationChannel: NotificationChannel;
  setNotificationChannel: (v: NotificationChannel) => void;
  inAppNotificationsEnabled: boolean;
  setInAppNotificationsEnabled: (v: boolean) => void;
  emailNotificationsEnabled: boolean;
  setEmailNotificationsEnabled: (v: boolean) => void;
  criticalAlertsEnabled: boolean;
  setCriticalAlertsEnabled: (v: boolean) => void;

  customModes: CustomMode[];
  setCustomModes: React.Dispatch<React.SetStateAction<CustomMode[]>>;
  modeMetaOverrides: ModeMetaOverrides;
  setModeMetaOverrides: React.Dispatch<React.SetStateAction<ModeMetaOverrides>>;
  newModeName: string;
  setNewModeName: (v: string) => void;
  expandedModeId: string | null;
  setExpandedModeId: React.Dispatch<React.SetStateAction<string | null>>;

  avatarPreview: string | null;
  setAvatarFromUser: (avatarUrl: string | null | undefined) => void;
  handleAvatarChange: (event: ChangeEvent<HTMLInputElement>) => void;
  avatarInputRef: React.RefObject<HTMLInputElement>;

  favoriteModes: string[];
  toggleFavoriteMode: (modeId: string) => void;
  isFavorite: (modeId: string) => boolean;
  canAddFavorite: boolean;
}

const SettingsStateContext = createContext<SettingsState | null>(null);
const TIMEZONE_STORAGE_KEY = "userTimeZone";
const NOTIFICATION_CHANNEL_STORAGE_KEY = "notificationChannel";

function normalizeNotificationChannel(value: unknown): NotificationChannel {
  if (value === "none" || value === "in_app" || value === "email" || value === "both") {
    return value;
  }
  return "in_app";
}

function loadStoredNotificationChannel(): NotificationChannel {
  try {
    return normalizeNotificationChannel(localStorage.getItem(NOTIFICATION_CHANNEL_STORAGE_KEY));
  } catch {
    return "in_app";
  }
}

function notificationChannelFromFlags(inAppEnabled: boolean, emailEnabled: boolean): NotificationChannel {
  if (inAppEnabled && emailEnabled) return "both";
  if (inAppEnabled) return "in_app";
  if (emailEnabled) return "email";
  return "none";
}

function notificationChannelHasInApp(channel: NotificationChannel): boolean {
  return channel === "in_app" || channel === "both";
}

function notificationChannelHasEmail(channel: NotificationChannel): boolean {
  return channel === "email" || channel === "both";
}

function loadStoredTimeZone(): string {
  try {
    return normalizeTimeZone(localStorage.getItem(TIMEZONE_STORAGE_KEY));
  } catch {
    return normalizeTimeZone(undefined);
  }
}

function loadStoredCustomModes(): CustomMode[] {
  try {
    const raw = localStorage.getItem("customModes");
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((mode): mode is CustomMode => {
        if (!mode || typeof mode !== "object") return false;
        const candidate = mode as Partial<CustomMode>;
        return (
          typeof candidate.id === "string" &&
          candidate.id.startsWith("custom-") &&
          typeof candidate.name === "string" &&
          typeof candidate.focusMetric === "string" &&
          typeof candidate.intervalSec === "number" &&
          ["low", "balanced", "high"].includes(candidate.sensitivity ?? "") &&
          typeof candidate.autoStart === "boolean"
        );
      })
      .map((mode) => ({
        ...mode,
        name: mode.name.trim().slice(0, 50),
        description: mode.description?.trim().slice(0, 120),
        bgImage: mode.bgImage,
      }))
      .filter((mode) => mode.name.length > 0);
  } catch {
    return [];
  }
}

function loadStoredModeMetaOverrides(): ModeMetaOverrides {
  try {
    const raw = localStorage.getItem("modeMetaOverrides");
    if (!raw) return {};

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    const result: ModeMetaOverrides = {};
    for (const [modeId, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!value || typeof value !== "object" || Array.isArray(value)) continue;
      const candidate = value as Record<string, unknown>;
      let name = typeof candidate.name === "string" ? candidate.name.trim().slice(0, 50) : undefined;
      let description = typeof candidate.description === "string" ? candidate.description.trim().slice(0, 120) : undefined;
      if (modeId === "office") {
        if (name === "Office" || name === "Kancelář") name = undefined;
        if (description === "Office environment" || description === "Kancelářské prostředí") description = undefined;
      }
      if (name || description) {
        result[modeId] = {
          ...(name ? { name } : {}),
          ...(description ? { description } : {}),
        };
      }
    }
    return result;
  } catch {
    return {};
  }
}

export function SettingsStateProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [nickname, setNickname] = useState("");
  const [timezone, setTimezoneState] = useState(loadStoredTimeZone);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  const [notificationChannel, setNotificationChannelState] = useState<NotificationChannel>(loadStoredNotificationChannel);
  const [criticalAlertsEnabled, setCriticalAlertsEnabled] = useState(true);

  const [customModes, setCustomModes] = useState<CustomMode[]>(loadStoredCustomModes);
  const [modeMetaOverrides, setModeMetaOverrides] = useState<ModeMetaOverrides>(loadStoredModeMetaOverrides);
  const [newModeName, setNewModeName] = useState("");
  const [expandedModeId, setExpandedModeId] = useState<string | null>(null);

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [favoriteModes, setFavoriteModes] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem("favoriteModes");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.filter((v): v is string => typeof v === "string").slice(0, 3);
      }
    } catch { /* ignore */ }
    return ["sleep", "office", "sport"];
  });

  useEffect(() => {
    try {
      localStorage.setItem("favoriteModes", JSON.stringify(favoriteModes));
    } catch { /* ignore */ }
  }, [favoriteModes]);

  useEffect(() => {
    try {
      localStorage.setItem("customModes", JSON.stringify(customModes));
    } catch { /* ignore */ }
  }, [customModes]);

  useEffect(() => {
    try {
      localStorage.setItem("modeMetaOverrides", JSON.stringify(modeMetaOverrides));
    } catch { /* ignore */ }
  }, [modeMetaOverrides]);

  const toggleFavoriteMode = useCallback((modeId: string) => {
    setFavoriteModes((prev) => {
      if (prev.includes(modeId)) {
        return prev.filter((id) => id !== modeId);
      }
      if (prev.length >= 3) {
        // Keep max 3 favorites; when full, drop the oldest and append the new one.
        return [...prev.slice(1), modeId];
      }
      return [...prev, modeId];
    });
  }, []);

  const isFavorite = useCallback((modeId: string) => favoriteModes.includes(modeId), [favoriteModes]);

  // Adding is always allowed: at 3/3 we rotate favorites by replacing the oldest.
  const canAddFavorite = true;

  const setTimezone = useCallback((value: string) => {
    setTimezoneState(normalizeTimeZone(value));
  }, []);

  const setNotificationChannel = useCallback((value: NotificationChannel) => {
    setNotificationChannelState(normalizeNotificationChannel(value));
  }, []);

  const inAppNotificationsEnabled = notificationChannelHasInApp(notificationChannel);
  const emailNotificationsEnabled = notificationChannelHasEmail(notificationChannel);

  const setInAppNotificationsEnabled = useCallback((enabled: boolean) => {
    setNotificationChannelState((currentChannel) =>
      notificationChannelFromFlags(enabled, notificationChannelHasEmail(currentChannel))
    );
  }, []);

  const setEmailNotificationsEnabled = useCallback((enabled: boolean) => {
    setNotificationChannelState((currentChannel) =>
      notificationChannelFromFlags(notificationChannelHasInApp(currentChannel), enabled)
    );
  }, []);

  useEffect(() => {
    setTimezoneState(normalizeTimeZone(user?.timezone));
  }, [user?.id, user?.timezone]);

  useEffect(() => {
    try {
      localStorage.setItem(TIMEZONE_STORAGE_KEY, timezone);
    } catch { /* ignore */ }
  }, [timezone]);

  useEffect(() => {
    try {
      localStorage.setItem(NOTIFICATION_CHANNEL_STORAGE_KEY, notificationChannel);
    } catch { /* ignore */ }
  }, [notificationChannel]);

  const setAvatarFromUser = useCallback((avatarUrl: string | null | undefined) => {
    setAvatarPreview(avatarUrl?.trim() || null);
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  }, []);

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    // MIME type validation: only accept image files
    if (!file.type.startsWith("image/")) {
      setProfileMessage("avatar_invalid_type");
      // Reset the file input so the same file can be re-selected
      if (avatarInputRef.current) avatarInputRef.current.value = "";
      return;
    }

    // File size validation: reject files larger than 5 MB
    const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_AVATAR_SIZE) {
      setProfileMessage("avatar_too_large");
      if (avatarInputRef.current) avatarInputRef.current.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        setProfileMessage("avatar_invalid_type");
        if (avatarInputRef.current) avatarInputRef.current.value = "";
        return;
      }

      setAvatarPreview(reader.result);
      setProfileMessage("Profile image updated.");
    };
    reader.onerror = () => {
      setProfileMessage("avatar_invalid_type");
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    };
    reader.readAsDataURL(file);
  }

  return (
    <SettingsStateContext.Provider
      value={{
        nickname, setNickname,
        timezone, setTimezone,
        profileMessage, setProfileMessage,
        notificationChannel, setNotificationChannel,
        inAppNotificationsEnabled, setInAppNotificationsEnabled,
        emailNotificationsEnabled, setEmailNotificationsEnabled,
        criticalAlertsEnabled, setCriticalAlertsEnabled,
        customModes, setCustomModes,
        modeMetaOverrides, setModeMetaOverrides,
        newModeName, setNewModeName,
        expandedModeId, setExpandedModeId,
        avatarPreview, setAvatarFromUser, handleAvatarChange, avatarInputRef,
        favoriteModes, toggleFavoriteMode, isFavorite, canAddFavorite,
      }}
    >
      {children}
    </SettingsStateContext.Provider>
  );
}

export const useSettingsState = () => {
  const ctx = useContext(SettingsStateContext);
  if (!ctx) throw new Error("useSettingsState must be inside SettingsStateProvider");
  return ctx;
};
