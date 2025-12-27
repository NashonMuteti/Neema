import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { I18nextProvider } from 'react-i18next'; // New import
import i18n from './lib/i18n.ts'; // New import

createRoot(document.getElementById("root")!).render(
  <I18nextProvider i18n={i18n}> {/* New: Wrap with I18nextProvider */}
    <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
      <App />
    </ThemeProvider>
  </I18nextProvider>
);