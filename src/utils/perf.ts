export const perfEnabled =
  import.meta.env.DEV || String(import.meta.env.VITE_DEBUG_PERF).toLowerCase() === "true";

type PerfExtra = Record<string, unknown> | undefined;

/**
 * Start a simple performance timer.
 *
 * Usage:
 * const end = perfStart('AuthContext:getSession')
 * ...
 * end({ session: !!session })
 */
export function perfStart(label: string) {
  const startedAt = performance.now();
  return (extra?: PerfExtra) => {
    if (!perfEnabled) return;
    const ms = Math.round(performance.now() - startedAt);
    if (extra) {
      // eslint-disable-next-line no-console
      console.debug(`[perf] ${label} ${ms}ms`, extra);
    } else {
      // eslint-disable-next-line no-console
      console.debug(`[perf] ${label} ${ms}ms`);
    }
  };
}

export function perfMark(message: string, extra?: PerfExtra) {
  if (!perfEnabled) return;
  // eslint-disable-next-line no-console
  console.debug(`[perf] ${message}`, extra ?? "");
}
