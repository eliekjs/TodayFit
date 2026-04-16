-- Sport Mode: allow plans with no explicit performance goals (sport-only prep).
-- primary_goal_id may be null when the user did not select ranked goals.
ALTER TABLE public.user_training_plans
  ALTER COLUMN primary_goal_id DROP NOT NULL;
