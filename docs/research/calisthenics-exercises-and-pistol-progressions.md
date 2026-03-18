# Calisthenics Exercises List & Pistol Squat Progressions (Research)

**Purpose:** Definitive list of calisthenics exercises in TodayFit and evidence-based pistol squat progressions/regressions to cue when Calisthenics is selected.

---

## 1. How “calisthenics” is defined in the app

- **Generator:** When primary focus is **Calisthenics**, the pool is filtered to exercises whose equipment is only `bodyweight`, `pullup_bar`, or `bench` (see `lib/generator.ts` `CALISTHENICS_EQUIPMENT`). The daily generator also treats any exercise with `goal_tags` including `"calisthenics"` as calisthenics, or with `bodyweight` in equipment.
- **Stub (testing):** Only four exercises have explicit `goal_tags: ["…", "calisthenics"]`: **Push-up**, **Dips**, **Pull-up**, **TRX Row**.
- **DB (production):** Any exercise with equipment that is only bodyweight (or bodyweight + pullup_bar / bench / TRX) is eligible when Calisthenics is selected. Goal tag `calisthenics` is optional; bodyweight equipment is the main criterion.

---

## 2. List of all calisthenics exercises

### 2.1 Explicitly calisthenics-tagged (stub / goal_tags)

| ID         | Name      |
|-----------|-----------|
| `push_up` | Push-up   |
| `dips`    | Dips      |
| `pullup`  | Pull-up / Assisted Pull-up |
| `trx_row` | TRX Row   |

### 2.2 Bodyweight-only (or bodyweight + bench / pullup_bar / TRX) in DB

**Lower body (squat / single-leg):**

| Slug                    | Name                      | Equipment              |
|-------------------------|---------------------------|------------------------|
| `pistol_squat`          | Pistol Squat              | bodyweight             |
| `shrimp_squat`          | Shrimp Squat              | bodyweight             |
| `sissy_squat`           | Sissy Squat               | bodyweight             |
| `wall_sit`              | Wall Sit                  | bodyweight             |
| `cossack_squat`         | Cossack Squat             | bodyweight             |
| `jump_squat`            | Jump Squat                | bodyweight             |
| `jump_squat_light`      | Jump Squat (Light)        | bodyweight             |
| `lateral_lunge`         | Lateral Lunge             | bodyweight, dumbbells   |
| `walking_lunge`         | Walking Lunge             | bodyweight, dumbbells   |
| `curtsy_lunge`          | Curtsy Lunge              | bodyweight, dumbbells   |
| `single_leg_hip_thrust` | Single-Leg Hip Thrust     | bodyweight, barbell    |
| `nordic_curl`           | Nordic Hamstring Curl     | bodyweight             |
| `stability_ball_hamstring_curl` | Stability Ball Hamstring Curl | bodyweight     |
| `calf_raise`            | Calf Raise                | bodyweight, dumbbells   |
| `standing_calf_raise_single` | Single-Leg Calf Raise | bodyweight, dumbbells   |

**Hinge:**

| Slug              | Name           | Equipment        |
|-------------------|----------------|------------------|
| `glute_bridge`    | Glute Bridge   | bodyweight       |
| `back_extension`  | Back Extension | bench, bodyweight |

**Push:**

| Slug                 | Name               | Equipment        |
|----------------------|--------------------|------------------|
| `push_up`            | Push-up            | bodyweight       |
| `dips`               | Dips               | bodyweight       |
| `close_grip_push_up` | Close-Grip Push-up | bodyweight       |
| `pike_push_up`       | Pike Push-up       | bodyweight       |
| `tricep_dip_bench`   | Bench Tricep Dip   | bench, bodyweight |
| `trx_chest_press`    | TRX Chest Press    | trx              |
| `dip_assisted`       | Assisted Dip       | bodyweight, machine |

**Pull:**

| Slug                          | Name                        | Equipment        |
|-------------------------------|-----------------------------|------------------|
| `pullup`                      | Pull-up                     | pullup_bar       |
| `australian_pull_up`          | Australian Pull-up          | bodyweight       |
| `ring_pull_up`                | Ring Pull-up                | bodyweight       |
| `inverted_row`                | Inverted Row                | bodyweight       |
| `inverted_row_feet_elevated`  | Feet-Elevated Inverted Row  | bodyweight       |
| `trx_row`                     | TRX Row                     | trx              |

**Core:**

| Slug                  | Name                  | Equipment     |
|-----------------------|-----------------------|---------------|
| `plank`               | Plank Hold            | bodyweight    |
| `dead_bug`            | Dead Bug              | bodyweight    |
| `ab_wheel` / `rollout_ab_wheel` | Ab Wheel Rollout | bodyweight    |
| `side_plank`          | Side Plank            | bodyweight    |
| `russian_twist`       | Russian Twist         | bodyweight, dumbbells |
| `v_up`                | V-Up                  | bodyweight    |
| `bicycle_crunch`      | Bicycle Crunch        | bodyweight    |
| `lying_leg_raise`     | Lying Leg Raise       | bodyweight    |
| `reverse_crunch`      | Reverse Crunch        | bodyweight    |
| `superman`            | Superman              | bodyweight    |
| `stir_the_pot`        | Stir the Pot          | bodyweight    |
| `bear_hold`           | Bear Hold             | bodyweight    |
| `plank_shoulder_tap`  | Plank Shoulder Tap    | bodyweight    |
| `body_saw`            | Body Saw              | bodyweight, trx |
| Plus mobility/recovery (dead_bug variants, bird_dog, etc.) | | bodyweight |

