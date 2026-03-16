# Archive

Code moved here during the deep cleanup (navigation/routes and dead code removal). Not part of the production build.

- **app-tabs/** – Removed tab screens: `build`, `factors`, `sport-dev` (redundant or dev-only; not in tab bar).
- **hooks/** – Unused template hooks: `use-theme-color`, `use-color-scheme` (app uses `lib/theme`).
- **components/** – `ToggleRow` (never imported).
- **lib/** – `adaptiveSessionTypes` (never imported).
- **lib-db/** – `goalsRepository`, `trainingQualitiesRepository` (exported but never used by app).

Restore by moving files back and re-adding any layout/export references.
