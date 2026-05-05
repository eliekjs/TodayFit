import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Animated } from "react-native";
import { StatusBar } from "expo-status-bar";
import { AppScreenWrapper } from "./AppScreenWrapper";
import { useTheme } from "../lib/theme";

type Props = {
  /** Primary headline (e.g. “Building your session…”). */
  message: string;
  /** Optional supporting line; keep short to avoid clutter. */
  subtitle?: string;
};

export function GenerationLoadingScreen({ message, subtitle }: Props) {
  const theme = useTheme();
  const breathe = useRef(new Animated.Value(0.65)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 0.65,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [breathe]);

  return (
    <AppScreenWrapper>
      <StatusBar style="light" />
      <View style={styles.centered}>
        <View
          style={[
            styles.panel,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
        >
          <Animated.View style={[styles.spinnerWrap, { opacity: breathe }]}>
            <ActivityIndicator size="large" color={theme.primary} />
          </Animated.View>
          <Text style={[styles.title, { color: theme.text }]}>{message}</Text>
          {subtitle != null && subtitle.length > 0 ? (
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>{subtitle}</Text>
          ) : null}
        </View>
      </View>
    </AppScreenWrapper>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  panel: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  spinnerWrap: {
    marginBottom: 22,
  },
  title: {
    fontSize: 19,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 10,
  },
});
