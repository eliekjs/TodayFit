import React from "react";
import Svg, { Rect } from "react-native-svg";

type Props = {
  size?: number;
  background?: string;
  foreground?: string;
};

/** Rounded mark: interlocking chain links on a teal square. */
export function SeshLogicMark({
  size = 36,
  background = "#315F6A",
  foreground = "#FFFFFF",
}: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36">
      <Rect width="36" height="36" rx="8" fill={background} />
      <Rect
        x="7.5"
        y="15.25"
        width="16.5"
        height="9.5"
        rx="4.75"
        fill="none"
        stroke={foreground}
        strokeWidth={2.15}
      />
      <Rect
        x="16.75"
        y="7.5"
        width="9.5"
        height="16.5"
        rx="4.75"
        fill="none"
        stroke={foreground}
        strokeWidth={2.15}
      />
    </Svg>
  );
}
