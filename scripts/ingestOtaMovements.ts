/**
 * Ingest OTA movements from https://movements.overtimeathletes.com/ into TodayFit ExerciseDefinition format.
 *
 * This script is best-effort: OTA pages mostly contain a title and (sometimes) an external link,
 * so we infer muscles/modalities/equipment/tags from the movement category path + slug keywords.
 *
 * Output: data/otaMovements.ts
 *
 * Run:
 *   npx tsx scripts/ingestOtaMovements.ts
 */

import fs from "node:fs";
import path from "node:path";

type MuscleGroup = "legs" | "push" | "pull" | "core";
type Modality = "strength" | "hypertrophy" | "conditioning" | "mobility" | "power";
type ContraindicationKey = "shoulder" | "elbow" | "wrist" | "lower_back" | "hip" | "knee" | "ankle";
type EquipmentKey =
  | "squat_rack"
  | "barbell"
  | "plates"
  | "bench"
  | "trap_bar"
  | "leg_press"
  | "cable_machine"
  | "lat_pulldown"
  | "chest_press"
  | "hamstring_curl"
  | "leg_extension"
  | "machine"
  | "dumbbells"
  | "kettlebells"
  | "adjustable_bench"
  | "ez_bar"
  | "treadmill"
  | "assault_bike"
  | "rower"
  | "ski_erg"
  | "stair_climber"
  | "elliptical"
  | "bands"
  | "trx"
  | "pullup_bar"
  | "rings"
  | "plyo_box"
  | "sled"
  | "bodyweight";

type ExerciseDefinition = {
  id: string;
  name: string;
  muscles: MuscleGroup[];
  modalities: Modality[];
  contraindications?: ContraindicationKey[];
  equipment: EquipmentKey[];
  tags: string[];
  progressions?: string[];
  regressions?: string[];
};

const ROOT = "https://movements.overtimeathletes.com";
const START_PAGES = [
  `${ROOT}/speed/`,
  `${ROOT}/power/`,
  `${ROOT}/strength/`,
  `${ROOT}/stretches-activation-2/`,
] as const;

function uniq<T>(xs: T[]): T[] {
  return [...new Set(xs)];
}

function toIdFromUrl(url: string): string {
  const u = new URL(url);
  const parts = u.pathname.split("/").filter(Boolean);
  const last = parts[parts.length - 1] ?? "movement";
  return last
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function stripHtml(s: string): string {
  return s
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchText(url: string): Promise<string> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 12_000);
  const res = await fetch(url, { redirect: "follow", signal: controller.signal });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  const txt = await res.text();
  clearTimeout(t);
  return txt;
}

function extractLinks(html: string): string[] {
  const out: string[] = [];
  const re = /href\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const href = m[1];
    if (!href) continue;
    if (href.startsWith("#")) continue;
    if (href.startsWith("mailto:")) continue;
    if (href.includes("wp-login.php")) continue;
    const abs = href.startsWith("http") ? href : new URL(href, ROOT).toString();
    if (!abs.startsWith(ROOT)) continue;
    out.push(abs.split("#")[0]);
  }
  return uniq(out);
}

function extractTitle(html: string): string | null {
  // Prefer H1
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  if (h1) return stripHtml(h1);
  // Fallback to title tag
  const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  if (t) return stripHtml(t).replace(/\s+-\s+OTA Exercise Database\s*$/i, "");
  return null;
}

type MovementKind = "speed" | "power" | "strength" | "mobility";

function inferFromPath(url: string): {
  kind: MovementKind;
  tags: string[];
  modalities: Modality[];
} {
  const p = new URL(url).pathname.toLowerCase();
  if (p.startsWith("/speed/")) return { kind: "speed", tags: ["speed", "athleticism"], modalities: ["conditioning", "power"] };
  if (p.startsWith("/power/")) return { kind: "power", tags: ["power", "athleticism"], modalities: ["power"] };
  if (p.startsWith("/strength/")) return { kind: "strength", tags: ["strength"], modalities: ["strength", "hypertrophy"] };
  if (p.startsWith("/stretches-activation-2/")) return { kind: "mobility", tags: ["mobility", "warmup", "cooldown"], modalities: ["mobility"] };
  return { kind: "strength", tags: [], modalities: ["strength"] };
}

function inferMuscles(url: string, title: string): MuscleGroup[] {
  const p = new URL(url).pathname.toLowerCase();
  const s = `${p} ${title}`.toLowerCase();
  if (s.includes("/strength/upper") || s.includes("push") || s.includes("press") || s.includes("push-up")) return ["push"];
  if (s.includes("/strength/upper") || s.includes("pull") || s.includes("row") || s.includes("chin") || s.includes("hang")) return ["pull"];
  if (s.includes("/strength/lower") || s.includes("sprint") || s.includes("start") || s.includes("jump") || s.includes("lunge") || s.includes("sled")) return ["legs"];
  if (s.includes("/strength/trunk") || s.includes("trunk") || s.includes("core") || s.includes("brace")) return ["core"];
  // Speed/power defaults to legs+core
  if (p.startsWith("/speed/") || p.startsWith("/power/")) return ["legs", "core"];
  // Mobility defaults to core+legs
  if (p.startsWith("/stretches-activation-2/")) return ["core", "legs"];
  return ["legs"];
}

