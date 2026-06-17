import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Store, MapPin, DollarSign, Building2, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useRTL } from "@/hooks/use-rtl";
import { Badge } from "@/components/ui/badge";
import { EditableText } from "@/components/ui/editable-text";

export default function FeaturedListings() {
  const { t } = useTranslation();
  const { language, isRtl } = useRTL();

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat(language === "ar" ? "ar-OM" : "en-OM", {
      style: "currency",
      currency: currency || "OMR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getSaleTypeColor = (saleType: string) => {
    switch (saleType?.toLowerCase()) {
      case "business sale":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "partnership":
        return "bg-green-100 text-green-800 border-green-200";
      case "investment":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "franchise":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Helper function to translate sale types
  const getTranslatedSaleType = (saleType: string) => {
    const translations: { [key: string]: string } = {
      "Investment": "استثمار",
      "Business Sale": "بيع العمل",
      "Partnership": "شراكة",
      "Joint Venture": "مشروع مشترك",
      "Franchise": "امتياز تجاري"
    };
    return translations[saleType] || saleType;
  };

  // Helper function to translate industries
  const getTranslatedIndustry = (industry: string) => {
    const translations: { [key: string]: string } = {
      "Technology": "التكنولوجيا",
      "Healthcare": "الرعاية الصحية",
      "Education": "التعليم",
      "Manufacturing": "التصنيع",
      "Retail & E-commerce": "التجارة الإلكترونية",
      "Food & Beverage": "الأغذية والمشروبات",
      "Tourism & Hospitality": "السياحة والضيافة",
      "Real Estate": "العقارات",
      "Agriculture": "الزراعة",
      "Marine Services": "الخدمات البحرية",
      "Renewable Energy": "الطاقة المتجددة",
      "Business": "الأعمال"
    };
    return translations[industry] || industry;
  };

  // Helper function to translate locations
  const getTranslatedLocation = (location: string) => {
    const translations: { [key: string]: string } = {
      "Muscat": "مسقط",
      "Salalah": "صلالة",
      "Sohar": "صحار",
      "Nizwa": "نزوى",
      "Sur": "صور",
      "Buraimi": "البريمي",
      "Rustaq": "الرستاق",
      "Ibri": "عبري",
      "Dubai": "دبي",
      "Abu Dhabi": "أبو ظبي",
      "Doha": "الدوحة",
      "Kuwait City": "مدينة الكويت",
      "Riyadh": "الرياض",
      "Manama": "المنامة"
    };
    return translations[location] || location;
  };

  // Fetch featured listings
  const {
    data: featuredListings = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/listings/featured"],
  });

  return (
    <section className="py-16 md:py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto mb-12">
          <div className="text-center">
            <h2 className={`text-3xl md:text-4xl font-bold mb-4 text-gray-800 ${isRtl ? 'font-arabic' : ''}`}>
              <EditableText
                translationKey="home.featuredListings.title"
                section="home"
                keyName="featuredListings.title"
                as="span"
              />
            </h2>
            <p className={`text-gray-600 text-lg leading-relaxed ${isRtl ? 'font-arabic' : ''}`}>
              <EditableText
                translationKey="home.featuredListings.subtitle"
                section="home"
                keyName="featuredListings.subtitle"
                as="span"
                multiline
              />
            </p>
          </div>
        </div>

        {/* Loading State - Skeleton */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                {/* Image Skeleton */}
                <div className="h-48 bg-gray-200 animate-pulse" />
                
                {/* Content Skeleton */}
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                  </div>
                  
                  <div className="h-6 w-3/4 bg-gray-200 rounded animate-pulse mb-3" />
                  <div className="h-4 w-full bg-gray-200 rounded animate-pulse mb-2" />
                  <div className="h-4 w-2/3 bg-gray-200 rounded animate-pulse mb-4" />
                  
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 text-red-600 p-6 rounded-lg mb-8 text-center max-w-2xl mx-auto">
            <p className="font-medium">
              Failed to load featured listings. Please try again later.
            </p>
          </div>
        )}

        {/* Listings Grid */}
        {!isLoading &&
        featuredListings &&
        Array.isArray(featuredListings) &&
        featuredListings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredListings.slice(0, 3).map((listing, index) => {
              const title = language === "ar" ? listing.title_ar : listing.title_en;
              const description = language === "ar" ? listing.description_ar : listing.description_en;
              
              return (
                <Link key={listing.id || index} href={`/listings/${listing.id}`}>
                  <div className="group bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-[#C79F3D]/30">
                    {/* Image Section */}
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={listing.imageUrl || "https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"}
                        alt={title || "Business Opportunity"}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                      
                      {/* Featured Badge */}
                      <div className={`absolute top-3 ${isRtl ? 'right-3' : 'left-3'}`}>
                        <Badge className={`bg-[#C79F3D] text-white hover:bg-[#C79F3D]/90 font-medium px-3 py-1 ${isRtl ? 'font-arabic' : ''}`}>
                          {t('home.featuredListings.featured')}
                        </Badge>
                      </div>

                      {/* Sale Type Badge */}
                      {listing.saleType && (
                        <div className={`absolute top-3 ${isRtl ? 'left-3' : 'right-3'}`}>
                          <Badge className={`${getSaleTypeColor(listing.saleType)} font-medium px-3 py-1 ${isRtl ? 'font-arabic' : ''}`}>
                            {isRtl ? getTranslatedSaleType(listing.saleType) : listing.saleType}
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Content Section */}
                    <div className="p-6">
                      <div className={`flex items-center gap-2 text-sm text-gray-500 mb-3 ${isRtl ? 'flex-row-reverse font-arabic' : ''}`}>
                        <Building2 className="h-4 w-4" />
                        <span>{isRtl ? getTranslatedIndustry(listing.industry || "Business") : (listing.industry || "Business")}</span>
                        {listing.location && (
                          <>
                            <span>•</span>
                            <MapPin className="h-4 w-4" />
                            <span>{isRtl ? getTranslatedLocation(listing.location) : listing.location}</span>
                          </>
                        )}
                      </div>

                      <h3 className={`font-bold text-xl text-gray-900 mb-3 group-hover:text-[#C79F3D] transition-colors line-clamp-2 ${isRtl ? 'text-right font-arabic' : ''}`}>
                        {title || "Business Opportunity"}
                      </h3>

                      <p className={`text-gray-600 text-sm leading-relaxed mb-4 line-clamp-3 ${isRtl ? 'text-right font-arabic' : ''}`}>
                        {description || "Contact for more details"}
                      </p>

                      {/* Price Section */}
                      <div className={`flex items-center justify-between pt-4 border-t border-gray-100 ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <div className={`flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                          <DollarSign className="h-5 w-5 text-[#C79F3D]" />
                          <span className={`font-bold text-lg text-gray-900 ${isRtl ? 'font-arabic' : ''}`}>
                            {listing.askingPrice 
                              ? formatPrice(listing.askingPrice, listing.currency || "OMR")
                              : t('home.featuredListings.priceOnRequest')
                            }
                          </span>
                        </div>
                        
                        <div className={`flex items-center gap-1 text-[#C79F3D] font-medium group-hover:gap-2 transition-all ${isRtl ? 'flex-row-reverse font-arabic' : ''}`}>
                          <span className="text-sm">{t('home.featuredListings.viewListing')}</span>
                          <ArrowRight className={`h-4 w-4 ${isRtl ? 'rotate-180' : ''}`} />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          !isLoading && (
            <div className="text-center py-14 px-6 bg-white rounded-xl shadow-sm max-w-xl mx-auto">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neutral-100 mb-5">
                <Store className="h-8 w-8 text-gray-500" />
              </div>
              <h3 className={`text-xl font-semibold mb-3 text-gray-800 ${isRtl ? 'font-arabic' : ''}`}>
                {t('home.featuredListings.noListings')}
              </h3>
              <p className={`text-gray-600 mb-6 ${isRtl ? 'font-arabic' : ''}`}>
                {t('home.featuredListings.checkBackLater')}
              </p>
            </div>
          )
        )}

        {/* View All Button */}
        <div className="mt-12 text-center">
          <Link href="/listings">
            <Button
              variant="outline"
              size="lg"
              className={`px-8 border-primary text-primary font-medium hover:bg-primary hover:text-white transition duration-300 ${isRtl ? 'font-arabic' : ''}`}
            >
              <EditableText
                translationKey="home.featuredListings.viewAllListings"
                section="home"
                keyName="featuredListings.viewAllListings"
                as="span"
              />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
