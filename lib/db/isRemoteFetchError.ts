/** True when a Supabase/fetch call failed at the network layer (offline, DNS, CORS, etc.). */
export function isRemoteFetchError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : String(error ?? "");
  const lower = message.toLowerCase();
  return /network|fetch failed|failed to fetch|network request failed|econn|etimedout|enotfound|timeout|timed out|aborted|offline|dns|typeerror/.test(
    lower
  );
}