**Conditioning / power:**

| Slug           | Name         | Equipment |
|----------------|--------------|-----------|
| `jump_rope`    | Jump Rope    | bodyweight |
| `burpee`       | Burpee       | bodyweight |
| `mountain_climber` | Mountain Climber | bodyweight |
| `lateral_bound`    | Lateral Bound    | bodyweight |
| `single_leg_hop`   | Single-Leg Hop   | bodyweight |

*(Plus stretches/mobility: standing hamstring stretch, figure four, hip flexor stretch, world’s greatest stretch, 90/90 hip switch, etc., all bodyweight.)*

---

## 3. Research: what to include for pistol squats when calisthenics is selected

### 3.1 Standard progression (regression → progression)

Evidence and common programming (e.g. Calisthenics Association, REP Fitness, Maximum Potential Calisthenics, Markow Training Systems) support this order:

1. **Two-leg squats** – base strength  
2. **Static lunges / split stance** – single-leg emphasis  
3. **Bulgarian split squats / step-ups** – more single-leg load  
4. **Single-leg step downs** – eccentric control  
5. **Partial pistol squats** – limited ROM  
6. **Assisted pistol squats** – external support (see below)  
7. **Elevated pistol squats** – heels raised (reduces ankle/hip mobility demand)  
8. **Strict pistol squats** – full depth, non-working leg off the floor  

### 3.2 Assisted variations (regressions)

- **TRX or pole / doorframe** – hold for balance and partial support; reduces load and balance demand.  
- **Resistance band** – anchored overhead to reduce effective bodyweight.  
- **Chair / box** – for partial ROM or as a target for depth.  
- **Partner** – light manual support during descent/ascent.

**For the app:** Cue **assisted pistol (TRX or pole)** and, when we add it, **elevated pistol (heels elevated)** as regressions.

### 3.3 Advanced progressions

- **Dragon pistol squat** – non-working leg hooked behind the standing leg, then extended forward without touching the ground. Prerequisites: ~5 strict pistol squats and ~5 shrimp squats (MP Calisthenics).  
- **BOSU / unstable surface** – adds balance and ankle stability; can be used as a progression (harder) or with heels on BOSU as a regression (reduces ankle dorsiflexion demand).  

**For the app:** When Calisthenics is selected (especially with a “Legs / Pistol” sub-focus), cue:

- **Pistol squat** (main)  
- **Shrimp squat** (related single-leg squat, progression path)  
- **Assisted pistol (TRX or pole)** – regression  
- **Elevated pistol (heels elevated)** – regression  
- **Dragon squat** – advanced progression (once we have it)  
- **Pistol on BOSU** – progression/regression option (once we have it)  

### 3.4 Prerequisites (for cues / progression logic)

- ~15+ two-leg bodyweight squats with good form  
- ~60+ seconds single-leg balance  
- Adequate ankle dorsiflexion (e.g. knee-to-wall ~4–5 in)  

---

## 4. Current gaps and recommendations

| Exercise / variant           | In DB?   | In stub? | Recommendation |
|-----------------------------|----------|----------|----------------|
| Pistol squat                | Yes      | No       | Keep; ensure tagged/mapped for calisthenics + legs. |
| Shrimp squat                | Yes      | No       | Keep; link as progression/alternative to pistol. |
| Assisted pistol (TRX/pole)  | No       | No       | Add: `pistol_squat_assisted_trx` or `pistol_squat_assisted` (equipment: bodyweight, trx or pole). |
| Elevated pistol (heels up)  | No       | No       | Add: `pistol_squat_elevated` (equipment: bodyweight, box or wedge). |
| Dragon squat                | No       | No       | Add: `dragon_squat` (bodyweight), progression of pistol_squat. |
| Pistol on BOSU              | No       | No       | Add: `pistol_squat_bosu` (bodyweight, bosu) for progression/regression. |

**Sub-focus:** Add a Calisthenics sub-focus **“Legs / Pistol & single-leg”** (`legs_pistol`) so that when users select Calisthenics + this sub-focus, the generator weights squat, legs, single_leg, balance, quads, glutes and surfaces pistol_squat, shrimp_squat, and (once added) assisted/elevated/dragon/BOSU variants.

**Full-body calisthenics:** Weight `full_body_calisthenics` with legs, squat, and single_leg so pistol and shrimp can appear in “Full body” calisthenics sessions, not only upper + core.

---

## 5. References (summary)

- Pistol progression order and assisted/elevated variants: Calisthenics Association (beginners), REP Fitness, Markow Training Systems.  
- Dragon pistol: Maximum Potential Calisthenics (prerequisites: 5 pistol + 5 shrimp).  
- BOSU / elevated work: reduces ankle/hip mobility demands (Markow Training Systems).  
- Prerequisites and timelines: 15+ squats, 60+ s single-leg balance, ankle mobility; progression ~4–24 weeks depending on baseline (Calisthenics Association).
