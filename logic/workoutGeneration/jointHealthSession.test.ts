import { describe, expect, it } from "vitest";
import type { GymProfile } from "../../data/gymProfiles";
import { GOAL_SUB_FOCUS_OPTIONS } from "../../data/goalSubFocus/goalSubFocusOptions";
import { PRIMARY_FOCUS_OPTIONS } from "../../lib/preferencesConstants";
import { manualPreferencesToGenerateWorkoutInput } from "../../lib/dailyGeneratorAdapter";
import type { ManualPreferences } from "../../lib/types";
import { generateWorkoutSession } from "./dailyGenerator";
import { STUB_EXERCISES, withJointHealthEnrichment } from "./exerciseStub";
import type { Exercise } from "./types";
import { isWarmupEligibleEquipment } from "../../lib/workoutRules";
import { buildJointHealthMain, estimateJointHealthItemMinutes } from "./jointHealthSession";
import { getJointHealthActivationFamilyId } from "./jointHealthActivationFamilies";

const TEST_GYM: GymProfile = {
  id: "test_gym",
  name: "Test Gym",
  equipment: [
    "bodyweight",
    "dumbbells",
    "kettlebells",
    "bands",
    "cable_machine",
    "bench",
  ],
};

describe("joint health goal in selection UI", () => {
  it("appears in PRIMARY_FOCUS_OPTIONS", () => {
    expect(PRIMARY_FOCUS_OPTIONS).toContain("Strength Training for Joint Health");
    expect(PRIMARY_FOCUS_OPTIONS).toContain("Recovery & Mobility");
    expect(PRIMARY_FOCUS_OPTIONS).not.toContain("Mobility & Joint Health");
  });

  it("defines six joint-specific sub-goals", () => {
    const entry = GOAL_SUB_FOCUS_OPTIONS["Strength Training for Joint Health"];
    expect(entry.goalSlug).toBe("joint_health");
    expect(entry.subFocuses.map((f) => f.slug)).toEqual([
      "knee_health",
      "shoulder_health",
      "hip_health",
      "ankle_foot_health",
      "back_spine_health",
      "elbow_wrist_health",
    ]);
  });
});

