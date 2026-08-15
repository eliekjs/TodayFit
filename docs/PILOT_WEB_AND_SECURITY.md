# Pilot web hosting & security

**Status:** Active — domain purchased (R4); hostname still needed from Ellie.  
**Related:** [PILOT_LAUNCH_PLAN.md](./PILOT_LAUNCH_PLAN.md), [AUTH_UX_IMPROVEMENT_PLAN.md](./AUTH_UX_IMPROVEMENT_PLAN.md), [PRIVACY_AND_DELETION.md](./PRIVACY_AND_DELETION.md), [PILOT_TESTER_PRIVACY.md](./PILOT_TESTER_PRIVACY.md)

This is the closed-pilot setup for putting SeshLogic on the domain you just bought, without making the generator a public download.

---

## Honest limit (read this first)

SeshLogic is an Expo app: the workout generator, scoring, and catalog client all ship as **JavaScript in the browser**. Login in the app (already required — see `AuthGate` in `app/_layout.tsx`) stops strangers from *using* it. It does **not** hide the code from anyone who can load the page.

So “nobody steals it” for a closed pilot means:

1. **Strangers never get the page** (Cloudflare Access in front of the site).
2. **The GitHub repo is private** (source + history stay off the public internet).
3. **Only invited testers have accounts** (Supabase invite / confirm-email; you control who knows the URL).
4. **User data is isolated** (RLS — already in the ship bar). That protects testers’ gyms and history, not the algorithm.

Anyone you invite *can* still open DevTools. Invite people you trust. Do not put this URL on social media or in public SEO.

Moving generation to a server (so the algorithm never ships to the client) is a post-pilot architecture change, not this setup.

---

## What was already planned

| Pilot item | How this doc closes it |
|------------|------------------------|
| **R4** Pick + register domain | You did this. Remaining: tell eng the hostname and point DNS. |
| **2.6** Custom SMTP + verified sending domain | Same domain (or `mail.` subdomain) at Resend → Supabase SMTP. |
| **2.8** Password-reset redirect allowlist | Set `PUBLIC_APP_ORIGIN` and re-run `configureSupabaseAuth.ts`. |
| **D5 / D6** Platforms + distribution | **Proposal:** invite-gated **web on your domain** as the primary tester path; **iOS / TestFlight later** for Sign in with Apple (2.10). |
| **D7** Guest entry | Already gone from Welcome; `AuthGate` requires a session. Treat as **hide guest**. |
| **6.1** Testers can actually open a build | Cloudflare Pages + Access + custom domain. |
| **6.6** Private privacy note | [PILOT_TESTER_PRIVACY.md](./PILOT_TESTER_PRIVACY.md) |

Apple sign-in still needs a native iOS build. Email/password on the web is enough for the 6–12 person pilot.

---

## Recommended stack

| Layer | Choice | Why |
|-------|--------|-----|
| Host | **Cloudflare Pages** | Free HTTPS + custom domain; `public/_headers` and `_redirects` already in the repo. |
| Gate | **Cloudflare Access** (Zero Trust, free ≤50 users) | Testers get an email pin *before any JS loads*. |
| DNS | Domain nameservers → Cloudflare | App + mail records in one place. |
| Mail | **Resend** → Supabase custom SMTP | R4 / 2.6; From: **SeshLogic**. |
| Auth | Existing Supabase project; confirm email ON | Do not enable a second “pilot” project until D8 is decided. |
| Repo | **GitHub private** | See below. |

EAS Hosting + custom domain is a paid Expo feature. Skip it for the closed pilot unless you already want EAS for TestFlight.

---

## Should GitHub be private?

**Yes. Make `eliekjs/TodayFit` private before the site is public-DNS, ideally today.**

`package.json` `"private": true` only blocks npm publish. It does **not** hide the GitHub repo.

A public repo is a full copy of the generator, ontology, catalog scripts, and research notes. For a closed commercial pilot that is the actual leak.

How:

1. GitHub → **TodayFit** → **Settings** → **Danger Zone** → **Change visibility** → **Private**.
2. Confirm CI still runs (GitHub Actions works on private repos on the free plan).
3. If anyone else needs access later, add them as a collaborator — do not switch back to public.

If the repo was ever public, copies may already exist. Going private still stops new clones and search-index refresh.

---

## Security setup (layers)

### A. Source

- GitHub **private**.
- Never commit `.env`, `SUPABASE_SERVICE_ROLE_KEY`, SMTP passwords, or `SUPABASE_ACCESS_TOKEN`.
- Client may only contain `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY` (anon key is designed to be public; RLS is the control).

### B. Edge (the important one for “don’t steal the app”)

1. Cloudflare Pages serves the static export.
2. **Cloudflare Zero Trust → Access → Application** wrapping the Pages hostname.
3. Policy: **Allow** emails (or a `@yourdomain.com` list, or a one-time pin to each tester email).
4. Uninvited visitors see Cloudflare’s login, not SeshLogic.

