// Visual style switcher context — manages which of the 10 visual styles is active.
// Each style defines image path prefixes/suffixes for hero backgrounds and environment scenes.

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

export interface VisualStyle {
  id: number;
  name: string;
  accent: string; // button background color
  heroPrefix: string; // path prefix for hero BG images, e.g. "/images/style2_dark/s2_hero_"
  scenePrefix: string; // path prefix for env scene images, e.g. "/images/style2_dark/s2_"
  heroSuffix: string; // e.g. ".png"
  sceneSuffix: string; // e.g. ".png"
}

const styles: VisualStyle[] = [
  { id: 1, name: "Warm Premium", accent: "#D97706", heroPrefix: "/images/style1_warm/s1_hero_", scenePrefix: "/images/style1_warm/s1_", heroSuffix: ".png", sceneSuffix: ".png" },
  { id: 2, name: "Dark Tech", accent: "#3B82F6", heroPrefix: "/images/style2_dark/s2_hero_", scenePrefix: "/images/style2_dark/s2_", heroSuffix: ".png", sceneSuffix: ".png" },
  { id: 3, name: "Nature", accent: "#22C55E", heroPrefix: "/images/style3_nature/s3_hero_", scenePrefix: "/images/style3_nature/s3_", heroSuffix: ".png", sceneSuffix: ".png" },
  { id: 4, name: "Nordic", accent: "#7DD3FC", heroPrefix: "/images/style4_nordic/s4_hero_", scenePrefix: "/images/style4_nordic/s4_", heroSuffix: ".png", sceneSuffix: ".png" },
  { id: 5, name: "Vibrant", accent: "#F472B6", heroPrefix: "/images/style5_vibrant/s5_hero_", scenePrefix: "/images/style5_vibrant/s5_", heroSuffix: ".png", sceneSuffix: ".png" },
  { id: 6, name: "Retro", accent: "#B45309", heroPrefix: "/images/style6_retro/s6_hero_", scenePrefix: "/images/style6_retro/s6_", heroSuffix: ".png", sceneSuffix: ".png" },
  { id: 7, name: "Industrial", accent: "#6B7280", heroPrefix: "/images/style7_industrial/s7_hero_", scenePrefix: "/images/style7_industrial/s7_", heroSuffix: ".png", sceneSuffix: ".png" },
  { id: 8, name: "Ocean", accent: "#0EA5E9", heroPrefix: "/images/style8_ocean/s8_hero_", scenePrefix: "/images/style8_ocean/s8_", heroSuffix: ".png", sceneSuffix: ".png" },
  { id: 9, name: "Desert", accent: "#DC2626", heroPrefix: "/images/style9_desert/s9_hero_", scenePrefix: "/images/style9_desert/s9_", heroSuffix: ".png", sceneSuffix: ".png" },
  { id: 16, name: "Figma", accent: "#3B82F6", heroPrefix: "/images/style2_dark/s2_hero_", scenePrefix: "/images/style2_dark/s2_", heroSuffix: ".png", sceneSuffix: ".png" },
];

interface StyleState {
  activeStyle: VisualStyle;
  setStyle: (id: number) => void;
  allStyles: VisualStyle[];
}

const StyleContext = createContext<StyleState | null>(null);

export function useVisualStyle(): StyleState {
  const ctx = useContext(StyleContext);
  if (!ctx) throw new Error("useVisualStyle must be used within StyleProvider");
  return ctx;
}

export function StyleProvider({ children }: { children: React.ReactNode }) {
  const [styleId, setStyleId] = useState(() => {
    const stored = localStorage.getItem("visualStyle");
    return stored ? parseInt(stored, 10) : 2; // Default to Dark Tech
  });

  const setStyle = useCallback((id: number) => {
    setStyleId(id);
    localStorage.setItem("visualStyle", String(id));
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-style", String(styleId));
  }, [styleId]);

  const activeStyle = styles.find(s => s.id === styleId) ?? styles[1];

  return (
    <StyleContext.Provider value={{ activeStyle, setStyle, allStyles: styles }}>
      {children}
    </StyleContext.Provider>
  );
}
