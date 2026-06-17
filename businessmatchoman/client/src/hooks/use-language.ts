import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import "../lib/i18n"; // Import i18n configuration

/**
 * Type for supported languages in the application
 */
export type Language = "en" | "ar";

/**
 * Hook for managing the current language of the application
 * Persists language selection in localStorage and integrates with i18next
 *
 * @returns Object containing the current language and functions to manage it
 */
export function useLanguage() {
  const { i18n } = useTranslation();

  // Get the initial language from localStorage or i18next or default to 'en'
  // This should match what i18n was initialized with
  const getInitialLanguage = (): Language => {
    // Use i18n's current language if available (it was set during init)
    const i18nLang = i18n.language?.split('-')[0];
    if (i18nLang === "en" || i18nLang === "ar") {
      return i18nLang;
    }
    
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

    // Default to English
    return "en";
  };

  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  // Function to update the language
  const setLanguage = useCallback(
    (newLanguage: Language) => {
      setLanguageState(newLanguage);

      // Store in both localstorage formats for compatibility
      localStorage.setItem("appLanguage", newLanguage);

      // Update i18next language
      i18n.changeLanguage(newLanguage);

      // Update document dir attribute for RTL/LTR support
      document.documentElement.dir = newLanguage === "ar" ? "rtl" : "ltr";
      document.documentElement.lang = newLanguage;

      // Add RTL specific styling if needed
      if (newLanguage === "ar") {
        document.body.classList.add("rtl");
      } else {
        document.body.classList.remove("rtl");
      }
    },
    [i18n],
  );

  // Toggle function - switches between 'en' and 'ar' and refreshes the page
  const toggleLanguage = useCallback(() => {
    const newLanguage = language === "en" ? "ar" : "en";
    
    // Store the new language first
    localStorage.setItem("appLanguage", newLanguage);
    
    // Update i18next language
    i18n.changeLanguage(newLanguage);
    
    // Refresh the page to ensure all components properly reload with new language
    window.location.reload();
  }, [language, i18n]);

  // Set the initial document direction on mount
  useEffect(() => {
    // Sync language with i18next on init - but only if they differ
    const i18nLang = i18n.language?.split('-')[0] || 'en';
    if (i18nLang !== language) {
      // If i18n has a different language, sync our state to match i18n
      // This handles the case where i18n was initialized with a specific language
      if (i18nLang === "en" || i18nLang === "ar") {
        setLanguageState(i18nLang);
        return; // Don't change i18n, it's already correct
      }
      // Otherwise, update i18n to match our state
      i18n.changeLanguage(language);
    }

    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = language;

    if (language === "ar") {
      document.body.classList.add("rtl");
    } else {
      document.body.classList.remove("rtl");
    }
  }, [language, i18n]);

  return {
    language,
    setLanguage,
    toggleLanguage,
    isRtl: language === "ar",
  };
}
