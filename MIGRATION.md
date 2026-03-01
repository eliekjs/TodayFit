# Migration: All App Data to Supabase

## Phase 0 — Current state (inventory)

### Persistence in use today
- **None** — No Firebase, Firestore, AsyncStorage, SQLite, or REST backend.
- All app “persistence” is **in-memory React state** in `AppStateContext` (context/AppStateContext.tsx).
- **Reference data** is static TypeScript:
  - `data/exercises.ts`: `EXERCISES` array (ExerciseDefinition). Used only by `lib/generator.ts`.
  - `data/gymProfiles.ts`: `EQUIPMENT_BY_CATEGORY`, `initialGymProfiles`, `getDefaultEquipmentForTemplate`. Used as initial state and by profiles UI.

### Data entities

| Entity              | User-specific? | Where read/written                          | Notes                                      |
|---------------------|-----------------|---------------------------------------------|--------------------------------------------|
| GymProfile          | Yes             | AppStateContext, profiles, manual prefs     | id, name, equipment[], dumbbellMaxWeight   |
| PreferencePreset    | Yes             | AppStateContext, profiles                   | Named snapshot of ManualPreferences         |
| ManualPreferences   | Yes (defaults)  | AppStateContext, manual/preferences, home   | Focus, duration, energy, injuries, etc.    |
| GeneratedWorkout    | Session         | AppStateContext, manual/workout, execute    | Current workout being built/executed        |
| WorkoutHistoryItem  | Yes             | AppStateContext, history, complete         | Completed workouts                          |
| SavedWorkout        | Yes             | AppStateContext, history, manual/workout    | In-progress/saved workouts                  |
| ExecutionProgress   | Session         | AppStateContext, execute                    | Resume state                                |
| Exercises (ref)     | No              | lib/generator.ts (from data/exercises)      | Filterable by equipment, tags, injuries    |

### Supabase client
- **Single module**: `lib/db/client.ts` — `getSupabase()`, `isDbConfigured()`.
- **Env**: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Confirmed in use.

---

## Migration plan

1. **Define canonical model** in Supabase: exercises + tags + maps, gym_profiles + equipment, workouts + blocks + exercises, user_preferences, user_goals.
2. **RLS**: Reference tables read-only for authenticated; user tables CRUD only when `user_id = auth.uid()`.
3. **Repositories**: One module per domain; UI and context call repos only (no direct `supabase.from()`).
4. **Refactor**: Context loads/saves via repos when DB configured and user present; otherwise keep in-memory behavior. Generator uses ExerciseRepo when available, else falls back to `EXERCISES`.
5. **Seed**: Idempotent SQL (and/or script) for exercises, exercise_tags, exercise_tag_map, exercise_contraindications from existing `data/exercises.ts`.
6. **Retire legacy**: Remove reliance on `initialGymProfiles` and in-memory-only state for user data once parity is confirmed; keep `data/exercises.ts` as fallback until seed is run. No Firebase to remove.

---

## What changed (post-migration)

- **Exercises**: Served from Supabase `exercises` + `exercise_tags` + `exercise_tag_map` + `exercise_contraindications`. Generator uses `ExerciseRepo.listExercises()` with filters.
- **Gym profiles**: Stored in `gym_profiles` + `gym_profile_equipment`. Context loads via `GymProfileRepo.listProfiles(userId)` and persists on add/update/remove/setActive.
- **Workouts**: Generated workout saved to `workouts` (intent jsonb) + `workout_blocks` + `workout_exercises`. History and saved workouts read from `WorkoutRepo.listWorkouts()` / `getWorkout(id)`.
- **Preferences**: Defaults and presets in `user_preferences` and optionally `user_goals`; context syncs via `PreferencesRepo` / `GoalsRepo`.
- **Sport Mode**: Unchanged; continues to use existing sport tables and `sportRepository`.

---

## Verification checklist (manual)

- [ ] App loads exercises from Supabase and filters correctly (equipment, injuries, focus).
- [ ] Gym profile equipment saving persists across reload (and RLS restricts to own user).
- [ ] Sport Mode still works (sports, qualities, user_sport_profiles).
- [ ] Workout generation uses exercises from DB when configured; generation saves workout + blocks + exercises when user is signed in.
- [ ] Completed workouts and saved workouts persist and reload when signed in.
- [ ] RLS prevents cross-user access (test with two users; confirm one cannot read another’s profiles/workouts).
- [ ] No `service_role` key in client code or committed files; `.env` is gitignored.
