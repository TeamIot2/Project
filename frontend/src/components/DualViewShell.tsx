// Dual-view shell: renders app content once (single panel) or twice (desktop + mobile)
// when viewport exceeds 1439px

import { useState, useEffect, createContext, useContext, type FC } from "react";
import { useDualViewPreference } from "../contexts/DualViewPreferenceContext";
import { DUAL_VIEW_MEDIA_QUERY } from "../constants/dualView";

type PanelType = "single" | "desktop" | "mobile";
const PanelContext = createContext<PanelType>("single");
export const usePanelType = () => useContext(PanelContext);

interface DualViewShellProps {
  Content: FC;
}

export default function DualViewShell({ Content }: DualViewShellProps) {
  const { dualViewEnabled } = useDualViewPreference();
  const [isWideEnough, setIsWideEnough] = useState(
    () => window.matchMedia(DUAL_VIEW_MEDIA_QUERY).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(DUAL_VIEW_MEDIA_QUERY);
    const handler = (e: MediaQueryListEvent) => setIsWideEnough(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const isDual = dualViewEnabled && isWideEnough;

  if (!isDual) {
    return (
      <div className="dual-view-shell single">
        <div className="app-panel">
          <PanelContext.Provider value="single">
            <Content />
          </PanelContext.Provider>
        </div>
      </div>
    );
  }

  return (
    <div className="dual-view-shell dual">
      <div className="app-panel desktop-panel">
        <PanelContext.Provider value="desktop">
          <Content />
        </PanelContext.Provider>
      </div>
      <div className="dual-view-divider" />
      <div className="app-panel mobile-panel">
        <PanelContext.Provider value="mobile">
          <Content />
        </PanelContext.Provider>
      </div>
    </div>
  );
}
