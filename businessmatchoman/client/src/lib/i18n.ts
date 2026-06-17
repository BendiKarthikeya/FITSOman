import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Import translations
import enTranslation from "../locales/en/translation.json";
import arTranslation from "../locales/ar/translation.json";

const resources = {
  en: {
    translation: enTranslation,
  },
  ar: {
    translation: arTranslation,
  },
};

// Get the initial language synchronously before i18n initializes
// This prevents the flash of wrong language
function getInitialLanguage(): string {
  // First check for appLanguage (our custom setting)
  const appLanguage = localStorage.getItem("appLanguage");
  if (appLanguage === "en" || appLanguage === "ar") {
    return appLanguage;
  }
  
  // Then check i18next setting
  const i18nextLang = localStorage.getItem("i18nextLng") || "";
  if (i18nextLang === "en" || i18nextLang === "ar") {
    return i18nextLang;
  }
  
  // Default to English (not Arabic from browser)
  return "en";
}

const initialLanguage = getInitialLanguage();

// Set the language in localStorage before i18n initializes to prevent detection conflicts
if (!localStorage.getItem("i18nextLng") || localStorage.getItem("i18nextLng") !== initialLanguage) {
  localStorage.setItem("i18nextLng", initialLanguage);
  localStorage.setItem("appLanguage", initialLanguage);
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLanguage, // Set the language explicitly
    fallbackLng: "en",
    debug: process.env.NODE_ENV === "development",

    interpolation: {
      escapeValue: false, // not needed for React
    },

    // Define detection options - but we've already set lng above
    detection: {
      order: ["localStorage", "querystring"], // Check localStorage first (we set it above)
      lookupQuerystring: "lang",
      lookupLocalStorage: "i18nextLng",
      caches: ["localStorage"],
    },

    // RTL support
    react: {
      useSuspense: true,
    },
  });

export default i18n;
