// Shared settings state so desktop and mobile panels stay in sync in dual view

import { createContext, useContext, useState, useRef, useEffect, useCallback, type ReactNode, type ChangeEvent } from "react";

type NotificationChannel = "none" | "in_app" | "email";

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
  handleAvatarChange: (event: ChangeEvent<HTMLInputElement>) => void;
  removeAvatar: () => void;
  avatarInputRef: React.RefObject<HTMLInputElement>;

  favoriteModes: string[];
  toggleFavoriteMode: (modeId: string) => void;
  isFavorite: (modeId: string) => boolean;
  canAddFavorite: boolean;
}

const SettingsStateContext = createContext<SettingsState | null>(null);

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
  const [nickname, setNickname] = useState("");
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  const [notificationChannel, setNotificationChannel] = useState<NotificationChannel>("in_app");
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

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

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

    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(URL.createObjectURL(file));
    setProfileMessage("Profile image updated.");
  }

  function removeAvatar() {
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
      setAvatarPreview(null);
      setProfileMessage("Profile image removed.");
    }
  }

  return (
    <SettingsStateContext.Provider
      value={{
        nickname, setNickname,
        timezone, setTimezone,
        profileMessage, setProfileMessage,
        notificationChannel, setNotificationChannel,
        criticalAlertsEnabled, setCriticalAlertsEnabled,
        customModes, setCustomModes,
        modeMetaOverrides, setModeMetaOverrides,
        newModeName, setNewModeName,
        expandedModeId, setExpandedModeId,
        avatarPreview, handleAvatarChange, removeAvatar, avatarInputRef,
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
