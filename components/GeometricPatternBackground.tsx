import React, { useMemo } from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import Svg, { Defs, G, LinearGradient, Rect, Stop } from "react-native-svg";

const TILE_W = 116;
const TILE_H = 72;
const STROKE_EMERALD = "rgba(45,212,191,0.17)";
const STROKE_BLUE = "rgba(59,130,246,0.2)";
const STROKE_FAINT = "rgba(148,163,184,0.07)";

export function GeometricPatternBackground() {
  const { width: winW, height: winH } = useWindowDimensions();
  const width = Math.max(1, winW);
  const height = Math.max(1, winH);

  const patternTiles = useMemo(() => {
    const cols = Math.max(1, Math.ceil(width / TILE_W) + 2);
    const rows = Math.max(1, Math.ceil(height / TILE_H) + 2);
    const tiles: React.ReactElement[] = [];
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const offsetX = r % 2 === 0 ? 0 : -TILE_W * 0.32;
        const x = c * TILE_W + offsetX;
        const y = r * TILE_H;
        const mod = (c + r) % 4;
        const strokeColor =
          mod === 0 ? STROKE_EMERALD : mod === 2 ? STROKE_BLUE : STROKE_FAINT;
        const innerStroke = mod === 1 ? STROKE_BLUE : STROKE_FAINT;
        tiles.push(
          <G key={`${c}-${r}`} transform={`translate(${x}, ${y})`}>
            <Rect
              x={0}
              y={0}
              width={TILE_W}
              height={TILE_H}
              rx={4}
              fill="none"
              stroke={strokeColor}
              strokeWidth={1}
            />
            <Rect
              x={8}
              y={8}
              width={TILE_W - 16}
              height={TILE_H - 16}
              rx={2}
              fill="none"
              stroke={innerStroke}
              strokeWidth={0.6}
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
        <Defs>
          <LinearGradient id="bgBase" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#052f35" />
            <Stop offset="48%" stopColor="#06263f" />
            <Stop offset="100%" stopColor="#041631" />
          </LinearGradient>
          <LinearGradient id="glowTop" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="rgba(16,185,129,0.28)" />
            <Stop offset="100%" stopColor="rgba(16,185,129,0)" />
          </LinearGradient>
          <LinearGradient id="glowBottom" x1="100%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="rgba(59,130,246,0.25)" />
            <Stop offset="100%" stopColor="rgba(59,130,246,0)" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#bgBase)" />
        <Rect x={0} y={0} width={width * 0.58} height={height * 0.45} fill="url(#glowTop)" />
        <Rect
          x={width * 0.36}
          y={height * 0.35}
          width={width * 0.64}
          height={height * 0.65}
          fill="url(#glowBottom)"
        />
        <G opacity={0.92}>{patternTiles}</G>
      </Svg>
    </View>
  );
}
