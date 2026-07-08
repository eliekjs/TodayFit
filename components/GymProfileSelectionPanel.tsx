import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import type { GymProfile } from "../data/gymProfiles";
import { useTheme } from "../lib/theme";
import { summarizeGymProfileEquipment } from "../lib/gymProfileDisplay";
import { PrimaryButton } from "./Button";

type Props = {
  activeProfile: GymProfile | null | undefined;
  gymProfiles: GymProfile[];
  onSelectProfile: (id: string) => void;
  onEditProfiles: () => void;
};

export function GymProfileSelectionPanel({
  activeProfile,
  gymProfiles,
  onSelectProfile,
  onEditProfiles,
}: Props) {
  const theme = useTheme();
  const otherProfiles = gymProfiles.filter((p) => p.id !== activeProfile?.id);
  const summary =
    activeProfile != null ? summarizeGymProfileEquipment(activeProfile) : null;

  return (
    <View style={styles.wrap}>
      {activeProfile != null ? (
        <>
          <View
            style={[
              styles.activeTile,
              {
                borderColor: theme.chipSelectedBorder,
                backgroundColor: theme.primarySoft,
              },
            ]}
          >
            <Text style={[styles.activeTileName, { color: theme.text }]} numberOfLines={2}>
              {activeProfile.name}
            </Text>
            <Text style={[styles.activeTileBadge, { color: theme.chipSelectedText }]}>
              Active gym
            </Text>
          </View>

          {summary != null ? (
            <View style={styles.summaryBlock}>
              <Text style={[styles.summaryLine, { color: theme.text }]}>
                {summary.highlightLine}
              </Text>
              {summary.categoryLine.length > 0 ? (
                <Text style={[styles.categoryLine, { color: theme.textMuted }]}>
                  {summary.itemCount} items · {summary.categoryLine}
                </Text>
              ) : (
                <Text style={[styles.categoryLine, { color: theme.textMuted }]}>
                  {summary.itemCount} items
                </Text>
              )}
            </View>
          ) : null}

          {otherProfiles.length > 0 ? (
            <View style={styles.switchBlock}>
              <Text style={[styles.switchLabel, { color: theme.textMuted }]}>
                Switch profile
              </Text>
              <View style={styles.otherTiles}>
                {otherProfiles.map((profile) => (
                  <Pressable
                    key={profile.id}
                    onPress={() => onSelectProfile(profile.id)}
                    style={({ pressed }) => [
                      styles.otherTile,
                      {
                        borderColor: theme.border,
                        backgroundColor: pressed ? theme.cardOpaque : theme.card,
                        opacity: pressed ? 0.92 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.otherTileName, { color: theme.text }]}
                      numberOfLines={2}
                    >
                      {profile.name}
                    </Text>
                    <Text style={[styles.otherTileMeta, { color: theme.textMuted }]}>
                      {profile.equipment.length} items
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
        </>
      ) : (
        <Text style={[styles.emptyText, { color: theme.textMuted }]}>
          No gym profile yet. Create one to match workouts to your equipment.
        </Text>
      )}

      <PrimaryButton
        label={activeProfile != null ? "Edit gym profiles" : "Create gym profile"}
        variant="secondary"
        onPress={onEditProfiles}
        style={styles.editButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  activeTile: {
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 6,
  },
  activeTileName: {
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 26,
  },
  activeTileBadge: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  summaryBlock: {
    gap: 4,
    paddingHorizontal: 2,
  },
  summaryLine: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
  categoryLine: {
    fontSize: 12,
    lineHeight: 17,
  },
  switchBlock: {
    gap: 8,
    marginTop: 4,
  },
  switchLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  otherTiles: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  otherTile: {
    flexGrow: 1,
    flexBasis: "45%",
    maxWidth: "100%",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  otherTileName: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
  },
  otherTileMeta: {
    fontSize: 11,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 18,
  },
  editButton: {
    marginTop: 4,
  },
});
