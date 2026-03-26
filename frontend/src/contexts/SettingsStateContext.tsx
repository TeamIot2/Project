// Shared settings state so desktop and mobile panels stay in sync in dual view

import { createContext, useContext, useState, useRef, useEffect, type ReactNode, type ChangeEvent } from "react";

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

interface SettingsState {
  nickname: string;
  setNickname: (v: string) => void;
  fullName: string;
  setFullName: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  timezone: string;
  setTimezone: (v: string) => void;
  profileMessage: string | null;
  setProfileMessage: (v: string | null) => void;

  notificationsEnabled: boolean;
  setNotificationsEnabled: (v: boolean) => void;
  pushAlertsEnabled: boolean;
  setPushAlertsEnabled: (v: boolean) => void;
  weeklyDigestEnabled: boolean;
  setWeeklyDigestEnabled: (v: boolean) => void;
  refreshInterval: string;
  setRefreshInterval: (v: string) => void;
  notificationChannel: NotificationChannel;
  setNotificationChannel: (v: NotificationChannel) => void;
  criticalAlertsEnabled: boolean;
  setCriticalAlertsEnabled: (v: boolean) => void;
  twoFactorEnabled: boolean;
  setTwoFactorEnabled: (v: boolean) => void;
  sessionTimeout: string;
  setSessionTimeout: (v: string) => void;

  customModes: CustomMode[];
  setCustomModes: React.Dispatch<React.SetStateAction<CustomMode[]>>;
  newModeName: string;
  setNewModeName: (v: string) => void;
  expandedModeId: string | null;
  setExpandedModeId: React.Dispatch<React.SetStateAction<string | null>>;

  avatarPreview: string | null;
  handleAvatarChange: (event: ChangeEvent<HTMLInputElement>) => void;
  removeAvatar: () => void;
  avatarInputRef: React.RefObject<HTMLInputElement>;
}

const SettingsStateContext = createContext<SettingsState | null>(null);

export function SettingsStateProvider({ children }: { children: ReactNode }) {
  const [nickname, setNickname] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [pushAlertsEnabled, setPushAlertsEnabled] = useState(true);
  const [weeklyDigestEnabled, setWeeklyDigestEnabled] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState("30");
  const [notificationChannel, setNotificationChannel] = useState<NotificationChannel>("in_app");
  const [criticalAlertsEnabled, setCriticalAlertsEnabled] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState("30");

  const [customModes, setCustomModes] = useState<CustomMode[]>([]);
  const [newModeName, setNewModeName] = useState("");
  const [expandedModeId, setExpandedModeId] = useState<string | null>(null);

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
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
        fullName, setFullName,
        phone, setPhone,
        timezone, setTimezone,
        profileMessage, setProfileMessage,
        notificationsEnabled, setNotificationsEnabled,
        pushAlertsEnabled, setPushAlertsEnabled,
        weeklyDigestEnabled, setWeeklyDigestEnabled,
        refreshInterval, setRefreshInterval,
        notificationChannel, setNotificationChannel,
        criticalAlertsEnabled, setCriticalAlertsEnabled,
        twoFactorEnabled, setTwoFactorEnabled,
        sessionTimeout, setSessionTimeout,
        customModes, setCustomModes,
        newModeName, setNewModeName,
        expandedModeId, setExpandedModeId,
        avatarPreview, handleAvatarChange, removeAvatar, avatarInputRef,
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
