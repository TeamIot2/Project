// Shared expansion state so desktop and mobile panels stay in sync

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface ExpandedDevicesState {
  expandedIds: Set<string>;
  toggle: (id: string) => void;
  isExpanded: (id: string) => boolean;
}

const ExpandedDevicesContext = createContext<ExpandedDevicesState>({
  expandedIds: new Set(),
  toggle: () => {},
  isExpanded: () => false,
});

export function ExpandedDevicesProvider({ children }: { children: ReactNode }) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const isExpanded = useCallback(
    (id: string) => expandedIds.has(id),
    [expandedIds]
  );

  return (
    <ExpandedDevicesContext.Provider value={{ expandedIds, toggle, isExpanded }}>
      {children}
    </ExpandedDevicesContext.Provider>
  );
}

export const useExpandedDevices = () => useContext(ExpandedDevicesContext);
