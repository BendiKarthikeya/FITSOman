import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Listing } from "@shared/schema";
import { useLanguage } from "@/hooks/use-language";
import { getLocalizedFields } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import {
  Building2,
  MapPin,
  DollarSign,
  Star,
  Verified,
  TrendingUp,
  Clock,
  Users,
} from "lucide-react";

// Helper functions to convert values to translation keys
const getLocationKey = (location: string) => {
  return location.toLowerCase().replace(/\s+/g, '').replace(/[^a-z]/g, '');
};

const getTransactionTypeKey = (type: string) => {
  return type.toLowerCase().replace(/\s+/g, '').replace(/[^a-z]/g, '');
};

const getIndustryKey = (industry: string) => {
  return industry.toLowerCase().replace(/\s+/g, '').replace(/[^a-z]/g, '');
};

interface EnhancedListingCardProps {
  listing: Listing;
  featured?: boolean;
}

export default function EnhancedListingCard({
  listing,
  featured = false,
}: EnhancedListingCardProps) {
  const { language, isRtl } = useLanguage();
  const { t } = useTranslation();

  const { title, description } = getLocalizedFields(listing, language);

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat(language === "ar" ? "ar-OM" : "en-OM", {
      style: "currency",
      currency: currency || "OMR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getSaleTypeColor = (saleType: string) => {
    switch (saleType.toLowerCase()) {
      case "full sale":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "partnership":
        return "bg-green-100 text-green-800 border-green-200";
      case "partial investment":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "franchise":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getIndustryIcon = (industry: string) => {
    switch (industry.toLowerCase()) {
      case "technology":
        return "💻";
      case "food & beverage":
        return "🍽️";
      case "agriculture":
        return "🌾";
      case "tourism & hospitality":
        return "🏨";
      case "marine services":
        return "⚓";
      case "manufacturing":
        return "🏭";
      case "renewable energy":
        return "☀️";
      case "food processing":
        return "🍱";
      case "e-commerce":
        return "🛒";
      case "healthcare":
        return "🏥";
      default:
        return "🏢";
    }
  };

  return (
    <Card
      className={`group hover:shadow-lg transition-all duration-300 overflow-hidden border-0 shadow-sm ${featured ? "ring-2 ring-primary/20" : ""}`}
    >
      {featured && (
        <div className="bg-gradient-to-r from-primary to-primary/80 text-white px-4 py-2 text-sm font-medium flex items-center justify-center">
          <Star className="h-4 w-4 mr-2 fill-current" />
          {t("featured")}
        </div>
      )}

      <div className="relative">
        <div
          className={`h-48 bg-gradient-to-br ${featured ? "from-primary/10 to-primary/5" : "from-gray-100 to-gray-50"} overflow-hidden`}
        >
          {listing.images && listing.images.length > 0 ? (
            <img
              src={listing.images[0]}
              alt={title}
              className="w-full h-full object-cover"
            />
          ) : listing.imageUrl ? (
            <img
              src={listing.imageUrl}
              alt={title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-6xl">
              {getIndustryIcon(listing.industry)}
            </div>
          )}
        </div>

        <div className="absolute top-3 right-3 flex gap-2">
          {listing.verified && (
            <Badge
              variant="secondary"
              className={`bg-green-100 text-green-800 border-green-200 ${isRtl ? 'font-arabic' : ''}`}
            >
              <Verified className={`h-3 w-3 ${isRtl ? 'ml-1' : 'mr-1'}`} />
              {t("verified")}
            </Badge>
          )}
          {listing.featured && (
            <Badge
              variant="secondary"
              className={`bg-white bg-opacity-90 text-amber-800 border-amber-200 ${isRtl ? 'font-arabic' : ''}`}
            >
              <Star className={`h-3 w-3 fill-current ${isRtl ? 'ml-1' : 'mr-1'}`} />
              {t("featured")}
            </Badge>
          )}
        </div>
      </div>

      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Badge className={`${getSaleTypeColor(listing.saleType)} ${isRtl ? 'font-arabic' : ''}`}>
                {t(`common.transactionTypes.${getTransactionTypeKey(listing.saleType)}`) || listing.saleType}
              </Badge>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">
                  {formatPrice(listing.askingPrice, listing.currency || "OMR")}
                </div>
              </div>
            </div>

            <Link href={`/listings/${listing.id}`}>
              <h3 className="text-xl font-bold text-gray-900 mb-2 hover:text-primary transition-colors cursor-pointer group-hover:text-primary">
                {title}
              </h3>
            </Link>
          </div>

          {/* Location and Industry */}
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className={`flex items-center ${isRtl ? 'font-arabic' : ''}`}>
              <Building2 className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`} />
              {t(`common.industries.${getIndustryKey(listing.industry)}`) || listing.industry}
            </div>
            <div className={`flex items-center ${isRtl ? 'font-arabic' : ''}`}>
              <MapPin className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`} />
              {t(`common.locations.${getLocationKey(listing.location)}`) || listing.location}
            </div>
          </div>

          {/* Description */}
          <p className="text-gray-600 text-sm leading-relaxed">
            {description && description.length > 150
              ? `${description.substring(0, 150)}...`
              : description || ""}
          </p>

          {/* Business Tags */}
          {listing.tags && listing.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {listing.tags.slice(0, 4).map((tag, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="text-xs px-2 py-1 bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                >
                  {language === "ar" ? tag.name_ar : tag.name_en}
                </Badge>
              ))}
              {listing.tags.length > 4 && (
                <Badge
                  variant="outline"
                  className="text-xs px-2 py-1 bg-gray-50 text-gray-500"
                >
                  +{listing.tags.length - 4}
                </Badge>
              )}
            </div>
          )}

          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-4 py-4 border-t border-gray-100">
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">
                {t("investment_type")}
              </div>
              <div className="text-sm font-medium">{listing.saleType}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">{t("industry")}</div>
              <div className="text-sm font-medium">{listing.industry}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">{t("location")}</div>
              <div className="text-sm font-medium">{listing.location}</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Link href={`/listing/${listing.id}`} className="flex-1">
              <Button variant="outline" className="w-full">
                {t("view_details")}
              </Button>
            </Link>
            <Button className="flex-1">
              <Users className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`} />
              {t("contact_seller") || "Contact Seller"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
