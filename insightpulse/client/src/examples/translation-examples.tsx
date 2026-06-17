// Example: How to use translations in your components

import { useTranslation } from 'react-i18next';

// Example 1: Basic text translation
function Example1() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('common.save')}</h1>
      <button>{t('common.submit')}</button>
    </div>
  );
}

// Example 2: Using nested translation keys
function Example2() {
  const { t } = useTranslation();
  
  return (
    <nav>
      <a href="/dashboard">{t('nav.dashboard')}</a>
      <a href="/surveys">{t('nav.surveys')}</a>
      <a href="/analytics">{t('nav.analytics')}</a>
    </nav>
  );
}

// Example 3: With variables/interpolation
function Example3() {
  const { t } = useTranslation();
  const userName = "John";
  
  // Translation key in en.json: "welcome": "Welcome, {{name}}!"
  return <h1>{t('welcome', { name: userName })}</h1>;
}

// Example 4: Conditional text based on language
function Example4() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  
  return (
    <div>
      <p>{t('profile.title')}</p>
      {isArabic && <p>مرحبا (Additional Arabic content)</p>}
    </div>
  );
}

// Example 5: Using the language context
import { useLanguage } from '@/lib/language-context';

function Example5() {
  const { t } = useTranslation();
  const { language, changeLanguage, isRTL } = useLanguage();
  
  return (
    <div style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
      <p>Current language: {language}</p>
      <button onClick={() => changeLanguage('en')}>English</button>
      <button onClick={() => changeLanguage('ar')}>العربية</button>
    </div>
  );
}

// Example 6: Real-world component conversion
// BEFORE (hardcoded text):
function ProfilePageBefore() {
  return (
    <div>
      <h1>Profile</h1>
      <p>Manage your account information</p>
      <button>Save Changes</button>
    </div>
  );
}

// AFTER (with translations):
function ProfilePageAfter() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('profile.title')}</h1>
      <p>{t('profile.subtitle')}</p>
      <button>{t('common.save')}</button>
    </div>
  );
}

// Example 7: Form with translations
function FormExample() {
  const { t } = useTranslation();
  
  return (
    <form>
      <label>{t('profile.username')}</label>
      <input placeholder={t('profile.username')} />
      
      <label>{t('profile.email')}</label>
      <input placeholder={t('profile.email')} />
      
      <button type="submit">{t('common.submit')}</button>
      <button type="button">{t('common.cancel')}</button>
    </form>
  );
}

// Example 8: Dynamic list with translations
function NavigationExample() {
  const { t } = useTranslation();
  
  const navItems = [
    { key: 'dashboard', path: '/dashboard' },
    { key: 'surveys', path: '/surveys' },
    { key: 'analytics', path: '/analytics' }
  ];
  
  return (
    <nav>
      {navItems.map(item => (
        <a key={item.key} href={item.path}>
          {t(`nav.${item.key}`)}
        </a>
      ))}
    </nav>
  );
}

// Example 9: Toast/Notification with translations
import { useToast } from '@/hooks/use-toast';

function NotificationExample() {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const showSuccess = () => {
    toast({
      title: t('common.success'),
      description: t('settings.language.languageChanged'),
    });
  };
  
  const showError = () => {
    toast({
      title: t('common.error'),
      description: t('settings.language.errorMessage'),
      variant: 'destructive',
    });
  };
  
  return (
    <div>
      <button onClick={showSuccess}>Show Success</button>
      <button onClick={showError}>Show Error</button>
    </div>
  );
}

// Example 10: Page header with multiple translations
function PageHeaderExample() {
  const { t } = useTranslation();
  
  return (
    <div className="page-header">
      <h1>{t('settings.language.title')}</h1>
      <p className="subtitle">{t('settings.language.description')}</p>
      <div className="actions">
        <button>{t('common.save')}</button>
        <button>{t('common.cancel')}</button>
      </div>
    </div>
  );
}

export {
  Example1,
  Example2,
  Example3,
  Example4,
  Example5,
  ProfilePageBefore,
  ProfilePageAfter,
  FormExample,
  NavigationExample,
  NotificationExample,
  PageHeaderExample
};
