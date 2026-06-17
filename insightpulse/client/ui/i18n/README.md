# Internationalization (i18n) Setup for UI

This directory contains the internationalization configuration and translation files for the Insight Pulse UI.

## Structure

```
ui/i18n/
├── config.ts              # i18next configuration
├── locales/
│   ├── en.json           # English translations
│   └── ar.json           # Arabic translations
└── README.md             # This file
```

## Supported Languages

- **English (en)** - Default language
- **Arabic (ar)** - RTL language with full support

## Setup

### 1. Configuration (`config.ts`)

The i18next configuration is initialized with:
- Language detection (localStorage → navigator)
- Browser language detection fallback
- Automatic RTL/LTR direction handling
- Persistent language preference in localStorage

### 2. Translation Files

Translation files are organized by language code:
- `en.json` - English translations
- `ar.json` - Arabic translations

Each file contains nested translation keys organized by feature/page:
- `common` - Common UI elements
- `auth` - Authentication pages
- `nav` - Navigation items
- `settings` - Settings pages
- `profile` - Profile pages
- `survey` - Survey-related strings
- `dashboard` - Dashboard strings
- `analytics` - Analytics strings
- `actionPlans` - Action planning strings

## Usage

### In Components

```tsx
import { useTranslation } from 'react-i18next';

export const MyComponent = () => {
  const { t } = useTranslation();
  
  return <h1>{t('common.save')}</h1>;
};
```

### Language Switching

```tsx
import { useLanguage } from '../lib/language-context';

export const LanguageSwitcher = () => {
  const { language, changeLanguage, isRTL } = useLanguage();
  
  return (
    <button onClick={() => changeLanguage('ar')}>
      Switch to Arabic
    </button>
  );
};
```

### Using the LanguageSwitcher Component

```tsx
import { LanguageSwitcher } from '../components/LanguageSwitcher';

export const MyPage = () => {
  return (
    <div>
      <LanguageSwitcher variant="button" />
      {/* or */}
      <LanguageSwitcher variant="dropdown" />
    </div>
  );
};
```

## Language Context

The `LanguageProvider` component wraps your app and provides:

```tsx
interface LanguageContextType {
  language: string;           // Current language code ('en' or 'ar')
  changeLanguage: (lng: string) => Promise<void>;  // Change language
  isRTL: boolean;            // Whether current language is RTL
}
```

### Setup in App

```tsx
import { LanguageProvider } from './lib/language-context';
import i18n from './i18n/config';

export function App() {
  return (
    <LanguageProvider>
      {/* Your app components */}
    </LanguageProvider>
  );
}
```

## RTL Support

When Arabic is selected:
- `document.documentElement.dir` is set to `rtl`
- `document.documentElement.lang` is set to `ar`
- CSS can use `[dir="rtl"]` selectors for RTL-specific styling
- The `isRTL` context value is `true`

## Adding New Translations

1. Add the key to both `en.json` and `ar.json`:

```json
{
  "myFeature": {
    "title": "My Feature",
    "description": "Feature description"
  }
}
```

2. Use in component:

```tsx
const { t } = useTranslation();
<h1>{t('myFeature.title')}</h1>
```

## Translation Organization

### Common Keys
- `common.save`, `common.cancel`, `common.delete` - Basic actions
- `common.loading`, `common.error`, `common.success` - Status messages

### Auth Keys
- `auth.login`, `auth.logout` - Authentication
- `auth.username`, `auth.password` - Form fields
- `auth.welcomeBack`, `auth.loginDescription` - Login page

### Navigation Keys
- `nav.dashboard`, `nav.surveys`, `nav.analytics` - Main navigation

### Settings Keys
- `settings.language.title` - Language settings
- `settings.language.selectLanguage` - Language selection

## Language Detection

The app automatically detects language in this order:
1. **localStorage** - Previously selected language (`i18nextLng`)
2. **Browser language** - User's browser language preference
3. **Fallback** - English (`en`)

## Persistence

Selected language is automatically saved to `localStorage` with key `i18nextLng` and persists across sessions.

## Components Using i18n

### LanguageSwitcher
- Location: `ui/components/LanguageSwitcher.tsx`
- Variants: `button` (toggle buttons) or `dropdown` (select menu)
- Props: `variant`, `className`

### SettingsLanguagePage
- Location: `ui/pages/SettingsLanguagePage.tsx`
- Full language settings page with selection and info

### LoginPage
- Location: `ui/pages/LoginPage.tsx`
- Includes language switcher in top-right corner
- All text translated

## Best Practices

1. **Always use translation keys** - Never hardcode strings
2. **Organize by feature** - Group related translations
3. **Keep keys consistent** - Use camelCase for keys
4. **Provide context** - Use nested objects for related strings
5. **Test both languages** - Verify RTL layout works correctly
6. **Use type-safe keys** - Consider using TypeScript for key validation

## Troubleshooting

### Language not changing
- Check if `LanguageProvider` wraps your component
- Verify localStorage is not blocked
- Check browser console for i18next errors

### RTL not working
- Ensure `document.documentElement.dir` is set correctly
- Check CSS for RTL-specific selectors
- Verify `isRTL` context value is correct

### Missing translations
- Check translation key spelling
- Verify key exists in both `en.json` and `ar.json`
- Check browser console for missing key warnings

## Future Enhancements

- [ ] Add more languages (French, Spanish, etc.)
- [ ] Implement translation management UI
- [ ] Add pluralization support
- [ ] Add date/time localization
- [ ] Add number formatting by locale
- [ ] Implement lazy loading of translation files
