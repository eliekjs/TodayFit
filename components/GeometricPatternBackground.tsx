import React, { useMemo } from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import Svg, { Defs, G, Line, LinearGradient, Rect, Stop } from "react-native-svg";

const PIECE_CELL = 16;
const PIECE_GAP = 1;
const GRID_SIZE = 28;
const GRID_STROKE = "rgba(148,163,184,0.12)";
const GRID_STRONG_STROKE = "rgba(56,189,248,0.12)";
type PieceStyle = {
  fill: string;
  top: string;
  left: string;
  bottom: string;
  right: string;
};

// Classic tetromino-inspired shades by piece type.
const PIECE_STYLES: PieceStyle[] = [
  { fill: "rgba(34,211,238,0.34)", top: "rgba(186,230,253,0.48)", left: "rgba(125,211,252,0.42)", bottom: "rgba(2,132,199,0.5)", right: "rgba(3,105,161,0.52)" }, // I
  { fill: "rgba(250,204,21,0.32)", top: "rgba(254,240,138,0.44)", left: "rgba(253,224,71,0.4)", bottom: "rgba(202,138,4,0.48)", right: "rgba(161,98,7,0.5)" }, // O
  { fill: "rgba(168,85,247,0.3)", top: "rgba(221,214,254,0.44)", left: "rgba(196,181,253,0.4)", bottom: "rgba(109,40,217,0.5)", right: "rgba(91,33,182,0.52)" }, // T
  { fill: "rgba(59,130,246,0.32)", top: "rgba(191,219,254,0.46)", left: "rgba(147,197,253,0.42)", bottom: "rgba(30,64,175,0.5)", right: "rgba(30,58,138,0.52)" }, // J
  { fill: "rgba(249,115,22,0.3)", top: "rgba(254,215,170,0.44)", left: "rgba(253,186,116,0.4)", bottom: "rgba(154,52,18,0.5)", right: "rgba(124,45,18,0.52)" }, // L
  { fill: "rgba(74,222,128,0.3)", top: "rgba(187,247,208,0.44)", left: "rgba(134,239,172,0.4)", bottom: "rgba(21,128,61,0.5)", right: "rgba(22,101,52,0.52)" }, // S
  { fill: "rgba(244,63,94,0.3)", top: "rgba(254,205,211,0.44)", left: "rgba(253,164,175,0.4)", bottom: "rgba(159,18,57,0.5)", right: "rgba(136,19,55,0.52)" }, // Z
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
  const { width: winW, height: winH } = useWindowDimensions();
  const width = Math.max(1, winW);
  const height = Math.max(1, winH);

  const boardGrid = useMemo(() => {
    const lines: React.ReactElement[] = [];
    const cols = Math.ceil(width / GRID_SIZE);
    const rows = Math.ceil(height / GRID_SIZE);

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
          stroke={isMajor ? GRID_STRONG_STROKE : GRID_STROKE}
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
          stroke={isMajor ? GRID_STRONG_STROKE : GRID_STROKE}
          strokeWidth={isMajor ? 1 : 0.7}
        />,
      );
    }

    return lines;
  }, [width, height]);

  const tetrominoPieces = useMemo(() => {
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
              {/* Bevel shading for classic tetris-block look */}
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
        // Keep density airy for readability: skip some cells in a repeatable pattern.
        if ((idx + r) % 3 === 0) continue;
        const opacity = y > height * 0.7 ? 0.56 : y < height * 0.25 ? 0.36 : 0.44;
        drawPiece(`field-${c}-${r}`, shape, x, y, pieceStyle, opacity);
      }
    }

    return pieces;
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
        <G opacity={0.9}>{boardGrid}</G>
        <G>{tetrominoPieces}</G>
      </Svg>
    </View>
  );
}
