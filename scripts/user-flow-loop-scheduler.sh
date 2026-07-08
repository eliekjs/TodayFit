#!/usr/bin/env bash
# Deep user-flow loop: detect → fix queue → agent implements → verify.
# Default: 18 ticks / 3 hours / 10 min interval.
# Each tick runs simulation; if issues found, emits agent wake to IMPLEMENT fix.

set -euo pipefail
INTERVAL_SEC="${INTERVAL_SEC:-600}"
MAX_TICKS="${MAX_TICKS:-18}"
PURPOSE="user_flow_output"
ARTIFACTS_DIR="${ARTIFACTS_DIR:-artifacts/deep-user-flow}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

mkdir -p "${REPO_ROOT}/${ARTIFACTS_DIR}"
LOG="${REPO_ROOT}/artifacts/user-flow-loop/scheduler.log"
mkdir -p "$(dirname "${LOG}")"

cd "${REPO_ROOT}"

echo "$(date -Iseconds) Deep fix loop started: ${MAX_TICKS} ticks, ${INTERVAL_SEC}s interval" >> "${LOG}"

run_tick() {
  local tick="$1"
  local loop_seed
  loop_seed=$(date +%s)
  echo "$(date -Iseconds) tick ${tick}/${MAX_TICKS} seed=${loop_seed} — running detect+fix-top" >> "${LOG}"

  set +e
  local out
  out=$(npx tsx scripts/deepUserFlowLoop.ts "${loop_seed}" --tick="${tick}" --max-ticks="${MAX_TICKS}" --fix-top --pressure --seeds=48 2>&1)
  local exit_code=$?
  set -e

  echo "${out}" >> "${LOG}"

  if [ "${exit_code}" -eq 2 ]; then
    printf 'AGENT_LOOP_TICK_%s {"prompt":"Pressure loop tick %s/%s found failures. Read artifacts/deep-user-flow/fix-queue.json — IMPLEMENT top fix, then verify: npx tsx scripts/deepUserFlowLoop.ts %s --pressure --verify --fix-top --seeds=48","tick":%s,"maxTicks":%s,"seed":%s,"needsFix":true}\n' \
      "${PURPOSE}" "${tick}" "${MAX_TICKS}" "${loop_seed}" "${tick}" "${MAX_TICKS}" "${loop_seed}"
    echo "$(date -Iseconds) tick ${tick} NEEDS FIX — agent wake emitted" >> "${LOG}"
  elif [ "${exit_code}" -eq 0 ]; then
    printf 'AGENT_LOOP_TICK_%s {"prompt":"Deep loop tick %s/%s all scenarios passed — no fix needed. Optional: npx tsx scripts/deepUserFlowLoop.ts %s --tick=%s --max-ticks=%s","tick":%s,"maxTicks":%s,"seed":%s,"needsFix":false}\n' \
      "${PURPOSE}" "${tick}" "${MAX_TICKS}" "${loop_seed}" "${tick}" "${MAX_TICKS}" "${tick}" "${MAX_TICKS}" "${loop_seed}"
    echo "$(date -Iseconds) tick ${tick} all pass" >> "${LOG}"
  else
    echo "$(date -Iseconds) tick ${tick} ERROR exit=${exit_code}" >> "${LOG}"
  fi
}

run_tick 1

tick=2
while [ "${tick}" -le "${MAX_TICKS}" ]; do
  sleep "${INTERVAL_SEC}"
  run_tick "${tick}"
  tick=$((tick + 1))
done

printf 'AGENT_LOOP_DONE_%s {"message":"Deep fix loop complete after %s ticks"}\n' "${PURPOSE}" "${MAX_TICKS}"
echo "$(date -Iseconds) loop complete (${MAX_TICKS} ticks)" >> "${LOG}"
