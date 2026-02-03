import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import { ThemeProvider } from "next-themes";

function isBrowserExtensionUrl(url?: string | null) {
  if (!url) return false;
  return (
    url.startsWith("chrome-extension://") ||
    url.startsWith("moz-extension://") ||
    url.startsWith("safari-extension://")
  );
}

function setupGlobalErrorLogging() {
  window.addEventListener("error", (event) => {
    // Ignore errors coming from browser extensions (common during development)
    if (isBrowserExtensionUrl((event as ErrorEvent).filename)) return;

    // eslint-disable-next-line no-console
    console.error("[global-error]", {
      message: event.message,
      filename: (event as ErrorEvent).filename,
      lineno: (event as ErrorEvent).lineno,
      colno: (event as ErrorEvent).colno,
      error: (event as ErrorEvent).error,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason: any = (event as PromiseRejectionEvent).reason;
    const stack = typeof reason?.stack === "string" ? reason.stack : "";

    // Ignore unhandled rejections coming from browser extensions
    if (stack.includes("chrome-extension://") || stack.includes("moz-extension://")) return;

    // eslint-disable-next-line no-console
    console.error("[global-unhandledrejection]", { reason });
  });
}

setupGlobalErrorLogging();

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
    <App />
  </ThemeProvider>
);