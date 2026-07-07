#!/usr/bin/env bash
# Persona simulation loop: 6 ticks over 1 hour (immediate + every 10 minutes).
# Emits AGENT_LOOP_TICK sentinel for agent wake notifications.

set -euo pipefail
INTERVAL_SEC=600
MAX_TICKS=6
PURPOSE="persona_sim"

echo "Persona loop scheduler started: ${MAX_TICKS} ticks, ${INTERVAL_SEC}s interval"

for tick in 2 3 4 5 6; do
  sleep "${INTERVAL_SEC}"
  LOOP_SEED=$(date +%s)
  printf 'AGENT_LOOP_TICK_%s {"prompt":"Run persona loop tick %s/%s: npx tsx scripts/personaLoopSimulation.ts %s --tick=%s --max-ticks=%s","tick":%s,"maxTicks":%s,"seed":%s}\n' \
    "${PURPOSE}" "${tick}" "${MAX_TICKS}" "${LOOP_SEED}" "${tick}" "${MAX_TICKS}" "${tick}" "${MAX_TICKS}" "${LOOP_SEED}"
done

printf 'AGENT_LOOP_DONE_%s {"message":"Persona loop complete after 1 hour"}\n' "${PURPOSE}"
