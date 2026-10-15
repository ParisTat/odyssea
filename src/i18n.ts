import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';

// Add a locale: create locales/<code>.json with the same keys, then list it here.
// Later the resources can come from a custom i18next backend (e.g. Firebase) instead.
export const SUPPORTED_LOCALES = ['en'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en } },
  lng: DEFAULT_LOCALE,
  fallbackLng: DEFAULT_LOCALE,
  supportedLngs: [...SUPPORTED_LOCALES],
  // Resources are bundled, so init synchronously and render translated text on first paint.
  initAsync: false,
  // React already escapes rendered strings.
  interpolation: { escapeValue: false },
});

export default i18n;
