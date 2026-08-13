/**
 * Near-duplicate trim of eligible_core → keep ~targetSize, demote rest to eligible_phase2.
 * Pure helpers used by the pilot catalog apply script + unit tests.
 */

export const PILOT_CORE_TARGET = 1000;

const VARIATION_TOKEN_RE =
  /\b(dumbbell|db|barbell|bb|kettlebell|kb|cable|machine|band|bands|smith|ez.?bar|trap.?bar|landmine|seated|standing|incline|decline|single.?arm|single.?leg|alternating|unilateral|bilateral|wide.?grip|close.?grip|neutral.?grip|pronated|supinated|with.?pause|tempo|deficit|elevated|floor|bench|paused|half|partial|assisted|weighted)\b/gi;

export type TrimExerciseRow = {
  id: string;
  slug: string;
  name: string;
  modalities: string[] | null;
  equipment: string[] | null;
  primary_muscles: string[] | null;
  movement_pattern: string | null;
  curation_movement_patterns: string[] | null;
  exercise_role: string | null;
  curation_primary_role: string | null;
  curation_equipment_class: string | null;
  curation_is_canonical: boolean | null;
  curation_complexity: string | null;
  warmup_relevance: string | null;
  cooldown_relevance: string | null;
  stretch_targets: string[] | null;
  mobility_targets: string[] | null;
};

export function equipmentClass(row: TrimExerciseRow): string {
  if (row.curation_equipment_class && row.curation_equipment_class.trim()) {
    return row.curation_equipment_class.trim().toLowerCase();
  }
  const eq = (row.equipment ?? []).map((e) => e.toLowerCase());
  if (eq.includes("barbell")) return "barbell";
  if (eq.includes("dumbbells") || eq.includes("dumbbell")) return "dumbbell";
  if (eq.includes("kettlebell") || eq.includes("kettlebells")) return "kb";
  if (eq.includes("cable") || eq.includes("cable_machine")) return "cable";
  if (eq.includes("machine")) return "machine";
  if (eq.includes("bands") || eq.includes("resistance_bands")) return "band";
  if (eq.length === 0 || (eq.length === 1 && eq[0] === "bodyweight")) return "bodyweight";
  return "other";
}

export function movementKey(row: TrimExerciseRow): string {
  const mp =
    (row.movement_pattern && row.movement_pattern.trim()) ||
    row.curation_movement_patterns?.[0] ||
    "unknown";
  const m1 = row.primary_muscles?.[0] ?? "unknown";
  return `${mp.toLowerCase()}|${m1.toLowerCase()}|${equipmentClass(row)}`;
}

/** Thin slices we must not starve when demoting variations. */
export function isProtectedThinSlice(row: TrimExerciseRow): boolean {
  const mods = (row.modalities ?? []).map((m) => m.toLowerCase());
  if (mods.includes("mobility") || mods.includes("recovery") || mods.includes("conditioning")) {
    return true;
  }
  const role = (row.curation_primary_role || row.exercise_role || "").toLowerCase();
  if (["mobility", "stretch", "cooldown", "prep", "finisher"].includes(role)) return true;
  if ((row.warmup_relevance ?? "").trim() || (row.cooldown_relevance ?? "").trim()) return true;
  if ((row.stretch_targets?.length ?? 0) > 0 || (row.mobility_targets?.length ?? 0) > 0) return true;
  const n = `${row.name} ${row.slug}`.toLowerCase();
  if (
    /stretch|mobility|foam|cars|yoga|cat.?cow|child.?pose|dead.?bug|bird.?dog|world.?greatest|ankle.?circle|wrist.?circle|thread.?the.?needle|sleeper/.test(
      n
    )
  ) {
    return true;
  }
  return false;
}

/** Higher = more likely to stay in core (common staple). */
export function keepScore(row: TrimExerciseRow): number {
  let s = 0;
  if (row.curation_is_canonical) s += 40;
  const name = row.name.trim();
  s += Math.max(0, 40 - name.length); // prefer shorter names
  const variationHits = (name.match(VARIATION_TOKEN_RE) ?? []).length;
  s -= variationHits * 8;
  const eq = equipmentClass(row);
  if (eq === "bodyweight" || eq === "barbell" || eq === "dumbbell") s += 10;
  if (eq === "machine" || eq === "other") s -= 6;
  const complexity = (row.curation_complexity ?? "").toLowerCase();
  if (complexity === "simple" || complexity === "low") s += 8;
  if (complexity === "advanced" || complexity === "high") s -= 8;
  if (isProtectedThinSlice(row)) s += 100;
  return s;
}

export type TrimCoreResult = {
  keepIds: string[];
  demoteIds: string[];
  protectedCount: number;
  groupCount: number;
};

/**
 * Keep up to `targetSize` core exercises; demote the rest (near-duplicates / variations).
 * Protected thin-slice rows are never demoted.
 */
export function trimCorePool(rows: TrimExerciseRow[], targetSize = PILOT_CORE_TARGET): TrimCoreResult {
  const protectedRows = rows.filter(isProtectedThinSlice);
  const compressible = rows.filter((r) => !isProtectedThinSlice(r));

  const groups = new Map<string, TrimExerciseRow[]>();
  for (const r of compressible) {
    const k = movementKey(r);
    const list = groups.get(k) ?? [];
    list.push(r);
    groups.set(k, list);
  }
  for (const list of groups.values()) {
    list.sort((a, b) => keepScore(b) - keepScore(a) || a.slug.localeCompare(b.slug));
  }

  const keep = new Set<string>(protectedRows.map((r) => r.id));
  // Seed: best from each group
  for (const list of groups.values()) {
    if (list[0]) keep.add(list[0].id);
  }

  // Fill toward target with next-best from largest remaining queues
  type Cand = { row: TrimExerciseRow; rank: number };
  const extras: Cand[] = [];
  for (const list of groups.values()) {
    for (let i = 1; i < list.length; i++) {
      extras.push({ row: list[i]!, rank: i });
    }
  }
  extras.sort(
    (a, b) =>
      keepScore(b.row) - keepScore(a.row) || a.rank - b.rank || a.row.slug.localeCompare(b.row.slug)
  );

  for (const { row } of extras) {
    if (keep.size >= targetSize) break;
    keep.add(row.id);
  }

  // If still over target (many protected + group seeds), demote lowest-score non-protected
  if (keep.size > targetSize) {
    const demotable = [...keep]
      .map((id) => rows.find((r) => r.id === id)!)
      .filter((r) => r && !isProtectedThinSlice(r))
      .sort((a, b) => keepScore(a) - keepScore(b) || b.slug.localeCompare(a.slug));
    for (const r of demotable) {
      if (keep.size <= targetSize) break;
      keep.delete(r.id);
    }
  }

  const keepIds = rows.filter((r) => keep.has(r.id)).map((r) => r.id);
  const demoteIds = rows.filter((r) => !keep.has(r.id)).map((r) => r.id);
  return {
    keepIds,
    demoteIds,
    protectedCount: protectedRows.length,
    groupCount: groups.size,
  };
}

/** Unlabeled → core if thin-slice protected, else niche (out of pilot until promoted). */
export function classifyUnlabeledState(row: TrimExerciseRow): "eligible_core" | "eligible_niche" {
  return isProtectedThinSlice(row) ? "eligible_core" : "eligible_niche";
}
