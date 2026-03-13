# Decision log: [Topic or subsystem]

**Purpose:** Record significant decisions (design, tradeoffs, evidence choices) for autonomous improvement so future runs and humans can understand why something was done.

---

## Entry format (copy per decision)

**Date:** YYYY-MM-DD  
**Subsystem:** (e.g. superset pairing, weekly day naming)  
**Decision:** One-line summary.

**Context:** What was the situation or evidence?

**Options considered:**  
- Option A: …  
- Option B: …

**Decision:** Which option was chosen and why.

**Consequences:** What we accept (e.g. limitation, follow-up work).

**References:** Link to research note or PR if applicable.

---

## Example

**Date:** 2025-03-13  
**Subsystem:** Superset pairing  
**Decision:** Use pairing_category as primary for “no double grip”; fall back to fatigue_regions.

**Context:** Evidence and ontology both support “avoid pairing two grip-heavy exercises.” pairing_category has a canonical `grip` value; fatigue_regions include `forearms`.

**Options considered:**  
- A: Use only pairing_category (simpler; some exercises may lack it).  
- B: Use pairing_category and fatigue_regions (more coverage; possible overlap).

**Decision:** A for primary rule; add fallback to fatigue_regions when pairing_category is missing, so existing data still improves behavior.

**Consequences:** We may later backfill pairing_category for grip-heavy exercises to reduce reliance on fallback.

**References:** PR #…, docs/research/evidence-review-superset-pairing.md
