import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { perfEnabled } from "@/utils/perf";

/**
 * Lightweight runtime performance logging.
 *
 * Logs route changes and the time between navigations.
 */
export default function PerfLogger() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const lastAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!perfEnabled) return;

    const now = performance.now();
    const sinceLastMs = lastAtRef.current == null ? null : Math.round(now - lastAtRef.current);
    lastAtRef.current = now;

    // eslint-disable-next-line no-console
    console.debug("[perf] route", {
      to: location.pathname + location.search + location.hash,
      navigationType,
      sinceLastMs,
    });
  }, [location.pathname, location.search, location.hash, navigationType]);

  return null;
}