describe("buildJointHealthMain", () => {
  const enrichedPool = withJointHealthEnrichment(STUB_EXERCISES);

  const basePrefs = (subs: string[]): ManualPreferences => ({
    primaryFocus: ["Strength Training for Joint Health"],
    targetBody: null,
    targetModifier: [],
    durationMinutes: 45,
    energyLevel: "medium",
    injuries: ["No restrictions"],
    upcoming: [],
    subFocusByGoal: {
      "Strength Training for Joint Health": subs,
    },
    workoutStyle: [],
    workoutTier: "intermediate",
  });

  it("produces PT-style block structure with activation, strength, and stability", () => {
    const input = manualPreferencesToGenerateWorkoutInput(basePrefs(["Knee Health"]), undefined, "jh-structure");
    const used = new Set<string>();
    const blocks = buildJointHealthMain(enrichedPool, input, used, () => 0.42);
    expect(blocks.length).toBeGreaterThanOrEqual(2);
    const titles = blocks.map((b) => b.title ?? "");
    expect(titles.some((t) => t.includes("activation") || t.includes("prep"))).toBe(true);
    expect(titles.some((t) => t.includes("Controlled strength") || t.includes("Stability"))).toBe(true);
    const allItems = blocks.flatMap((b) => b.items);
    expect(allItems.length).toBeGreaterThanOrEqual(6);
    expect(allItems.every((it) => (it.reasoning_tags ?? []).includes("joint_health"))).toBe(true);
    const estimatedMinutes = blocks.reduce(
      (sum, block) => sum + block.items.reduce((s, item) => s + estimateJointHealthItemMinutes(item), 0),
      0
    );
    expect(estimatedMinutes).toBeGreaterThanOrEqual(35);
  });

  it("activation block uses bodyweight or band prep only — no loaded split squats or machines", () => {
    const input = manualPreferencesToGenerateWorkoutInput(basePrefs(["Knee Health"]), TEST_GYM, "jh-activation-bw");
    const used = new Set<string>();
    const blocks = buildJointHealthMain(enrichedPool, input, used, () => 0.55);
    const activation = blocks.find((b) => (b.title ?? "").toLowerCase().includes("activation"));
    expect(activation).toBeDefined();
    expect((activation?.items.length ?? 0)).toBeGreaterThan(0);
    for (const item of activation?.items ?? []) {
      const ex = enrichedPool.find((e) => e.id === item.exercise_id);
      expect(ex, `missing exercise ${item.exercise_id}`).toBeDefined();
      expect(isWarmupEligibleEquipment(ex!.equipment_required ?? [])).toBe(true);
      expect(item.exercise_id).not.toBe("leg_extension");
      expect(item.exercise_id).not.toMatch(/split_squat|goblet_squat|barbell/);
    }
  });

  it("excludes high-impact exercises from generated joint health sessions", () => {
    const withPlyo: Exercise[] = [
      ...enrichedPool,
      {
        id: "box_jump_test",
        name: "Box Jump",
        movement_pattern: "locomotion",
        muscle_groups: ["legs"],
        modality: "power",
        equipment_required: ["box"],
        difficulty: 3,
        time_cost: "low",
        tags: {
          goal_tags: ["power"],
          energy_fit: ["high"],
          stimulus: ["plyometric"],
        },
      },
    ];
    const input = manualPreferencesToGenerateWorkoutInput(basePrefs(["Knee Health"]), undefined, "jh-exclude");
    const used = new Set<string>();
    const blocks = buildJointHealthMain(withPlyo, input, used, () => 0.1);
    const ids = blocks.flatMap((b) => b.items.map((i) => i.exercise_id));
    expect(ids).not.toContain("box_jump_test");
  });

  it("generates end-to-end via dailyGenerator with knee health sub-focus", () => {
    const input = manualPreferencesToGenerateWorkoutInput(basePrefs(["Knee Health"]), TEST_GYM, "jh-e2e");
    expect(input.primary_goal).toBe("joint_health");
    expect(input.goal_sub_focus?.joint_health).toContain("knee_health");

    const session = generateWorkoutSession(input, enrichedPool);
    expect(session.blocks.length).toBeGreaterThan(0);
    const itemCount = session.blocks.reduce((n, b) => n + b.items.length, 0);
    expect(itemCount).toBeGreaterThanOrEqual(3);
    const hasJointHealthTag = session.blocks.some((b) =>
      b.items.some((it) => (it.reasoning_tags ?? []).includes("joint_health"))
    );
    expect(hasJointHealthTag).toBe(true);

    const banned = new Set([
      "box_jump",
      "burpee",
      "kb_swing",
      "kettlebell_swing",
      "back_squat",
      "barbell_squat",
      "cat_camel",
      "push_up",
      "t_spine_rotation",
      "worlds_greatest_stretch",
      "bench_press_barbell",
      "dips",
    ]);
    const ids = session.blocks.flatMap((b) => b.items.map((i) => i.exercise_id));
    for (const id of ids) {
      expect(banned.has(id)).toBe(false);
    }
    expect(ids.some((id) => id.includes("bench_press"))).toBe(false);
    expect(ids.length).toBeGreaterThanOrEqual(5);
    const estimatedMinutes = session.blocks.reduce(
      (sum, block) => sum + block.items.reduce((s, item) => s + estimateJointHealthItemMinutes(item), 0),
      0
    );
    expect(estimatedMinutes).toBeGreaterThanOrEqual(25);
  });

  it("knee health session uses only knee-tagged exercises from enriched pool", () => {
    const input = manualPreferencesToGenerateWorkoutInput(basePrefs(["Knee Health"]), undefined, "jh-knee-only");
    const used = new Set<string>();
    const blocks = buildJointHealthMain(enrichedPool, input, used, () => 0.33);
    const ids = blocks.flatMap((b) => b.items.map((i) => i.exercise_id));
    const kneeTagged = new Set(
      enrichedPool
        .filter((e) => e.tags?.attribute_tags?.includes("knee_health"))
        .map((e) => e.id)
    );
    for (const id of ids) {
      expect(kneeTagged.has(id)).toBe(true);
    }
  });
});

