import { Link } from "wouter";
import { BUSINESS_CATEGORIES } from "@shared/types";
import { useTranslation } from "react-i18next";
import { useRTL } from "@/hooks/use-rtl";
import { Button } from "@/components/ui/button";
import { EditableText } from "@/components/ui/editable-text";
import {
  UtensilsCrossed,
  ShoppingCart,
  Code,
  Factory,
  Building,
  Stethoscope,
  GraduationCap,
  MoreHorizontal,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";


// Type for the API response
interface CategoryCount {
  category: string;
  count: number;
}

// Function to get the appropriate Lucide icon for each category
const getCategoryIcon = (categoryId: string) => {
  switch (categoryId) {
    case "food_hospitality":
      return UtensilsCrossed;
    case "retail_ecommerce":
      return ShoppingCart;
    case "technology":
      return Code;
    case "manufacturing":
      return Factory;
    case "real_estate":
      return Building;
    case "healthcare":
      return Stethoscope;
    case "education":
      return GraduationCap;
    case "others":
      return MoreHorizontal;
    default:
      return MoreHorizontal;
  }
};

export default function BusinessCategories() {
  const { t } = useTranslation();
  const { isRtl, language } = useRTL();

  // Fetch real category counts from the API
  const {
    data: categoryCounts = [],
    isLoading,
    error,
  } = useQuery<CategoryCount[]>({
    queryKey: ["/api/listings/counts"],
  });

  // Map the API response to category IDs for easier lookup
  const countsByCategory = new Map<string, number>();

  if (categoryCounts && Array.isArray(categoryCounts) && categoryCounts.length > 0) {
    categoryCounts.forEach((item: CategoryCount) => {
      // Find the matching category by name
      const matchingCategory = BUSINESS_CATEGORIES.find(
        (cat) => cat.name.toLowerCase() === item.category.toLowerCase(),
      );
      if (matchingCategory) {
        countsByCategory.set(matchingCategory.id, item.count);
      }
    });
  }

  return (
    <section className="py-16 md:py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto mb-12 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4 text-gray-800">
            <EditableText
              translationKey="home.categories.title"
              section="home"
              keyName="categories.title"
              as="span"
            />
          </h2>
          <p className="text-gray-600 text-base max-w-2xl mx-auto mb-6">
            <EditableText
              translationKey="home.categories.subtitle"
              section="home"
              keyName="categories.subtitle"
              as="span"
              multiline
            />
          </p>
          
          {/* Registration CTA in categories */}
          <div className="bg-accent-gold/10 border border-accent-gold/20 rounded-lg p-4 max-w-2xl mx-auto mb-8">
            <p className={`text-primary-blue text-sm mb-3 text-center ${isRtl ? 'font-arabic' : ''}`}>
              <EditableText
                translationKey="home.categories.cta_text"
                section="home"
                keyName="categories.cta_text"
                as="span"
                multiline
              />
            </p>
            <Link href="/auth?tab=register">
              <Button className="px-6 py-2 bg-accent-gold text-deep-contrast font-medium rounded-lg hover:bg-accent-gold/90 transition duration-300">
                <EditableText
                  translationKey="home.categories.cta_button"
                  section="home"
                  keyName="categories.cta_button"
                  as="span"
                />
              </Button>
            </Link>
          </div>
        </div>

        {isLoading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 md:gap-6 lg:gap-8">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg animate-pulse mb-4" />
                  <div className="h-5 w-20 bg-gray-200 rounded animate-pulse mb-2" />
                  <div className="h-4 w-12 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="flex justify-center items-center py-12">
            <p className="text-red-500">{t("home.categories.error_loading")}</p>
          </div>
        )}

        {!isLoading && !error && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 md:gap-6 lg:gap-8">
            {BUSINESS_CATEGORIES.map((category) => {
              const count = countsByCategory.get(category.id) || 0;
              const IconComponent = getCategoryIcon(category.id);

              return (
                <Link
                  key={category.id}
                  href={`/listings?industry=${encodeURIComponent(category.name)}`}
                  className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 px-6 py-8 flex flex-col items-center justify-center border border-neutral-200 hover:border-primary hover:border-opacity-50 transform hover:-translate-y-1 group"
                >
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5 bg-gradient-to-br from-primary to-primary-blue text-white group-hover:scale-110 transition-transform duration-300">
                    <IconComponent className="h-8 w-8" />
                  </div>
                  <h3 className={`font-heading font-semibold text-gray-800 text-center mb-2 group-hover:text-primary transition-colors duration-300 ${isRtl ? 'font-arabic' : ''}`}>
                    {t(`home.categories.${category.id}`) || category.name}
                  </h3>
                  <p className={`text-sm text-neutral-600 flex items-center font-sans ${isRtl ? 'flex-row-reverse font-arabic' : ''}`}>
                    <span className={isRtl ? "ml-1" : "mr-1"}>{count}</span>
                    <span>{t("home.categories.listings")}</span>
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
