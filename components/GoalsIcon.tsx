import React from "react";
import Svg, { Circle, Path } from "react-native-svg";
import { useTheme } from "../lib/theme";

type Props = {
  size?: number;
  color?: string;
};

/**
 * Target mark for Goals chrome — distinct from the Workout tab barbell
 * and from SportFocusedIcon.
 */
export function GoalsIcon({ size = 16, color }: Props) {
  const theme = useTheme();
  const stroke = color ?? theme.primary;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="8.25" stroke={stroke} strokeWidth={1.75} />
      <Circle cx="12" cy="12" r="4.25" stroke={stroke} strokeWidth={1.5} />
      <Path
        d="M12 3.5 V7.25"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <Path
        d="M20.5 12 H16.75"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}
