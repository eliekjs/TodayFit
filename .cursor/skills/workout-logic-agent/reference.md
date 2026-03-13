# Exercise Science Reference by Goal

Concise principles for programming (reps, sets, rest, volume, balance) per goal. Use when tuning prescription, scoring, or session structure.

---

## Strength

- **Rep ranges:** Typically 3–6 for main compounds; 5–8 for secondary.
- **Rest:** 2–5 min between sets for heavy work; avoid shortening rest at the cost of load.
- **Volume:** Moderate total sets per pattern; prioritize quality and load over sheer volume.
- **Balance:** Push/pull and squat/hinge balance; avoid excessive same-pattern volume. Use movement-pattern caps.
- **Qualities:** `max_strength`, `pushing_strength`, `pulling_strength`; compound-dominant.

---

## Hypertrophy

- **Rep ranges:** Often 6–12 for most work; some 8–15 for isolations.
- **Rest:** 60–90 s typical; can go 45–120 s depending on exercise and intent.
- **Volume:** Higher total sets per muscle/region; allow for fatigue management (e.g. fatigue_regions, pairing).
- **Balance:** Push/pull and legs; include isolation where template allows. Avoid stacking same fatigue_region in supersets.
- **Qualities:** `hypertrophy`, `lat_hypertrophy`, `quad_hypertrophy`; mix compounds and accessories.

---

## Body recomp

- **Mix:** Hypertrophy-style resistance + aerobic base (e.g. Zone 2). Prescription should reflect both.
- **Cardio:** Prefer user’s preferred Zone 2 modality when set; duration in moderate range (e.g. 15–30 min finisher).
- **Qualities:** `hypertrophy`, `aerobic_base`, `work_capacity`; balance strength and conditioning.

---

## Endurance

- **Prescription:** Time- or work-based; steady state (Zone 2) or structured intervals as appropriate.
- **Rest:** Short or none for steady; interval rest by work:rest ratio.
- **Qualities:** `aerobic_base`, `posterior_chain_endurance`, `trunk_endurance`; avoid heavy strength overlap in same session unless blended by design.

---

## Conditioning / work capacity

- **Prescription:** Intervals, circuits, or time domains; clear work/rest.
- **Qualities:** `work_capacity`, `anaerobic_capacity`, `aerobic_power`, `lactate_tolerance`. Match session template (e.g. HIIT vs circuit).

---

## Power

- **Rep ranges:** Low (e.g. 3–5); focus on intent and velocity, not fatigue.
- **Rest:** Long enough to recover (e.g. 2–4 min); do not place after high-fatigue work.
- **Order:** Power work early in session when fresh.
- **Qualities:** `power`, `rate_of_force_development`; use quality weights and block type (e.g. power block).

---

## Mobility

- **Load:** Low; ROM and control emphasis.
- **Prescription:** Reps/time for drills; avoid high fatigue. Cooldown selection uses mobility_targets and stretch_targets; respect contraindications.
- **Qualities:** `mobility`, `thoracic_mobility`, `hip_stability`.

---

## Recovery

- **Load and volume:** Low; restorative. No heavy compounds or high-intensity conditioning.
- **Qualities:** `recovery`, `mobility`; avoid stacking fatigue.

---

## Athletic performance (general)

- **Mix:** Power, rate of force development, strength, balance, unilateral. Session structure should reflect this (e.g. power then strength then accessories).
- **Qualities:** `power`, `rate_of_force_development`, `max_strength`, `balance`, `unilateral_strength`.

---

## Sport-specific (climbing, ski, running)

- **Climbing:** Pulling, grip, lockoff, scapular stability, core. High weight on `pulling_strength`, `grip_strength`, `lockoff_strength`, `scapular_stability`.
- **Ski:** Eccentric, unilateral, hip stability, trunk endurance, aerobic base. Emphasize `eccentric_strength`, `unilateral_strength`, `hip_stability`, `trunk_endurance`.
- **Running:** Aerobic base, posterior chain endurance, tendon resilience. Avoid heavy lower-body fatigue immediately before key runs; use `aerobic_base`, `posterior_chain_endurance`, `tendon_resilience`.

---

## Cross-cutting

- **Injuries:** Hard-exclude by joint_stress and contraindication tags; never prescribe into a user-stated restriction.
- **Energy/duration:** Low energy or short duration → fewer blocks/exercises, not only shorter rest; scale volume and density appropriately.
- **Supersets:** Prefer non-competing pairing categories and fatigue regions; avoid same grip or same pattern back-to-back unless intentional (e.g. pre-exhaustion).
- **Weekly:** When distributing across days, respect goal distribution style (dedicate days vs blend) and body emphasis (upper/lower/full) so the week is coherent with user preferences.
