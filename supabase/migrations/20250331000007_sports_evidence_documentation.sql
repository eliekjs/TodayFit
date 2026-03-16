-- Sports: evidence-based documentation (NSCA, ACSM, ExRx, NCSF).
-- See docs/research/sports-audit-2025.md. No data changes; comments only.

COMMENT ON TABLE public.sports IS 'Canonical sport catalog for Sport Prep mode. Category, description, popularity_tier. Quality relevance in sport_quality_map. See docs/research/sports-audit-2025.md.';
COMMENT ON TABLE public.sport_qualities IS 'Physical qualities: speed_agility, power, conditioning, durability_resilience. Used in sport_quality_map (relevance 1=high, 2=medium, 3=low). See docs/research/sports-audit-2025.md.';
COMMENT ON TABLE public.sport_quality_map IS 'Sport–quality relevance (1=high, 2=medium, 3=low). Drives target vector and exercise ranking for sport prep. See docs/research/sports-audit-2025.md.';
