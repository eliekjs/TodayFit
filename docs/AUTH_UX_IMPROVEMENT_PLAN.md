# Auth UX improvement plan

**Status:** In progress  
**Voice source of truth:** [PRODUCT_VOICE.md](./PRODUCT_VOICE.md)  
**Related:** [PASSWORD_RESET_SETUP.md](./PASSWORD_RESET_SETUP.md), [PRIVACY_AND_DELETION.md](./PRIVACY_AND_DELETION.md), [PILOT_WEB_AND_SECURITY.md](./PILOT_WEB_AND_SECURITY.md)

Implements the post-audit auth polish: branded email sending, productized errors, stronger templates, and in-app copy aligned to product voice.

---

## Goals

1. Users never see “Supabase Auth” or raw API errors as the product voice.
2. Confirm + reset emails look and sound like SeshLogic.
3. Login / signup / reset / delete copy matches [PRODUCT_VOICE.md](./PRODUCT_VOICE.md).
4. Custom SMTP + verified domain for production deliverability (human ops).

---

## Ownership split

### You (Ellie) — required for email branding & deliverability

Do these in order. Until SMTP is live, confirm/reset mail may still show a Supabase-ish From address even if subjects/bodies say SeshLogic. Full DNS + hosting steps: [PILOT_WEB_AND_SECURITY.md](./PILOT_WEB_AND_SECURITY.md).

#### 1. Pick a sending domain

- Prefer a domain you control (the one just registered for R4).
- Subdomain for mail is fine: `mail.yourdomain.com`.

#### 2. Create a transactional email account

Pick one:

| Provider | Notes |
|----------|--------|
| **Resend** (recommended) | Simple; good docs with Supabase |
| **Postmark** | Excellent deliverability |
| **SendGrid** | Fine; more UI to navigate |

Create an API key / SMTP credentials. You need:

- SMTP host  
- Port (usually `465` SSL or `587` STARTTLS)  
- Username  
- Password / API key  
- From email, e.g. `noreply@mail.yourdomain.com`  
- From name: **`SeshLogic`**

#### 3. Verify the domain at the provider

In Resend/Postmark/SendGrid:

1. Add your domain.
2. Add the DNS records they show (SPF, DKIM, sometimes DMARC).
3. Wait until status is **Verified**.

Without this, mail stays untrusted and may look like spam.

#### 4. Wire SMTP in Supabase

1. Open [Supabase Dashboard](https://supabase.com/dashboard/project/zwbrgxhehaufkypeiewh) → project **todayfit**.
2. **Authentication** → **Emails** → **SMTP Settings** (or **Custom SMTP**).
3. Enable custom SMTP and enter:

| Field | Value |
|-------|--------|
| Sender email | `noreply@…` (verified address) |
| Sender name | `SeshLogic` |
| Host / port / user / pass | From your provider |

4. Save.
5. Send a test: sign up with a fresh email you control; confirm From shows **SeshLogic**, not Supabase Auth.

#### 5. Smoke-test after agent copy/template work

With a real inbox (check spam once):

1. **Sign up** → confirm email → log in.  
2. **Wrong password** → see productized error (not raw Supabase).  
3. **Forgot password** → 6-digit code → new password → log in.  
4. **Resend confirmation** (unconfirmed account).  
5. **Delete account** → confirm dialog → cannot log in with that email.

#### 6. Optional later

- Raise password min length in Supabase Auth to match app (if we move to 8+).  
- Add DMARC policy once SPF/DKIM are stable.  
- Rotate any access tokens used for Management API scripts.

---

### Agent / eng — app + templates + copy system

| # | Work | Files / surface |
|---|------|-----------------|
| A | Add shared auth copy map (voice-aligned) | `lib/authCopy.ts` (+ tests) |
| B | Route AuthContext errors through the map | `context/AuthContext.tsx` |
| C | Update welcome / forgot-password / delete modal strings | `app/welcome.tsx`, `app/auth/forgot-password.tsx`, `components/DeleteAccountConfirmModal.tsx`, profiles |
| D | Refresh confirm + reset HTML templates (TodayFit voice) | `scripts/configureSupabaseAuth.ts` + re-apply with token **or** dashboard paste |
| E | Document SMTP + template ops | This file + short note in `PASSWORD_RESET_SETUP.md` |
| F | Hide/dev-tone “Supabase env” user strings | welcome + auth screens |
| G | Brief sign-out feedback (optional toast/inline) | profiles |

**Out of scope for this plan:** OAuth, multi-step product onboarding, changing login-required gate.

---

## Implementation phases

### Phase 1 — Voice + copy system (app)

1. Land [PRODUCT_VOICE.md](./PRODUCT_VOICE.md) (done with this plan).  
2. Add `lib/authCopy.ts` with canonical strings + `mapAuthError(message, context)`.  
3. Wire AuthContext + screens.  
4. Vitest for error mapping (wrong password, not confirmed, already registered, rate limit).

### Phase 2 — Email templates

1. Update confirm + recovery HTML in `configureSupabaseAuth.ts` to voice checklist.  
2. Re-apply via Management API when a short-lived `SUPABASE_ACCESS_TOKEN` is available, **or** Ellie pastes templates in Dashboard → Authentication → Email Templates.  
3. Keep `{{ .Token }}` in reset template (required for in-app code step).

### Phase 3 — SMTP (Ellie)

Follow **You (Ellie)** steps 1–5 above. Agent cannot complete From-name branding without your provider credentials.

### Phase 4 — QA

- Checklist in Ellie’s smoke-test §5.  
- Update `docs/qa/ui-flow-pass-checklist.md` auth rows if guest copy is still referenced.

---

## Success criteria

| Check | Passes when |
|-------|-------------|
| From name | Inbox shows **SeshLogic** (after SMTP) |
| Subjects | “Confirm your SeshLogic email” / “Reset your SeshLogic password” |
| Login error | Never raw “Invalid login credentials” |
| Confirm UX | Personalized email + resend; voice-aligned |
| Reset UX | Code path works; anti-enumeration copy kept |
| Delete | Confirm dialog; Auth user gone |
| No vendor leak | No “Supabase” in production user strings |

---

## Rollback

- App copy: revert `lib/authCopy.ts` + call sites.  
- Templates: re-apply previous HTML via dashboard or script.  
- SMTP: disable custom SMTP in dashboard to return to built-in mail (From reverts to Supabase).
