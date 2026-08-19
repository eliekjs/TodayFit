import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../lib/theme";

export type PillTabItem<K extends string = string> = {
  key: K;
  label: string;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  renderIcon?: (color: string, size: number) => React.ReactNode;
};

type Props<K extends string> = {
  tabs: PillTabItem<K>[];
  value: K;
  onChange: (key: K) => void;
  compact?: boolean;
  style?: ViewStyle;
};

/**
 * Ethos-style tab slider: pale track, inactive items are plain icon+label,
 * active item is a white pill with a hairline border.
 */
export function PillTabs<K extends string>({
  tabs,
  value,
  onChange,
  compact = false,
  style,
}: Props<K>) {
  const theme = useTheme();
  if (tabs.length === 0) return null;

  return (
    <View
      style={[
        styles.track,
        compact && styles.trackCompact,
        {
          backgroundColor: theme.secondary,
        },
        style,
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {tabs.map((tab) => {
          const active = tab.key === value;
          return (
            <Pressable
              key={tab.key}
              onPress={() => onChange(tab.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={tab.label}
              style={({ pressed }) => [
                styles.tab,
                compact && styles.tabCompact,
                active && [
                  styles.tabActive,
                  {
                    backgroundColor: theme.cardOpaque,
                    borderColor: theme.border,
                    ...(Platform.OS === "web"
                      ? {
                          borderColor: "transparent",
                          boxShadow: `inset 0 0 0 1px ${theme.border}`,
                        }
                      : null),
                  },
                ],
                { opacity: pressed ? 0.85 : 1 },
              ]}
            >
              {tab.renderIcon
                ? tab.renderIcon(active ? theme.primary : theme.textMuted, compact ? 13 : 16)
                : tab.icon ? (
                    <Ionicons
                      name={tab.icon}
                      size={compact ? 13 : 16}
                      color={active ? theme.primary : theme.textMuted}
                    />
                  ) : null}
              <Text
                style={[
                  styles.label,
                  compact && styles.labelCompact,
                  { color: active ? theme.text : theme.textMuted },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    alignSelf: "stretch",
    borderRadius: 999,
    padding: 4,
    overflow: "hidden",
  },
  trackCompact: {
    alignSelf: "flex-start",
    padding: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "transparent",
  },
  tabCompact: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  tabActive: {
    borderWidth: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
  labelCompact: {
    fontSize: 12,
  },
});
