# Source ranking for exercise science research

When the workout-logic-research-integration agent researches evidence, it should prefer sources in the following order. Use this to prioritize and to cite appropriately in research notes.

---

## Tier 1 — Highest weight

- **Systematic reviews and meta-analyses** (e.g. Cochrane, sport-specific systematic reviews in peer-reviewed journals).
- **Consensus statements and position stands** from:
  - ACSM (American College of Sports Medicine)
  - NSCA (National Strength and Conditioning Association)
  - ISSN (International Society of Sports Nutrition, for nutrition-related training context)
  - Other recognized bodies (e.g. BASES, UKSCA) where relevant.
- **Peer-reviewed journals** with a clear methods section (e.g. *Journal of Strength and Conditioning Research*, *Medicine & Science in Sports & Exercise*, *Sports Medicine*, *British Journal of Sports Medicine*).

Use Tier 1 for **high-confidence rules** that get implemented as code.

---

## Tier 2 — Good supporting evidence

- **Guidelines and recommendations** from national or international sports or health bodies (even when not full consensus statements).
- **Well-cited textbooks** (e.g. *Essentials of Strength Training and Conditioning*, *Science of Lifting*) for established principles (periodization, rep ranges, recovery).
- **Peer-reviewed single studies** with clear population, intervention, and outcomes — especially when they align with Tier 1.

Use Tier 2 to support **context-dependent heuristics** and to document rationale.

---

## Tier 3 — Context and nuance only

- **Expert blogs or articles** by recognized practitioners or researchers, when they cite Tier 1/2.
- **Practitioner summaries** (e.g. “what the research says” roundups) that link to primary sources.

Do **not** use Tier 3 alone for high-confidence rules. Use for speculative ideas or to note disagreement in the field.

---

## Avoid

- Blog posts or social media with no citations.
- Commercial or product-driven “studies” without independent peer review.
- Single anecdotes or “bro science” as sole evidence.

---

## In research notes

When writing a research note in `/docs/research/`, tag each finding with the tier of the best source (e.g. “Tier 1: ACSM position stand”) and link to the source. Prefer DOI or stable URL.