describe("buildJointHealthMain — shoulder health", () => {
  const enrichedPool = withJointHealthEnrichment(STUB_EXERCISES);

  const shoulderPrefs = (): ManualPreferences => ({
    primaryFocus: ["Strength Training for Joint Health"],
    targetBody: null,
    targetModifier: [],
    durationMinutes: 45,
    energyLevel: "medium",
    injuries: ["No restrictions"],
    upcoming: [],
    subFocusByGoal: {
      "Strength Training for Joint Health": ["Shoulder Health"],
    },
    workoutStyle: [],
    workoutTier: "intermediate",
  });

  it("activation uses bodyweight or band shoulder prep only", () => {
    const input = manualPreferencesToGenerateWorkoutInput(shoulderPrefs(), TEST_GYM, "jh-shoulder-activation");
    const used = new Set<string>();
    const blocks = buildJointHealthMain(enrichedPool, input, used, () => 0.61);
    const activation = blocks.find((b) => (b.title ?? "").toLowerCase().includes("activation"));
    expect(activation).toBeDefined();
    for (const item of activation?.items ?? []) {
      const ex = enrichedPool.find((e) => e.id === item.exercise_id);
      expect(ex).toBeDefined();
      expect(isWarmupEligibleEquipment(ex!.equipment_required ?? [])).toBe(true);
      expect(item.exercise_id).not.toMatch(/bench|dip|push_up$/);
    }
  });

  it("shoulder activation uses distinct prep families — not all wall slides", () => {
    const input = manualPreferencesToGenerateWorkoutInput(shoulderPrefs(), TEST_GYM, "jh-shoulder-diverse");
    const used = new Set<string>();
    const blocks = buildJointHealthMain(enrichedPool, input, used, () => 0.42);
    const activation = blocks.find((b) => (b.title ?? "").toLowerCase().includes("activation"));
    const ids = (activation?.items ?? []).map((i) => i.exercise_id);
    expect(ids.length).toBeGreaterThanOrEqual(3);

    const families = ids.map((id) => getJointHealthActivationFamilyId(id, "shoulder_health"));
    const wallSlideCount = families.filter((f) => f === "wall_slide_scap").length;
    expect(wallSlideCount).toBeLessThanOrEqual(1);
    expect(new Set(families.filter(Boolean)).size).toBeGreaterThanOrEqual(3);
  });

  it("generates end-to-end shoulder health without bench press or dips", () => {
    const input = manualPreferencesToGenerateWorkoutInput(shoulderPrefs(), TEST_GYM, "jh-shoulder-e2e");
    expect(input.goal_sub_focus?.joint_health).toContain("shoulder_health");
    const session = generateWorkoutSession(input, enrichedPool);
    const ids = session.blocks.flatMap((b) => b.items.map((i) => i.exercise_id));
    expect(ids.length).toBeGreaterThanOrEqual(4);
    const banned = new Set(["bench_press_barbell", "dips", "push_up", "barbell_back_squat", "cat_camel"]);
    for (const id of ids) {
      expect(banned.has(id)).toBe(false);
    }
    expect(session.blocks.some((b) => b.items.some((it) => (it.reasoning_tags ?? []).includes("joint_health")))).toBe(
      true
    );
  });
});

