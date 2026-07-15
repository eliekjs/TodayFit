import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { cleanFlowPalette, useTheme } from "../lib/theme";

type LegacyBg = React.ComponentType;

/**
 * Root background. v1 cleanFlow is a solid color — keep SVG/tetromino work out of the
 * critical path so web first paint is not blocked by react-native-svg.
 */
export function GeometricPatternBackground() {
  const theme = useTheme();
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
  return <LazyLegacyGeometricBackground />;
}

function LazyLegacyGeometricBackground() {
  const [Legacy, setLegacy] = useState<LegacyBg | null>(null);

  useEffect(() => {
    let cancelled = false;
    void import("./LegacyGeometricSvgBackground").then((mod) => {
      if (!cancelled) setLegacy(() => mod.LegacyGeometricSvgBackground);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!Legacy) {
    return (
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.nonInteractive,
          { backgroundColor: "#041631" },
        ]}
      />
    );
  }
  return <Legacy />;
}

const styles = StyleSheet.create({
  nonInteractive: {
    pointerEvents: "none",
  },
});
