import { createContext, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';

interface LanguageContextType {
  language: string;
  changeLanguage: (lng: string) => Promise<void>;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const [language, setLanguage] = useState(i18n.language);
  const [isRTL, setIsRTL] = useState(i18n.language === 'ar');

  const changeLanguage = async (lng: string) => {
    await i18n.changeLanguage(lng);
    setLanguage(lng);
    setIsRTL(lng === 'ar');
    
    // Update HTML dir attribute for RTL support
    document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lng;
    
    // Save to localStorage
    localStorage.setItem('i18nextLng', lng);
  };

  // Set initial direction based on language
  useEffect(() => {
    const currentLang = i18n.language;
    document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLang;
    setIsRTL(currentLang === 'ar');
  }, [i18n.language]);

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
