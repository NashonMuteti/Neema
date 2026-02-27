"use client";

import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useSystemSettings } from "@/context/SystemSettingsContext";

const LAST_ACTIVITY_KEY = "app:last_activity_ts";

function readLastActivityTs() {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(LAST_ACTIVITY_KEY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function writeLastActivityTs(ts: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LAST_ACTIVITY_KEY, String(ts));
}

export default function SessionTimeoutManager() {
  const { session, isLoading: authLoading } = useAuth();
  const { sessionTimeoutMinutes, isLoading: settingsLoading } = useSystemSettings();

  const signingOutRef = React.useRef(false);
  const lastWriteRef = React.useRef(0);

  const effectiveTimeoutMinutes = React.useMemo(() => {
    const n = Number(sessionTimeoutMinutes);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
  }, [sessionTimeoutMinutes]);

  const recordActivity = React.useCallback(() => {
    const now = Date.now();
    // Throttle writes to localStorage (mousemove can be very noisy)
    if (now - lastWriteRef.current < 5000) return;
    lastWriteRef.current = now;
    writeLastActivityTs(now);
  }, []);

  // Track user activity while signed in
  React.useEffect(() => {
    if (authLoading || settingsLoading) return;
    if (!session) return;
    if (!effectiveTimeoutMinutes) return;

    // Initialize last activity on sign-in
    writeLastActivityTs(Date.now());

    const onActivity = () => recordActivity();

    const activityEvents: Array<keyof WindowEventMap> = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "focus",
    ];

    activityEvents.forEach((evt) => window.addEventListener(evt, onActivity, { passive: true }));

    const onVisibility = () => {
      if (document.visibilityState === "visible") recordActivity();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      activityEvents.forEach((evt) => window.removeEventListener(evt, onActivity));
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [authLoading, settingsLoading, session, effectiveTimeoutMinutes, recordActivity]);

  // Enforce timeout (inactivity) across tabs
  React.useEffect(() => {
    if (authLoading || settingsLoading) return;
    if (!session) return;
    if (!effectiveTimeoutMinutes) return;

    signingOutRef.current = false;

    const timeoutMs = effectiveTimeoutMinutes * 60 * 1000;

    const check = async () => {
      const last = readLastActivityTs() ?? Date.now();
      const idleMs = Date.now() - last;

      if (idleMs < timeoutMs) return;
      if (signingOutRef.current) return;

      signingOutRef.current = true;
      await supabase.auth.signOut();
    };

    const interval = window.setInterval(check, 10_000);

    const onStorage = (e: StorageEvent) => {
      if (e.key === LAST_ACTIVITY_KEY) {
        // Another tab updated activity; re-check soon.
        void check();
      }
    };
    window.addEventListener("storage", onStorage);

    // Initial check (covers return from sleep / long background)
    void check();

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("storage", onStorage);
    };
  }, [authLoading, settingsLoading, session, effectiveTimeoutMinutes]);

  return null;
}
