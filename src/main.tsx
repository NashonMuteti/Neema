import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import { ThemeProvider } from "next-themes";

function setupGlobalErrorLogging() {
  window.addEventListener("error", (event) => {
    // eslint-disable-next-line no-console
    console.error("[global-error]", {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    // eslint-disable-next-line no-console
    console.error("[global-unhandledrejection]", { reason: event.reason });
  });
}

setupGlobalErrorLogging();

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
    <App />
  </ThemeProvider>
);