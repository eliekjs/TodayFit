# Product voice & auth copy

**Audience:** eng, product, agents writing user-facing strings (app UI, emails, modals, errors).  
**Derived from:** [WORKOUT_INTENT.md](./WORKOUT_INTENT.md), [USER_PERSONAS.md](./USER_PERSONAS.md), [PRODUCT_PRIORITIES.md](./PRODUCT_PRIORITIES.md).

When auth, onboarding, or account copy could sound like “generic SaaS” or “fitness influencer,” use this file.

---

## Who we’re talking to

TodayFit users are **athletic, thoughtful people** who already know a fair amount about training. They want **structure and fewer decisions** at the gym—not education lectures, meet-prep coaching, or bro-split hype.

Canonical reference: sport-focused athletes cross-training (P01–P04, P07, P10), multi-goal planners (P05–P06), habitual “train today” users (P09). They are **not** complete beginners (X02) and **not** looking for lab-grade periodization (X01 / rejected coach UX).

**Implication for tone:** speak like a competent training partner who respects their time—clear, calm, practical. Never talk down; never cheerlead.

---

## Voice principles

| Do | Don’t |
|----|--------|
| Direct, short sentences | Soft filler (“just,” “simply,” “easily”) |
| One action per message | Stacked instructions and jargon |
| Name **TodayFit** in emails | Name Supabase, SMTP, env vars, “backend” |
| Calm confidence | Hype (“Crush it!”, “Beast mode”, emoji walls) |
| Honest constraints (check spam once) | Apologetic walls or blame the user |
| Generic auth failures (security) | “No account with that email” on login |
| Peer to peer | Coach-as-authority or corporate support bot |

**Register:** adult, athletic, plain English. Closer to a good training log than a consumer wellness app.

**Product words:** gym, session, sport, goals, presets, equipment. Avoid: journey, unlock your potential, community, gamify.

---

## Auth-specific rules

1. **Errors map to product copy** — never show raw Supabase/API strings in the UI.
2. **Login failures stay generic** — “Email or password is incorrect.”
3. **Emails are from TodayFit** — From name `TodayFit`, not “Supabase Auth” (requires custom SMTP; see plan).
4. **Confirm / reset emails** — subject names TodayFit; body states what to do, what expires, ignore-if-not-you.
5. **Success copy is brief** — confirm what happened; one next step.
6. **Destructive actions** — plain stakes, no scare theater; a simple confirm dialog is enough.

---

## Canonical phrases (prefer these)

| Situation | Prefer |
|-----------|--------|
| Signup needs confirm | “We sent a confirmation link to {email}. Open it, then log in. If you don’t see it, check spam.” |
| Resend confirm | “Confirmation email sent again. Check inbox and spam, then log in.” |
| Email confirmed | “Email confirmed. Log in to continue.” |
| Login wrong creds | “Email or password is incorrect.” |
| Email not confirmed | “Confirm your email before logging in. Check inbox and spam, or resend the link.” |
| Account exists | “An account with this email already exists. Log in, or reset your password.” |
| Reset sent | “If an account exists for that email, we sent a reset code. Check inbox and spam.” |
| Bad / expired code | “That code is invalid or expired. Request a new one.” |
| Password updated | “Password updated. Log in with your new password.” |
| Sign out | Optional toast: “Signed out.” Redirect to login is enough. |
| Delete confirm | “This permanently deletes {email} and synced gyms, presets, and history. This cannot be undone.” |
| Delete success | Redirect to login; no victory lap. |
| Link broken | “That email link is invalid or expired. Request a new one, or log in if you already confirmed.” |
| Rate limit | “Too many attempts. Try again in a few minutes.” |
| Auth misconfigured (dev) | Prefer silent/guest-blocked; if shown: “Sign-in isn’t available in this build.” — never “Supabase env.” |

---

## Email shape (confirm + reset)

1. Subject: action + TodayFit (e.g. “Confirm your TodayFit email”).
2. Opening: one sentence why they got the mail.
3. Primary CTA or code (large, scannable).
4. Expiry / one-time note when relevant.
5. “If you didn’t create a TodayFit account / request this, ignore this email.”
6. No marketing footer in v1 auth mail.

---

## Alignment checklist (agents)

Before shipping auth or account copy:

- [ ] Sounds right for a sport-aware gym user who is not a beginner
- [ ] No vendor or infrastructure words in user-visible strings
- [ ] Login / signup errors go through the shared copy map
- [ ] Emails say TodayFit in subject and body; From name is TodayFit when SMTP is set
