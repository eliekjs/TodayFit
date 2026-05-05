import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useTheme } from "../lib/theme";
import type { BlockType, GeneratedWorkout, WorkoutBlock, WorkoutItem } from "../lib/types";
import { formatPrescription, formatSupersetPairLabel, getSupersetPairsForBlock } from "../lib/types";
import { SPORTS_WITH_SUB_FOCUSES } from "../data/sportSubFocus/sportsWithSubFocuses";

// ─── Intent chip helpers ────────────────────────────────────────────────────

const _sportBySlug = new Map(SPORTS_WITH_SUB_FOCUSES.map((s) => [s.slug, s]));

function _humanizeGoalSlug(slug: string): string {
  const map: Record<string, string> = {
    strength: "Strength",
    hypertrophy: "Build Muscle",
    muscle: "Build Muscle",
    body_recomp: "Body Recomp",
    conditioning: "Conditioning",
    endurance: "Endurance",
    mobility: "Mobility",
    recovery: "Recovery",
    power: "Power",
    athletic_performance: "Athletic Performance",
    calisthenics: "Calisthenics",
    physique: "Physique",
    resilience: "Resilience",
  };
  return (
    map[slug] ??
    slug
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  );
}

function _formatIntentLabel(intent: {
  kind: "goal" | "goal_sub_focus" | "sport" | "sport_sub_focus";
  slug: string;
  parent_slug?: string;
}): string {
  if (intent.kind === "sport" || intent.kind === "sport_sub_focus") {
    const parentSlug = intent.kind === "sport_sub_focus" ? (intent.parent_slug ?? intent.slug) : intent.slug;
    const sport = _sportBySlug.get(parentSlug);
    if (!sport) return _humanizeGoalSlug(intent.slug);
    if (intent.kind === "sport") return sport.name;
    const subFocus = sport.sub_focuses.find((sf) => sf.slug === intent.slug);
    return `${sport.name} → ${subFocus?.name ?? _humanizeGoalSlug(intent.slug)}`;
  }
  if (intent.kind === "goal_sub_focus") {
    const parent = intent.parent_slug ? _humanizeGoalSlug(intent.parent_slug) : null;
    const label = _humanizeGoalSlug(intent.slug);
    return parent ? `${parent} → ${label}` : label;
  }
  return _humanizeGoalSlug(intent.slug);
}

/** Returns up to 3 human-readable labels for why this exercise is in the workout. */
function getIntentLabels(item: WorkoutItem): string[] {
  const links = item.session_intent_links;
  if (!links) return [];

  const labels: string[] = [];
  const declaredSportSubs = links.declared_sport_sub_focuses ?? [];
  const hasDeclaredSportSubs = declaredSportSubs.length > 0;

  // User explicitly picked sport sub-focuses — show them first even when this exercise’s
  // tags only weakly match ranked_intent_entries (otherwise chips collapse to internal primary goal).
  for (const d of declaredSportSubs) {
    if (labels.length >= 3) break;
    const label = _formatIntentLabel({
      kind: "sport_sub_focus",
      slug: d.slug,
      parent_slug: d.parent_slug,
    });
    if (!labels.includes(label)) labels.push(label);
  }

  // Show most-specific matched intents first (sub-focus > top-level goal/sport).
  if (links.matched_intents && links.matched_intents.length > 0) {
    const nonInferred = links.matched_intents.filter((m) => m.match_strength !== "inferred");
    const forDisplay =
      hasDeclaredSportSubs
        ? nonInferred.filter(
            (m) => !(m.kind === "goal" && m.slug === "athletic_performance")
          )
        : nonInferred;
    // Prefer sub-focus entries — they are more informative than a bare sport/goal label.
    const subFocusMatches = forDisplay
      .filter((m) => m.kind === "sport_sub_focus" || m.kind === "goal_sub_focus")
      .slice(0, 2)
      .map(_formatIntentLabel)
      .filter((lbl) => !labels.includes(lbl));
    if (subFocusMatches.length > 0) {
      for (const lbl of subFocusMatches) {
        if (labels.length >= 3) break;
        if (!labels.includes(lbl)) labels.push(lbl);
      }
    } else {
      for (const m of forDisplay.slice(0, 2)) {
        if (labels.length >= 3) break;
        const lbl = _formatIntentLabel(m);
        if (!labels.includes(lbl)) labels.push(lbl);
      }
    }
  }

  // Always surface session goals (e.g. "Build Muscle") even when sport chips are shown,
  // and even when the exercise carries intent_inferred (no specific tag match).
  for (const goal of links.goals ?? []) {
    if (hasDeclaredSportSubs && goal === "athletic_performance") continue;
    const humanized = _humanizeGoalSlug(goal);
    if (!labels.includes(humanized) && labels.length < 3) labels.push(humanized);
  }

  // Add sport name if not already covered by a matched_intents sport/sport_sub_focus entry.
  if (labels.length < 3) {
    const coveredSportParents = new Set(
      (links.matched_intents ?? [])
        .filter((m) => m.kind === "sport" || m.kind === "sport_sub_focus")
        .map((m) => (m.kind === "sport_sub_focus" ? (m.parent_slug ?? m.slug) : m.slug))
    );
    for (const sportSlug of links.sport_slugs ?? []) {
      if (!coveredSportParents.has(sportSlug) && labels.length < 3) {
        const sport = _sportBySlug.get(sportSlug);
        labels.push(sport ? sport.name : _humanizeGoalSlug(sportSlug));
      }
    }
  }

  return [...new Set(labels)].slice(0, 3);
}

