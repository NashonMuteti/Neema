"use client";

import * as React from "react";
import { ThemeProvider } from "next-themes";
import { useSystemSettings } from "@/context/SystemSettingsContext";

const THEME_STORAGE_KEY = "theme"; // next-themes default
const USER_OVERRIDE_KEY = "app:theme_override";
const OVERRIDE_EVENT = "app-theme-override-changed";

function computeHasUserOverride(defaultTheme: string) {
  if (typeof window === "undefined") return false;

  const explicitOverride = window.localStorage.getItem(USER_OVERRIDE_KEY) === "1";
  if (explicitOverride) return true;

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  // Treat an existing stored theme as a user choice when it differs from the app default.
  return storedTheme !== null && storedTheme !== defaultTheme;
}

export function markUserThemeOverride() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USER_OVERRIDE_KEY, "1");
  window.dispatchEvent(new Event(OVERRIDE_EVENT));
}

export const SystemThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { defaultTheme } = useSystemSettings();
  const [hasUserOverride, setHasUserOverride] = React.useState(() => computeHasUserOverride("system"));

  React.useEffect(() => {
    const recompute = () => setHasUserOverride(computeHasUserOverride(defaultTheme));

    recompute();

    const onOverrideEvent = () => recompute();
    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY || e.key === USER_OVERRIDE_KEY) recompute();
    };

    window.addEventListener(OVERRIDE_EVENT, onOverrideEvent);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener(OVERRIDE_EVENT, onOverrideEvent);
      window.removeEventListener("storage", onStorage);
    };
  }, [defaultTheme]);

  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme={defaultTheme}
      enableSystem
      // If the user hasn't chosen a theme, force the app-wide default from Admin → General.
      forcedTheme={hasUserOverride ? undefined : defaultTheme}
    >
      {children}
    </ThemeProvider>
  );
};