describe("buildJointHealthMain — hip health", () => {
  const enrichedPool = withJointHealthEnrichment(STUB_EXERCISES);

  const hipPrefs = (): ManualPreferences => ({
    primaryFocus: ["Strength Training for Joint Health"],
    targetBody: null,
    targetModifier: [],
    durationMinutes: 45,
    energyLevel: "medium",
    injuries: ["No restrictions"],
    upcoming: [],
    subFocusByGoal: {
      "Strength Training for Joint Health": ["Hip Health"],
    },
    workoutStyle: [],
    workoutTier: "intermediate",
  });

  it("activation uses bodyweight or band hip prep only", () => {
    const input = manualPreferencesToGenerateWorkoutInput(hipPrefs(), TEST_GYM, "jh-hip-activation");
    const used = new Set<string>();
    const blocks = buildJointHealthMain(enrichedPool, input, used, () => 0.61);
    const activation = blocks.find((b) => (b.title ?? "").toLowerCase().includes("activation"));
    expect(activation).toBeDefined();
    for (const item of activation?.items ?? []) {
      const ex = enrichedPool.find((e) => e.id === item.exercise_id);
      expect(ex).toBeDefined();
      expect(isWarmupEligibleEquipment(ex!.equipment_required ?? [])).toBe(true);
      expect(item.exercise_id).not.toMatch(/bench|push_up$|barbell_squat/);
    }
  });

  it("hip activation uses distinct prep families — not all cossacks or 90/90 variants", () => {
    const input = manualPreferencesToGenerateWorkoutInput(hipPrefs(), TEST_GYM, "jh-hip-diverse");
    const used = new Set<string>();
    const blocks = buildJointHealthMain(enrichedPool, input, used, () => 0.42);
    const activation = blocks.find((b) => (b.title ?? "").toLowerCase().includes("activation"));
    const ids = (activation?.items ?? []).map((i) => i.exercise_id);
    expect(ids.length).toBeGreaterThanOrEqual(3);

    const families = ids.map((id) => getJointHealthActivationFamilyId(id, "hip_health"));
    const cossackCount = families.filter((f) => f === "cossack_mobility").length;
    const ninetyCount = families.filter((f) => f === "ninety_ninety").length;
    expect(cossackCount).toBeLessThanOrEqual(1);
    expect(ninetyCount).toBeLessThanOrEqual(1);
    expect(new Set(families.filter(Boolean)).size).toBeGreaterThanOrEqual(3);
  });

  it("generates end-to-end hip health without bench press or thoracic flows", () => {
    const input = manualPreferencesToGenerateWorkoutInput(hipPrefs(), TEST_GYM, "jh-hip-e2e");
    expect(input.goal_sub_focus?.joint_health).toContain("hip_health");
    const session = generateWorkoutSession(input, enrichedPool);
    const ids = session.blocks.flatMap((b) => b.items.map((i) => i.exercise_id));
    expect(ids.length).toBeGreaterThanOrEqual(4);
    const banned = new Set(["bench_press_barbell", "push_up", "cat_camel", "t_spine_rotation", "wall_slide"]);
    for (const id of ids) {
      expect(banned.has(id)).toBe(false);
    }
    const hipTagged = new Set(
      enrichedPool.filter((e) => e.tags?.attribute_tags?.includes("hip_health")).map((e) => e.id)
    );
    for (const id of ids) {
      expect(hipTagged.has(id)).toBe(true);
    }
  });
});

