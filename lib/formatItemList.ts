/** Join labels for UI summaries. Never uses “+N more”. */
export function formatItemList(
  items: readonly (string | null | undefined)[],
  separator = " · "
): string {
  return items
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0)
    .join(separator);
}
