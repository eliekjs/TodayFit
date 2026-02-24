import { useColorScheme } from "react-native";

const lightPalette = {
  background: "#F7F7F9",
  card: "#FFFFFF",
  border: "#E0E0E5",
  text: "#111111",
  textMuted: "#6B6B80",
  primary: "#2563EB",
  primarySoft: "#E0EAFF",
  secondary: "#111827",
  secondarySoft: "#E5E7EB",
  chipBackground: "#E5E7EB",
  chipSelectedBackground: "#111827",
  chipSelectedText: "#FFFFFF",
  danger: "#DC2626",
};

const darkPalette = {
  background: "#050816",
  card: "#0B1020",
  border: "#1F2937",
  text: "#F9FAFB",
  textMuted: "#9CA3AF",
  primary: "#60A5FA",
  primarySoft: "#1E293B",
  secondary: "#F9FAFB",
  secondarySoft: "#111827",
  chipBackground: "#111827",
  chipSelectedBackground: "#F9FAFB",
  chipSelectedText: "#020617",
  danger: "#F87171",
};

export type Theme = typeof lightPalette;

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === "dark" ? darkPalette : lightPalette;
}
