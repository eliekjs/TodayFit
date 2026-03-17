import { useColorScheme } from "react-native";

// TodayFit: matches welcome/landing — dark teal, frosted cards, teal/green primary, blue accent
const todayFitPalette = {
  background: "#0e3d4d",
  card: "rgba(255,255,255,0.08)",
  cardOpaque: "#134a5c",
  border: "rgba(255,255,255,0.12)",
  text: "#f8fafc",
  textMuted: "rgba(248,250,252,0.7)",
  primary: "#2dd4bf",
  primarySoft: "rgba(45,212,191,0.2)",
  secondary: "#3b82f6",
  secondarySoft: "rgba(59,130,246,0.2)",
  chipBackground: "rgba(255,255,255,0.1)",
  chipSelectedBackground: "rgba(45,212,191,0.25)",
  chipSelectedText: "#2dd4bf",
  chipSelectedBorder: "#2dd4bf",
  danger: "#f87171",
};

// Slightly darker for dark mode
const todayFitDarkPalette = {
  ...todayFitPalette,
  background: "#0a2f3d",
  card: "rgba(255,255,255,0.06)",
  cardOpaque: "#0f3d4d",
  border: "rgba(255,255,255,0.1)",
  primarySoft: "rgba(45,212,191,0.15)",
  secondarySoft: "rgba(59,130,246,0.15)",
  chipSelectedBackground: "rgba(45,212,191,0.2)",
};

export type Theme = typeof todayFitPalette;

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === "dark" ? todayFitDarkPalette : todayFitPalette;
}
