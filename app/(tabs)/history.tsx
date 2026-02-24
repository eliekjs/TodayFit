import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useTheme } from "../../lib/theme";
import { useAppState } from "../../context/AppStateContext";
import { Card } from "../../components/Card";

export default function HistoryScreen() {
  const theme = useTheme();
  const { workoutHistory } = useAppState();

  const items = [...workoutHistory].sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              No workouts saved yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
              Once you finish a session, it will appear here with a quick
              snapshot.
            </Text>
          </View>
        ) : (
          items.map((item) => {
            const date = new Date(item.date);
            const label = `${date.toLocaleDateString()} • ${
              item.focus.join(" • ") || "General training"
            }`;
            return (
              <Card
                key={item.id}
                title={label}
                subtitle={
                  item.durationMinutes != null
                    ? `${item.durationMinutes} min`
                    : undefined
                }
                style={{ marginBottom: 12 }}
              />
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
});
