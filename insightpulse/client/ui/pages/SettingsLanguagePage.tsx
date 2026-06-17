import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supportedLanguages } from '../i18n/config';
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card';
import { Button } from '../components/Button';

export const SettingsLanguagePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Initialize RTL/LTR on mount
  useEffect(() => {
    const currentLang = i18n.language;
    document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLang;
    setSelectedLanguage(currentLang);
  }, [i18n.language]);
  
  const handleSaveLanguage = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    
    try {
      // Change language
      await i18n.changeLanguage(selectedLanguage);
      
      // Update HTML dir attribute for RTL support
      document.documentElement.dir = selectedLanguage === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = selectedLanguage;
      
      // Save to localStorage
      localStorage.setItem('i18nextLng', selectedLanguage);
      
      // Show success message
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error changing language:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-slate-900 mb-2">
            {t('settings.language.title')}
          </h1>
          <p className="text-slate-600">
            {t('settings.language.description')}
          </p>
        </div>

        {/* Language Selection Card */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle>{t('settings.language.selectLanguage')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(supportedLanguages).map(([code, { name, nativeName }]) => (
                <div
                  key={code}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedLanguage === code
                      ? 'border-slate-900 bg-slate-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => setSelectedLanguage(code)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900">{name}</h3>
                      <p className="text-sm text-slate-600">{nativeName}</p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedLanguage === code
                          ? 'border-slate-900 bg-slate-900'
                          : 'border-slate-300'
                      }`}
                    >
                      {selectedLanguage === code && (
                        <div className="w-2 h-2 bg-white rounded-full" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Success Message */}
            {saveSuccess && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-900">
                  ✓ {t('settings.language.languageChanged')}
                </p>
              </div>
            )}

            {/* Language Features */}
            <div className="mt-6 pt-6 border-t border-slate-200">
              <h4 className="font-semibold text-slate-900 mb-3">
                {t('common.features')}
              </h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="text-slate-900 font-semibold">•</span>
                  <span>Full interface translation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-900 font-semibold">•</span>
                  <span>RTL support for Arabic</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-900 font-semibold">•</span>
                  <span>Automatic language detection</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-900 font-semibold">•</span>
                  <span>Persistent language preference</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="mt-8 flex gap-4">
          <Button
            variant="primary"
            size="md"
            className="px-6 py-2 rounded-lg"
            onClick={handleSaveLanguage}
            disabled={isSaving || selectedLanguage === i18n.language}
          >
            {isSaving ? t('common.loading') : t('common.save')}
          </Button>
          <Button
            variant="outline"
            size="md"
            className="px-6 py-2 rounded-lg border border-slate-200"
            onClick={() => window.history.back()}
          >
            {t('common.back')}
          </Button>
        </div>
      </div>
    </div>
  );
};
