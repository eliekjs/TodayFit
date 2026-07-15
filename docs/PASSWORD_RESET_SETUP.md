# Password reset (email code flow)

Supabase **sends** reset emails. You do **not** need your own mail server for development.
For production deliverability, connect custom SMTP (Resend, SendGrid, Postmark, etc.) under
**Authentication → Emails → SMTP Settings**.

## App flow

1. Welcome → **Forgot password?** → `/auth/forgot-password`
2. Enter email → **Email me a code** (`resetPasswordForEmail`)
3. Enter 6-digit code → **Verify code** (`verifyOtp` type `recovery`)
4. Choose new password → sign out → back to Welcome login

## Critical: show the code in the email template

By default Supabase’s “Reset Password” email is mostly a **link**. For the in-app code step to work, the template must include the OTP token.

1. Supabase Dashboard → **Authentication** → **Email Templates**
2. Select **Reset Password**
3. Put the code prominently in the body, for example:

```html
<h2>Reset your TodayFit password</h2>
<p>Enter this code in the app:</p>
<p style="font-size:24px;font-weight:bold;letter-spacing:4px;">{{ .Token }}</p>
<p>This code expires soon. If you didn’t request it, ignore this email.</p>
```

You can leave `{{ .ConfirmationURL }}` as a fallback link; the app prefers the code path.

4. **Save**

## Why you might not get the email

- Default Supabase mail often lands in **Spam** / **Promotions**
- Rate limits (especially on free/built-in SMTP)
- Wrong recipient email, or account doesn’t exist (app still shows a generic “if an account exists…” message for security)
- Auth email sending disabled for that project

Check: **Authentication → Users** (user exists) and **Logs** / Auth logs for `reset_password` / email errors.

## Security notes (already in app)

- Send step does not confirm whether the email is registered (anti-enumeration)
- OTP must be verified before password change (`type: "recovery"`)
- After password update, the app **signs out** and forces a fresh login
- Codes expire; resend is available on the code step
