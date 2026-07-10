import React from "react";
import { View, Text, StyleSheet, Platform, type ViewStyle } from "react-native";
import { useTheme } from "../lib/theme";
import { PrimaryButton } from "./Button";

type Props = {
  title?: string;
  /** Custom title layout; takes precedence over `title` when provided. */
  titleNode?: React.ReactNode;
  subtitle?: string;
  children?: React.ReactNode;
  style?: ViewStyle;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
};

export function Card({
  title,
  titleNode,
  subtitle,
  children,
  style,
  primaryActionLabel,
  onPrimaryAction,
}: Props) {
  const theme = useTheme();
  const borderColor = Platform.OS === "web" ? theme.border : theme.borderStrong;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.cardOpaque,
          borderColor,
          borderWidth: 1,
        },
        style,
      ]}
    >
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          {titleNode ?? (
            title != null ? (
              <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
            ) : null
          )}
          {subtitle && (
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>
              {subtitle}
            </Text>
          )}
        </View>
        {primaryActionLabel != null && onPrimaryAction != null && (
          <PrimaryButton
            label={primaryActionLabel}
            variant="ghost"
            onPress={onPrimaryAction}
            style={styles.action}
          />
        )}
      </View>
      {children != null && <View style={styles.content}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  content: {
    marginTop: 12,
    gap: 8,
  },
  action: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
});