describe("buildJointHealthMain — ankle & foot health", () => {
  const enrichedPool = withJointHealthEnrichment(STUB_EXERCISES);

  const anklePrefs = (): ManualPreferences => ({
    primaryFocus: ["Strength Training for Joint Health"],
    targetBody: null,
    targetModifier: [],
    durationMinutes: 45,
    energyLevel: "medium",
    injuries: ["No restrictions"],
    upcoming: [],
    subFocusByGoal: {
      "Strength Training for Joint Health": ["Ankle & Foot Health"],
    },
    workoutStyle: [],
    workoutTier: "intermediate",
  });

  it("activation uses bodyweight or band ankle prep only", () => {
    const input = manualPreferencesToGenerateWorkoutInput(anklePrefs(), TEST_GYM, "jh-ankle-activation");
    const used = new Set<string>();
    const blocks = buildJointHealthMain(enrichedPool, input, used, () => 0.61);
    const activation = blocks.find((b) => (b.title ?? "").toLowerCase().includes("activation"));
    expect(activation).toBeDefined();
    for (const item of activation?.items ?? []) {
      const ex = enrichedPool.find((e) => e.id === item.exercise_id);
      expect(ex).toBeDefined();
      expect(isWarmupEligibleEquipment(ex!.equipment_required ?? [])).toBe(true);
      expect(item.exercise_id).not.toMatch(/cossack|clamshell|bench|split_squat/);
    }
  });

  it("ankle activation uses distinct prep families — not all tibialis or gait variants", () => {
    const input = manualPreferencesToGenerateWorkoutInput(anklePrefs(), TEST_GYM, "jh-ankle-diverse");
    const used = new Set<string>();
    const blocks = buildJointHealthMain(enrichedPool, input, used, () => 0.42);
    const activation = blocks.find((b) => (b.title ?? "").toLowerCase().includes("activation"));
    const ids = (activation?.items ?? []).map((i) => i.exercise_id);
    expect(ids.length).toBeGreaterThanOrEqual(3);

    const families = ids.map((id) => getJointHealthActivationFamilyId(id, "ankle_foot_health"));
    const tibCount = families.filter((f) => f === "tibialis_activation").length;
    const gaitCount = families.filter((f) => f === "gait_walks").length;
    expect(tibCount).toBeLessThanOrEqual(1);
    expect(gaitCount).toBeLessThanOrEqual(1);
    expect(new Set(families.filter(Boolean)).size).toBeGreaterThanOrEqual(3);
  });

  it("generates end-to-end ankle/foot health without hip or thoracic flows", () => {
    const input = manualPreferencesToGenerateWorkoutInput(anklePrefs(), TEST_GYM, "jh-ankle-e2e");
    expect(input.goal_sub_focus?.joint_health).toContain("ankle_foot_health");
    const session = generateWorkoutSession(input, enrichedPool);
    const ids = session.blocks.flatMap((b) => b.items.map((i) => i.exercise_id));
    expect(ids.length).toBeGreaterThanOrEqual(4);
    const banned = new Set(["clamshell", "hip_90_90", "cat_camel", "push_up", "wall_slide"]);
    for (const id of ids) {
      expect(banned.has(id)).toBe(false);
    }
    const ankleTagged = new Set(
      enrichedPool.filter((e) => e.tags?.attribute_tags?.includes("ankle_foot_health")).map((e) => e.id)
    );
    for (const id of ids) {
      expect(ankleTagged.has(id)).toBe(true);
    }
  });
});