### C. App auth

- Sign-in required (`AuthGate`).
- Confirm email required (`mailer_autoconfirm: false`).
- Optional extra: Dashboard → Authentication → Providers → Email → **Disable new signups** and invite testers from the dashboard. Use this if you want zero public registration even after Access.

### D. Data

- RLS on user tables (Phase 3 / `scripts/verifyRlsIsolation.ts`).
- Apply `delete_own_account` (2.9) before testers create real accounts.
- Rotate any Management API tokens used for scripts (3.5).

### E. Discoverability

- `public/robots.txt` disallows all crawlers.
- `X-Robots-Tag: noindex` on hosted responses.
- `<meta name="robots" content="noindex, nofollow">` in the web shell.
- Do not submit the URL to search consoles.

---

## Ellie checklist (you; ~45 minutes once DNS is in Cloudflare)

Tell the agent the **exact hostname** you want for the app (apex `seshlogic.com` vs `app.seshlogic.com`). Then:

### 1. Cloudflare account + nameservers

1. Create a Cloudflare account and **Add site** = your domain (free plan is enough).
2. At your registrar, switch nameservers to the two Cloudflare nameservers they show.
3. Wait until the domain shows **Active**.

### 2. Pages project

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → connect GitHub (`eliekjs/TodayFit`, private is fine).
2. Build settings:

   | Field | Value |
   |-------|--------|
   | Build command | `npm run web:export` (raises Node heap; `npx expo export --platform web` OOMs this bundle) |
   | Build output directory | `dist` |
   | Root | `/` (repo root) |
   | Node version | `22` |

3. Environment variables on the Pages project (Production):

   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - `EXPO_PUBLIC_APP_ORIGIN` = `https://YOUR_DOMAIN` (no trailing slash)

4. First deploy. You’ll get a `*.pages.dev` URL — **do not share it**. Add Access to that hostname too, or unpublish it after the custom domain works.

### 3. Custom domain

Pages → **Custom domains** → add `YOUR_DOMAIN` (and `www` if you want it to redirect). Cloudflare will create the DNS records.

### 4. Cloudflare Access

1. [Zero Trust](https://one.dash.cloudflare.com/) → **Access** → **Applications** → **Add**.
2. Type: **Self-hosted**. Domain: your Pages custom domain (and `*.pages.dev` if that URL still exists).
3. Policy: **Allow** → include each tester email (One-time PIN).
4. Add your own email first and confirm you can get through.

### 5. Mail (2.6)

1. Create a [Resend](https://resend.com) account.
2. Add the domain (or `mail.YOUR_DOMAIN`). Paste SPF / DKIM / (optional) DMARC into Cloudflare DNS. Wait until **Verified**.
3. Supabase → project **todayfit** → **Authentication** → **Emails** → **SMTP**:

   | Field | Value |
   |-------|--------|
   | Sender email | `noreply@YOUR_DOMAIN` (or `noreply@mail.YOUR_DOMAIN`) |
   | Sender name | `SeshLogic` |
   | Host | `smtp.resend.com` |
   | Port | `465` |
   | Username | `resend` |
   | Password | Resend API key |

4. Sign up with a throwaway inbox; From should say **SeshLogic**, not Supabase.

### 6. Auth redirects (2.8)

In `.env` (local, never commit):

```
PUBLIC_APP_ORIGIN=https://YOUR_DOMAIN
```

Then:

```bash
SUPABASE_ACCESS_TOKEN=sbp_… npx tsx scripts/configureSupabaseAuth.ts
```

Or paste `https://YOUR_DOMAIN` and `https://YOUR_DOMAIN/**` into Dashboard → Authentication → URL Configuration → Redirect URLs, and set Site URL to `https://YOUR_DOMAIN`.

### 7. Smoke

1. Incognito, no Access login → blocked at Cloudflare.
2. After Access, Welcome loads; signup → confirm email → log in → generate a day.
3. Forgot password → code in inbox → new password → log in.
4. Profile → Delete account (after 2.9 is applied).

---

## Local / repo commands (already wired)

```bash
npm run web:export          # production static files → dist/
npx expo serve dist         # preview the export locally
```

Web output is `single` (one `index.html`) so history and saved-workout IDs still work on refresh behind `public/_redirects`.

---

## What not to do

- Do not make the GitHub repo public “for easier deploys.” Cloudflare and Actions work with private repos.
- Do not put the `service_role` key in Pages env as `EXPO_PUBLIC_*`.
- Do not skip Access and rely on “testers won’t guess the URL.”
- Do not index a privacy-policy page on this same host until you want a public marketing site (pilot 6.6 is a private note, not store-grade hosting).
