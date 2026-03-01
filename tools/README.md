# Tools

One-time migration or data scripts live here. They are **excluded from the app build**.

- **Do not** commit any file that contains or loads `service_role` keys or Firebase service account JSON.
- Use local env (e.g. `.env.local` or env vars) for secrets when running scripts.
- Example: a script that reads from Firebase Admin and writes to Supabase using the service role key would be run only from a developer machine with credentials in env, never from the Expo client.
