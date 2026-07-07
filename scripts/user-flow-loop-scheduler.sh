#!/usr/bin/env bash
# Deep user-flow simulation loop — immediate tick 1 + every 10 minutes.
# Default: 18 ticks over 3 hours. Override: MAX_TICKS=6 INTERVAL_SEC=600 bash ...
# Emits AGENT_LOOP_TICK sentinel for agent wake notifications.

set -euo pipefail
INTERVAL_SEC="${INTERVAL_SEC:-600}"
MAX_TICKS="${MAX_TICKS:-18}"
PURPOSE="user_flow_output"
ARTIFACTS_DIR="${ARTIFACTS_DIR:-artifacts/user-flow-loop}"

mkdir -p "${ARTIFACTS_DIR}"
echo "$(date -Iseconds) Deep user-flow loop started: ${MAX_TICKS} ticks, ${INTERVAL_SEC}s interval (~$(( (MAX_TICKS - 1) * INTERVAL_SEC / 60 )) min)" >> "${ARTIFACTS_DIR}/scheduler.log"

run_tick() {
  local tick="$1"
  local loop_seed
  loop_seed=$(date +%s)
  printf 'AGENT_LOOP_TICK_%s {"prompt":"Run deep user flow simulation tick %s/%s: npx tsx scripts/deepUserFlowSimulation.ts %s","tick":%s,"maxTicks":%s,"seed":%s}\n' \
    "${PURPOSE}" "${tick}" "${MAX_TICKS}" "${loop_seed}" "${tick}" "${MAX_TICKS}" "${loop_seed}"
  echo "$(date -Iseconds) tick ${tick}/${MAX_TICKS} seed=${loop_seed}" >> "${ARTIFACTS_DIR}/scheduler.log"
}

run_tick 1

tick=2
while [ "${tick}" -le "${MAX_TICKS}" ]; do
  sleep "${INTERVAL_SEC}"
  run_tick "${tick}"
  tick=$((tick + 1))
done

printf 'AGENT_LOOP_DONE_%s {"message":"Deep user-flow loop complete after %s ticks"}\n' "${PURPOSE}" "${MAX_TICKS}"
echo "$(date -Iseconds) loop complete (${MAX_TICKS} ticks)" >> "${ARTIFACTS_DIR}/scheduler.log"
