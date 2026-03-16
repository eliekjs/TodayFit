# Conditioning: intervals for rower / assault bike / ski erg

**Date:** 2025-03  
**Subsystem:** Conditioning block (prescription + dailyGenerator).

## Problem

Prescribing 20–30+ minutes straight on a rower, assault bike, or ski erg is mentally and physically demanding and often leads to poor adherence. Users and coaches commonly use intervals for these modalities.

## Evidence

- **Interval vs steady-state (general):** HIIT and interval rowing deliver comparable or superior aerobic benefits in less time; intervals are more time-efficient and can improve adherence (Concept2, British Rowing, rowingmachinepro.com, Marathon Handbook). Zone 2 is often described as continuous 20–30 min, but splitting into 3–4 chunks with short rest (e.g. 1 min) still supports aerobic base and is more manageable on ergs.
- **Rower/erg specifically:** Interval sessions (e.g. 4×6 min, 5×5 min with 1 min rest) are standard in rowing and indoor cycling programming; 30 min continuous on an erg is less common than interval formats.
- **Goals:** For endurance, 3–4 longer work intervals (e.g. 5–8 min) preserve Zone 2 benefit; for body recomp / general fitness, shorter work intervals (4–5 min) with 1 min rest are time-efficient and align with HIIT research.

## Change

- **`lib/generation/prescriptionRules.ts`:** Added `getConditioningIntervalStructure(totalMinutes, goal, equipmentRequired)`. When equipment includes rower, assault_bike, ski_erg, or bike and total conditioning is ≥20 min, returns interval structure: 3–6 rounds, work 3–10 min per round, 60 s rest. Otherwise returns a single continuous block.
- **`logic/workoutGeneration/dailyGenerator.ts`:** Conditioning block (endurance path and main flow) now uses this structure: `sets`, `time_seconds`, `rest_seconds`, and `format` ("circuit" when intervals) so the prescription shows e.g. "4 × 6 min, rest 60 s" instead of "1 × 30 min".
- Treadmill and other non-erg equipment are unchanged (can still be one continuous block when desired).

## Result

- Rower, assault bike, ski erg (and bike) with 20+ min conditioning → intervals (e.g. 4×6 min + 1 min rest).
- Treadmill or conditioning &lt; 20 min → unchanged (single block when applicable).
