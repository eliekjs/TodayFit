/**
 * Minimal react-native stub for Vitest (node environment).
 * The real react-native package ships Flow syntax that Vite/Rollup cannot parse.
 * Wired via `resolve.alias` in vitest.config.ts. Extend only with symbols that
 * lib/services modules actually import at module scope.
 */

type PlatformSelectSpec<T> = Partial<Record<"ios" | "android" | "web" | "native" | "default", T>>;

export const Platform = {
  OS: "web" as const,
  select<T>(spec: PlatformSelectSpec<T>): T | undefined {
    return spec.web ?? spec.default;
  },
};

export const Alert = {
  alert: (..._args: unknown[]) => {},
};

export function useColorScheme(): "light" | "dark" | null {
  return "light";
}

export const StyleSheet = {
  create<T>(styles: T): T {
    return styles;
  },
  flatten<T>(style: T): T {
    return style;
  },
};

export const Dimensions = {
  get: (_dim: "window" | "screen") => ({ width: 375, height: 812, scale: 2, fontScale: 1 }),
};
