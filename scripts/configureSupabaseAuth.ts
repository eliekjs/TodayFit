/**
 * Configure SeshLogic Auth settings on the hosted Supabase project via Management API:
 * - Email provider + confirm email required
 * - Site URL + redirect allowlist (password reset + welcome + hosted web origin)
 * - Confirm signup + Reset password email templates (reset includes {{ .Token }})
 *
 * Does NOT configure custom SMTP (needs your provider credentials in the dashboard).
 *
 * Auth: SUPABASE_ACCESS_TOKEN from https://supabase.com/dashboard/account/tokens
 * Optional: SUPABASE_PROJECT_REF (defaults to todayfit production ref)
 * Optional: PUBLIC_APP_ORIGIN or EXPO_PUBLIC_APP_ORIGIN (https://your-domain)
 *
 * Usage: SUPABASE_ACCESS_TOKEN=sbp_… npx tsx scripts/configureSupabaseAuth.ts
 */
import {
  buildAuthRedirectAllowlist,
  resolvePilotWebOriginFromEnv,
} from "../lib/authRedirectAllowlist";
import { loadDotEnvFromRepoRoot } from "./dotenvLocal";

loadDotEnvFromRepoRoot();

const PROJECT_REF =
  (process.env.SUPABASE_PROJECT_REF ?? "zwbrgxhehaufkypeiewh").trim();
const WEB_ORIGIN = resolvePilotWebOriginFromEnv();

const CONFIRM_SUBJECT = "Confirm your SeshLogic email";
const CONFIRM_HTML = `<h2>Confirm your SeshLogic email</h2>
<p>Thanks for signing up. Confirm your email, then open SeshLogic and log in.</p>
<p><a href="{{ .ConfirmationURL }}">Confirm email address</a></p>
<p>If you didn't create a SeshLogic account, you can ignore this email.</p>`;

const RECOVERY_SUBJECT = "Reset your SeshLogic password";
const RECOVERY_HTML = `<h2>Reset your SeshLogic password</h2>
<p>Enter this code in the app:</p>
<p style="font-size:24px;font-weight:bold;letter-spacing:4px;">{{ .Token }}</p>
<p>This code expires soon. If you didn't request it, ignore this email.</p>
<p><a href="{{ .ConfirmationURL }}">Or open the reset link</a></p>`;

/** Comma-separated allowlist; wildcards supported by Supabase Auth. */
const REDIRECT_ALLOWLIST = buildAuthRedirectAllowlist(WEB_ORIGIN).join(",");

async function main() {
  const token = (process.env.SUPABASE_ACCESS_TOKEN ?? "").trim();
  if (!token) {
    console.error(
      "Missing SUPABASE_ACCESS_TOKEN.\n" +
        "Create one at https://supabase.com/dashboard/account/tokens\n" +
        "Then: SUPABASE_ACCESS_TOKEN=sbp_… npx tsx scripts/configureSupabaseAuth.ts"
    );
    process.exit(1);
  }

  const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`;
  const body = {
    // Email / password
    external_email_enabled: true,
    mailer_autoconfirm: false, // Confirm email ON (users must verify before login)
    password_min_length: 6,

    // URL config — hosted web origin when set; native deep links stay on the allowlist
    site_url: WEB_ORIGIN ?? "todayfit://welcome",
    uri_allow_list: REDIRECT_ALLOWLIST,

    // Email templates
    mailer_subjects_confirmation: CONFIRM_SUBJECT,
    mailer_templates_confirmation_content: CONFIRM_HTML,
    mailer_subjects_recovery: RECOVERY_SUBJECT,
    mailer_templates_recovery_content: RECOVERY_HTML,
  };

  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Auth config PATCH failed (${res.status}):\n${text}`);
    process.exit(1);
  }

  const config = (await res.json()) as Record<string, unknown>;
  const summary = {
    site_url: config.site_url,
    mailer_autoconfirm: config.mailer_autoconfirm,
    external_email_enabled: config.external_email_enabled,
    password_min_length: config.password_min_length,
    uri_allow_list: config.uri_allow_list,
    mailer_subjects_confirmation: config.mailer_subjects_confirmation,
    mailer_subjects_recovery: config.mailer_subjects_recovery,
    recovery_includes_token: String(
      config.mailer_templates_recovery_content ?? ""
    ).includes("{{ .Token }}"),
  };
  console.log("Applied Auth config for project", PROJECT_REF);
  console.log(JSON.stringify(summary, null, 2));
  console.log(
    "\nStill manual (needs your SMTP provider credentials):\n" +
      "  Dashboard → Authentication → Emails → SMTP Settings"
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
