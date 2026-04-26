import React, { useMemo } from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import Svg, { G, Path } from "react-native-svg";

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
        const even = (c + r) % 2 === 0;
        tiles.push(
          <G key={`${c}-${r}`} transform={`translate(${x}, ${y})`}>
            {/* Mountains */}
            <Path
              d="M0 100 L16 76 L28 92 L40 68 L56 100"
              fill="none"
              stroke={even ? EMERALD_500 : BLUE_500}
              strokeWidth={1.4}
            />
            {/* Bike frame */}
            <Path
              d="M72 78 m-10 0 a10 10 0 1 0 20 0 a10 10 0 1 0 -20 0 M104 78 m-10 0 a10 10 0 1 0 20 0 a10 10 0 1 0 -20 0 M82 78 L92 62 L102 78 L92 78 L92 62"
              fill="none"
              stroke={even ? BLUE_400 : EMERALD_400}
              strokeWidth={1}
            />
            {/* Rock clusters */}
            <Path
              d="M4 24 L12 16 L22 20 L20 30 L10 32 Z M24 34 L32 26 L42 30 L40 40 L30 42 Z"
              fill="none"
              stroke={even ? EMERALD_400 : BLUE_400}
              strokeWidth={1}
            />
            {/* Skis */}
            <Path
              d="M64 8 L78 44 M72 6 L86 42 M60 10 Q66 4 72 8 M68 8 Q74 2 80 6"
              fill="none"
              stroke={even ? BLUE_500 : EMERALD_500}
              strokeWidth={1.2}
            />
            {/* Volleyball */}
            <Path
              d="M96 24 m-12 0 a12 12 0 1 0 24 0 a12 12 0 1 0 -24 0 M84 24 C88 20 92 18 96 18 C100 18 104 20 108 24 M86 30 C92 26 100 26 106 30 M96 12 L96 36"
              fill="none"
              stroke={even ? EMERALD_400 : BLUE_400}
              strokeWidth={1}
            />
            {/* Surfboard */}
            <Path
              d="M44 10 Q50 2 56 10 Q58 20 56 30 Q50 38 44 30 Q42 20 44 10 M46 20 L54 20"
              fill="none"
              stroke={even ? BLUE_400 : EMERALD_400}
              strokeWidth={1}
            />
            {/* Tennis racket */}
            <Path
              d="M18 62 m-8 0 a8 10 0 1 0 16 0 a8 10 0 1 0 -16 0 M22 70 L30 82 M12 58 L26 66 M12 66 L26 58"
              fill="none"
              stroke={even ? BLUE_500 : EMERALD_500}
              strokeWidth={1}
            />
            {/* Weights / barbell */}
            <Path
              d="M34 52 L54 52 M30 48 L30 56 M34 48 L34 56 M54 48 L54 56 M58 48 L58 56"
              fill="none"
              stroke={even ? EMERALD_500 : BLUE_500}
              strokeWidth={1.2}
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
