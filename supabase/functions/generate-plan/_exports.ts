// Test-harness re-exports. Not imported by index.ts and therefore has zero
// effect on the deployed edge function runtime (serve() in index.ts is the
// only entrypoint invoked by Supabase). Kept as a sibling so the production
// entry file has no test-scaffolding residue.
export {
  generateWorkout,
  buildMealPlan,
  EXERCISE_POOL,
  pickSessionOrder,
  MEAL_FOOD_DB,
  MEAL_DIST,
  MEAL_TIMES_NORMAL,
  MEAL_TIMES_IF,
  MEAL_NAME_KEYS,
  MEAL_NAME_KEYS_IF,
  pickQty,
  pickRotated,
  normalizeGoal,
  calculateMacros,
} from "./index.ts";