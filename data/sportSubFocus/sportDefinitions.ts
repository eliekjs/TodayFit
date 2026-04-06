/**
 * Canonical sport-prep definitions (movement priorities, energy systems, must-include / avoid,
 * weekly bias). Slugs are canonical — resolve user-facing / legacy slugs with `getCanonicalSportSlug`.
 */

import { getCanonicalSportSlug } from "./canonicalSportSlug";
import type { SportDefinition } from "./types";

export const SPORT_DEFINITIONS: SportDefinition[] = [
  {
    slug: "rock_climbing",
    displayName: "Climbing (rock, bouldering, ice → consolidated prep)",
    movementPatternsRanked: [
      { rank: 1, label: "Vertical pulling (varied grips)" },
      { rank: 2, label: "Isometric core tension" },
      { rank: 3, label: "Scapular control / retraction" },
      { rank: 4, label: "Finger strength (grip variations)" },
      { rank: 5, label: "Hip mobility / high steps" },
    ],
    energySystems: {
      primary: "Anaerobic (bouldering bursts)",
      secondary: "Aerobic capacity (route endurance)",
    },
    mustInclude: [
      "Pull-ups (varied grips, weighted)",
      "Dead hangs / hangboard",
      "Core tension (front lever progressions, hollow holds)",
      "Lock-off strength",
      "Antagonist pushing (shoulder balance)",
    ],
    mustAvoidOrLimit: [
      "Heavy lower body hypertrophy",
      "Machine isolation",
      "Excessive bilateral barbell work",
    ],
    weeklyStructureBias: [
      "2–3 climbing-specific strength",
      "1 endurance / pump session",
      "Optional antagonist + mobility day",
    ],
    engine: {
      movementPatterns: [
        { slug: "pull", rank: 1, weight: 1 },
        { slug: "rotate", rank: 2, weight: 0.88 },
        { slug: "push", rank: 3, weight: 0.72 },
        { slug: "carry", rank: 4, weight: 0.62 },
        { slug: "squat", rank: 5, weight: 0.45 },
      ],
      topPatterns: ["pull", "rotate"],
      secondaryPatterns: ["push", "carry"],
      requiredTagBoosts: [
        { tag: "vertical_pull", weight: 2.4 },
        { tag: "pulling_strength", weight: 2.2 },
        { tag: "grip_endurance", weight: 2 },
        { tag: "finger_strength", weight: 2.2 },
        { tag: "lockoff_strength", weight: 2 },
        { tag: "scapular_control", weight: 1.8 },
        { tag: "core_bracing", weight: 1.6 },
        { tag: "anti_extension", weight: 1.4 },
        { tag: "anti_rotation", weight: 1.4 },
        { tag: "climbing", weight: 1.2 },
      ],
      softBannedTagSlugs: ["leg_press", "machine_isolation"],
      softBanPredicateKeys: ["heavy_lower_only_squat_hinge"],
      hardBanPredicateKeys: ["leg_press_family"],
      energySystemBias: {
        conditioningMinutesScale: 0.88,
        favorStimulusTags: ["anaerobic", "aerobic_zone2"],
      },
      structureBias: {
        emphasis: "strength",
        strengthShare: 0.62,
        conditioningShare: 0.18,
        hybridShare: 0.2,
      },
      compositionNudge: {
        conditioningPickerMinutesMultiplier: 0.95,
        mainStrengthPatternScoreMultiplier: 1.06,
        climbingStyleDomainGate: true,
      },
      scoringPenaltyKeys: [
        "climbing_heavy_lower_squat_hinge_penalty",
        "climbing_bilateral_squat_hypertrophy_penalty",
      ],
    },
  },
  {
    slug: "alpine_skiing",
    displayName: "Alpine / downhill skiing",
    movementPatternsRanked: [
      { rank: 1, label: "Repeated knee flexion–extension under load; eccentric-heavy absorption (quads, patellar tendon)" },
      { rank: 2, label: "Lateral stiffness and edge control (hip abduction/ER, ankle inversion–eversion strategy)" },
      { rank: 3, label: "Trunk anti-rotation / anti-flexion for variable snow and counter-rotation" },
      { rank: 4, label: "Isometric quadriceps endurance (long-radius, sustained flexion angles)" },
      { rank: 5, label: "Short-amplitude power: rapid re-centering and hop-to-ski landings" },
    ],
    energySystems: {
      primary: "Glycolytic / anaerobic endurance (repeat runs, vert)",
      secondary: "Aerobic base for volume days and travel",
    },
    mustInclude: [
      "Eccentric-biased split squat / lunge (slow lowers, pause)",
      "Lateral bound or skater hop with stick landing",
      "Wall sit or leg extension isometric holds",
      "Anti-rotation chops / Pallof press",
      "Drop landing or deceleration step-down progressions",
    ],
    mustAvoidOrLimit: [
      "Upper-only gym weeks",
      "Leg hypertrophy without deceleration or lateral exposure",
      "Easy steady-state only (no interval or repeat-effort)",
    ],
    weeklyStructureBias: [
      "2 quad-dominant strength + eccentric emphasis",
      "1 lateral / plyometric + landing quality",
      "1 interval or mixed conditioning",
    ],
    engine: {
      movementPatterns: [
        { slug: "squat", rank: 1, weight: 1 },
        { slug: "rotate", rank: 2, weight: 0.9 },
        { slug: "hinge", rank: 3, weight: 0.82 },
        { slug: "locomotion", rank: 4, weight: 0.65 },
        { slug: "carry", rank: 5, weight: 0.45 },
      ],
      topPatterns: ["squat", "rotate"],
      secondaryPatterns: ["hinge", "locomotion"],
      requiredTagBoosts: [
        { tag: "eccentric_strength", weight: 2.2 },
        { tag: "eccentric", weight: 1.8 },
        { tag: "single_leg_strength", weight: 2 },
        { tag: "lateral_power", weight: 2 },
        { tag: "knee_stability", weight: 1.6 },
        { tag: "ankle_stability", weight: 1.5 },
        { tag: "core_anti_rotation", weight: 1.8 },
        { tag: "anti_rotation", weight: 1.6 },
        { tag: "plyometric", weight: 1.7 },
        { tag: "anaerobic", weight: 1.4 },
      ],
      softBanPredicateKeys: ["alpine_upper_only_push_pull_strength"],
      energySystemBias: {
        conditioningMinutesScale: 1.12,
        favorStimulusTags: ["anaerobic", "aerobic_zone2"],
      },
      structureBias: {
        emphasis: "strength",
        strengthShare: 0.55,
        conditioningShare: 0.32,
        hybridShare: 0.13,
        lowerBodyBias: 0.75,
        upperBodyBias: 0.15,
        fullBodyBias: 0.1,
      },
      compositionNudge: {
        conditioningPickerMinutesMultiplier: 1.12,
        mainStrengthPatternScoreMultiplier: 1.08,
      },
      scoringPenaltyKeys: ["alpine_upper_hypertrophy_mismatch_penalty"],
    },
  },
  {
    slug: "backcountry_skiing",
    displayName: "Backcountry skiing / splitboarding",
    movementPatternsRanked: [
      { rank: 1, label: "Concentric-dominant uphill: hip extension, ankle plantarflexion, low-cadence pushing" },
      { rank: 2, label: "Loaded step pattern (skinning ROM, hip hike, calf repeat)" },
      { rank: 3, label: "Eccentric quad control for variable-pitch descents (long brake runs)" },
      { rank: 4, label: "Pack-weighted trunk anti-extension and lateral stability" },
      { rank: 5, label: "Ankle inversion/eversion control on breakable crust / uneven skin tracks" },
    ],
    energySystems: {
      primary: "Oxidative + muscular endurance (hours uphill, Z2–Z3)",
      secondary: "Anaerobic bursts (kick turns, short steep pushes)",
    },
    mustInclude: [
      "Heavy step-ups or box step (match pack load progression)",
      "Long incline treadmill, stair, or hike with load",
      "Single-leg eccentric emphasis for descent prep",
      "Carry variations (suitcase, front rack) for pack realism",
      "Soleus/gastroc endurance (bent-knee and straight-leg)",
    ],
    mustAvoidOrLimit: [
      "1RM-focused leg blocks pre big tours",
      "HIIT-only weeks without long-duration tolerance work",
    ],
    weeklyStructureBias: [
      "2 long Z2 / muscular-endurance uphill sessions",
      "1 leg strength + eccentric for descents",
      "1 mixed conditioning or shorter threshold",
    ],
    engine: {
      movementPatterns: [
        { slug: "locomotion", rank: 1, weight: 1 },
        { slug: "squat", rank: 2, weight: 0.9 },
        { slug: "hinge", rank: 3, weight: 0.82 },
        { slug: "carry", rank: 4, weight: 0.72 },
        { slug: "rotate", rank: 5, weight: 0.55 },
      ],
      topPatterns: ["locomotion", "squat"],
      secondaryPatterns: ["hinge", "carry"],
      requiredTagBoosts: [
        { tag: "zone2_cardio", weight: 2 },
        { tag: "aerobic_base", weight: 1.9 },
        { tag: "single_leg_strength", weight: 2 },
        { tag: "strength_endurance", weight: 1.8 },
        { tag: "carry", weight: 1.6 },
        { tag: "eccentric_strength", weight: 1.7 },
        { tag: "core_bracing", weight: 1.4 },
        { tag: "ankle_stability", weight: 1.3 },
      ],
      energySystemBias: {
        conditioningMinutesScale: 1.06,
        favorStimulusTags: ["aerobic_zone2", "anaerobic"],
      },
      structureBias: {
        emphasis: "conditioning",
        strengthShare: 0.4,
        conditioningShare: 0.45,
        hybridShare: 0.15,
        lowerBodyBias: 0.85,
      },
      compositionNudge: {
        conditioningPickerMinutesMultiplier: 1.1,
        mainStrengthPatternScoreMultiplier: 1.04,
      },
    },
  },
  {
    slug: "xc_skiing",
    displayName: "Cross-country skiing (Nordic)",
    movementPatternsRanked: [
      { rank: 1, label: "Double-pole: lat/pec traction, trunk flexion, arm–core endurance" },
      { rank: 2, label: "Diagonal/concurrent stride: hip drive + contralateral trunk rotation" },
      { rank: 3, label: "Ankle dorsiflexion and lower-leg repeat stiffness (kick phase)" },
      { rank: 4, label: "Hip hinge pattern for classic kick and V2 offset loading" },
      { rank: 5, label: "Shoulder girdle upward rotation control (pole plant, long sessions)" },
    ],
    energySystems: {
      primary: "Aerobic; race-specific threshold / sub-threshold sustained work",
      secondary: "Anaerobic capacity (course climbs, sprint finishes)",
    },
    mustInclude: [
      "Double-pole erg, rope pulls, or ski-specific upper endurance",
      "Hinge endurance (RDL, back extension) with time-under-tension",
      "Single-leg stability and small-amplitude plyos",
      "Rotational and anti-rotation core (match pole/trunk coupling)",
      "Rowing or ski erg intervals as engine proxy",
    ],
    mustAvoidOrLimit: [
      "Heavy eccentric leg hypertrophy that compromises daily classic/skate volume",
      "Upper-body bro splits without pulling endurance",
    ],
    weeklyStructureBias: [
      "2 sport-specific engine intervals (erg, rollers, ski)",
      "1 strength maintenance (hinge + single-leg + upper pull endurance)",
      "1 longer continuous Z2",
    ],
  },
  {
    slug: "hiking_backpacking",
    displayName: "Hiking / backpacking",
    movementPatternsRanked: [
      { rank: 1, label: "Concentric uphill stepping under pack load (quads, glutes, calves)" },
      { rank: 2, label: "Controlled downhill eccentric (quads, patellar tendon, knee strategy)" },
      { rank: 3, label: "Hip hinge with axial load (pack weight, lumbar posture)" },
      { rank: 4, label: "Ankle dorsiflexion and foot intrinsics on uneven, rocky tread" },
      { rank: 5, label: "Thoracic extension + scapular control for strap loading and posture" },
    ],
    energySystems: {
      primary: "Oxidative (Z2) for multi-hour foot time",
      secondary: "Muscular endurance for vert + load",
    },
    mustInclude: [
      "Loaded step-ups and hiking-specific incline work",
      "Downhill-eccentric prep (slow split squat lowers, step-downs)",
      "Farmer / suitcase carries",
      "Calf raises (straight and bent knee)",
      "T-spine and hip mobility for pack posture",
    ],
    mustAvoidOrLimit: [
      "Heavy max squatting immediately before long descent-heavy trips",
      "Replacing foot time entirely with gym HIIT",
    ],
    weeklyStructureBias: [
      "2 long Z2 on feet or incline (progress load/duration)",
      "1 strength–endurance legs + carries",
      "1 mobility + eccentric knee/quad prep",
    ],
    engine: {
      movementPatterns: [
        { slug: "locomotion", rank: 1, weight: 1 },
        { slug: "squat", rank: 2, weight: 0.9 },
        { slug: "hinge", rank: 3, weight: 0.85 },
        { slug: "carry", rank: 4, weight: 0.78 },
        { slug: "rotate", rank: 5, weight: 0.55 },
      ],
      topPatterns: ["locomotion", "squat"],
      secondaryPatterns: ["hinge", "carry"],
      requiredTagBoosts: [
        { tag: "zone2_cardio", weight: 2 },
        { tag: "aerobic_base", weight: 2 },
        { tag: "carry", weight: 1.9 },
        { tag: "single_leg_strength", weight: 1.9 },
        { tag: "eccentric_strength", weight: 1.7 },
        { tag: "core_bracing", weight: 1.5 },
        { tag: "ankle_stability", weight: 1.4 },
        { tag: "balance", weight: 1.2 },
      ],
      energySystemBias: {
        conditioningMinutesScale: 1.05,
        favorStimulusTags: ["aerobic_zone2"],
      },
      structureBias: {
        emphasis: "hybrid",
        strengthShare: 0.45,
        conditioningShare: 0.38,
        hybridShare: 0.17,
        lowerBodyBias: 0.7,
      },
      compositionNudge: {
        conditioningPickerMinutesMultiplier: 1.08,
        mainStrengthPatternScoreMultiplier: 1.03,
      },
    },
  },
  {
    slug: "mountaineering",
    displayName: "Mountaineering (alpine objectives)",
    movementPatternsRanked: [
      { rank: 1, label: "Mixed concentric: steep snow/ice steps, crampon front-pointing pattern stiffness" },
      { rank: 2, label: "Long-duration oxidative work at submax (altitude reduces effective intensity)" },
      { rank: 3, label: "Eccentric quad and knee control for long glacier/trail descents with load" },
      { rank: 4, label: "Axial loading: core anti-flexion + hip stability under heavy pack or rope kit" },
      { rank: 5, label: "Pulling and grip for technical movement (rope, tools) — supplementary to legs" },
    ],
    energySystems: {
      primary: "Aerobic power / oxidative capacity (long approaches, reduced O2)",
      secondary: "Strength-endurance for pushes and carries",
    },
    mustInclude: [
      "Weighted step-ups and steep incline hiking",
      "Eccentric quad and deceleration work (descent-specific)",
      "Heavy carries and core bracing under load",
      "Long Z2 with pack (gradient when possible)",
      "General upper pull + grip endurance (moderate volume)",
    ],
    mustAvoidOrLimit: [
      "Trail-running-only prep without load or descent bias",
      "Neglecting eccentric tissue prep before big vertical days",
    ],
    weeklyStructureBias: [
      "1 long loaded outing (duration + vert)",
      "1 quad/braking and knee resilience",
      "1–2 Z2 engine sessions",
      "1 supplemental strength (pull + core)",
    ],
  },
  {
    slug: "rucking",
    displayName: "Rucking",
    movementPatternsRanked: [
      { rank: 1, label: "Hip extension endurance under sustained axial load (ruck plate/belt)" },
      { rank: 2, label: "Trunk anti-flexion and anti-lateral flexion (strap torque, sway)" },
      { rank: 3, label: "Single-leg stability with load (uneven surface, fatigue)" },
      { rank: 4, label: "Foot and ankle stiffness for high-mile repeat impact (modulated vs running)" },
      { rank: 5, label: "Thoracic posture and neck/upper-trap endurance from harness pressure" },
    ],
    energySystems: {
      primary: "Oxidative Z2–Z3 at ruck pace",
      secondary: "Muscular endurance (glutes, quads, upper back isometrics)",
    },
    mustInclude: [
      "Progressive ruck marches (weight × distance)",
      "Step-ups or incline walks with ruck",
      "Carries and core anti-extension (dead bug progressions, planks under load)",
      "Calf and soleus volume",
      "Hip hinge with light load for posterior chain without heavy eccentric wrecking march",
    ],
    mustAvoidOrLimit: [
      "High-volume heavy barbell eccentrics before key ruck events",
      "Omitting posture and mid-back work",
    ],
    weeklyStructureBias: [
      "2–3 ruck or incline sessions (progress load or duration)",
      "1 low-eccentric-cost strength",
      "Recovery / mobility as mileage climbs",
    ],
  },
  {
    slug: "road_running",
    displayName: "Running (road, marathon, ultra)",
    movementPatternsRanked: [
      { rank: 1, label: "Sagittal cyclical stance: stiff ankle, Achilles–soleus elastic rebound" },
      { rank: 2, label: "Hip extension propulsion with minimal vertical oscillation cost" },
      { rank: 3, label: "Single-leg stance stability in midstance (hip abductors, foot control)" },
      { rank: 4, label: "Trunk stiffness / anti-rotation for forward lean without collapse" },
      { rank: 5, label: "Knee extensor–patellar tendon tolerance for high weekly ground reaction cycles" },
    ],
    energySystems: {
      primary: "Oxidative (Z2) for volume; marathon–ultra = glycogen-sparing pace work",
      secondary: "Lactate threshold / VO2 for HM–10K; neuromuscular speed via strides",
    },
    mustInclude: [
      "Easy and long runs (surface-appropriate)",
      "Tempo or threshold segments when race-specific",
      "Strides or short intervals for leg speed and stiffness",
      "Calf raises (straight and bent knee) and soleus loading",
      "Light single-leg strength (split squat, RDL) without DOMS overload",
    ],
    mustAvoidOrLimit: [
      "Heavy eccentric leg sessions in race tapers or peak weeks",
      "Novel high-soreness lifting during high-mileage blocks",
    ],
    weeklyStructureBias: [
      "~70–80% easy aerobic by time or distance",
      "1–2 quality (tempo, threshold, intervals, or long run with pace)",
      "1–2 short strength or plyo primers (low fatigue)",
    ],
    engine: {
      movementPatterns: [
        { slug: "locomotion", rank: 1, weight: 1 },
        { slug: "squat", rank: 2, weight: 0.82 },
        { slug: "hinge", rank: 3, weight: 0.78 },
        { slug: "rotate", rank: 4, weight: 0.65 },
        { slug: "carry", rank: 5, weight: 0.45 },
      ],
      topPatterns: ["locomotion", "squat"],
      secondaryPatterns: ["hinge", "rotate"],
      requiredTagBoosts: [
        { tag: "zone2_cardio", weight: 2.2 },
        { tag: "aerobic_base", weight: 2 },
        { tag: "single_leg_strength", weight: 2 },
        { tag: "ankle_stability", weight: 1.8 },
        { tag: "plyometric", weight: 1.3 },
        { tag: "eccentric", weight: 1.5 },
        { tag: "running_conditioning", weight: 1.6 },
      ],
      energySystemBias: {
        conditioningMinutesScale: 1.08,
        favorStimulusTags: ["aerobic_zone2", "anaerobic"],
      },
      structureBias: {
        emphasis: "conditioning",
        strengthShare: 0.3,
        conditioningShare: 0.55,
        hybridShare: 0.15,
        lowerBodyBias: 0.8,
      },
      compositionNudge: {
        conditioningPickerMinutesMultiplier: 1.12,
        mainStrengthPatternScoreMultiplier: 1.02,
      },
    },
  },
  {
    slug: "trail_running",
    displayName: "Trail running",
    movementPatternsRanked: [
      { rank: 1, label: "Uphill concentric power (short steps, hands-on-thigh pattern strength)" },
      { rank: 2, label: "Downhill eccentric braking (quads, patellar tendon, foot slapping control)" },
      { rank: 3, label: "Ankle inversion/eversion and proprioception on off-camber and technical tread" },
      { rank: 4, label: "Single-leg stability on irregular foot strikes" },
      { rank: 5, label: "Core endurance for posture over long descents and rocky sections" },
    ],
    energySystems: {
      primary: "Aerobic (variable terrain cost)",
      secondary: "Anaerobic for steep climbs and race surges",
    },
    mustInclude: [
      "Hill repeats or vert-specific intervals",
      "Step-downs, eccentric lunges, or downhill running progressions",
      "Balance and single-leg work on unstable or varied surfaces",
      "Long trail runs with vert when possible",
      "Lateral and small-hop stability drills",
    ],
    mustAvoidOrLimit: [
      "Flat-road-only training for technical or vert races",
      "Bilateral machine leg work without single-leg and deceleration exposure",
    ],
    weeklyStructureBias: [
      "1 long run with terrain specificity",
      "1 vert or hill session",
      "1 strength/stability (eccentric + ankle)",
      "Remaining Z2 trail or road as needed",
    ],
    engine: {
      movementPatterns: [
        { slug: "locomotion", rank: 1, weight: 1 },
        { slug: "squat", rank: 2, weight: 0.88 },
        { slug: "hinge", rank: 3, weight: 0.82 },
        { slug: "rotate", rank: 4, weight: 0.7 },
        { slug: "carry", rank: 5, weight: 0.55 },
      ],
      topPatterns: ["locomotion", "squat"],
      secondaryPatterns: ["hinge", "rotate"],
      requiredTagBoosts: [
        { tag: "single_leg_strength", weight: 2.2 },
        { tag: "eccentric_strength", weight: 2 },
        { tag: "ankle_stability", weight: 2 },
        { tag: "balance", weight: 1.7 },
        { tag: "plyometric", weight: 1.5 },
        { tag: "aerobic_base", weight: 1.6 },
        { tag: "core_stability", weight: 1.4 },
      ],
      energySystemBias: {
        conditioningMinutesScale: 1.05,
        favorStimulusTags: ["aerobic_zone2", "anaerobic"],
      },
      structureBias: {
        emphasis: "hybrid",
        strengthShare: 0.42,
        conditioningShare: 0.4,
        hybridShare: 0.18,
        lowerBodyBias: 0.75,
      },
      compositionNudge: {
        conditioningPickerMinutesMultiplier: 1.1,
        mainStrengthPatternScoreMultiplier: 1.05,
      },
    },
  },
  {
    slug: "hyrox",
    displayName: "Hyrox / functional fitness",
    movementPatternsRanked: [
      { rank: 1, label: "Full-body cyclical work" },
      { rank: 2, label: "Carrying / sled work" },
      { rank: 3, label: "Squat + hinge endurance" },
      { rank: 4, label: "Engine transitions" },
      { rank: 5, label: "Grip endurance" },
    ],
    energySystems: {
      primary: "Mixed aerobic + anaerobic",
      secondary: "Repeated high-threshold bouts",
    },
    mustInclude: [
      "Sled push/pull (or substitutes)",
      "Burpees",
      "Carries",
      "Row/Ski erg",
      "Running intervals",
    ],
    mustAvoidOrLimit: ["Isolated bodybuilding", "Max strength-only blocks"],
    weeklyStructureBias: [
      "2 engine sessions",
      "1 hybrid",
      "1 strength support",
    ],
    engine: {
      movementPatterns: [
        { slug: "carry", rank: 1, weight: 1 },
        { slug: "squat", rank: 2, weight: 0.9 },
        { slug: "hinge", rank: 3, weight: 0.88 },
        { slug: "locomotion", rank: 4, weight: 0.85 },
        { slug: "rotate", rank: 5, weight: 0.6 },
      ],
      topPatterns: ["carry", "squat"],
      secondaryPatterns: ["hinge", "locomotion"],
      requiredTagBoosts: [
        { tag: "work_capacity", weight: 2.4 },
        { tag: "anaerobic_capacity", weight: 2 },
        { tag: "grip_endurance", weight: 2 },
        { tag: "sled_strength", weight: 1.9 },
        { tag: "single_leg_strength", weight: 1.7 },
        { tag: "core_bracing", weight: 1.6 },
        { tag: "anaerobic", weight: 1.8 },
      ],
      energySystemBias: {
        conditioningMinutesScale: 1.15,
        favorStimulusTags: ["anaerobic", "aerobic_zone2"],
      },
      structureBias: {
        emphasis: "conditioning",
        strengthShare: 0.32,
        conditioningShare: 0.48,
        hybridShare: 0.2,
        fullBodyBias: 0.85,
      },
      compositionNudge: {
        conditioningBlockExtraScale: 1.05,
        conditioningPickerMinutesMultiplier: 1.22,
        mainStrengthPatternScoreMultiplier: 1.03,
      },
    },
  },
  {
    slug: "surfing",
    displayName: "Surfing",
    movementPatternsRanked: [
      { rank: 1, label: "Paddle (upper endurance)" },
      { rank: 2, label: "Pop-up explosive push" },
      { rank: 3, label: "Rotational core" },
      { rank: 4, label: "Balance / instability" },
      { rank: 5, label: "Hip mobility" },
    ],
    energySystems: {
      primary: "Mixed aerobic + repeated bursts",
      secondary: "Shoulder/paddle endurance layers",
    },
    mustInclude: [
      "Push-up explosiveness",
      "Lat endurance",
      "Rotational core",
      "Balance drills",
      "Shoulder endurance",
    ],
    mustAvoidOrLimit: ["Heavy lower focus", "Slow lifting bias"],
    weeklyStructureBias: [
      "2 paddle/upper endurance + rotation",
      "1 lower-body power + balance",
      "1 mobility / shoulder health",
    ],
  },
  {
    slug: "cycling",
    displayName: "Cycling",
    movementPatternsRanked: [
      { rank: 1, label: "Concentric-dominant knee extension + hip extension in closed chain (pedal stroke)" },
      { rank: 2, label: "Sustained trunk flexion stability and scapular support on bars" },
      { rank: 3, label: "Aerobic engine for long low-impact time (road, TT, climbing)" },
      { rank: 4, label: "Standing / torque surges (hip extension, core brace) on climbs and sprints" },
      { rank: 5, label: "Neck and upper-back endurance from prolonged position" },
    ],
    energySystems: {
      primary: "Oxidative; threshold and sweet-spot for race specificity",
      secondary: "VO2 / anaerobic capacity for attacks and short climbs",
    },
    mustInclude: [
      "Z2 and structured intervals on bike (or smart trainer)",
      "Single-leg press or squat variants with low soreness profile",
      "Core anti-extension (dead bug, plank progressions)",
      "Hip hinge light load for posterior chain balance",
      "Mobility for hip flexors and thoracic extension",
    ],
    mustAvoidOrLimit: [
      "High-volume heavy eccentric lifting in key race or camp weeks",
      "Leg sessions that compromise next-day pedaling quality",
    ],
    weeklyStructureBias: [
      "3–5 on-bike sessions (Z2 + threshold/interval mix by phase)",
      "1–2 gym strength (low eccentric cost, maintenance in season)",
    ],
  },
  {
    slug: "rowing_erg",
    displayName: "Rowing (erg / on-water transfer)",
    movementPatternsRanked: [
      { rank: 1, label: "Sequential leg–hip–arm drive; concentric leg push with hip hinge closure" },
      { rank: 2, label: "Lat and scapular retraction pulling endurance" },
      { rank: 3, label: "Trunk rock from strong hinge: controlled opening, not excessive flexion" },
      { rank: 4, label: "Grip and forearm endurance for long pieces" },
      { rank: 5, label: "Posterior chain and hip mobility for full compression and recovery" },
    ],
    energySystems: {
      primary: "Aerobic for steady state and UT1/UT2; race 2k = heavy aerobic + anaerobic contribution",
      secondary: "Lactate tolerance and anaerobic power for sprints and race pace",
    },
    mustInclude: [
      "Erg or boat intervals and steady pieces",
      "Deadlift or hip hinge pattern (moderate load, technique)",
      "Pulling strength and scapular control (rows, pull-ups scaled)",
      "Core anti-extension and connection drills",
      "Forearm/grip endurance work",
    ],
    mustAvoidOrLimit: [
      "Excessive bench and mirror-muscle volume vs pulling",
      "High-soreness squat volume that disrupts leg drive frequency",
    ],
    weeklyStructureBias: [
      "3–5 rowing sessions (mix endurance and race-pace work)",
      "1 full-body strength (hinge + pull + core)",
    ],
  },
  {
    slug: "swimming_open_water",
    displayName: "Swimming (pool / open water)",
    movementPatternsRanked: [
      { rank: 1, label: "Horizontal trunk: hip-driven rotation with connected pull (high elbow catch)" },
      { rank: 2, label: "Shoulder internal rotation and extension strength; lat-dominant pull" },
      { rank: 3, label: "Scapular upward rotation and control (overhead volume)" },
      { rank: 4, label: "Ankle plantarflexion and streamline kick (secondary propulsion)" },
      { rank: 5, label: "Core anti-extension and rotation coupling (bodyline)" },
    ],
    energySystems: {
      primary: "Oxidative for distance; threshold sets for CSS/CSS-based training",
      secondary: "Anaerobic for turns, OW surges, and sprint events",
    },
    mustInclude: [
      "Pulling strength (pull-ups, bands, cable swim-specific patterns)",
      "Shoulder prehab: ER, scapular work, prone Y/T/W",
      "Core planks and rotational control",
      "Kick or band work for ankle and hip internal rotation",
      "Open-water skills (sighting, drafting) in sport practice when applicable",
    ],
    mustAvoidOrLimit: [
      "Heavy overhead pressing without shoulder balance",
      "Leg days that trash kick endurance before key swim sets",
    ],
    weeklyStructureBias: [
      "3–6 swim sessions (technique + endurance + threshold mix)",
      "2 short dryland (pull + shoulder health + core)",
    ],
  },
  {
    slug: "triathlon",
    displayName: "Triathlon",
    movementPatternsRanked: [
      { rank: 1, label: "Cycling: concentric leg repeat + seated trunk support" },
      { rank: 2, label: "Running: elastic rebound and sagittal stiffness off the bike" },
      { rank: 3, label: "Swimming: horizontal pull power and shoulder-friendly overhead volume" },
      { rank: 4, label: "Transitions: neural and metabolic switching (bike→run leg feel)" },
      { rank: 5, label: "Global core stiffness across three modalities" },
    ],
    energySystems: {
      primary: "Oxidative engine across swim, bike, run (sport-specific Z2 and threshold)",
      secondary: "Lactate and anaerobic for surges, hills, and short-course",
    },
    mustInclude: [
      "Brick sessions (bike→run) in appropriate phases",
      "Each sport’s key weekly quality (swim threshold, bike intervals, run tempo or long)",
      "Shoulder prehab and pulling volume for swim",
      "Low-soreness leg strength for run durability off bike",
      "Recovery discipline between combined stress",
    ],
    mustAvoidOrLimit: [
      "Monolithic heavy lifting that compromises any of the three sports the next day",
      "Neglecting one discipline’s eccentric or tissue load (e.g. run-only dryland)",
    ],
    weeklyStructureBias: [
      "Typical 2 swim, 2–3 bike, 2–3 run (phase-dependent)",
      "1 brick",
      "1 combined or short strength session (full-body, low eccentric cost in season)",
    ],
  },
  {
    slug: "boxing",
    displayName: "Boxing",
    movementPatternsRanked: [
      { rank: 1, label: "Rotational power" },
      { rank: 2, label: "Footwork" },
      { rank: 3, label: "Upper-body endurance" },
      { rank: 4, label: "Core stability" },
      { rank: 5, label: "Reaction speed" },
    ],
    energySystems: {
      primary: "Anaerobic intervals",
      secondary: "Aerobic base",
    },
    mustInclude: [
      "Shadowboxing / bag work (sport practice — outside gym prep can still bias rotation & circuits)",
      "Rotational med ball",
      "Conditioning circuits",
      "Core rotational work",
    ],
    mustAvoidOrLimit: ["Slow heavy lifting focus"],
    weeklyStructureBias: [
      "2+ interval / conditioning emphasis",
      "1 rotational power & core",
      "1 moderate strength support (not max slow grinds)",
    ],
  },
  {
    slug: "muay_thai",
    displayName: "Muay Thai / kickboxing",
    movementPatternsRanked: [
      { rank: 1, label: "Rotational power" },
      { rank: 2, label: "Footwork and hip-driven strikes" },
      { rank: 3, label: "Upper-body and grip endurance" },
      { rank: 4, label: "Core stability" },
      { rank: 5, label: "Repeated burst recovery" },
    ],
    energySystems: {
      primary: "Anaerobic intervals",
      secondary: "Aerobic base",
    },
    mustInclude: [
      "Striking-specific conditioning (pads/bag/shadow where applicable)",
      "Rotational med ball",
      "Conditioning circuits",
      "Core rotational work",
      "Hip stability for kicks",
    ],
    mustAvoidOrLimit: ["Slow heavy lifting focus", "Leg hypertrophy that compromises kick recovery"],
    weeklyStructureBias: [
      "2+ sport-specific conditioning",
      "1 power/rotation",
      "1 strength support (moderate)",
    ],
  },
  {
    slug: "grappling",
    displayName: "Grappling (BJJ, wrestling, MMA)",
    movementPatternsRanked: [
      { rank: 1, label: "Isometric strength" },
      { rank: 2, label: "Grip endurance" },
      { rank: 3, label: "Pulling strength" },
      { rank: 4, label: "Hip control" },
      { rank: 5, label: "Core compression" },
    ],
    energySystems: {
      primary: "Mixed aerobic + anaerobic",
      secondary: "High-threshold repeated efforts",
    },
    mustInclude: ["Grip training", "Isometric holds", "Pulling strength", "Core compression"],
    mustAvoidOrLimit: [],
    weeklyStructureBias: [
      "2 grappling-specific strength/grip",
      "1 work capacity / intervals",
      "1 mobility / prehab",
    ],
  },
  {
    slug: "basketball",
    displayName: "Basketball (field / court sport prep)",
    movementPatternsRanked: [
      { rank: 1, label: "Sprinting" },
      { rank: 2, label: "Change of direction" },
      { rank: 3, label: "Jumping" },
      { rank: 4, label: "Deceleration" },
      { rank: 5, label: "Reactive agility" },
    ],
    energySystems: {
      primary: "Repeated sprint ability",
      secondary: "Aerobic base for game volume",
    },
    mustInclude: ["Sprints", "Plyometrics", "Agility drills", "Lower strength"],
    mustAvoidOrLimit: ["Slow hypertrophy-only lifting"],
    weeklyStructureBias: [
      "2 speed / COD / plyo",
      "1 lower strength",
      "1 conditioning / repeat sprint",
    ],
  },
  {
    slug: "soccer",
    displayName: "Soccer (field sport prep)",
    movementPatternsRanked: [
      { rank: 1, label: "Sprinting" },
      { rank: 2, label: "Change of direction" },
      { rank: 3, label: "Jumping / single-leg power" },
      { rank: 4, label: "Deceleration" },
      { rank: 5, label: "Reactive agility" },
    ],
    energySystems: {
      primary: "Repeated sprint ability",
      secondary: "Aerobic base",
    },
    mustInclude: ["Sprints", "Plyometrics", "Agility drills", "Lower strength"],
    mustAvoidOrLimit: ["Slow hypertrophy-only lifting"],
    weeklyStructureBias: [
      "2 field running / repeat sprint",
      "1 agility + deceleration",
      "1 strength / hamstring resilience",
    ],
  },
  {
    slug: "rugby",
    displayName: "Rugby (field sport prep)",
    movementPatternsRanked: [
      { rank: 1, label: "Sprinting" },
      { rank: 2, label: "Change of direction" },
      { rank: 3, label: "Jumping / contact readiness" },
      { rank: 4, label: "Deceleration" },
      { rank: 5, label: "Reactive agility" },
    ],
    energySystems: {
      primary: "Repeated sprint ability",
      secondary: "Anaerobic repeat effort + aerobic base",
    },
    mustInclude: ["Sprints", "Plyometrics", "Agility drills", "Lower strength"],
    mustAvoidOrLimit: ["Slow hypertrophy-only lifting"],
    weeklyStructureBias: [
      "2 collision / repeat effort + speed",
      "1 max or heavy lower (in season as appropriate)",
      "1 conditioning",
    ],
  },
];

/** Canonical slug → definition */
export const SPORT_DEFINITIONS_BY_SLUG: Record<string, SportDefinition> = Object.fromEntries(
  SPORT_DEFINITIONS.map((d) => [d.slug, d])
) as Record<string, SportDefinition>;

/**
 * Definitions keyed by slug before consolidation (e.g. mountaineering has its own profile;
 * `getCanonicalSportSlug` maps it to trail_running for generation elsewhere).
 */
const SPORT_DEFINITION_SLUGS_BEFORE_CANONICAL = new Set<string>(["mountaineering"]);

/** Resolved through `getCanonicalSportSlug` so legacy slugs still match, except direct-definition slugs above. */
export function getSportDefinition(sportSlug: string): SportDefinition | undefined {
  if (!sportSlug) return undefined;
  const normalized = sportSlug.toLowerCase().trim();
  if (SPORT_DEFINITION_SLUGS_BEFORE_CANONICAL.has(normalized)) {
    return SPORT_DEFINITIONS_BY_SLUG[normalized];
  }
  return SPORT_DEFINITIONS_BY_SLUG[getCanonicalSportSlug(sportSlug)];
}
