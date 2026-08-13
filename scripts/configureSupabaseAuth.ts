/**
 * Configure TodayFit Auth settings on the hosted Supabase project via Management API:
 * - Email provider + confirm email required
 * - Site URL + redirect allowlist (password reset + welcome)
 * - Confirm signup + Reset password email templates (reset includes {{ .Token }})
 *
 * Does NOT configure custom SMTP (needs your provider credentials in the dashboard).
 *
 * Auth: SUPABASE_ACCESS_TOKEN from https://supabase.com/dashboard/account/tokens
 * Optional: SUPABASE_PROJECT_REF (defaults to todayfit production ref)
 *
 * Usage: SUPABASE_ACCESS_TOKEN=sbp_… npx tsx scripts/configureSupabaseAuth.ts
 */
import { loadDotEnvFromRepoRoot } from "./dotenvLocal";

loadDotEnvFromRepoRoot();

const PROJECT_REF =
  (process.env.SUPABASE_PROJECT_REF ?? "zwbrgxhehaufkypeiewh").trim();

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
const REDIRECT_ALLOWLIST = [
  "todayfit://**",
  "todayfit://auth/reset-password",
  "todayfit://welcome",
  "exp://**/--/auth/reset-password",
  "exp://**/--/welcome",
  "http://localhost:8081/**",
  "http://127.0.0.1:8081/**",
  "http://localhost:19006/**",
  "http://127.0.0.1:19006/**",
].join(",");

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

    // URL config — mobile deep links + local Expo web
    site_url: "todayfit://welcome",
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
