import { Link } from "wouter";
import { Listing, User } from "@shared/schema";
import { Card } from "@/components/ui/card";
import {
  MapPin,
  ShieldCheck,
  Building2,
  Tag,
  DollarSign,
  User as UserIcon,
  Briefcase,
  Star,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { useTranslation } from "react-i18next";

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
import { getImageWithFallback } from "@/lib/image-sources";
import SaveButton from "@/components/save-button";

interface ListingCardProps {
  listing: Listing;
}

export default function ListingCard({ listing }: ListingCardProps) {
  const { language } = useLanguage();
  const { t } = useTranslation();
  const isRtl = language === "ar";

  // Get the title and description based on language
  const title = language === "ar" ? listing.title_ar : listing.title_en;
  const description =
    language === "ar" ? listing.description_ar : listing.description_en;



  // Fetch the seller/owner information
  const { data: seller } = useQuery({
    queryKey: [`/api/users/${listing.userId}`],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/users/${listing.userId}`);
        if (!res.ok) {
          throw new Error("Failed to fetch seller information");
        }
        return res.json();
      } catch (error) {
        console.error("Error fetching seller:", error);
        return null;
      }
    },
    enabled: !!listing.userId,
    staleTime: Infinity,
  });

  // Format currency
  const formatCurrency = (amount: number, currency?: string | null) => {
    return `${currency || "OMR"} ${amount.toLocaleString()}`;
  };

  return (
    <Card className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden h-full flex flex-col">
      <div className="relative">
        <Link href={`/listings/${listing.id}`}>
          <img
            src={
              listing.images && listing.images.length > 0
                ? listing.images[0]
                : getImageWithFallback(
                    listing.imageUrl,
                    "listing",
                    undefined,
                    listing.id,
                    listing.industry,
                  )
            }
            alt={title}
            className="w-full h-52 object-cover transition-transform duration-300 hover:scale-105"
          />
        </Link>
        {listing.featured && (
          <div className={`absolute top-3 ${isRtl ? 'right-3' : 'left-3'} bg-white bg-opacity-90 text-amber-800 text-xs font-medium px-3 py-1 rounded-full flex items-center ${isRtl ? 'font-arabic' : ''}`}>
            <Star className={`h-3 w-3 fill-current ${isRtl ? 'ml-1.5' : 'mr-1.5'}`} />
            {t('featured')}
          </div>
        )}
        {listing.verified && (
          <div className={`absolute top-3 ${isRtl ? 'left-3' : 'right-3'} bg-white bg-opacity-90 text-gray-800 text-xs font-medium px-3 py-1 rounded-full flex items-center ${isRtl ? 'font-arabic' : ''}`}>
            <ShieldCheck className={`h-3 w-3 ${isRtl ? 'ml-1.5' : 'mr-1.5'}`} />
            {t('verified')}
          </div>
        )}
        <div className="absolute bottom-3 right-3">
          <SaveButton listingId={listing.id} listingUserId={listing.userId} />
        </div>
      </div>

      <div className="p-5 flex-grow flex flex-col">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center text-xs font-medium text-primary">
            <Building2 className={`h-3.5 w-3.5 ${isRtl ? "ml-1" : "mr-1"}`} />
            {t(`common.industries.${getIndustryKey(listing.industry)}`) || listing.industry}
          </div>
          <div className="flex items-center text-xs font-medium text-gray-500">
            <MapPin className={`h-3.5 w-3.5 ${isRtl ? "ml-1" : "mr-1"}`} />
            {t(`common.locations.${getLocationKey(listing.location)}`) || listing.location}
          </div>
        </div>

        <Link href={`/listings/${listing.id}`}>
          <h3 className="text-lg font-semibold text-gray-800 mb-2 hover:text-primary transition-colors">
            {title}
          </h3>
        </Link>

        <p className="text-gray-600 text-sm mb-4 flex-grow">
          {description && description.length > 120
            ? `${description.substring(0, 120)}...`
            : description}
        </p>

        <div className="flex justify-between items-center mb-4 mt-auto">
          <div className="flex items-start">
            <Tag
              className={`h-4 w-4 text-gray-500 mt-0.5 ${isRtl ? "ml-2" : "mr-2"}`}
            />
            <div className="flex flex-col">
              <span className={`text-xs text-gray-500 ${isRtl ? 'font-arabic' : ''}`}>
                {t('listingDetails.overview.saleType')}
              </span>
              <span className={`font-medium text-sm text-gray-800 ${isRtl ? 'font-arabic' : ''}`}>
                {t(`common.transactionTypes.${getTransactionTypeKey(listing.saleType)}`) || listing.saleType}
              </span>
            </div>
          </div>
          <div className="flex items-start">
            <DollarSign
              className={`h-4 w-4 text-gray-500 mt-0.5 ${isRtl ? "ml-2" : "mr-2"}`}
            />
            <div className={`flex flex-col ${isRtl ? 'text-left' : 'text-right'}`}>
              <span className={`text-xs text-gray-500 ${isRtl ? 'font-arabic' : ''}`}>
                {t('listingDetails.overview.askingPrice')}
              </span>
              <span className={`font-bold text-primary ${isRtl ? 'font-arabic' : ''}`}>
                {formatCurrency(listing.askingPrice, listing.currency)}
              </span>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4 flex justify-between items-center">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              {seller?.role === "broker" ? (
                <Briefcase className="h-4 w-4 text-gray-500" />
              ) : (
                <UserIcon className="h-4 w-4 text-gray-500" />
              )}
            </div>
            <span
              className={`text-sm text-gray-500 ${isRtl ? "mr-2 font-arabic" : "ml-2"}`}
            >
              {t('listingDetails.overview.listedBy')}{" "}
              {seller?.role === "broker"
                ? t('common.broker')
                : t('listingDetails.overview.businessOwner')}
            </span>
          </div>
          <Link href={`/listings/${listing.id}`}>
            <button className={`text-primary hover:text-primary-dark text-sm font-medium px-3 py-1 rounded-full border border-primary hover:bg-primary hover:text-white transition-colors ${isRtl ? 'font-arabic' : ''}`}>
              {t('listings.card.viewDetails')}
            </button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
