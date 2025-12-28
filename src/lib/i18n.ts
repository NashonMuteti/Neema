import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend'; // Add this import

i18n
  .use(Backend) // Use the backend plugin
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en', // Fallback language if detection fails or translation is missing
    debug: true, // Enable debug mode for development
    interpolation: {
      escapeValue: false, // React already escapes by default
    },
    // resources: {}, // Keep this empty when using backend
    backend: {
      loadPath: '/locales/{{lng}}/translation.json',
    },
    detection: {
      order: ['localStorage', 'navigator'], // Prioritize localStorage for persistence
      caches: ['localStorage'],
    },
  });

export default i18n;