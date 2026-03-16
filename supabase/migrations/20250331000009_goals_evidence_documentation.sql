-- Goals catalog: evidence-based documentation (NSCA, ACSM, ExRx, NCSF, Schoenfeld).
-- See docs/research/goals-audit-2025.md. No data changes; comments only.

COMMENT ON TABLE public.goals IS 'Goal catalog (slug, name, goal_type: sport|performance|physique|mobility|rehab). Seed: strength, muscle, endurance, conditioning, mobility, climbing, trail_running, ski, physique, resilience. Evidence: docs/research/goals-audit-2025.md';
COMMENT ON TABLE public.goal_demand_profile IS 'Relative weights (0-3) per goal for strength, power, aerobic, anaerobic, mobility, prehab, recovery; used for target vector and quality alignment. Evidence: docs/research/goals-audit-2025.md';
COMMENT ON TABLE public.goal_tag_profile IS 'Maps each goal_slug to tag_slugs for exercise scoring (get_exercises_by_goals_ranked). Evidence: docs/research/goals-audit-2025.md';
COMMENT ON TABLE public.goal_sub_focus IS 'Sub-focus options per goal (Manual mode). Canonical source: data/goalSubFocus/goalSubFocusOptions.ts. Evidence: docs/research/goals-audit-2025.md';
COMMENT ON TABLE public.goal_sub_focus_tag_map IS 'Maps goal sub-focus to exercise tags for workout generator biasing. Canonical source: data/goalSubFocus/goalSubFocusTagMap.ts. Evidence: docs/research/goals-audit-2025.md';
