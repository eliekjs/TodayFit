/** Maps Supabase/network failures to short, user-facing copy for remote app-state loads. */
export function formatRemoteLoadError(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  const lower = message.toLowerCase();
  if (
    /network|fetch failed|failed to fetch|network request failed|econn|etimedout|enotfound|timeout|timed out|aborted|offline|dns/.test(
      lower
    )
  ) {
    return "Couldn't reach the server. Check your connection and try again.";
  }
  if (/jwt|session|auth|permission|rls|row level|not authorized|401|403/.test(lower)) {
    return "Couldn't load your saved data. Try signing out and back in.";
  }
  if (message.trim()) {
    return message.trim();
  }
  return "Couldn't load your saved data. Try again.";
}
