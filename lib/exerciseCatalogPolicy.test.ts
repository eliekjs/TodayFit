/**
 * Policy for when Supabase is treated as the production exercise source of truth.
 * Run: npx tsx lib/exerciseCatalogPolicy.test.ts
 */
import assert from "node:assert/strict";
import { isDbCatalogAuthoritative, minActiveExercisesForDbSourceOfTruth } from "./exerciseCatalogPolicy";

function run() {
  const min = minActiveExercisesForDbSourceOfTruth();
  assert.ok(min >= 1, "default minimum should be >= 1");

  assert.equal(isDbCatalogAuthoritative(min - 1), false);
  assert.equal(isDbCatalogAuthoritative(min), true);
  assert.equal(isDbCatalogAuthoritative(min + 100), true);

  console.log("exerciseCatalogPolicy.test.ts: all passed");
}

run();
