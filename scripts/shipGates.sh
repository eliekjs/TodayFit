#!/usr/bin/env bash
# Ship gate: generation fidelity + auth env helper tests.
# Usage: bash scripts/shipGates.sh
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== shipGates: unit (auth env + persona fixtures) =="
npx vitest run lib/db/client.test.ts logic/workoutGeneration/personaFixtures.test.ts

echo "== shipGates: Manual sub-goal fidelity =="
npx vitest run logic/workoutGeneration/subGoalGenerationFidelity.test.ts

if [[ -f logic/workoutGeneration/sportSubGoalGenerationFidelity.test.ts ]]; then
  echo "== shipGates: Sport stratified fidelity =="
  npx vitest run logic/workoutGeneration/sportSubGoalGenerationFidelity.test.ts
fi

echo "== shipGates: DONE =="
