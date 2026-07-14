# Phase 2 progress

## Code landed (2026-07-12)

- `applyPreferencePreset` now upserts preferences when signed in (G2.1)
- `addCompletedWorkout` replaces local `hist_*` id with server UUID (G2.2)
- `updateWorkoutHistoryItem` persists rename via `updateCompletedWorkoutName` (G2.3)
- Train-today default documented as device-local for v1 (G2.4)
- Guest durability: **wont_fix_v1** (G2.5)

## Still open

- G2.6 Guest→sign-in merge policy (document + test)
- G2.7 Offline signed-in edits (already Alert on failure; confirm no silent-loss claims)

## Guest → sign-in policy (v1)

**Cloud wins.** When a guest signs in, `loadRemoteAppState` replaces gyms/prefs/presets/history with the signed-in snapshot. Guest in-memory edits from that session are not merged (guest durability is out of scope). Copy on welcome already says guest data is not kept in the cloud.

## Offline signed-in edits (v1)

No offline write queue. Failed persists surface `Couldn't save` via `persistWithHandling` / Alert. Users should retry when online.