describe("buildJointHealthMain — back & spine health", () => {
  const enrichedPool = withJointHealthEnrichment(STUB_EXERCISES);

  const spinePrefs = (): ManualPreferences => ({
    primaryFocus: ["Strength Training for Joint Health"],
    targetBody: null,
    targetModifier: [],
    durationMinutes: 45,
    energyLevel: "medium",
    injuries: ["No restrictions"],
    upcoming: [],
    subFocusByGoal: {
      "Strength Training for Joint Health": ["Back & Spine Health"],
    },
    workoutStyle: [],
    workoutTier: "intermediate",
  });

  it("activation uses bodyweight or band spine prep only", () => {
    const input = manualPreferencesToGenerateWorkoutInput(spinePrefs(), TEST_GYM, "jh-spine-activation");
    const used = new Set<string>();
    const blocks = buildJointHealthMain(enrichedPool, input, used, () => 0.61);
    const activation = blocks.find((b) => (b.title ?? "").toLowerCase().includes("activation"));
    expect(activation).toBeDefined();
    for (const item of activation?.items ?? []) {
      const ex = enrichedPool.find((e) => e.id === item.exercise_id);
      expect(ex).toBeDefined();
      expect(isWarmupEligibleEquipment(ex!.equipment_required ?? [])).toBe(true);
      expect(item.exercise_id).not.toMatch(/deadlift|bench|good_morning/);
    }
  });

  it("spine activation uses distinct prep families — not all open books or cat-cow variants", () => {
    const input = manualPreferencesToGenerateWorkoutInput(spinePrefs(), TEST_GYM, "jh-spine-diverse");
    const used = new Set<string>();
    const blocks = buildJointHealthMain(enrichedPool, input, used, () => 0.42);
    const activation = blocks.find((b) => (b.title ?? "").toLowerCase().includes("activation"));
    const ids = (activation?.items ?? []).map((i) => i.exercise_id);
    expect(ids.length).toBeGreaterThanOrEqual(3);

    const families = ids.map((id) => getJointHealthActivationFamilyId(id, "back_spine_health"));
    const openBookCount = families.filter((f) => f === "open_book").length;
    const catCowCount = families.filter((f) => f === "cat_cow").length;
    expect(openBookCount).toBeLessThanOrEqual(1);
    expect(catCowCount).toBeLessThanOrEqual(1);
    expect(new Set(families.filter(Boolean)).size).toBeGreaterThanOrEqual(3);
  });

  it("generates end-to-end back/spine health without deadlifts or hip isolation", () => {
    const input = manualPreferencesToGenerateWorkoutInput(spinePrefs(), TEST_GYM, "jh-spine-e2e");
    expect(input.goal_sub_focus?.joint_health).toContain("back_spine_health");

    const used = new Set<string>();
    const mainBlocks = buildJointHealthMain(enrichedPool, input, used, () => 0.42);
    const mainTitles = mainBlocks.map((b) => b.title ?? "");
    expect(mainTitles.some((t) => t.toLowerCase().includes("controlled strength"))).toBe(true);
    expect(mainTitles.some((t) => t.toLowerCase().includes("stability"))).toBe(true);

    const session = generateWorkoutSession(input, enrichedPool);
    const ids = session.blocks.flatMap((b) => b.items.map((i) => i.exercise_id));
    expect(ids.length).toBeGreaterThanOrEqual(4);
    const sessionTitles = session.blocks.map((b) => b.title ?? "");
    expect(sessionTitles.some((t) => t.toLowerCase().includes("stability"))).toBe(true);
    const banned = new Set(["barbell_deadlift", "clamshell", "hip_90_90", "bench_press_barbell", "push_up"]);
    for (const id of ids) {
      expect(banned.has(id)).toBe(false);
    }
    const spineTagged = new Set(
      enrichedPool.filter((e) => e.tags?.attribute_tags?.includes("back_spine_health")).map((e) => e.id)
    );
    for (const id of ids) {
      expect(spineTagged.has(id)).toBe(true);
    }
    expect(sessionTitles.some((t) => t.toLowerCase().includes("goal focus"))).toBe(false);
  });

  it("high-difficulty activation prep does not block controlled strength picks", () => {
    const pool = withJointHealthEnrichment(STUB_EXERCISES).map((e) => {
      if ((e.tags?.attribute_tags ?? []).includes("back_spine_activation")) {
        return { ...e, difficulty: 3 as Exercise["difficulty"] };
      }
      return e;
    });
    const input = manualPreferencesToGenerateWorkoutInput(spinePrefs(), TEST_GYM, "jh-spine-stress");
    const used = new Set<string>();
    const blocks = buildJointHealthMain(pool, input, used, () => 0.42);
    const strength = blocks.find((b) => (b.title ?? "").toLowerCase().includes("controlled strength"));
    const stability = blocks.find((b) => (b.title ?? "").toLowerCase().includes("stability"));
    expect(strength?.items.length ?? 0).toBeGreaterThanOrEqual(1);
    expect(stability?.items.length ?? 0).toBeGreaterThanOrEqual(1);
  });
});

