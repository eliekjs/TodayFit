# Deep Cleanup Summary

## 1. Navigation structure BEFORE vs AFTER

### BEFORE
- **Root:** `app/_layout.tsx` → `Slot` (AuthProvider, AppStateProvider).
- **Tabs group `(tabs)/`:**
  - **Visible tabs (3):** Library, Today (index), Profile.
  - **Hidden / flow screens:** manual/preferences, manual/workout, manual/execute, manual/week, adaptive/index, adaptive/schedule, adaptive/recommendation.
  - **Other hidden (no tab bar):** build, factors, sport-dev.
- **Stack group `(stack)/`:**
  - history/index (redirect → /library)
  - history/[id], history/complete, history/weeks/[id]
  - workout (wrapper around (tabs)/manual/workout; **never linked**)
  - saved (redirect → /library)

### AFTER
- **Root:** Unchanged.
- **Tabs group `(tabs)/`:**
  - **Visible tabs (3):** Library, Today, Profile.
  - **Flow screens (unchanged):** manual/*, adaptive/*.
  - **Removed from layout:** build, factors, sport-dev (screens deleted; entries removed from `_layout.tsx`).
- **Stack group `(stack)/`:**
  - **Removed:** `(stack)/workout/` (unused route; no navigation to `/workout`).
  - **Kept:** history/index, history/[id], history/complete, history/weeks/[id], saved (redirects retained).

---

## 2. Files deleted

| Item | Action |
|------|--------|
| `app/(stack)/workout/index.tsx` | **Deleted** (unused stack route; only re-exported manual/workout) |

**Total deleted:** 1 file.

---

## 3. Files archived

All moved to `/archive/` (see `archive/README.md`).

| Path | Reason |
|------|--------|
| `app/(tabs)/build.tsx` | Hidden tab; redundant with Today (index) entry points |
| `app/(tabs)/factors.tsx` | Hidden tab; placeholder “factors” screen |
| `app/(tabs)/sport-dev.tsx` | Dev-only screen; link from Profile removed |
| `hooks/use-theme-color.ts` | Never imported; app uses `lib/theme` |
| `hooks/use-color-scheme.ts` | Never imported |
| `hooks/use-color-scheme.web.ts` | Never imported |
| `components/ToggleRow.tsx` | Never imported |
| `lib/adaptiveSessionTypes.ts` | Never imported |
| `lib/db/goalsRepository.ts` | Exported from `lib/db/index` but never used |
| `lib/db/trainingQualitiesRepository.ts` | Never imported (Phase 1 optional DB) |

**Total archived:** 10 files (3 app screens, 3 hooks, 1 component, 2 lib, 2 lib/db).

---

## 4. Major architecture simplifications

- **Navigation:** Only routes that are actually used or that perform redirects remain. Removed one unused stack route (`/workout`) and three hidden tab screens (build, factors, sport-dev).
- **Tabs layout:** `Tabs.Screen` entries for build, factors, sport-dev removed so filesystem and UI match.
- **Profile screen:** “Sport DB (Dev)” link and its styles removed (sport-dev archived).
- **DB surface:** `goalsRepository` and `trainingQualitiesRepository` removed from production code; exports dropped from `lib/db/index.ts`.
- **Theme:** Fixed use of non-existent `theme.success` in `app/(tabs)/adaptive/recommendation.tsx` (use `theme.primary`).
- **TypeScript:** `archive/` excluded from `tsconfig.json` so archived code does not affect type-checking. `FilteredTabBar` props explicitly typed as `BottomTabBarProps` in tabs layout.

---

## 5. Dependencies likely removable (do not uninstall automatically)

- **@react-navigation/elements** – Not referenced in app code; may be a transitive/peer of React Navigation. Verify with `npm ls` and usage search before removing.
- **expo-font** – Often pulled in by Expo templates; confirm no `useFonts` or similar in app before removing.
- **expo-haptics** – Not referenced in app; optional for future haptics.
- **expo-symbols** – Not referenced in app; may be Expo SDK peer.
- **expo-web-browser** – Not referenced in app; useful if you add in-app links later.

Recommendation: run a project-wide grep for each package name and for typical imports (e.g. `expo-haptics`, `expo-font`) before removing any dependency.

---

## 6. Remaining technical debt

- **TypeScript:** Pre-existing errors remain in `data/exercises.ts`, `lib/generator.ts`, `lib/db/starterExerciseRepository.ts`, `logic/workoutGeneration/*`, `logic/workoutIntelligence/selection/sessionAssembler.ts`, `services/sportPrepPlanner/*`, and some tests (e.g. vitest types, phase8/phase9 test types). These were not introduced by this cleanup.
- **Navigation types:** `app/(tabs)/_layout.tsx` may still report that `tabBar` is not on the expo-router Tabs `screenOptions` type; the custom tab bar is valid at runtime.
- **Redirect-only stack screens:** `(stack)/history/index.tsx` and `(stack)/saved/index.tsx` only redirect to `/library`. They could be replaced by a single redirect route or by configuring the router to redirect at the segment level if desired.
- **Duplicate “entry” flows:** Today (index) and the removed “build” screen both offered “Build My Workout” and “Sport Mode”; consolidation is done by keeping only the Today flow.

---

## Verification

- **Archive:** All moved files are under `/archive/` with a short README.
- **Imports:** No production code imports archived or deleted modules; `lib/db/index.ts` no longer exports goals or training qualities repos.
- **App entry:** Entry point and providers unchanged; navigation and tabs layout updated to match actual usage.
- **TypeScript:** `archive` excluded; one theme fix and one layout typings fix applied. Remaining TS errors are pre-existing.

Run `npx expo start` and exercise the main flows (Today → manual/preferences → week/execute, Today → adaptive → schedule/recommendation, Library, Profile) to confirm behavior.
