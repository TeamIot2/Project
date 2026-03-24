// Dual-view preference context: enables/disables side-by-side desktop+mobile rendering.

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

interface DualViewPreferenceState {
  dualViewEnabled: boolean;
  setDualViewEnabled: (enabled: boolean) => void;
}

const STORAGE_KEY = "dualViewEnabled";
const INIT_KEY = "dualViewInitialized";

const DualViewPreferenceContext = createContext<DualViewPreferenceState | null>(null);

export function useDualViewPreference(): DualViewPreferenceState {
  const ctx = useContext(DualViewPreferenceContext);
  if (!ctx) throw new Error("useDualViewPreference must be used within DualViewPreferenceProvider");
  return ctx;
}

export function DualViewPreferenceProvider({ children }: { children: React.ReactNode }) {
  const [dualViewEnabled, setDualViewEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const initialized = window.localStorage.getItem(INIT_KEY) === "1";
    if (!initialized) {
      window.localStorage.setItem(INIT_KEY, "1");
      window.localStorage.setItem(STORAGE_KEY, "1");
      return true;
    }
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === null) return true;
    return stored === "1";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, dualViewEnabled ? "1" : "0");
  }, [dualViewEnabled]);

  const value = useMemo(
    () => ({ dualViewEnabled, setDualViewEnabled }),
    [dualViewEnabled]
  );

  return (
    <DualViewPreferenceContext.Provider value={value}>
      {children}
    </DualViewPreferenceContext.Provider>
  );
}
