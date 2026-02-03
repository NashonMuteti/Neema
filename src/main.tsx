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

function stackLooksLikeExtension(stack?: string | null) {
  if (!stack) return false;
  return (
    stack.includes("chrome-extension://") ||
    stack.includes("moz-extension://") ||
    stack.includes("safari-extension://")
  );
}

function setupGlobalErrorLogging() {
  window.addEventListener("error", (event) => {
    const e = event as ErrorEvent;

    // Ignore errors coming from browser extensions (common during development)
    if (isBrowserExtensionUrl(e.filename) || stackLooksLikeExtension(e.error?.stack)) {
      event.preventDefault();
      return;
    }

    // eslint-disable-next-line no-console
    console.error("[global-error]", {
      message: e.message,
      filename: e.filename,
      lineno: e.lineno,
      colno: e.colno,
      error: e.error,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason: any = (event as PromiseRejectionEvent).reason;
    const stack = typeof reason?.stack === "string" ? reason.stack : "";

    // Ignore unhandled rejections coming from browser extensions
    if (stackLooksLikeExtension(stack)) {
      event.preventDefault();
      return;
    }

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