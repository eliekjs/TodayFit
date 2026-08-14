/**
 * User-facing block titles for the six-block programming model.
 * Does not change which blocks the generator builds — only names them after assembly.
 */

export type PresentationBlock = {
  block_type: string;
  title?: string;
  items: Array<{ exercise_id: string; exercise_name: string }>;
};

type PresentationExercise = {
  muscle_groups?: string[];
  pairing_category?: string;
  modality?: string;
  tags?: { attribute_tags?: string[] };
};

const SUPPORT_TYPES = new Set(["cooldown", "mobility", "recovery", "core"]);

const PRESERVED_TITLES = new Set(["calisthenics"]);

const GENERIC_STRUCTURAL_TITLES = new Set([
  "activation",
  "warmup",
  "main_strength",
  "main strength",
  "primary strength",
  "secondary strength",
  "main hypertrophy",
  "hypertrophy",
  "power block",
  "power",
  "accessory",
  "conditioning",
  "cooldown",
  "mobility",
  "recovery",
  "core",
]);

function isGenericStructuralTitle(title: string): boolean {
  const n = title.toLowerCase().trim();
  if (!n) return true;
  if (GENERIC_STRUCTURAL_TITLES.has(n)) return true;
  if (/^block [a-z]+$/i.test(n)) return true;
  if (/^main strength\b/i.test(n)) return true;
  if (/^main hypertrophy\b/i.test(n)) return true;
  if (/^power block\b/i.test(n)) return true;
  return false;
}

function norm(value: string): string {
  return value.toLowerCase().replace(/[\s-]+/g, "_");
}

function itemBlob(block: PresentationBlock, exercisesById?: Map<string, PresentationExercise>): string {
  const parts: string[] = [];
  for (const item of block.items) {
    parts.push(item.exercise_name);
    const ex = exercisesById?.get(item.exercise_id);
    if (!ex) continue;
    parts.push(ex.modality ?? "");
    parts.push(ex.pairing_category ?? "");
    parts.push(...(ex.muscle_groups ?? []));
    parts.push(...(ex.tags?.attribute_tags ?? []));
  }
  return parts.join(" ").toLowerCase().replace(/[_-]+/g, " ");
}

export function resolveSupportBlockTitle(
  block: PresentationBlock,
  exercisesById?: Map<string, PresentationExercise>
): string {
  const blob = itemBlob(block, exercisesById);
  if (/\b(knee|acl|patell)/.test(blob)) return "Knee Resilience";
  if (/\b(shoulder|rotator|scap)/.test(blob)) return "Shoulder Stability";
  if (/\bankle\b/.test(blob)) return "Ankle Stability";
  if (/\b(core|anti rotation|anti flexion|plank|pallof)\b/.test(blob) && !/\b(stretch|mobility)\b/.test(blob)) {
    return "Core";
  }
  if (/\b(prehab|sport support|stability)\b/.test(blob)) return "Sport Support";
  if (/\b(recovery|breathing|restore)\b/.test(blob)) return "Recovery";
  if (/\b(mobility|stretch|cooldown)\b/.test(blob)) return "Mobility";

  const type = norm(block.block_type);
  if (type === "core") return "Core";
  if (type === "mobility") return "Mobility";
  if (type === "recovery") return "Recovery";
  return "Cooldown";
}

function uniquifyTitles(blocks: PresentationBlock[]): void {
  const used = new Set<string>();
  for (const block of blocks) {
    let title = (block.title ?? block.block_type.replace(/_/g, " ")).trim();
    if (used.has(title)) {
      let suffix = 2;
      while (used.has(`${title} (${suffix})`)) suffix += 1;
      title = `${title} (${suffix})`;
      block.title = title;
    }
    used.add(title);
  }
}

/**
 * Rename assembled blocks to Primary / Secondary Strength, Power / Speed, Hypertrophy,
 * Accessory, Conditioning, and content-aware support titles.
 */
export function applySessionBlockPresentation(
  blocks: PresentationBlock[],
  exercisesById?: Map<string, PresentationExercise>
): void {
  let mainStrengthCount = 0;
  for (const block of blocks) {
    const type = norm(block.block_type);
    const existing = (block.title ?? "").trim();
    if (existing && PRESERVED_TITLES.has(norm(existing))) continue;
    // Keep joint-health PT titles, interval names, foundations, etc.
    if (existing && !isGenericStructuralTitle(existing)) continue;

    if (type === "warmup" || type === "prep") {
      block.title = "Activation";
      continue;
    }
    if (type === "power") {
      block.title = "Power / Speed";
      continue;
    }
    if (type === "main_strength") {
      mainStrengthCount += 1;
      if (/secondary/i.test(existing)) {
        block.title = "Secondary Strength";
      } else {
        block.title = mainStrengthCount === 1 ? "Primary Strength" : "Secondary Strength";
      }
      continue;
    }
    if (type === "main_hypertrophy") {
      block.title = "Hypertrophy";
      continue;
    }
    if (type === "accessory") {
      if (/prehab|sport support|stability|resilience/i.test(existing)) {
        block.title = resolveSupportBlockTitle({ ...block, block_type: "core" }, exercisesById);
      } else {
        block.title = "Accessory";
      }
      continue;
    }
    if (type === "conditioning") {
      block.title = /endurance/i.test(existing) ? "Endurance" : "Conditioning";
      continue;
    }
    if (SUPPORT_TYPES.has(type)) {
      block.title = resolveSupportBlockTitle(block, exercisesById);
    }
  }
  uniquifyTitles(blocks);
}
