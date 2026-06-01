import { useColorScheme } from "react-native";

// TodayFit: dark teal chrome, frosted cards, teal primary / blue secondary — soft fills muted for legibility
const todayFitPalette = {
  background: "rgba(12,28,54,0.48)",
  /** Frosted slate — high enough opacity for labels over the pattern background (esp. iOS). */
  card: "rgba(22,30,46,0.84)",
  cardOpaque: "rgba(22,30,46,0.94)",
  /** Accordion / preference rows — extra opacity so white labels stay readable on native. */
  sectionSurface: "rgba(22,30,46,0.93)",
  border: "rgba(148,163,184,0.34)",
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
  primarySoft: "rgba(13,148,136,0.1)",
  secondarySoft: "rgba(59,130,246,0.08)",
  chipBackground: "rgba(15,23,42,0.82)",
  chipSelectedBackground: "rgba(13,148,136,0.22)",
  chipSelectedText: "#bfe9e4",
};

export type Theme = typeof todayFitPalette;

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === "dark" ? todayFitDarkPalette : todayFitPalette;
}
