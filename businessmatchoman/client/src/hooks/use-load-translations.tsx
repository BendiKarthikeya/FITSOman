import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import i18n from "@/lib/i18n";

interface Translation {
  id: number;
  section: string;
  key: string;
  english: string;
  arabic: string;
  notes?: string;
  lastUpdated?: string;
  addedBy?: number;
}

/**
 * Hook to load translations from database and merge with i18n resources
 */
export function useLoadTranslations() {
  const { data: translations, isLoading } = useQuery<Translation[]>({
    queryKey: ["/api/translations"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/translations");
      const result = await response.json();
      return result.data || [];
    },
    staleTime: 30 * 1000, // 30 seconds - refresh more frequently to see admin changes
    cacheTime: 2 * 60 * 1000, // Keep in cache for 2 minutes
    refetchOnWindowFocus: true, // Refetch when user returns to the tab
    refetchOnMount: true, // Always refetch on mount to get latest translations
    retry: 1,
  });

  useEffect(() => {
    if (translations && translations.length > 0) {
      // Group translations by language
      const enTranslations: Record<string, any> = {};
      const arTranslations: Record<string, any> = {};

      translations.forEach((translation) => {
        // Build nested object structure (e.g., home.hero.title)
        const keys = `${translation.section}.${translation.key}`.split(".");
        
        // Helper function to set nested value
        const setNestedValue = (obj: any, keys: string[], value: string) => {
          let current = obj;
          for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) {
              current[keys[i]] = {};
            }
            current = current[keys[i]];
          }
          current[keys[keys.length - 1]] = value;
        };

        // Only set translations if they exist and are not empty
        // This ensures we only override JSON translations with database values
        if (translation.english && translation.english.trim()) {
          setNestedValue(enTranslations, keys, translation.english);
        }

        if (translation.arabic && translation.arabic.trim()) {
          setNestedValue(arTranslations, keys, translation.arabic);
        }
      });

      // Merge with existing translations
      const currentEn = i18n.getResourceBundle("en", "translation") || {};
      const currentAr = i18n.getResourceBundle("ar", "translation") || {};

      // Deep merge function
      const deepMerge = (target: any, source: any): any => {
        const output = { ...target };
        if (isObject(target) && isObject(source)) {
          Object.keys(source).forEach((key) => {
            if (isObject(source[key])) {
              if (!(key in target)) {
                Object.assign(output, { [key]: source[key] });
              } else {
                output[key] = deepMerge(target[key], source[key]);
              }
            } else {
              Object.assign(output, { [key]: source[key] });
            }
          });
        }
        return output;
      };

      const mergedEn = deepMerge(currentEn, enTranslations);
      const mergedAr = deepMerge(currentAr, arTranslations);

      // Update i18n resources - this will trigger a re-render for all components using translations
      i18n.addResourceBundle("en", "translation", mergedEn, true, true);
      i18n.addResourceBundle("ar", "translation", mergedAr, true, true);
      
      // Force i18n to emit a language changed event to update all components
      i18n.emit("languageChanged", i18n.language);
    }
  }, [translations]);

  return { isLoading };
}

function isObject(item: any): boolean {
  return item && typeof item === "object" && !Array.isArray(item);
}

