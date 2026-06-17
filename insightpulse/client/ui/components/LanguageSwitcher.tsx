import React from 'react';
import { useTranslation } from 'react-i18next';
import { supportedLanguages } from '../i18n/config';
import { Button } from './Button';

interface LanguageSwitcherProps {
  variant?: 'button' | 'dropdown';
  className?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ 
  variant = 'button',
  className = ''
}) => {
  const { i18n } = useTranslation();
  const language = i18n.language;
  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    // Update HTML dir attribute for RTL support
    document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lng;
    // Save to localStorage
    localStorage.setItem('i18nextLng', lng);
  };

  if (variant === 'dropdown') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <label htmlFor="language-select" className="text-sm font-medium text-slate-700">
          Language:
        </label>
        <select
          id="language-select"
          value={language}
          onChange={(e) => changeLanguage(e.target.value)}
          className="px-3 py-2 rounded-md border border-slate-200 bg-white text-sm font-medium text-slate-900 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900"
        >
          {Object.entries(supportedLanguages).map(([code, { name, nativeName }]) => (
            <option key={code} value={code}>
              {name} ({nativeName})
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {Object.entries(supportedLanguages).map(([code, { nativeName }]) => (
        <Button
          key={code}
          variant={language === code ? 'primary' : 'outline'}
          size="sm"
          onClick={() => changeLanguage(code)}
          className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
            language === code
              ? 'bg-slate-900 text-white'
              : 'border border-slate-200 text-slate-900 hover:bg-slate-50'
          }`}
        >
          {nativeName}
        </Button>
      ))}
    </div>
  );
};
