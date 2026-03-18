# Sport consolidation recommendations

Reduce option overload by merging very similar sports into single choices, while **keeping all unique sub-goals** so logic and tag mapping still work. Sub-goals become the way users express power vs endurance (e.g. "Power / Dynamic" vs "Trunk Endurance" for climbing).

---

## 1. Backcountry skiing or splitboarding → **one option**

| Current | Proposed |
|--------|----------|
| **Backcountry Skiing** (`backcountry_skiing`) | **Backcountry Skiing or Splitboarding** |
| **Splitboarding** (`splitboarding`) — in DB only, no sub-focus in app | Single sport in app + DB |

**Rationale:** Same movement (skins up, ride down), same training: uphill endurance, leg strength, downhill stability, core, knee resilience. Splitboarding is already in DB and in sport tags; it just never got its own entry in `SPORTS_WITH_SUB_FOCUSES`. Merging avoids two nearly identical choices.

**Sub-goals to keep (from backcountry_skiing):**  
`uphill_endurance`, `leg_strength`, `downhill_stability`, `core_stability`, `knee_resilience`  
No new sub-goals needed; splitboarders use the same ones.

**Implementation:** Keep slug `backcountry_skiing` as canonical. Update display name to "Backcountry Skiing or Splitboarding". In DB, either (a) deprecate/remove `splitboarding` row and add alias in app, or (b) keep both rows but treat `splitboarding` as alias that maps to `backcountry_skiing` for sub-focus and quality weights. Migrations that tag exercises for `splitboarding` can also tag for `backcountry_skiing` (or we map splitboarding → backcountry_skiing when loading weights).

---

## 2. Rock climbing (bouldering, sport/lead, trad) → **one “Rock Climbing” option**

| Current | Proposed |
|--------|----------|
| **Bouldering** (`rock_bouldering`) | **Rock Climbing** (one entry) |
| **Rock Climbing (Sport/Lead)** (`rock_sport_lead`) | Sub-goals cover power vs endurance |
| **Trad Climbing** (`rock_trad`) | |

**Rationale:** Same movement family (rock climbing); difference is emphasis (power vs endurance), which is already captured by sub-goals. One pick with sub-goals is simpler than three separate sports.

**Sub-goals to keep (union, deduped):**

- From bouldering/sport/lead: `finger_strength`, `pull_strength`, `lockoff_strength`, `core_tension`, `shoulder_stability`, `power_dynamic`
- From trad only: `trunk_endurance` (replaces or supplements power_dynamic for endurance-focused climbers)

**Proposed single list:**  
`finger_strength`, `pull_strength`, `lockoff_strength`, `core_tension`, `shoulder_stability`, `power_dynamic`, `trunk_endurance`  
So users can still choose “Power / Dynamic” vs “Trunk Endurance” (and the rest) and logic stays the same.

**Implementation:** New canonical slug e.g. `rock_climbing`. One entry in `SPORTS_WITH_SUB_FOCUSES` with the union of sub-focuses above. In `SUB_FOCUS_TAG_MAP`, copy mappings from `rock_sport_lead` / `rock_bouldering` / `rock_trad` to `rock_climbing:<sub_focus>`. In `sportQualityWeights.ts`, add `rock_climbing` (e.g. blend of the three: strong on pulling, grip, lockoff, core; optional slight bias to power or endurance via sub-focus). DB: add `rock_climbing` to `sports`; keep `rock_bouldering`, `rock_sport_lead`, `rock_trad` as deprecated or alias rows that map to `rock_climbing` for existing users. Default sub-focus when none selected: e.g. `pull_strength`, `core_tension`. Update `starterExerciseRepository` default logic to use `rock_climbing` (and map old slugs to it).

**Note:** Ice climbing stays separate (different movement and equipment; distinct sub-goals like grip_endurance, shoulder & overhead).

---

## 3. Volleyball (indoor + beach) → **one option**

| Current | Proposed |
|--------|----------|
| **Volleyball (Indoor)** (`volleyball_indoor`) | **Volleyball** |
| **Beach Volleyball** (`volleyball_beach`) | |

**Rationale:** Same sub-focus list (vertical jump, landing mechanics, shoulder stability, core stability, knee resilience). Only surface differs; training priorities are the same.

**Sub-goals to keep:**  
`vertical_jump`, `landing_mechanics`, `shoulder_stability`, `core_stability`, `knee_resilience`  
(No change; already identical.)

**Implementation:** Canonical slug e.g. `volleyball`. Single entry in `SPORTS_WITH_SUB_FOCUSES`. DB: one row "Volleyball (Indoor & Beach)" or "Volleyball"; alias or migrate `volleyball_indoor` and `volleyball_beach` to `volleyball`.

