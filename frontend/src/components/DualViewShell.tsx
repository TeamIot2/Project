// Dual-view shell: renders app content once (single panel) or twice (desktop + mobile)
// when viewport exceeds 1439px

import { useState, useEffect, createContext, useContext, type FC } from "react";
import { useLocation } from "react-router-dom";
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
  const location = useLocation();
  const [isWideEnough, setIsWideEnough] = useState(
    () => window.matchMedia(DUAL_VIEW_MEDIA_QUERY).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(DUAL_VIEW_MEDIA_QUERY);
    const handler = (e: MediaQueryListEvent) => setIsWideEnough(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const isLoginRoute = location.pathname === "/login";
  const isDual = !isLoginRoute && dualViewEnabled && isWideEnough;

  useEffect(() => {
    if (!isDual) return;

    const getMobileMainWrapper = () =>
      document.querySelector<HTMLElement>(".dual-view-shell.dual .mobile-panel .main-wrapper");

    const syncMobileScrollWithPage = () => {
      const mobileMainWrapper = getMobileMainWrapper();
      if (!mobileMainWrapper) return;
      const pageScrollable = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const mobileScrollable = Math.max(0, mobileMainWrapper.scrollHeight - mobileMainWrapper.clientHeight);
      if (mobileScrollable === 0) {
        mobileMainWrapper.scrollTop = 0;
        return;
      }
      if (pageScrollable === 0) return;
      const ratio = Math.min(1, Math.max(0, window.scrollY / pageScrollable));
      mobileMainWrapper.scrollTop = ratio * mobileScrollable;
    };

    const handleMobileWheel = (event: WheelEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const inMobilePanel = target.closest(".dual-view-shell.dual .mobile-panel");
      if (!inMobilePanel) return;
      const mobileMainWrapper = getMobileMainWrapper();
      if (!mobileMainWrapper) return;

      const pageScrollable = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const mobileScrollable = Math.max(0, mobileMainWrapper.scrollHeight - mobileMainWrapper.clientHeight);

      if (pageScrollable > 0) {
        event.preventDefault();
        window.scrollBy({ top: event.deltaY, left: 0, behavior: "auto" });
        return;
      }

      if (mobileScrollable > 0) {
        event.preventDefault();
        const nextScrollTop = Math.min(
          mobileScrollable,
          Math.max(0, mobileMainWrapper.scrollTop + event.deltaY)
        );
        mobileMainWrapper.scrollTop = nextScrollTop;
      }
    };

    syncMobileScrollWithPage();
    const raf = requestAnimationFrame(syncMobileScrollWithPage);
    window.addEventListener("scroll", syncMobileScrollWithPage, { passive: true });
    window.addEventListener("resize", syncMobileScrollWithPage);
    document.addEventListener("wheel", handleMobileWheel, { passive: false });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", syncMobileScrollWithPage);
      window.removeEventListener("resize", syncMobileScrollWithPage);
      document.removeEventListener("wheel", handleMobileWheel);
    };
  }, [isDual]);

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