describe("buildJointHealthMain — elbow & wrist health", () => {
  const enrichedPool = withJointHealthEnrichment(STUB_EXERCISES);

  const elbowWristPrefs = (): ManualPreferences => ({
    primaryFocus: ["Strength Training for Joint Health"],
    targetBody: null,
    targetModifier: [],
    durationMinutes: 45,
    energyLevel: "medium",
    injuries: ["No restrictions"],
    upcoming: [],
    subFocusByGoal: {
      "Strength Training for Joint Health": ["Elbow/Wrist Health"],
    },
    workoutStyle: [],
    workoutTier: "intermediate",
  });

  it("activation uses bodyweight or band forearm prep only", () => {
    const input = manualPreferencesToGenerateWorkoutInput(elbowWristPrefs(), TEST_GYM, "jh-elbow-activation");
    const used = new Set<string>();
    const blocks = buildJointHealthMain(enrichedPool, input, used, () => 0.61);
    const activation = blocks.find((b) => (b.title ?? "").toLowerCase().includes("activation"));
    expect(activation).toBeDefined();
    for (const item of activation?.items ?? []) {
      const ex = enrichedPool.find((e) => e.id === item.exercise_id);
      expect(ex).toBeDefined();
      expect(isWarmupEligibleEquipment(ex!.equipment_required ?? [])).toBe(true);
      expect(item.exercise_id).not.toMatch(/dip|skull|bench|pullup|muscle_up/);
    }
  });

  it("elbow/wrist activation uses distinct prep families — not all pull-aparts or cuff drills", () => {
    const input = manualPreferencesToGenerateWorkoutInput(elbowWristPrefs(), TEST_GYM, "jh-elbow-diverse");
    const used = new Set<string>();
    const blocks = buildJointHealthMain(enrichedPool, input, used, () => 0.42);
    const activation = blocks.find((b) => (b.title ?? "").toLowerCase().includes("activation"));
    const ids = (activation?.items ?? []).map((i) => i.exercise_id);
    expect(ids.length).toBeGreaterThanOrEqual(3);

    const families = ids.map((id) => getJointHealthActivationFamilyId(id, "elbow_wrist_health"));
    const pullApartCount = families.filter((f) => f === "band_pull_apart").length;
    const cuffCount = families.filter((f) => f === "rotator_upstream").length;
    expect(pullApartCount).toBeLessThanOrEqual(1);
    expect(cuffCount).toBeLessThanOrEqual(1);
    expect(new Set(families.filter(Boolean)).size).toBeGreaterThanOrEqual(3);
  });

  it("generates end-to-end elbow/wrist health without dips or thoracic flows", () => {
    const input = manualPreferencesToGenerateWorkoutInput(elbowWristPrefs(), TEST_GYM, "jh-elbow-e2e");
    expect(input.goal_sub_focus?.joint_health).toContain("elbow_wrist_health");

    const used = new Set<string>();
    const mainBlocks = buildJointHealthMain(enrichedPool, input, used, () => 0.42);
    const mainTitles = mainBlocks.map((b) => b.title ?? "");
    expect(mainTitles.some((t) => t.toLowerCase().includes("controlled strength"))).toBe(true);
    expect(mainTitles.some((t) => t.toLowerCase().includes("stability"))).toBe(true);

    const session = generateWorkoutSession(input, enrichedPool);
    const ids = session.blocks.flatMap((b) => b.items.map((i) => i.exercise_id));
    expect(ids.length).toBeGreaterThanOrEqual(7);
    const sessionTitles = session.blocks.map((b) => b.title ?? "");
    expect(sessionTitles.some((t) => t.toLowerCase().includes("stability"))).toBe(true);
    const banned = new Set(["dips", "bench_press_barbell", "pullup", "cat_camel", "clamshell", "skull_crusher"]);
    for (const id of ids) {
      expect(banned.has(id)).toBe(false);
    }
    const elbowTagged = new Set(
      enrichedPool.filter((e) => e.tags?.attribute_tags?.includes("elbow_wrist_health")).map((e) => e.id)
    );
    for (const id of ids) {
      expect(elbowTagged.has(id)).toBe(true);
    }
    expect(sessionTitles.some((t) => t.toLowerCase().includes("goal focus"))).toBe(false);
  });
});
