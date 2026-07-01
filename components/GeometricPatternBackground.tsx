import React, { useMemo } from "react";
import { View, StyleSheet, useWindowDimensions, Platform } from "react-native";
import Svg, { Defs, G, Line, LinearGradient, Rect, Stop } from "react-native-svg";
import { cleanFlowPalette, useTheme } from "../lib/theme";

const PIECE_CELL = 16;
const PIECE_GAP = 1;
const GRID_SIZE = 28;
const GRID_STROKE = "rgba(148,163,184,0.1)";
const GRID_STRONG_STROKE = "rgba(100,116,139,0.14)";
const IS_NATIVE = Platform.OS !== "web";
/** Web keeps a hint of teal/navy; native uses neutral dark shifts only (P3 reads green/blue as neon). */
const GLOW_TOP = IS_NATIVE ? "rgba(8, 32, 38, 0.22)" : "rgba(16,185,129,0.1)";
const GLOW_BOTTOM = IS_NATIVE ? "rgba(6, 18, 40, 0.28)" : "rgba(59,130,246,0.09)";
const NATIVE_SCRIM = "rgba(4, 14, 32, 0.42)";
const PIECE_OPACITY_SCALE = IS_NATIVE ? 0 : 0.72;
type PieceStyle = {
  fill: string;
  top: string;
  left: string;
  bottom: string;
  right: string;
};

// Classic tetromino-inspired shades by piece type (web only — hidden on native).
const PIECE_STYLES: PieceStyle[] = [
  { fill: "rgba(34,211,238,0.18)", top: "rgba(186,230,253,0.28)", left: "rgba(125,211,252,0.24)", bottom: "rgba(2,132,199,0.3)", right: "rgba(3,105,161,0.32)" }, // I
  { fill: "rgba(250,204,21,0.22)", top: "rgba(254,240,138,0.3)", left: "rgba(253,224,71,0.28)", bottom: "rgba(202,138,4,0.32)", right: "rgba(161,98,7,0.34)" }, // O
  { fill: "rgba(168,85,247,0.2)", top: "rgba(221,214,254,0.3)", left: "rgba(196,181,253,0.28)", bottom: "rgba(109,40,217,0.32)", right: "rgba(91,33,182,0.34)" }, // T
  { fill: "rgba(59,130,246,0.18)", top: "rgba(191,219,254,0.28)", left: "rgba(147,197,253,0.24)", bottom: "rgba(30,64,175,0.3)", right: "rgba(30,58,138,0.32)" }, // J
  { fill: "rgba(249,115,22,0.2)", top: "rgba(254,215,170,0.3)", left: "rgba(253,186,116,0.28)", bottom: "rgba(154,52,18,0.32)", right: "rgba(124,45,18,0.34)" }, // L
  { fill: "rgba(74,222,128,0.18)", top: "rgba(187,247,208,0.28)", left: "rgba(134,239,172,0.24)", bottom: "rgba(21,128,61,0.3)", right: "rgba(22,101,52,0.32)" }, // S
  { fill: "rgba(244,63,94,0.2)", top: "rgba(254,205,211,0.3)", left: "rgba(253,164,175,0.28)", bottom: "rgba(159,18,57,0.32)", right: "rgba(136,19,55,0.34)" }, // Z
];

const TETROMINOES: number[][][] = [
  [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
  ], // I
  [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ], // O
  [
    [0, 0],
    [1, 0],
    [2, 0],
    [1, 1],
  ], // T
  [
    [0, 0],
    [0, 1],
    [1, 1],
    [2, 1],
  ], // J
  [
    [2, 0],
    [0, 1],
    [1, 1],
    [2, 1],
  ], // L
  [
    [1, 0],
    [2, 0],
    [0, 1],
    [1, 1],
  ], // S
  [
    [0, 0],
    [1, 0],
    [1, 1],
    [2, 1],
  ], // Z
];

