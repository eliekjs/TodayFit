import { useColorScheme } from "react-native";

// TodayFit: matches welcome/landing — dark teal, frosted cards, teal/green primary, blue accent
const todayFitPalette = {
  background: "rgba(4,18,43,0.6)",
  card: "rgba(15,23,42,0.42)",
  cardOpaque: "rgba(15,23,42,0.86)",
  border: "rgba(148,163,184,0.26)",
  text: "#f8fafc",
  textMuted: "rgba(226,232,240,0.78)",
  primary: "#2dd4bf",
  primarySoft: "rgba(45,212,191,0.22)",
  secondary: "#3b82f6",
  secondarySoft: "rgba(59,130,246,0.22)",
  chipBackground: "rgba(15,23,42,0.45)",
  chipSelectedBackground: "rgba(45,212,191,0.24)",
  chipSelectedText: "#2dd4bf",
  chipSelectedBorder: "#2dd4bf",
  danger: "#f87171",
};

// Slightly darker for dark mode
const todayFitDarkPalette = {
  ...todayFitPalette,
  background: "rgba(3,10,27,0.66)",
  card: "rgba(15,23,42,0.48)",
  cardOpaque: "rgba(15,23,42,0.9)",
  border: "rgba(148,163,184,0.22)",
  primarySoft: "rgba(45,212,191,0.18)",
  secondarySoft: "rgba(59,130,246,0.18)",
  chipSelectedBackground: "rgba(45,212,191,0.2)",
};

export type Theme = typeof todayFitPalette;

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === "dark" ? todayFitDarkPalette : todayFitPalette;
}
