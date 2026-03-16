/**
 * Minimal shim for template hook.
 * In this project we use `lib/theme.ts` instead for most styling.
 */

export function useThemeColor(
  props: { light?: string; dark?: string },
  _colorName: string
): string {
  if (props.light != null) return props.light;
  if (props.dark != null) return props.dark;
  return "#000000";
}
