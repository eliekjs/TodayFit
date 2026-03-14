/**
 * Testing agent: user-input scenarios by focus area, decision reports, and assertions.
 * Run: npx tsx logic/workoutGeneration/testingAgent/runFocusTests.ts [focusId...] [--describe] [--list]
 */

export {
  buildDecisionReport,
  buildInputSummary,
  buildConstraintsSummary,
  buildSessionSummary,
  buildValidationSummary,
  formatDecisionReport,
} from "./decisionReport";
export type {
  DecisionReport,
  InputSummary,
  ConstraintsSummary,
  SessionSummary,
  ValidationSummary,
  ScoringSampleEntry,
} from "./decisionReport";

export {
  FOCUS_AREAS,
  getFocusArea,
  getScenarioInputsForFocus,
} from "./focusAreas";
export type { FocusAreaId, FocusArea, Scenario, ExpectedDecision } from "./focusAreas";

export { runFocusArea, runAll } from "./runFocusTests";
export type { RunOptions } from "./runFocusTests";
