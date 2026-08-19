import React from "react";
import Svg, { Circle, Path } from "react-native-svg";
import { useTheme } from "../lib/theme";

type Props = {
  size?: number;
  color?: string;
};

/**
 * Line-art skis + ball for Sport-Focused chrome (replaces sparkles, which read as generic AI diamonds).
 */
export function SportFocusedIcon({ size = 16, color }: Props) {
  const theme = useTheme();
  const stroke = color ?? theme.primary;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4.5 20.5 L9 4.5"
        stroke={stroke}
        strokeWidth={1.75}
        strokeLinecap="round"
      />
      <Path
        d="M8 20.5 L12.5 4.5"
        stroke={stroke}
        strokeWidth={1.75}
        strokeLinecap="round"
      />
      <Path
        d="M6.2 12.5 H11.2"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <Circle cx="17.25" cy="16" r="4.75" stroke={stroke} strokeWidth={1.75} />
      <Path
        d="M13.6 14.4 C15.4 13.3 19.1 13.3 20.9 14.4"
        stroke={stroke}
        strokeWidth={1.2}
        strokeLinecap="round"
      />
      <Path
        d="M13.6 17.7 C15.4 18.8 19.1 18.8 20.9 17.7"
        stroke={stroke}
        strokeWidth={1.2}
        strokeLinecap="round"
      />
      <Path
        d="M17.25 11.25 V20.75"
        stroke={stroke}
        strokeWidth={1.2}
        strokeLinecap="round"
      />
    </Svg>
  );
}
