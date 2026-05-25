import { useColorScheme } from "react-native";

// TodayFit: dark teal chrome, frosted cards, teal primary / blue secondary — soft fills muted for legibility
const todayFitPalette = {
  background: "rgba(12,28,54,0.48)",
  card: "rgba(30,41,59,0.52)",
  cardOpaque: "rgba(30,41,59,0.9)",
  border: "rgba(148,163,184,0.34)",
  text: "#f8fafc",
  textMuted: "rgba(226,232,240,0.84)",
  primary: "#2dd4bf",
  /** Solid teal for small indicators (radio dot, etc.) — calmer than `primary` */
  primarySolid: "#14b8a6",
  primarySoft: "rgba(13,148,136,0.14)",
  secondary: "#60a5fa",
  secondarySoft: "rgba(59,130,246,0.12)",
  chipBackground: "rgba(30,41,59,0.5)",
  chipSelectedBackground: "rgba(13,148,136,0.18)",
  chipSelectedText: "#ccfbf1",
  chipSelectedBorder: "#14b8a6",
  danger: "#f87171",
};

// Slightly heavier frost + contrast for system dark mode
const todayFitDarkPalette = {
  ...todayFitPalette,
  background: "rgba(6,16,38,0.58)",
  card: "rgba(15,23,42,0.55)",
  cardOpaque: "rgba(15,23,42,0.92)",
  border: "rgba(148,163,184,0.28)",
  primarySoft: "rgba(13,148,136,0.12)",
  secondarySoft: "rgba(59,130,246,0.1)",
  chipBackground: "rgba(15,23,42,0.52)",
  chipSelectedBackground: "rgba(13,148,136,0.15)",
  chipSelectedText: "#bfe9e4",
};

export type Theme = typeof todayFitPalette;

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === "dark" ? todayFitDarkPalette : todayFitPalette;
}
