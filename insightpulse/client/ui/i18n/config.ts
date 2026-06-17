import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslations from './locales/en.json';
import arTranslations from './locales/ar.json';
import enLegacy from '../../src/locales/en.json';
import arLegacy from '../../src/locales/ar.json';

// Deep-merge legacy strings (e.g. admin.*) into the new UI translations,
// so pages from client/src/pages/admin/* find their i18n keys.
function deepMerge(target: any, source: any): any {
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      target[key] = deepMerge(target[key] ?? {}, source[key]);
    } else if (target[key] === undefined) {
      target[key] = source[key];
    }
  }
  return target;
}

const resources = {
  en: { translation: deepMerge({ ...(enTranslations as any) }, enLegacy as any) },
  ar: { translation: deepMerge({ ...(arTranslations as any) }, arLegacy as any) },
};

// Supported languages
export const supportedLanguages = {
  en: { name: 'English', nativeName: 'English' },
  ar: { name: 'Arabic', nativeName: 'العربية' }
};

// Convert a missing key like "admin.sessionManagement.orgWide"
// into a readable label "Org Wide" so the UI never shows raw key paths.
function humanizeMissingKey(key: string): string {
  const last = key.split('.').pop() ?? key;
  // Insert spaces before capitals, replace separators, then Title Case.
  return last
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

i18n
  // Detect user language
  .use(LanguageDetector)
  // Pass the i18n instance to react-i18next
  .use(initReactI18next)
  // Initialize i18next
  .init({
    resources,
    fallbackLng: 'en',
    debug: false,
    parseMissingKeyHandler: humanizeMissingKey,
    interpolation: {
      escapeValue: false // React already escapes values
    },
    detection: {
      // Order of detection methods
      order: ['localStorage', 'navigator'],
      // Cache user language
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng'
    }
  });

export default i18n;
