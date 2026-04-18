# Workout intent (product scope)

**Audience:** autonomous agents and contributors who need a shared picture of who TodayFit is for and what “good” output means in this codebase.

This doc is the **canonical product intent** for workout generation and related exercise data. When research, logic, or enrichment work could go in more than one direction, align with this file unless a human run brief says otherwise.

---

## Who the app is for

- **Sport-focused athletes cross-training in the gym** — gym work supports their sport; the app is not only “general fitness.”
- **People who want less decision burden at the gym** — they do not want to show up and invent the session from scratch every time, and they are not necessarily following a huge, rigid external protocol.
- **People who already know a fair amount about training** — they are not complete beginners, but they want **more structure and fewer decisions** made for them (exercise selection, ordering, volume cues within reason).
- **People balancing multiple goals** — e.g. sport performance plus muscular or body-composition goals, or several priorities at once.
- **People managing real-world constraints** — including **injuries or nagging issues** alongside their goals, and **changing context** (different gyms, equipment, travel, schedule). The product should tolerate **variable inputs** without requiring a perfect static setup.

---

## Who the app is not for

- **Competitive powerlifting** or a primary focus on **maximizing specific competition lifts** (squat, bench, deadlift as sport) with meet-style progression.
- **Highly technical, coach-grade periodization** as the main experience — this is **not** positioned as a lab-style or elite technical training system.

---

## Implications for agents

- Prefer **practical, adaptable** prescriptions and exercise choices over **lift-specific peaking** or meet-prep framing.
- Favor **constraint-aware** behavior (equipment variance, injuries, mixed goals) over optimizing for a single abstract strength number on a fixed lift.
- Keep tone and complexity **accessible** — structured and evidence-informed where the codebase requires it, without presenting the product as a specialist technical coaching platform.