function IntentChips({
  item,
  theme,
}: {
  item: WorkoutItem;
  theme: ReturnType<typeof useTheme>;
}) {
  const labels = getIntentLabels(item);
  if (labels.length === 0) return null;
  return (
    <View style={intentStyles.row}>
      <Text style={[intentStyles.forLabel, { color: theme.textMuted }]}>FOR:</Text>
      <View style={intentStyles.chips}>
        {labels.map((label) => (
          <View key={label} style={[intentStyles.chip, { borderColor: theme.primary }]}>
            <Text style={[intentStyles.chipText, { color: theme.primary }]}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const intentStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 6,
    gap: 6,
  },
  forLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    paddingTop: 3,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    flex: 1,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  chipText: {
    fontSize: 11,
    fontWeight: "500",
  },
});

export type WorkoutBlockListProps = {
  workout: GeneratedWorkout;
  showSwap?: boolean;
  onSwap?: (exerciseId: string, exerciseName: string, blockType: BlockType) => void;
  showTags?: boolean;
  /** Optional notes per exercise id (e.g. from completed workout history). */
  exerciseNotes?: Record<string, string>;
};

export function WorkoutBlockList({
  workout,
  showSwap = false,
  onSwap,
  showTags = false,
  exerciseNotes,
}: WorkoutBlockListProps) {
  const theme = useTheme();

  return (
    <>
      {workout.blocks.map((block, blockIdx) => {
        const pairs = getSupersetPairsForBlock(block);
        const hasSupersetExercises = !!(pairs && pairs.length > 0);
        const hasBlockItems = (block.items?.length ?? 0) > 0;
        const hasExercises = hasSupersetExercises || hasBlockItems;

        if (!hasExercises) {
          return null;
        }

        return (
          <View
            key={`${block.block_type}-${blockIdx}`}
            style={styles.sectionBlock}
          >
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {block.title ?? block.block_type}
            </Text>
            {renderBlockContent(
              block,
              block.block_type,
              theme,
              showSwap,
              onSwap,
              showTags,
              exerciseNotes
            )}
          </View>
        );
      })}
    </>
  );
}

function renderBlockContent(
  block: WorkoutBlock,
  blockType: BlockType,
  theme: ReturnType<typeof useTheme>,
  showSwap: boolean,
  onSwap: ((exerciseId: string, exerciseName: string, blockType: BlockType) => void) | undefined,
  showTags: boolean,
  exerciseNotes?: Record<string, string>
) {
  const pairs = getSupersetPairsForBlock(block);
  const noteFor = (exerciseId: string) =>
    exerciseNotes?.[exerciseId] ? (
      <View style={[styles.noteBox, { backgroundColor: theme.primarySoft }]}>
        <Text style={[styles.noteLabel, { color: theme.textMuted }]}>
          Your note
        </Text>
        <Text style={[styles.noteText, { color: theme.text }]}>
          {exerciseNotes[exerciseId]}
        </Text>
      </View>
    ) : null;
  if (pairs && pairs.length > 0) {
    return (
      <>
        {pairs.map((pair, idx) => (
          <View
            key={`superset-${idx}`}
            style={[styles.supersetBlock, { borderLeftColor: theme.primary ?? theme.border }]}
          >
            {(() => {
              const pairRest = Math.max(pair[0]?.rest_seconds ?? 0, pair[1]?.rest_seconds ?? 0);
              const pairRestText = pairRest > 0 ? `, rest ${pairRest}s after both` : "";
              return (
            <Text style={[styles.supersetLabel, { color: theme.textMuted }]}>
              {formatSupersetPairLabel(pair)} — do A then B
              {pairRestText}
            </Text>
              );
            })()}
            <View style={[styles.pairRow, { backgroundColor: theme.card ?? theme.background }]}>
              {pair.map((item, pairIdx) => (
                <View key={item.exercise_id} style={styles.exerciseRow}>
                  <Text style={[styles.supersetLetter, { color: theme.primary ?? theme.text }]}>
                    {String.fromCharCode(65 + pairIdx)}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.exerciseName, { color: theme.text }]}>
                      {item.exercise_name}
                    </Text>
                    <Text
                      style={[styles.exercisePrescription, { color: theme.textMuted }]}
                    >
                      {formatPrescription(item, { includeRest: false })}
                    </Text>
                    {showTags && (item.tags?.length ?? 0) > 0 && (
                      <View style={styles.tagsRow}>
                        {(item.tags ?? []).slice(0, 3).map((tag) => (
                          <Text
                            key={tag}
                            style={[styles.tag, { color: theme.textMuted }]}
                          >
                            {tag}
                          </Text>
                        ))}
                      </View>
                    )}
                    <IntentChips item={item} theme={theme} />
                    {noteFor(item.exercise_id)}
                  </View>
                  {showSwap && onSwap && (
                    <Pressable
                      onPress={() => onSwap(item.exercise_id, item.exercise_name, blockType)}
                      style={[styles.swapBtn, { borderColor: theme.border }]}
                    >
                      <Text style={[styles.swapBtnText, { color: theme.textMuted }]}>
                        Swap
                      </Text>
                    </Pressable>
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}
      </>
    );
  }

  return (
    <>
      {block.items.map((item) => (
        <View key={item.exercise_id} style={styles.exerciseRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.exerciseName, { color: theme.text }]}>
              {item.exercise_name}
            </Text>
            <Text
              style={[styles.exercisePrescription, { color: theme.textMuted }]}
            >
              {formatPrescription(item, { includeRest: true })}
            </Text>
            {showTags && (item.tags?.length ?? 0) > 0 && (
              <View style={styles.tagsRow}>
                {(item.tags ?? []).slice(0, 3).map((tag) => (
                  <Text
                    key={tag}
                    style={[styles.tag, { color: theme.textMuted }]}
                  >
                    {tag}
                  </Text>
                ))}
              </View>
            )}
            <IntentChips item={item} theme={theme} />
            {noteFor(item.exercise_id)}
          </View>
          {showSwap && onSwap && (
            <Pressable
              onPress={() => onSwap(item.exercise_id, item.exercise_name, blockType)}
              style={[styles.swapBtn, { borderColor: theme.border }]}
            >
              <Text style={[styles.swapBtnText, { color: theme.textMuted }]}>
                Swap
              </Text>
            </Pressable>
          )}
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  sectionBlock: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  supersetBlock: {
    marginBottom: 12,
    paddingLeft: 8,
    borderLeftWidth: 3,
  },
  supersetLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  pairRow: {
    borderRadius: 8,
    padding: 8,
    gap: 8,
  },
  exerciseRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 8,
    gap: 8,
  },
  supersetLetter: {
    fontSize: 14,
    fontWeight: "700",
    minWidth: 20,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: "600",
  },
  exercisePrescription: {
    fontSize: 13,
    marginTop: 2,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  tag: {
    fontSize: 11,
  },
  swapBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  swapBtnText: {
    fontSize: 12,
    fontWeight: "500",
  },
  noteBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
  },
  noteLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  noteText: {
    fontSize: 13,
  },
});
