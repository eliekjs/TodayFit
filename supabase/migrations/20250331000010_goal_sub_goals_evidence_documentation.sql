-- Goal sub-goals (goal sub-focus): evidence-based documentation (NSCA, ACSM, ExRx, NCSF).
-- See docs/research/goal-sub-goals-audit-2025.md. No data changes; comments only.
-- Parent goals catalog: docs/research/goals-audit-2025.md.

COMMENT ON TABLE public.goal_sub_focus IS 'Sub-focus options per goal (Manual mode sub-goals). Canonical source: data/goalSubFocus/goalSubFocusOptions.ts. Evidence: docs/research/goal-sub-goals-audit-2025.md.';
COMMENT ON TABLE public.goal_sub_focus_tag_map IS 'Maps (goal_slug, sub_focus_slug) to exercise tag slugs and weight for generator biasing. Canonical source: data/goalSubFocus/goalSubFocusTagMap.ts. Evidence: docs/research/goal-sub-goals-audit-2025.md.';