---

## 4. Track Sprinting + Track & Field → **one option**

| Current | Proposed |
|--------|----------|
| **Track Sprinting** (`track_sprinting`) | **Track & Field / Sprinting** |
| **Track & Field** (`track_field`) | |

**Rationale:** Identical sub-focuses (acceleration, max velocity, plyometrics, leg strength, hamstring & tendon resilience). Same training logic.

**Sub-goals to keep:**  
`acceleration_power`, `max_velocity`, `plyometric_power`, `leg_strength`, `hamstring_tendon_resilience`  
(No change.)

**Implementation:** Canonical slug e.g. `track_sprinting` or `track_field`. One entry in `SPORTS_WITH_SUB_FOCUSES`; display name "Track & Field / Sprinting". DB and quality weights: one canonical; other slug aliased.

---

## 5. Cycling (road + mountain) → **one “Cycling” option**

| Current | Proposed |
|--------|----------|
| **Cycling** (Road) (`cycling_road`) | **Cycling** |
| **Cycling (Mountain)** (`cycling_mtb`) | |

**Rationale:** Overlap is large (aerobic base, threshold, leg strength, core). MTB adds “Power Endurance”; road adds “VO2 Intervals”. Both can live as sub-goals under one sport.

**Sub-goals to keep (union):**  
`aerobic_base`, `threshold`, `vo2_intervals`, `power_endurance`, `leg_strength`, `core_stability`  
(Union of both current lists.)

**Implementation:** Canonical slug e.g. `cycling`. One entry in `SPORTS_WITH_SUB_FOCUSES` with all six sub-goals. `SUB_FOCUS_TAG_MAP`: merge entries from `cycling_road` and `cycling_mtb` under `cycling:*`. Quality weights: single `cycling` profile (e.g. road-based with MTB-relevant qualities). DB: one “Cycling” row; alias `cycling_road` and `cycling_mtb` to `cycling`.

---

## 6. Racquet / paddle court (Tennis, Pickleball, Badminton, Squash) → **one “Racquet / Court” or keep 2**

| Current | Proposed (option A) | Proposed (option B) |
|--------|----------------------|----------------------|
| Tennis, Pickleball, Badminton, Squash | **Racquet & Court Sports** (one) | **Tennis / Pickleball** and **Badminton / Squash** (two) |

**Rationale:** All four share the same sub-focus list: lateral speed, rotational power, shoulder stability, core & rotation, work capacity. Option A minimizes options; option B keeps a slight distinction (tennis/pickleball vs badminton/squash) if you want to preserve different quality-weight nuances later.

**Sub-goals to keep:**  
`lateral_speed`, `rotational_power`, `shoulder_stability`, `core_rotation`, `work_capacity`  
(No change.)

**Recommendation:** Option A (one “Racquet & Court Sports” or “Court Racquet Sports”) unless you have a strong reason to keep tennis vs badminton separate. Implementation: one canonical slug (e.g. `court_racquet`), one `SPORTS_WITH_SUB_FOCUSES` entry, merge tag maps and quality weights from the four; DB aliases for tennis, pickleball, badminton, squash.

---

## 7. Grappling (BJJ, Judo, MMA, Wrestling) → **optional consolidation**

| Current | Proposed |
|--------|----------|
| BJJ, Judo, MMA, Wrestling | **Grappling** (one) or keep 2–3 |

**Rationale:** BJJ, Judo, MMA, and Wrestling share very similar sub-focuses (grip/endurance, hip stability, pull strength, explosive power, work capacity). MMA overlaps with both grappling and striking (Muay Thai). Merging all four into “Grappling” would reduce options; keeping “BJJ”, “Judo”, “Wrestling”, and “MMA” as separate is still manageable if you prefer identity over simplicity.

**Sub-goals to keep (union):**  
Current set is already almost identical; only naming differs (e.g. “Hip Stability & Mobility” vs “Hip Stability & Power”). One list: `grip_endurance`, `hip_stability`, `pull_strength`, `explosive_power`, `work_capacity`.

**Recommendation:** Lower priority than 1–5. If consolidating: one “Grappling” sport with the above sub-goals; Muay Thai stays separate (striking + kicks). Optionally keep “MMA” as its own with same sub-goals and a blended quality profile.

---

## 8. Running (road, trail, marathon, ultra) → **no consolidation recommended**

Keeping **Road Running**, **Trail Running**, **Marathon Running**, and **Ultra Running** separate is recommended: they have meaningfully different sub-goals (e.g. trail has downhill control, ankle stability, terrain adaptability; marathon has marathon pace; ultra has durability emphasis). Consolidating would lose useful nuance.

