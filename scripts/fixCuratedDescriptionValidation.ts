/**
 * Fix curated description validation failures (sentence length/count).
 */
import fs from "node:fs";
import path from "node:path";
import { EXERCISES } from "../data/exercisesMerged";
import { validateCuratedDescriptionsFile } from "../lib/exerciseDescriptionsCurated";
import {
  MAX_EXERCISE_DESCRIPTION_SENTENCE_CHARS,
  MAX_EXERCISE_DESCRIPTION_SENTENCES,
  validateExerciseDescriptionCopy,
} from "../lib/exerciseDisplayCue";

const CURATED_PATH = path.join(process.cwd(), "data/exerciseDescriptions.curated.json");

function splitSentences(text: string): string[] {
  return text
    .trim()
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.trim().length > 0);
}

function joinSentences(sentences: string[]): string {
  return sentences.map((s) => (s.endsWith(".") ? s : s + ".")).join(" ");
}

function shortenSentence(s: string): string {
  let out = s.replace(/\s+/g, " ").trim();
  out = out.replace(/Perform the [^.]+ pattern with control through the full rep\.?/i, "Move through the pattern with control.");
  out = out.replace(/Pull the bar or bell close using the legs and hips, receive it in the listed catch position, then stand or finish overhead as the name describes/i,
    "Pull the weight close with the legs and hips, catch it as the name describes, then stand or finish overhead");
  out = out.replace(/Start on your back with the load pressed up, roll to the elbow, post to the hand, sweep the leg through, and stand while keeping the weight stacked over the shoulder\. Reverse the steps to return/i,
    "Start on your back with the load up, move through each get-up segment to stand, then reverse back down");
  out = out.replace(/Place the rear foot on a bench or floor in a split stance and lower mostly straight down, then drive through the front foot to stand/i,
    "Set a split stance, lower straight down, then drive through the front foot to stand");
  out = out.replace(/Hold the load on the side opposite the working leg\. /i, "");
  out = out.replace(/Hold the load on the same side as the working leg\. /i, "");
  out = out.replace(/Alternate sides each rep with the same form on both sides\. /i, "");
  out = out.replace(/Work one side while the other side waits in the start position, then switch in a seesaw rhythm\. /i, "");
  out = out.replace(/Work one arm at a time while the other arm supports or waits at the side\. /i, "");
  out = out.replace(/Work one leg at a time with the other foot lifted or behind you\. /i, "");
  if (out.length > MAX_EXERCISE_DESCRIPTION_SENTENCE_CHARS) {
    const clauses = out.split(/,\s+/);
    out = clauses.slice(0, Math.max(2, Math.ceil(clauses.length * 0.6))).join(", ");
    if (!out.endsWith(".")) out += ".";
  }
  return out;
}

function fixDescription(text: string): string {
  let sentences = splitSentences(text).map(shortenSentence);

  while (sentences.length > MAX_EXERCISE_DESCRIPTION_SENTENCES) {
    const merged = `${sentences[0].replace(/\.$/, "")}, ${sentences[1].charAt(0).toLowerCase()}${sentences[1].slice(1)}`;
    sentences = [merged, ...sentences.slice(2)];
  }

  sentences = sentences.map((s) => {
    let out = s.trim();
    while (out.length > MAX_EXERCISE_DESCRIPTION_SENTENCE_CHARS) {
      const parts = out.split(/,\s+/);
      if (parts.length <= 1) {
        out = out.slice(0, MAX_EXERCISE_DESCRIPTION_SENTENCE_CHARS - 1).replace(/,\s[^,]*$/, "") + ".";
        break;
      }
      out = parts.slice(0, -1).join(", ") + ".";
    }
    return out.endsWith(".") ? out : out + ".";
  });

  return joinSentences(sentences);
}

function main() {
  const file = JSON.parse(fs.readFileSync(CURATED_PATH, "utf8"));
  const known = new Set(EXERCISES.map((e) => e.id));
  let fixed = 0;

  for (const slug of Object.keys(file.entries)) {
    const entry = file.entries[slug];
    const errs = validateExerciseDescriptionCopy(entry.description);
    if (!errs.length) continue;
    entry.description = fixDescription(entry.description);
    const errs2 = validateExerciseDescriptionCopy(entry.description);
    if (errs2.length) {
      const s = splitSentences(entry.description);
      entry.description = joinSentences(s.slice(0, MAX_EXERCISE_DESCRIPTION_SENTENCES).map(shortenSentence));
    }
    fixed++;
  }

  fs.writeFileSync(CURATED_PATH, JSON.stringify(file, null, 2) + "\n");

  const result = validateCuratedDescriptionsFile(known);
  console.log(JSON.stringify({ fixed, remainingErrors: result.errors.length, errors: result.errors.slice(0, 30) }, null, 2));
}

main();
