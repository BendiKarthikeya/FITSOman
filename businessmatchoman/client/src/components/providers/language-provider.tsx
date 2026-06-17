import { createContext, ReactNode, useContext, useEffect } from "react";
import { useLanguage, Language } from "@/hooks/use-language";
import { useTranslation } from "react-i18next";

// Define the context type
interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  isRtl: boolean;
}

// Create the context with a default value
const LanguageContext = createContext<LanguageContextType | null>(null);

// Provider component
export function LanguageProvider({ children }: { children: ReactNode }) {
  const languageState = useLanguage();
  const { i18n } = useTranslation();

  // Determine if the current language is RTL
  const isRtl = languageState.language === "ar";

  // Create a context value with the isRtl property
  const contextValue = {
    ...languageState,
    isRtl,
  };

  // Keep language state in sync with i18n
  useEffect(() => {
    i18n.changeLanguage(languageState.language);
  }, [languageState.language, i18n]);

  // Apply RTL/LTR direction based on language
  useEffect(() => {
    document.documentElement.lang = i18n.language;
    document.documentElement.dir = isRtl ? "rtl" : "ltr";
    document.body.dir = isRtl ? "rtl" : "ltr";

    // Add or remove RTL class for Tailwind RTL support
    if (isRtl) {
      document.documentElement.classList.add("rtl");
    } else {
      document.documentElement.classList.remove("rtl");
    }
  }, [i18n.language, isRtl]);

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}

// Hook to use the language context
// Using function declaration for consistent exports (Fast Refresh compatibility)
export function useLanguageContext() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error(
      "useLanguageContext must be used within a LanguageProvider",
    );
  }

  return context;
}
