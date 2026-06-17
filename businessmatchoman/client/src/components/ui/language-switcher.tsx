import { Button } from "@/components/ui/button";
import { useLanguageContext } from "@/components/providers/language-provider";
import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function LanguageSwitcher() {
  const { language, setLanguage, isRtl } = useLanguageContext();
  const { t } = useTranslation();

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'ar', name: 'العربية', flag: '🇸🇦' }
  ];

  const currentLanguage = languages.find(lang => lang.code === language);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`flex items-center gap-2 font-medium rounded-full px-3 border-primary hover:bg-primary hover:text-white transition-colors ${isRtl ? 'flex-row-reverse' : ''}`}
          title={t("common.switchLanguage")}
        >
          <Globe className="h-4 w-4" />
          <span className="text-sm">{currentLanguage?.flag}</span>
          <span className="text-sm hidden md:inline">{currentLanguage?.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align={isRtl ? "start" : "end"} 
        className="w-40"
      >
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            className={`flex items-center gap-2 cursor-pointer ${isRtl ? 'flex-row-reverse' : ''} ${
              language === lang.code ? 'bg-primary/10' : ''
            }`}
            onClick={() => setLanguage(lang.code as 'en' | 'ar')}
          >
            <span className="text-lg" aria-hidden="true">
              {lang.flag}
            </span>
            <span className="flex-1">{lang.name}</span>
            {language === lang.code && (
              <span className="text-primary text-sm">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}