function inferEquipment(url: string, title: string): EquipmentKey[] {
  const s = `${new URL(url).pathname} ${title}`.toLowerCase();
  const eq: EquipmentKey[] = ["bodyweight"];
  if (s.includes("band")) eq.push("bands");
  if (s.includes("sled")) eq.push("sled");
  if (s.includes("box")) eq.push("plyo_box");
  if (s.includes("treadmill")) eq.push("treadmill");
  if (s.includes("row")) eq.push("rower");
  if (s.includes("ski")) eq.push("ski_erg");
  return uniq(eq);
}

function inferContraindications(kind: MovementKind, url: string, title: string): ContraindicationKey[] | undefined {
  const s = `${new URL(url).pathname} ${title}`.toLowerCase();
  const out: ContraindicationKey[] = [];
  if (kind === "speed" || kind === "power") {
    if (!s.includes("ankle")) out.push("knee");
    out.push("ankle");
  }
  if (s.includes("wall") || s.includes("hand") || s.includes("push")) out.push("wrist", "shoulder");
  if (s.includes("hang") || s.includes("chin") || s.includes("pull")) out.push("shoulder", "elbow");
  const clean = uniq(out);
  return clean.length ? clean : undefined;
}

async function crawl(): Promise<string[]> {
  const seen = new Set<string>();
  const queue: string[] = [...START_PAGES];
  let fetched = 0;

  while (queue.length) {
    const url = queue.shift()!;
    if (seen.has(url)) continue;
    seen.add(url);
    fetched++;
    if (fetched % 50 === 0) console.log(`Crawl: fetched ${fetched}, seen ${seen.size}, queue ${queue.length}`);
    if (seen.size > 2500) break;
    let html: string;
    try {
      html = await fetchText(url);
    } catch {
      continue;
    }
    const links = extractLinks(html);
    for (const l of links) {
      // stay within movement taxonomy sections
      const p = new URL(l).pathname;
      if (
        p.startsWith("/speed/") ||
        p.startsWith("/power/") ||
        p.startsWith("/strength/") ||
        p.startsWith("/stretches-activation-2/")
      ) {
        if (!seen.has(l)) queue.push(l);
      }
    }
  }

  return [...seen].filter((u) => {
    const p = new URL(u).pathname;
    // exclude index/category pages that are just link lists
    return !["/speed/", "/power/", "/strength/", "/stretches-activation-2/"].includes(p) && p.split("/").filter(Boolean).length >= 3;
  });
}

function formatTs(exercises: ExerciseDefinition[]): string {
  const header = `import type { ExerciseDefinition } from \"../lib/types\";\n\nexport const OTA_MOVEMENTS: ExerciseDefinition[] = [\n`;
  const lines = exercises.map((e) => `  ${JSON.stringify(e, null, 2).replace(/\n/g, "\n  ")},`);
  const footer = `\n];\n`;
  return header + lines.join("\n") + footer;
}

async function main() {
  console.log("Crawling OTA movements site...");
  const urls = await crawl();
  console.log(`Found ${urls.length} candidate movement pages.`);
  const exercises: ExerciseDefinition[] = [];

  // Simple concurrency so we don't take forever.
  const CONCURRENCY = 8;
  let idx = 0;

  async function worker() {
    while (true) {
      const i = idx++;
      if (i >= urls.length) return;
      const url = urls[i];
      if (i % 50 === 0) console.log(`Fetching ${i}/${urls.length}...`);

      let html: string;
      try {
        html = await fetchText(url);
      } catch {
        continue;
      }
    const name = extractTitle(html);
    if (!name) continue;

    const id = toIdFromUrl(url);
    const { kind, tags: kindTags, modalities } = inferFromPath(url);
    const muscles = inferMuscles(url, name);
    const equipment = inferEquipment(url, name);
    const contraindications = inferContraindications(kind, url, name);
    const tags = uniq([
      "ota_movements",
      ...kindTags,
      ...new URL(url).pathname.split("/").filter(Boolean).slice(0, 3).map((s) => s.replace(/-2$/, "").replace(/-/g, " ")),
    ]);

    exercises.push({
      id,
      name,
      muscles,
      modalities,
      equipment,
      ...(contraindications ? { contraindications } : {}),
      tags,
      regressions: [],
      progressions: [],
    });
  }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  exercises.sort((a, b) => a.id.localeCompare(b.id));

  const outPath = path.join(process.cwd(), "data", "otaMovements.ts");
  fs.writeFileSync(outPath, formatTs(exercises), "utf8");
  console.log(`Wrote ${exercises.length} exercises to ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

