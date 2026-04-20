import React, { useMemo } from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import Svg, { G, Path } from "react-native-svg";

// From repo Landing: hexagons + mountain peaks in a 120x120 pattern (emerald/blue strokes)
const PATTERN_SIZE = 120;
const EMERALD_400 = "#34d399";
const BLUE_400 = "#60a5fa";
const EMERALD_500 = "#10b981";
const BLUE_500 = "#3b82f6";

export function GeometricPatternBackground() {
  const { width: winW, height: winH } = useWindowDimensions();
  const width = Math.max(1, winW);
  const height = Math.max(1, winH);

  const patternTiles = useMemo(() => {
    const cols = Math.max(1, Math.ceil(width / PATTERN_SIZE) + 1);
    const rows = Math.max(1, Math.ceil(height / PATTERN_SIZE) + 1);
    const tiles: React.ReactElement[] = [];
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const x = c * PATTERN_SIZE;
        const y = r * PATTERN_SIZE;
        tiles.push(
          <G key={`${c}-${r}`} transform={`translate(${x}, ${y})`}>
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
          </G>,
        );
      }
    }
    return tiles;
  }, [width, height]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <G opacity={0.2}>{patternTiles}</G>
      </Svg>
    </View>
  );
}
