# Production Hardening Progress (Autonomous Loop)

This is a plain-English summary of what has been done so far from the code review action plan.

## Why this work started

The review identified a few top risks for production:

- Workouts could be "plausible looking" but still wrong or unsafe.
- Multi-step DB writes could partially fail and leave inconsistent data.
- Silent persistence failures could make users think something saved when it did not.
- Too many environment-dependent paths could make behavior inconsistent and hard to debug.

This loop has been addressing those in priority order.

## Phases and iterations completed

## Phase 1: Correctness and safety guardrails

### Iteration 1

- Fixed adaptive weekly anti-repeat wiring so weekly main-lift history is actually passed through generation.
- Added tests proving that weekly state is propagated day to day.
- Added generation validation guardrail coverage.
- Hardened duration reporting behavior after post-assembly injections.

### Iteration 3

- Added structured fallback metadata in generator debug when unresolved validation issues remain.
- Added explicit logging for sport profile mapping failures (`map_failed`) while preserving generation.

### Iteration 8

- Added a generation mode fingerprint (debug metadata) so sessions expose key runtime mode details (flags/profile state/pool checkpoints).
- Added dedupe for repeated identical `map_failed` warnings in a single runtime to reduce log noise.

### Iteration 13

- Added one conservative regenerate attempt before critical-violation fallback removal.
- Kept hard safety behavior intact if regenerate still does not resolve critical violations.

### Iteration 14

- Added adaptive-week **outcome-level** test coverage for main-lift ID diversity across days (not only input propagation).

## Phase 2: Data integrity and persistence trust

### Iteration 2

- Added shared persistence helper to avoid swallowed errors.
- Replaced key silent catches in app state persistence flows.
- Added rollback for destructive optimistic remove on save failure.

### Iteration 5

- Added compensating cleanup in DB repositories for multi-step workout/week saves when later steps fail.
- Added rollback-focused tests.

### Iteration 6

- Adaptive recommendation screen day moves (up/down) now persist for signed-in users.
- Added optimistic UI rollback if server persistence fails.
- Guest mode remains local-only.

### Iteration 11

- Added compensating cleanup in `planWeek` when late failures happen (after some rows/workouts already created).
- Tests now verify cleanup attempts are made and original error is still propagated.

### Iteration 12

- Added serialized + latest-only coalesced persistence for rapid manual preference updates.
- This reduces in-session racey overwrites from overlapping saves.

## Phase 3: Runtime safety and testing blind spots

### Iteration 4

- Reduced weekly load N+1 behavior by using batched workout retrieval in weekly plan loading path.
- Added mapping tests for batched behavior.

### Iteration 7

- Added runtime guards/normalization for malformed DB JSON payloads (preferences and workout payloads).
- Prevents crashes from malformed rows and falls back safely.

### Iteration 9

- Added focused service failure-path tests for planner/regeneration/status update flows.
- Covered DB-not-configured, missing rows, insert/update failures.

### Iteration 10

- Extended failure tests to cover additional late-failure and select-error paths.
- Confirmed remaining partial-persistence risks, which then drove Iteration 11 cleanup hardening.

## What has improved (plain English)

- The generator is now safer when validation fails in edge cases.
- Weekly generation behaves more consistently for diversity goals.
- Persistence failures are less silent, and destructive actions now have rollback protection.
- Multi-step save flows have compensating cleanup in more failure scenarios.
- Adaptive day moves no longer silently revert after reload for signed-in users.
- Runtime malformed payload handling is more defensive.
- Test coverage now includes more of the failure modes that matter in production.

## What still needs work (remaining high-value items)

- True transactional persistence (single DB transaction/RPC for complex write graphs) is still the long-term target.
- More end-to-end tests for naturally occurring validation fallback scenarios (not only mocked ones).
- Cluster-level diversity checks (not just exact main-lift IDs) should be added for adaptive week quality.
- Observability should be wired to durable telemetry sinks (not just debug fields/console logs).
- Large generator modules are still big and should be incrementally split into clearer stages with explicit invariants.

## Current status

- Autonomous hardening loop is active.
- Changes so far are incremental, test-backed, and focused on the highest production risks first.