export function GeometricPatternBackground() {
  const theme = useTheme();
  const { width: winW, height: winH } = useWindowDimensions();
  const width = Math.max(1, winW);
  const height = Math.max(1, winH);

  const boardGrid = useMemo(() => {
    const lines: React.ReactElement[] = [];
    const cols = Math.ceil(width / GRID_SIZE);
    const rows = Math.ceil(height / GRID_SIZE);
    const gridStroke = IS_NATIVE ? "rgba(148,163,184,0.07)" : GRID_STROKE;
    const gridStrongStroke = IS_NATIVE ? "rgba(100,116,139,0.1)" : GRID_STRONG_STROKE;

    for (let c = 0; c <= cols; c++) {
      const x = c * GRID_SIZE;
      const isMajor = c % 4 === 0;
      lines.push(
        <Line
          key={`v-${c}`}
          x1={x}
          y1={0}
          x2={x}
          y2={height}
          stroke={isMajor ? gridStrongStroke : gridStroke}
          strokeWidth={isMajor ? 1 : 0.7}
        />,
      );
    }
    for (let r = 0; r <= rows; r++) {
      const y = r * GRID_SIZE;
      const isMajor = r % 4 === 0;
      lines.push(
        <Line
          key={`h-${r}`}
          x1={0}
          y1={y}
          x2={width}
          y2={y}
          stroke={isMajor ? gridStrongStroke : gridStroke}
          strokeWidth={isMajor ? 1 : 0.7}
        />,
      );
    }

    return lines;
  }, [width, height]);

  const tetrominoPieces = useMemo(() => {
    if (PIECE_OPACITY_SCALE <= 0) return [];

    const pieces: React.ReactElement[] = [];
    const step = PIECE_CELL + PIECE_GAP;
    const cols = Math.max(6, Math.floor(width / 92));
    const rows = Math.max(8, Math.floor(height / 84));

    const drawPiece = (
      id: string,
      shape: number[][],
      px: number,
      py: number,
      pieceStyle: PieceStyle,
      opacity = 0.5,
    ) => {
      pieces.push(
        <G key={id} opacity={opacity}>
          {shape.map(([sx, sy], idx) => (
            <G key={`${id}-${idx}`}>
              <Rect
                x={px + sx * step}
                y={py + sy * step}
                width={PIECE_CELL}
                height={PIECE_CELL}
                fill={pieceStyle.fill}
                stroke="rgba(2,6,23,0.42)"
                strokeWidth={0.8}
              />
              <Rect
                x={px + sx * step}
                y={py + sy * step}
                width={PIECE_CELL}
                height={2}
                fill={pieceStyle.top}
              />
              <Rect
                x={px + sx * step}
                y={py + sy * step}
                width={2}
                height={PIECE_CELL}
                fill={pieceStyle.left}
              />
              <Rect
                x={px + sx * step}
                y={py + sy * step + PIECE_CELL - 2}
                width={PIECE_CELL}
                height={2}
                fill={pieceStyle.bottom}
              />
              <Rect
                x={px + sx * step + PIECE_CELL - 2}
                y={py + sy * step}
                width={2}
                height={PIECE_CELL}
                fill={pieceStyle.right}
              />
            </G>
          ))}
        </G>,
      );
    };

    for (let r = -1; r <= rows; r++) {
      for (let c = -1; c <= cols; c++) {
        const stagger = r % 2 === 0 ? 0 : 26;
        const x = c * 92 + 10 + stagger;
        const y = r * 84 + 12;
        const idx = Math.abs(c * 3 + r * 5);
        const shapeIndex = idx % TETROMINOES.length;
        const shape = TETROMINOES[shapeIndex];
        const pieceStyle = PIECE_STYLES[shapeIndex];
        if ((idx + r) % 3 === 0) continue;
        const opacity =
          (y > height * 0.7 ? 0.38 : y < height * 0.25 ? 0.24 : 0.3) * PIECE_OPACITY_SCALE;
        drawPiece(`field-${c}-${r}`, shape, x, y, pieceStyle, opacity);
      }
    }

    return pieces;
  }, [width, height]);

  const glowTopHeight = IS_NATIVE ? height * 0.38 : height * 0.45;
  const glowTopWidth = IS_NATIVE ? width * 0.52 : width * 0.58;
  const glowBottomY = IS_NATIVE ? height * 0.42 : height * 0.35;
  const glowBottomWidth = IS_NATIVE ? width * 0.58 : width * 0.64;
  const glowBottomHeight = IS_NATIVE ? height * 0.58 : height * 0.65;

  if (theme.background === cleanFlowPalette.background) {
    return (
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.nonInteractive,
          { backgroundColor: theme.background },
        ]}
      />
    );
  }

  return (
    <View style={[StyleSheet.absoluteFill, styles.nonInteractive]}>
      <Svg width={width} height={height} style={[StyleSheet.absoluteFill, styles.nonInteractive]}>
        <Defs>
          <LinearGradient id="bgBase" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#052f35" />
            <Stop offset="48%" stopColor="#06263f" />
            <Stop offset="100%" stopColor="#041631" />
          </LinearGradient>
          <LinearGradient id="glowTop" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={GLOW_TOP} />
            <Stop offset="100%" stopColor={IS_NATIVE ? "rgba(8, 32, 38, 0)" : "rgba(16,185,129,0)"} />
          </LinearGradient>
          <LinearGradient id="glowBottom" x1="100%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={GLOW_BOTTOM} />
            <Stop offset="100%" stopColor={IS_NATIVE ? "rgba(6, 18, 40, 0)" : "rgba(59,130,246,0)"} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#bgBase)" />
        <Rect x={0} y={0} width={glowTopWidth} height={glowTopHeight} fill="url(#glowTop)" />
        <Rect
          x={width * (IS_NATIVE ? 0.42 : 0.36)}
          y={glowBottomY}
          width={glowBottomWidth}
          height={glowBottomHeight}
          fill="url(#glowBottom)"
        />
        <G opacity={IS_NATIVE ? 0.55 : 0.9}>{boardGrid}</G>
        <G>{tetrominoPieces}</G>
      </Svg>
      {IS_NATIVE ? <View style={[StyleSheet.absoluteFill, styles.nativeScrim]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  nonInteractive: {
    pointerEvents: "none",
  },
  nativeScrim: {
    backgroundColor: NATIVE_SCRIM,
  },
});
