# Rep range defaults and superset duration

## Default: 8–12 reps

The generator programs **8–12 reps** for most strength/hypertrophy work unless one of the exceptions below applies.

## Exceptions (when we prescribe something other than 8–12)

| Case | Rep (or) prescription | Reason |
|------|------------------------|--------|
| **Max strength with barbell/cable/machine** | 3–6 reps | Goal rules: strength goal uses low reps for heavy loading (ACSM). |
| **Power** | 2–5 or 3–5 reps | Explosive intent; quality over volume. |
| **Endurance** | 15–25 reps | Muscular endurance (ACSM/NSCA). |
| **Mobility / recovery** | Time or 1 rep | Stretch/mobility is time-based or single hold. |
| **Conditioning** | Time-based | Cardio/erg work uses minutes, not rep counts. |
| **Exercise-specific DB override** | `rep_range_min`–`rep_range_max` | When set on the exercise, we blend with goal range (e.g. calves 15–25, isolation 10–20). |

## DB/KB-only exercises (goblet squat, DB RDL, etc.)

Exercises that use **only** dumbbells and/or kettlebells (and optionally adjustable bench) are always prescribed **8–12 reps** for main strength, main hypertrophy, and accessory blocks—even when the goal is “Max strength.” Rationale: true max-strength loading is typically barbell; DB/KB work is better suited to moderate rep ranges unless the user is explicitly in a max-strength phase with only DB/KB available.

## Superset block duration

Superset blocks (e.g. two 5×5 exercises) use a **realistic** time estimate: ~15–20 minutes for two 5×5 exercises. Formula: `sets × (1.5 min work per round + min(rest, 120s) / 60)`. Rest used in the estimate is capped at 2 minutes per round because superset rest is taken once per pair, not per exercise.

---

## Database: list exercises by rep-range behavior

Run against your `exercises` table (e.g. Supabase SQL editor or `psql`).

**1) Exercises that get the “DB/KB-only → 8–12” override**  
(equipment is only dumbbells and/or kettlebells, and optionally adjustable_bench):

```sql
SELECT id, slug, name, equipment, rep_range_min, rep_range_max
FROM public.exercises
WHERE is_active = true
  AND array_length(equipment, 1) > 0
  AND equipment <@ ARRAY['dumbbells', 'kettlebells', 'adjustable_bench']::text[]
  AND (equipment && ARRAY['dumbbells'] OR equipment && ARRAY['kettlebells'])
ORDER BY name;
```

**2) Exercises with an explicit rep range** (these are blended with goal; exceptions to the default 8–12 when the overlap allows):

```sql
SELECT id, slug, name, equipment, rep_range_min, rep_range_max
FROM public.exercises
WHERE is_active = true
  AND rep_range_min IS NOT NULL
  AND rep_range_max IS NOT NULL
ORDER BY rep_range_min, name;
```

**3) Single query: DB/KB-only and/or explicit rep range** (all “exception” rows for rep behavior):

```sql
SELECT id, slug, name, equipment, rep_range_min, rep_range_max,
       CASE
         WHEN array_length(equipment, 1) > 0
              AND equipment <@ ARRAY['dumbbells', 'kettlebells', 'adjustable_bench']::text[]
              AND (equipment && ARRAY['dumbbells'] OR equipment && ARRAY['kettlebells'])
         THEN 'db_kb_only_8_12'
         ELSE NULL
       END AS db_kb_override,
       CASE WHEN rep_range_min IS NOT NULL AND rep_range_max IS NOT NULL THEN 'has_rep_range' ELSE NULL END AS explicit_rep_range
FROM public.exercises
WHERE is_active = true
  AND (
    (array_length(equipment, 1) > 0
     AND equipment <@ ARRAY['dumbbells', 'kettlebells', 'adjustable_bench']::text[]
     AND (equipment && ARRAY['dumbbells'] OR equipment && ARRAY['kettlebells']))
    OR (rep_range_min IS NOT NULL AND rep_range_max IS NOT NULL)
  )
ORDER BY name;
```

You can paste any of these into the Supabase SQL editor (or run via `psql` / your DB client) to inspect which exercises are affected.
