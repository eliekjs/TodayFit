# Contraindications audit: evidence-based enrichment and tag priority

**Date:** 2025-03-16  
**Category:** Exercise DB enrichment — contraindications  
**Scope:** Audit existing contraindication tags; add tags (including where already present) ordered by relevance; add tag priority to workout generation for better matching.

---

## 1. Research question

Which exercises are contraindicated for which body regions (shoulder, knee, lower back, elbow, wrist, hip, ankle), and in what order of relevance (primary vs secondary concern)? How should the generator use this order for better matching?

---

## 2. Sources

| Source | Type (Tier) | Link / key claim(s) |
|--------|-------------|----------------------|
| NCSF — Contraindicated Exercises | Tier 2 (reference) | [NCSF PDF](https://www.ncsf.org/pdf/ceu/contraindicated_exercises.pdf): Common contraindicated patterns in shoulders/low back (pulling/pressing mechanics), knees (excessive translation), lower back/pelvis (instability, hip flexor recruitment). |
| NSCA — Knee Movement and Exercise Guidelines | Tier 1 | [NSCA Kinetic Select](https://www.nsca.com/education/articles/kinetic-select/knee-movement-and-exercise-guidelines/): Anterior knee pain; importance of surfaces, footwear, muscular imbalances (e.g. gluteus medius). |
| NSCA — Leg Extension, Leg Curl, Adduction Machine | Tier 2 | [NSCA PTQ](https://www.nsca.com/education/articles/ptq/are-the-seated-leg-extension-leg-curl-and-adduction-machine-exercises-non-functional-or-risky/): Not inherently non-functional; dosage and ROM matter for knee/patellofemoral. |
| ACSM — Musculoskeletal considerations | Tier 1 | Guidelines: acute/chronic pain, OA/RA, osteoporosis, low back pain, inflammation warrant consultation; musculoskeletal disorders exacerbated by exercise are relative contraindications. |
| IJSPT — OKC Knee Extension Following ACLR | Tier 1 | [IJSPT](https://ijspt.scholasticahq.com/article/18983): OKC knee extension safe when dosed and ROM-appropriate; avoid aggressive load in unsuitable ROM. |
| BMC — Deadlifts vs Good Mornings | Tier 1 | [BMC Sports Sci Med Rehabil](https://www.biomedcentral.com/2052-1847/5/27): Good mornings minimal knee flexion; deadlifts higher L4/L5 moments; good mornings as posterior-chain option. |
| NCBI — Low Back Biomechanics Deadlifts | Tier 1 | [PMC9837526](https://ncbi.nlm.nih.gov/pmc/articles/PMC9837526/): Narrative review of lumbar loading during deadlifts. |
| ACSM's Health & Fitness Journal — Deadlift | Tier 2 | Understanding deadlift and variations; posterior chain strengthening can help prevent LBP when performed correctly. |
| HSS — Lower Back Pain After Deadlifts | Tier 2 | [HSS](https://www.hss.edu/health-library/move-better/lower-back-pain-after-deadlift): Technique and compensation; sharp pain = stop. |
| Pliability / practitioner summaries — Shoulder impingement | Tier 3 | Overhead press, behind-neck work, dips, upright rows, heavy lateral raises contraindicated or caution for impingement; band rows, face pulls, wall slides as alternatives. |
| Les Mills / Barbend — Upright rows | Tier 3 | Upright row: internal rotation + elevation compresses subacromial space; contraindicated for shoulder impingement. |
| Muscle & Fitness — Leg extensions and knees | Tier 3 | Patellofemoral stress; dosage and ROM matter; symptomatic individuals need individualized selection. |

---

## 3. Classification of findings

### High-confidence rules (implemented)

- **Shoulder:** Overhead pressing, dips, behind-neck pulls, upright rows, heavy lateral/front raises, and repetitive overhead/hanging work stress the shoulder (impingement/rotator cuff). Source: NCSF, ACSM musculoskeletal, practitioner consensus (Tier 2/3). Implemented: `exercise_contraindications` and `contraindication_tags` for shoulder on dips, OH press, pull-up, lateral/front raise, upright row, battle ropes, landmine press, push-up, hanging leg raise, inverted/TRX row, etc.
- **Knee:** Deep or loaded knee flexion (squats, lunges, leg press), leg extension/curl (patellofemoral/ACL context-dependent), impact (jump, box jump, burpee, double unders), and repetitive cycling can stress the knee. Source: NSCA, NCSF, IJSPT. Implemented: knee contraindication on leg_extension, leg_curl, nordic_curl, box_jump, burpee, jump_rope, jump_squat, wall_ball, assault_bike, zone2_bike, etc.
- **Lower back:** Deadlift variants, RDL, good morning, back extension, rowing (heavy), prone extension, and ballistic hinge (e.g. KB swing) load the lumbar spine. Source: BMC, NCBI, ACSM, HSS. Implemented: lower_back on barbell_deadlift, RDL, good_morning, back_extension, rower/ski erg, barbell/cable/pendlay/yates/t-bar row, single_leg_rdl, deficit/snatch_grip deadlift, devils_press, prone_extension, etc.
- **Elbow:** Dips, skull crusher, close-grip bench, preacher curl, tricep extensions, hanging leg raise stress the elbow. Source: NCSF/biomechanics. Implemented: elbow on dips, tricep_dip_bench, skull_crusher, close_grip_bench, preacher_curl, cable_tricep_extension, overhead_tricep_extension, db_tricep_kickback, hanging_leg_raise.
- **Wrist:** Push-ups, dips, plank, battle ropes, double unders, decline bench place wrist in extension/load. Implemented: wrist on dips, push_up, close_grip_push_up, battle_rope_waves, double_unders, decline_bench, etc.
- **Tag order (priority):** For each exercise, contraindications should be ordered from most to least relevant (primary concern first). Implemented: `exercise_contraindications.sort_order` and sync of `contraindication_tags` with `ORDER BY sort_order` so array is [most_relevant, ..., least_relevant].
- **Generator use of priority:** Prefer exercises with fewer contraindications when otherwise equal (better match pool); first element of `contraindication_tags` is “primary” for display/future soft logic. Implemented: small scoring bonus for fewer contraindication_tags in `scoreExercise`.

### Context-dependent heuristics (implemented)

- Leg extension/curl: Evidence supports that they are not universally “bad” for the knee; appropriateness depends on load, ROM, and individual (ACLR, patellofemoral pain). We tag knee as a contraindication so users with knee concerns can exclude them; priority can place knee lower for leg curl than for deep squat if desired. Implemented: knee on leg_extension, leg_curl, nordic_curl with priority.
- Rowing: Heavy or poor-form rowing stresses lower back; we tag lower_back for barbell/cable/pendlay/yates/t-bar row so injury filter can exclude. Implemented: lower_back on rows with appropriate priority.

### Speculative / deferred

- Hip and ankle: Fewer explicit studies in this audit; existing ontology slugs (hip_stress, ankle_stress) and tagging retained. No new slug added.
- Cardiovascular contraindications: Out of scope (we only tag musculoskeletal body regions).

---

## 4. Comparison to previous implementation

- **Before:** Contraindications existed in `exercise_contraindications` and were synced to `exercises.contraindication_tags` with alphabetical order (`ORDER BY c.contraindication`). No priority; no generator use of “primary” or count.
- **After:** (1) `exercise_contraindications` has optional `sort_order` (1 = most relevant). (2) Sync uses `ORDER BY sort_order, contraindication` so `contraindication_tags` is ordered most→least. (3) Additional contraindication rows added for upright row, and any gaps from audit; existing exercises enriched with extra tags where evidence supports. (4) Generator scores with a small bonus for fewer contraindications and documents that first tag = primary.

---

## 5. Metadata / ontology impact

- **DB:** `exercise_contraindications` gains optional `sort_order smallint DEFAULT 1`. `exercises.contraindication_tags` remains `text[]`; order of elements is now meaningful (first = primary).
- **Ontology:** No new slugs; existing CONTRAINDICATION_TAGS (shoulder, knee, lower_back, elbow, wrist, hip, ankle) used. Docs updated to state that order in `contraindication_tags` is most→least relevant.
- **Generation:** `filterByHardConstraints` unchanged (still excludes any exercise with matching contraindication). `scoreExercise` uses contraindication count for tie-breaking (prefer fewer contraindications).

---

## 6. Validation

- All new/updated contraindication values are canonical slugs from `lib/ontology/vocabularies.ts` (CONTRAINDICATION_TAGS).
- Sync migration rebuilds `contraindication_tags` from `exercise_contraindications` with `ORDER BY sort_order, contraindication`.
- Generator tests: existing injury-filter tests still pass; optional unit test for “fewer contraindications” scoring bonus.
