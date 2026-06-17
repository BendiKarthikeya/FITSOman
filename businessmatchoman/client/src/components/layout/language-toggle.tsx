import { Button } from "@/components/ui/button";
import { useLanguageContext } from "../providers/language-provider";
import { useTranslation } from "react-i18next";

export default function LanguageToggle() {
  const { language, toggleLanguage, isRtl } = useLanguageContext();
  const { t } = useTranslation();

  // Choose appropriate spacing class based on language direction
  const spacingClass = isRtl ? "space-x-reverse space-x-1" : "space-x-1";

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleLanguage}
      className={`flex items-center font-medium rounded-full px-3 border-primary hover:bg-primary hover:text-white transition-colors ${spacingClass}`}
      title={t("common.switchTo", {
        language: language === "en" ? "العربية" : "English",
      })}
    >
      {language === "en" ? (
        <>
          <span className="mr-1 md:mr-1.5" aria-hidden="true">
            🇴🇲
          </span>
          <span className="text-sm">العربية</span>
        </>
      ) : (
        <>
          <span
            className={isRtl ? "ml-1 md:ml-1.5" : "mr-1 md:mr-1.5"}
            aria-hidden="true"
          >
            🇬🇧
          </span>
          <span className="text-sm">English</span>
        </>
      )}
    </Button>
  );
}
