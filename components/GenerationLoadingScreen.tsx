import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Pressable,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { AppScreenWrapper } from "./AppScreenWrapper";
import { themeFonts, themeRadius, useTheme } from "../lib/theme";
import { useBusyLabel } from "../lib/useAnimatedEllipsis";

type Props = {
  message: string;
  subtitle?: string;
  /** When provided, shows a "Change filters" back button. */
  onGoBack?: () => void;
};

export function GenerationLoadingScreen({
  message,
  subtitle,
  onGoBack,
}: Props) {
  const theme = useTheme();
  const displayMessage = useBusyLabel(message, true);
  const breathe = useRef(new Animated.Value(0.65)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0.65, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [breathe]);

  return (
    <AppScreenWrapper>
      <StatusBar style="dark" />
      <View style={styles.centered}>
        <View
          style={[
            styles.panel,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Animated.View style={[styles.spinnerWrap, { opacity: breathe }]}>
            <ActivityIndicator size="large" color={theme.primary} />
          </Animated.View>

          <Text style={[styles.title, { color: theme.text }]}>{displayMessage}</Text>

          {subtitle != null && subtitle.length > 0 ? (
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>{subtitle}</Text>
          ) : null}

          {onGoBack ? (
            <Pressable
              onPress={onGoBack}
              style={({ pressed }) => [
                styles.backButton,
                { borderColor: theme.border, opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Text style={[styles.backButtonText, { color: theme.textMuted }]}>
                Change filters
              </Text>
            </Pressable>
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
    paddingHorizontal: 24,
  },
  panel: {
    width: "100%",
    maxWidth: 360,
    borderRadius: themeRadius.card,
    borderWidth: 1,
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  spinnerWrap: {
    marginBottom: 22,
  },
  title: {
    fontFamily: themeFonts.displayBold,
    fontSize: 22,
    textAlign: "center",
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 10,
  },
  backButton: {
    marginTop: 22,
    paddingVertical: 9,
    paddingHorizontal: 20,
    borderRadius: themeRadius.control,
    borderWidth: 1,
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: "500",
  },
});
