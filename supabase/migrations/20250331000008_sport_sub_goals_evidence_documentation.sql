-- Sport sub-goals (sub-focus): evidence-based documentation (NSCA, ACSM, ExRx, NCSF).
-- See docs/research/sport-sub-goals-audit-2025.md. No data changes; comments only.

COMMENT ON TABLE public.sports_sub_focus IS 'Sub-goals per sport (e.g. Finger Strength for climbing, Uphill Endurance for backcountry). Canonical source: data/sportSubFocus/sportsWithSubFocuses.ts. See docs/research/sport-sub-goals-audit-2025.md.';
COMMENT ON TABLE public.sub_focus_tag_map IS 'Maps (sport, sub_focus) to exercise tag slugs and weight for generator biasing. Canonical source: data/sportSubFocus/subFocusTagMap.ts. See docs/research/sport-sub-goals-audit-2025.md.';
