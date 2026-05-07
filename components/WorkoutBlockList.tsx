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

/** True for the internal "athletic_performance" goal slug — too generic to show users. */
function _isAthletic(m: { kind: string; slug: string }): boolean {
  return m.kind === "goal" && m.slug === "athletic_performance";
}

/**
 * Returns 1–2 human-readable labels for why this exercise is in the workout.
 * Rules (in priority order):
 *  1. Session prep (warmup/cooldown) — no FOR chip; shows nothing.
 *  2. Specific matched intents (sport sub-focus > goal sub-focus > bare sport),
 *     "athletic_performance" goal entries are never displayed (too generic).
 *  3. Exercises that matched a sport tag but not a specific sub-focus → sport name.
 *  4. Exercises with no sport connection in a sport session → session sport names as context.
 *  5. Non-sport sessions → humanized goal name.
 */
function getIntentLabels(item: WorkoutItem): string[] {
  const links = item.session_intent_links;
  if (!links) return [];

  // Warmup / cooldown: block title already provides context; no FOR chip needed.
  if (links.session_prep) return [];

  const labels: string[] = [];

  // 1. Specific matched intent entries — skip athletic_performance and inferred.
  const specificMatched = (links.matched_intents ?? []).filter(
    (m) => m.match_strength !== "inferred" && !_isAthletic(m)
  );
  const strengthOrder = (m: (typeof specificMatched)[number]) =>
    m.match_strength === "direct" ? 0 : 1;
  const tier = (m: (typeof specificMatched)[number]) =>
    m.kind === "sport_sub_focus" ? 0 : m.kind === "goal_sub_focus" ? 1 : m.kind === "sport" ? 2 : 3;

  const orderedMatched = [...specificMatched].sort((a, b) => {
    const td = tier(a) - tier(b);
    if (td !== 0) return td;
    const sw = strengthOrder(a) - strengthOrder(b);
    if (sw !== 0) return sw;
    return a.rank - b.rank;
  });

  for (const m of orderedMatched) {
    if (labels.length >= 2) break;
    const lbl = _formatIntentLabel(m);
    if (!labels.includes(lbl)) labels.push(lbl);
  }

  // 2. Exercise has a sport tag that matches the session sport (but no sub-focus).
  if (labels.length < 2) {
    const coveredParents = new Set(
      orderedMatched
        .filter((m) => m.kind === "sport" || m.kind === "sport_sub_focus")
        .map((m) => (m.kind === "sport_sub_focus" ? (m.parent_slug ?? m.slug) : m.slug))
    );
    for (const sportSlug of links.sport_slugs ?? []) {
      if (labels.length >= 2) break;
      if (coveredParents.has(sportSlug)) continue;
      const sport = _sportBySlug.get(sportSlug);
      const lbl = sport ? sport.name : _humanizeGoalSlug(sportSlug);
      if (!labels.includes(lbl)) labels.push(lbl);
    }
  }

  // 3. Non-sport goal fallback (strength, hypertrophy, mobility…) — skip athletic_performance.
  if (labels.length === 0) {
    for (const goal of (links.goals ?? []).filter((g) => g !== "athletic_performance")) {
      if (labels.length >= 2) break;
      const humanized = _humanizeGoalSlug(goal);
      if (!labels.includes(humanized)) labels.push(humanized);
    }
  }

  // 4. Last resort for sport sessions: show session sport context so the chip is never blank.
  if (labels.length === 0 && (links.session_sport_slugs?.length ?? 0) > 0) {
    for (const sportSlug of (links.session_sport_slugs ?? []).slice(0, 2)) {
      if (labels.length >= 2) break;
      const sport = _sportBySlug.get(sportSlug);
      const lbl = sport ? sport.name : _humanizeGoalSlug(sportSlug);
      if (!labels.includes(lbl)) labels.push(lbl);
    }
  }

  return [...new Set(labels)].slice(0, 2);
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

function BlockGoalBadge({
  block,
  theme,
}: {
  block: WorkoutBlock;
  theme: ReturnType<typeof useTheme>;
}) {
  const intent = block.goal_intent;
  if (!intent) return null;

  const goalLabel = _humanizeGoalSlug(intent.goal_slug);
  const subLabel = intent.sub_focus_slug ? _humanizeGoalSlug(intent.sub_focus_slug) : null;
  const label = subLabel ? `${goalLabel} · ${subLabel}` : goalLabel;

  return (
    <View style={blockGoalStyles.row}>
      <View style={[blockGoalStyles.badge, { backgroundColor: theme.primarySoft, borderColor: theme.primary }]}>
        <Text style={[blockGoalStyles.badgeText, { color: theme.primary }]}>
          {label.toUpperCase()}
        </Text>
      </View>
    </View>
  );
}

const blockGoalStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    marginBottom: 8,
    marginTop: 2,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.7,
  },
});

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
  onSwap?: (
    exerciseId: string,
    exerciseName: string,
    blockType: BlockType,
    swapPoolExerciseIds?: string[]
  ) => void;
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
            <BlockGoalBadge block={block} theme={theme} />
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
  onSwap:
    | ((
        exerciseId: string,
        exerciseName: string,
        blockType: BlockType,
        swapPoolExerciseIds?: string[]
      ) => void)
    | undefined,
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
                      onPress={() =>
                        onSwap(
                          item.exercise_id,
                          item.exercise_name,
                          blockType,
                          block.goal_intent?.swap_pool_exercise_ids
                        )
                      }
                      style={[styles.swapBtn, { borderColor: theme.border }]}
                    >
                      <Text style={[styles.swapBtnText, { color: theme.textMuted }]}>
                        Swap exercise
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
              onPress={() =>
                onSwap(
                  item.exercise_id,
                  item.exercise_name,
                  blockType,
                  block.goal_intent?.swap_pool_exercise_ids
                )
              }
              style={[styles.swapBtn, { borderColor: theme.border }]}
            >
              <Text style={[styles.swapBtnText, { color: theme.textMuted }]}>
                Swap exercise
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
