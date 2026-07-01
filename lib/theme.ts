import React, { createContext, useContext } from "react";
import { Platform, useColorScheme } from "react-native";

const IS_NATIVE = Platform.OS !== "web";

// TodayFit: dark teal chrome, frosted cards, teal primary / blue secondary — soft fills muted for legibility
const todayFitPalette = {
  background: "rgba(12,28,54,0.48)",
  /** Frosted slate — high enough opacity for labels over the pattern background (esp. iOS). */
  card: "rgba(22,30,46,0.84)",
  cardOpaque: "rgba(22,30,46,0.94)",
  /** Accordion / preference rows — extra opacity so white labels stay readable on native. */
  sectionSurface: "rgba(22,30,46,0.93)",
  border: "rgba(148,163,184,0.34)",
  /** Stronger outline for rank badges / chips on saturated native displays. */
  borderStrong: "rgba(148,163,184,0.52)",
  text: "#f8fafc",
  textMuted: "rgba(226,232,240,0.84)",
  primary: "#2dd4bf",
  /** Solid teal for small indicators (radio dot, etc.) — calmer than `primary` */
  primarySolid: "#14b8a6",
  primarySoft: "rgba(13,148,136,0.12)",
  secondary: "#60a5fa",
  secondarySoft: "rgba(59,130,246,0.1)",
  chipBackground: "rgba(22,30,46,0.8)",
  chipSelectedBackground: "rgba(13,148,136,0.26)",
  chipSelectedText: "#ccfbf1",
  chipSelectedBorder: "#14b8a6",
  danger: "#f87171",
};

// Slightly heavier frost + contrast for system dark mode
const todayFitDarkPalette = {
  ...todayFitPalette,
  background: "rgba(6,16,38,0.58)",
  card: "rgba(15,23,42,0.86)",
  cardOpaque: "rgba(15,23,42,0.94)",
  sectionSurface: "rgba(15,23,42,0.93)",
  border: "rgba(148,163,184,0.28)",
  borderStrong: "rgba(148,163,184,0.46)",
  primarySoft: "rgba(13,148,136,0.1)",
  secondarySoft: "rgba(59,130,246,0.08)",
  chipBackground: "rgba(15,23,42,0.82)",
  chipSelectedBackground: "rgba(13,148,136,0.22)",
  chipSelectedText: "#bfe9e4",
};

/** iOS/Android: fully opaque surfaces — rgba still bleeds the pattern through on native. */
const todayFitNativePalette = {
  ...todayFitPalette,
  card: "#161e2e",
  cardOpaque: "#161e2e",
  sectionSurface: "#161e2e",
  chipBackground: "#1e293b",
  border: "rgba(148,163,184,0.55)",
  borderStrong: "rgba(148,163,184,0.68)",
  chipSelectedBorder: "#2dd4bf",
  chipSelectedBackground: "rgba(45,212,191,0.2)",
};

const todayFitDarkNativePalette = {
  ...todayFitDarkPalette,
  card: "#0f172a",
  cardOpaque: "#0f172a",
  sectionSurface: "#0f172a",
  chipBackground: "#1e293b",
  border: "rgba(148,163,184,0.5)",
  borderStrong: "rgba(148,163,184,0.62)",
  chipSelectedBorder: "#2dd4bf",
  chipSelectedBackground: "rgba(45,212,191,0.18)",
};

export type Theme = typeof todayFitPalette;

const themeOverrideContext = createContext<Theme | null>(null);

type ThemeOverrideProviderProps = {
  theme?: Theme | null;
  children: React.ReactNode;
};

export const cleanFlowPalette: Theme = {
  background: "#f7f3ec",
  card: "#fffdf8",
  cardOpaque: "#fffdf8",
  sectionSurface: "#fffdf8",
  border: "rgba(44,38,32,0.12)",
  borderStrong: "rgba(44,38,32,0.18)",
  text: "#231f1a",
  textMuted: "rgba(35,31,26,0.66)",
  primary: "#b7791f",
  primarySolid: "#9c6417",
  primarySoft: "rgba(183,121,31,0.12)",
  secondary: "#e8ddcd",
  secondarySoft: "rgba(183,121,31,0.09)",
  chipBackground: "#fffdf8",
  chipSelectedBackground: "rgba(183,121,31,0.14)",
  chipSelectedText: "#5f3d0e",
  chipSelectedBorder: "#b7791f",
  danger: "#b91c1c",
};

export function ThemeOverrideProvider({ theme, children }: ThemeOverrideProviderProps) {
  return React.createElement(
    themeOverrideContext.Provider,
    { value: theme ?? null },
    children
  );
}

export function useTheme(): Theme {
  const override = useContext(themeOverrideContext);
  if (override != null) {
    return override;
  }
  return cleanFlowPalette;
}

export function useLegacyTheme(): Theme {
  const scheme = useColorScheme();
  if (IS_NATIVE) {
    return scheme === "dark" ? todayFitDarkNativePalette : todayFitNativePalette;
  }
  return scheme === "dark" ? todayFitDarkPalette : todayFitPalette;
}
