import React, { useMemo } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Svg, { Defs, Pattern, Path, Rect } from "react-native-svg";

// From repo Landing: hexagons + mountain peaks in a 120x120 pattern (emerald/blue strokes)
const PATTERN_SIZE = 120;
const EMERALD_400 = "#34d399";
const BLUE_400 = "#60a5fa";
const EMERALD_500 = "#10b981";
const BLUE_500 = "#3b82f6";

export function GeometricPatternBackground() {
  const { width, height } = useMemo(() => Dimensions.get("window"), []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <Pattern
            id="geometric-pattern"
            x="0"
            y="0"
            width={PATTERN_SIZE}
            height={PATTERN_SIZE}
            patternUnits="userSpaceOnUse"
          >
            {/* Hexagons */}
            <Path
              d="M30 0 L60 15 L60 45 L30 60 L0 45 L0 15 Z"
              fill="none"
              stroke={EMERALD_400}
              strokeWidth={1}
            />
            <Path
              d="M90 30 L120 45 L120 75 L90 90 L60 75 L60 45 Z"
              fill="none"
              stroke={BLUE_400}
              strokeWidth={1}
            />
            {/* Mountain peaks */}
            <Path
              d="M0 90 L15 60 L30 90"
              fill="none"
              stroke={EMERALD_500}
              strokeWidth={1.5}
            />
            <Path
              d="M90 0 L105 30 L120 0"
              fill="none"
              stroke={BLUE_500}
              strokeWidth={1.5}
            />
          </Pattern>
        </Defs>
        <Rect
          x="0"
          y="0"
          width={width}
          height={height}
          fill="url(#geometric-pattern)"
          opacity={0.2}
        />
      </Svg>
    </View>
  );
}