---

## Summary table (for approval)

| # | Combine these | Into one (display name) | Canonical slug (suggestion) | Unique sub-goals preserved |
|---|----------------|--------------------------|-----------------------------|-----------------------------|
| 1 | Backcountry Skiing, Splitboarding | Backcountry Skiing or Splitboarding | `backcountry_skiing` | uphill_endurance, leg_strength, downhill_stability, core_stability, knee_resilience |
| 2 | Bouldering, Sport/Lead, Trad | Rock Climbing | `rock_climbing` | finger_strength, pull_strength, lockoff_strength, core_tension, shoulder_stability, power_dynamic, trunk_endurance |
| 3 | Volleyball (Indoor), Beach Volleyball | Volleyball | `volleyball` | vertical_jump, landing_mechanics, shoulder_stability, core_stability, knee_resilience |
| 4 | Track Sprinting, Track & Field | Track & Field / Sprinting | `track_sprinting` or `track_field` | acceleration_power, max_velocity, plyometric_power, leg_strength, hamstring_tendon_resilience |
| 5 | Cycling (Road), Cycling (Mountain) | Cycling | `cycling` | aerobic_base, threshold, vo2_intervals, power_endurance, leg_strength, core_stability |
| 6 | Tennis, Pickleball, Badminton, Squash | Racquet & Court Sports (or 2 groups) | `court_racquet` (or keep 2) | lateral_speed, rotational_power, shoulder_stability, core_rotation, work_capacity |
| 7 | (Optional) BJJ, Judo, MMA, Wrestling | Grappling | `grappling` | grip_endurance, hip_stability, pull_strength, explosive_power, work_capacity |

**Implementation order suggested:** 1 → 2 → 3 → 4 → 5 → 6 (then 7 if desired). For each: update `SPORTS_WITH_SUB_FOCUSES`, `SUB_FOCUS_TAG_MAP`, `sportQualityWeights.ts`, DB `sports` and any seeds, default sub-focus in `starterExerciseRepository`, and add alias/migration for old slugs so existing user data and starter_exercises tags still resolve.

---

**Files to touch per consolidation:**

- `data/sportSubFocus/sportsWithSubFocuses.ts` — one entry per combined sport, full sub-focus list
- `data/sportSubFocus/subFocusTagMap.ts` — keys `new_slug:sub_focus` with tag arrays (copy or merge from existing)
- `logic/workoutIntelligence/sportQualityWeights.ts` — `SportSlug` type and `SPORT_QUALITY_WEIGHTS` entry
- `lib/db/starterExerciseRepository.ts` — default sub-focus when primary sport is the new slug; map old slugs → new for defaults
- `supabase/migrations/` — new migration: upsert canonical sport row; optional alias or backfill for old slugs; `sports_sub_focus` / `sub_focus_tag_map` if you sync from app
- `docs/sports-sub-goals-and-exercises.md` — update table to reflect merged sports and sub-goals
- Any UI that shows sport name or filters by slug (e.g. adaptive schedule) — ensure it uses canonical slug and display name

Once you approve which rows to combine (1–7), the next step is to implement the chosen consolidations in that order and preserve all listed sub-goals so logic still works.

---

## Implemented (done)

All 7 consolidations above have been implemented. Legacy slugs are mapped in `data/sportSubFocus/canonicalSportSlug.ts`; DB migration `20250317100001_sport_consolidation.sql` adds canonical sports and deactivates legacy rows.

---

## Other possible consolidations (optional, not done)

- **OCR / Tactical:** Spartan/OCR and Tactical Fitness share work capacity, running endurance, core, and durability. Could become one “OCR / Tactical Fitness” with sub-goals as union (work_capacity, running_endurance, grip_endurance, strength_endurance, durability, core_stability). Lower priority; different user identities.
- **Hyrox + CrossFit:** Both are hybrid fitness with work capacity, strength, power, engine. Could become “Hybrid Fitness” with sub-goals covering work capacity, strength, power, gymnastics, engine, running, grip. Arguably different enough (Hyrox = race format; CrossFit = general training) to keep separate.
- **Running (light merge):** Road + Marathon could stay separate (different race goals). Trail + Ultra have overlap (durability, uphill, leg resilience) but trail has downhill/ankle/terrain; keeping separate is recommended.
- **Hiking + Rucking:** Some overlap (aerobic, load carriage, leg strength). Could combine as “Hiking / Rucking” with sub-goals: aerobic_base, load_carriage_durability, leg_strength, core_stability, ankle_stability, uphill_endurance. Optional future step.
