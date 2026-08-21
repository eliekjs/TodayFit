import { useEffect, useState } from "react";

const FRAMES = [".", "..", "..."] as const;

/** Replace a trailing ellipsis (… or ...) with the given dots string. */
export function applyBusyEllipsis(label: string, dots: string): string {
  const base = label.replace(/(?:\u2026|\.{2,3})\s*$/, "");
  return `${base}${dots}`;
}

/**
 * Cycles ".", "..", "..." while `active` so busy copy feels in progress.
 * When idle, returns a single ellipsis character for static labels.
 */
export function useAnimatedEllipsis(active: boolean, intervalMs = 400): string {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!active) {
      setFrame(0);
      return;
    }
    const id = setInterval(() => {
      setFrame((n) => (n + 1) % FRAMES.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs]);

  return active ? FRAMES[frame]! : "…";
}

/** Strip a trailing ellipsis and re-append animated dots while busy. */
export function useBusyLabel(label: string, busy: boolean): string {
  const dots = useAnimatedEllipsis(busy);
  if (!busy) return label;
  return applyBusyEllipsis(label, dots);
}
