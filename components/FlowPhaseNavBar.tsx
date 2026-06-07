import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../lib/theme";
import type { FlowNavAction } from "../lib/sessionFlowNav";

export type FlowPhaseNavBarProps = {
  /** Previous step or phase — omit on first step. */
  back?: FlowNavAction | null;
  /** Primary forward action (next step or next phase). */
  forward: FlowNavAction;
  hint?: string | null;
  /** Pin to bottom of screen with safe-area padding (preferences-style). */
  sticky?: boolean;
  onLayout?: (height: number) => void;
  style?: ViewStyle;
  children?: React.ReactNode;
};

/**
 * Consistent back / forward controls for workout and week generation flows.
 * Back: outlined secondary. Forward: primary fill with chevron.
 */
export function FlowPhaseNavBar({
  back,
  forward,
  hint,
  sticky = false,
  onLayout,
  style,
  children,
}: FlowPhaseNavBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const content = (
    <>
      <View style={styles.row}>
        {back ? (
          <Pressable
            onPress={back.onPress}
            disabled={back.disabled || back.loading}
            accessibilityRole="button"
            accessibilityLabel={back.label}
            style={({ pressed }) => [
              styles.backBtn,
              {
                borderColor: theme.border,
                backgroundColor: theme.card,
                opacity: back.disabled ? 0.4 : pressed ? 0.88 : 1,
              },
            ]}
          >
            {back.loading ? (
              <ActivityIndicator size="small" color={theme.textMuted} />
            ) : (
              <>
                <Ionicons name="chevron-back" size={17} color={theme.text} />
                <Text style={[styles.backLabel, { color: theme.text }]} numberOfLines={1}>
                  {back.label}
                </Text>
              </>
            )}
          </Pressable>
        ) : (
          <View style={styles.backSpacer} />
        )}

        <Pressable
          onPress={forward.onPress}
          disabled={forward.disabled || forward.loading}
          accessibilityRole="button"
          accessibilityLabel={forward.label}
          style={({ pressed }) => [
            styles.forwardBtn,
            {
              backgroundColor: theme.primary,
              opacity: forward.disabled ? 0.45 : pressed ? 0.9 : 1,
            },
          ]}
        >
          {forward.loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={styles.forwardLabel} numberOfLines={1}>
                {forward.label}
              </Text>
              <Ionicons name="chevron-forward" size={18} color="#fff" />
            </>
          )}
        </Pressable>
      </View>

      {hint ? (
        <Text style={[styles.hint, { color: theme.textMuted }]} numberOfLines={2}>
          {hint}
        </Text>
      ) : null}

      {children}
    </>
  );

  if (sticky) {
    return (
      <View
        onLayout={(e) => onLayout?.(e.nativeEvent.layout.height)}
        style={[
          styles.stickyWrap,
          {
            backgroundColor: theme.cardOpaque,
            borderTopColor: theme.border,
            paddingBottom: 10 + Math.max(insets.bottom, 8),
          },
          Platform.select({
            web: { boxShadow: "0 -4px 16px rgba(0,0,0,0.2)" },
            default: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.18,
              shadowRadius: 8,
              elevation: 12,
            },
          }),
          style,
        ]}
      >
        {content}
      </View>
    );
  }

  return (
    <View
      onLayout={onLayout ? (e) => onLayout(e.nativeEvent.layout.height) : undefined}
      style={[styles.inlineWrap, style]}
    >
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  stickyWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inlineWrap: {
    marginTop: 16,
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 10,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 96,
    maxWidth: "38%",
  },
  backSpacer: {
    width: 0,
    minWidth: 0,
  },
  backLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  forwardBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
    minHeight: 44,
  },
  forwardLabel: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    flexShrink: 1,
  },
  hint: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
    textAlign: "center",
  },
});

export default FlowPhaseNavBar;
