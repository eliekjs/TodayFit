import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  LayoutAnimation,
  Platform,
  UIManager,
  type ViewStyle,
} from "react-native";
import { useTheme } from "../lib/theme";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental != null
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Props = {
  title: string;
  /** Shown below title when expanded */
  subtitle?: string;
  /** Right side of header when collapsed (e.g. current value) */
  summary: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
  /** Extra top margin for first section */
  marginTop?: number;
  /** Smaller header/body when nested inside another panel (e.g. Advanced options) */
  nested?: boolean;
};

/**
 * Accordion row: title + summary when collapsed; tap to expand content.
 */
export function CollapsiblePreferenceSection({
  title,
  subtitle,
  summary,
  expanded,
  onToggle,
  children,
  style,
  marginTop = 0,
  nested = false,
}: Props) {
  const theme = useTheme();

  const handlePress = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onToggle();
  };

  const headerStyle = nested ? styles.headerNested : styles.header;
  const titleStyle = nested ? styles.titleNested : styles.title;
  const subtitleStyle = nested ? styles.subtitleNested : styles.subtitle;
  const summaryStyle = nested ? styles.summaryNested : styles.summary;
  const bodyStyle = nested ? styles.bodyNested : styles.body;

  return (
    <View style={[styles.wrapper, { marginTop }, style]}>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          headerStyle,
          {
            borderBottomColor: theme.border,
            backgroundColor: expanded ? theme.card : "transparent",
            opacity: pressed ? 0.85 : 1,
          },
        ]}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${title}. ${summary}. ${expanded ? "Collapse" : "Expand"}`}
      >
        <View style={styles.headerTextCol}>
          <Text style={[titleStyle, { color: theme.text }]}>{title}</Text>
          {expanded && subtitle != null ? (
            <Text style={[subtitleStyle, { color: theme.textMuted }]}>{subtitle}</Text>
          ) : null}
        </View>
        <View style={styles.headerRight}>
          {!expanded ? (
            <Text
              style={[summaryStyle, { color: theme.textMuted }]}
              numberOfLines={2}
            >
              {summary}
            </Text>
          ) : null}
          <Text style={[styles.chevron, { color: theme.textMuted }]}>
            {expanded ? "▼" : "▶"}
          </Text>
        </View>
      </Pressable>
      {expanded ? (
        <View style={[bodyStyle, { borderColor: theme.border }]}>
          {children}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  headerNested: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  headerTextCol: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  titleNested: {
    fontSize: 15,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
    fontWeight: "400",
  },
  subtitleNested: {
    fontSize: 12,
    marginTop: 3,
    fontWeight: "400",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    maxWidth: "42%",
  },
  summary: {
    fontSize: 13,
    textAlign: "right",
    flex: 1,
  },
  summaryNested: {
    fontSize: 12,
    textAlign: "right",
    flex: 1,
  },
  chevron: {
    fontSize: 12,
    width: 18,
    textAlign: "center",
  },
  body: {
    paddingTop: 16,
    paddingBottom: 8,
    paddingHorizontal: 4,
    borderLeftWidth: 0,
  },
  bodyNested: {
    paddingTop: 12,
    paddingBottom: 6,
    paddingHorizontal: 2,
    borderLeftWidth: 0,
  },
});
