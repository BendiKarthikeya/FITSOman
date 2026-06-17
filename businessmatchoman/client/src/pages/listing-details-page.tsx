import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  MapPin,
  Building,
  Calendar,
  FileText,
  User,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Listing } from "@/../../shared/schema";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { useState, useEffect, useCallback } from "react";
import { DocumentsSection } from "@/components/sections/documents-section";
import { useAuth } from "@/hooks/use-auth";
import ContactSellerModal from "@/components/contact-seller-modal";
import SaveButton from "@/components/save-button";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/hooks/use-language";
import { useRTL } from "@/hooks/use-rtl";


const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-OM", {
    style: "currency",
    currency: "OMR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Helper function to get translated user role
const getTranslatedUserRole = (role: string, t: any): string => {
  if (!role) return '';
  
  const roleKey = role.toLowerCase();
  const translationKey = `userRoles.${roleKey}`;
  const translated = t(translationKey);
  
  // If translation not found, return the original role with fallback
  if (translated === translationKey) {
    return role.charAt(0).toUpperCase() + role.slice(1);
  }
  
  return translated;
};

// Helper function to get translated location
const getTranslatedLocation = (location: string, t: any): string => {
  if (!location) return '';
  
  // Create a mapping of common location names to their translation keys
  const locationMap: { [key: string]: string } = {
    'muscat': 'muscat',
    'dubai': 'dubai',
    'salalah': 'salalah',
    'sohar': 'sohar',
    'nizwa': 'nizwa',
    'sur': 'sur',
    'abu dhabi': 'abudhabi',
    'doha': 'doha',
    'riyadh': 'riyadh',
    'jeddah': 'jeddah',
    'manama': 'manama',
    'kuwait city': 'kuwaitcity',
    'wahiba sands': 'wahibasands',
    'other gcc': 'othergcc'
  };
  
  const locationKey = locationMap[location.toLowerCase()] || location.toLowerCase().replace(/[^a-z0-9]/g, '');
  const translatedLocation = t(`common.locations.${locationKey}`);
  
  // Return translated location if it exists and is different from the key, otherwise return original
  return translatedLocation && translatedLocation !== `common.locations.${locationKey}` ? translatedLocation : location;
};

// Helper function to get translated industry
const getTranslatedIndustry = (industry: string, t: any): string => {
  if (!industry) return '';
  
  // Create a mapping of common industry names to their translation keys
  const industryMap: { [key: string]: string } = {
    'technology': 'technology',
    'food & beverage': 'foodbeverage',
    'agriculture': 'agriculture',
    'tourism & hospitality': 'tourismhospitality',
    'marine services': 'marineservices',
    'manufacturing': 'manufacturing',
    'renewable energy': 'renewableenergy',
    'food processing': 'foodprocessing',
    'e-commerce': 'ecommerce',
    'healthcare': 'healthcare',
    'real estate': 'realestate',
    'retail & e-commerce': 'retailecommerce',
    'food & hospitality': 'foodhospitality'
  };
  
  const industryKey = industryMap[industry.toLowerCase()] || industry.toLowerCase().replace(/[^a-z0-9]/g, '');
  const translatedIndustry = t(`common.industries.${industryKey}`);
  
  // Return translated industry if it exists and is different from the key, otherwise return original
  return translatedIndustry && translatedIndustry !== `common.industries.${industryKey}` ? translatedIndustry : industry;
};

export default function ListingDetailsPage() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const { user } = useAuth();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { isRtl } = useRTL();

  const {
    data: listing,
    isLoading,
    error,
  } = useQuery<Listing>({
    queryKey: ["/api/listings", id],
    queryFn: () => fetch(`/api/listings/${id}`).then((res) => res.json()),
    enabled: !!id && !isNaN(Number(id)),
  });

  const { data: similarListings } = useQuery<Listing[]>({
    queryKey: ["/api/listings", id, "similar"],
    queryFn: () =>
      fetch(`/api/listings/${id}/similar`).then((res) => res.json()),
    enabled: !!id && !isNaN(Number(id)) && !!listing,
  });

  // Fetch seller information
  const { data: seller } = useQuery({
    queryKey: [`/api/users/${listing?.userId}`],
    queryFn: async () => {
      if (!listing?.userId) return null;
      const res = await fetch(`/api/users/${listing.userId}`);
      if (!res.ok) throw new Error("Failed to fetch seller information");
      return res.json();
    },
    enabled: !!listing?.userId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Breadcrumb Skeleton */}
          <div className="h-4 w-48 bg-gray-200 rounded animate-pulse mb-6" />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content Skeleton */}
            <div className="lg:col-span-2">
              {/* Image Slider Skeleton */}
              <div className="h-96 bg-gray-200 rounded-lg animate-pulse mb-6" />
              
              {/* Title and Price Skeleton */}
              <div className="h-8 w-3/4 bg-gray-200 rounded animate-pulse mb-4" />
              <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-6" />
              
              {/* Details Grid Skeleton */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                    <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                  </div>
                ))}
              </div>
              
              {/* Description Skeleton */}
              <div className="space-y-3 mb-8">
                <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-5/6 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-4/5 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
            
            {/* Sidebar Skeleton */}
            <div className="space-y-6">
              {/* Contact Card Skeleton */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-4" />
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse" />
                  <div className="space-y-2">
                    <div className="h-5 w-24 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>
                <div className="h-10 w-full bg-gray-200 rounded animate-pulse" />
              </div>
              
              {/* Save Button Skeleton */}
              <div className="h-10 w-full bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || (!isLoading && !listing)) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className={`text-center ${isRtl ? 'font-arabic' : ''}`}>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t('listingDetails.errors.notFound')}
          </h2>
          <p className="text-gray-600 mb-4">
            {t('listingDetails.errors.notFoundDescription')}
          </p>
          <Button onClick={() => navigate("/listings")}>
            <ArrowLeft className={`w-4 h-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
            {t('listingDetails.errors.backToListings')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {listing && (
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Breadcrumb */}
          <div className="mb-6">
            <nav className={`text-sm text-gray-500 ${isRtl ? 'font-arabic text-right' : ''}`}>
              <button
                onClick={() => navigate("/")}
                className="hover:text-blue-600 transition-colors"
              >
                {t('listingDetails.breadcrumb.home')}
              </button>
              <span className="mx-2">/</span>
              <button
                onClick={() => navigate("/listings")}
                className="hover:text-blue-600 transition-colors"
              >
                {t('listingDetails.breadcrumb.listings')}
              </button>
              <span className="mx-2">/</span>
              <span className="text-gray-900">
                {language === "ar" ? listing.title_ar : listing.title_en || t('listingDetails.breadcrumb.businessListing')}
              </span>
            </nav>
          </div>

          {/* Image Gallery */}
          <div className="mb-8">
            {listing.images && listing.images.length > 0 ? (
              <div className="space-y-4">
                {/* Main Image Carousel */}
                <div className="relative h-80 rounded-lg overflow-hidden bg-gray-100">
                  <div
                    className="flex transition-transform duration-500 ease-in-out h-full"
                    style={{
                      transform: `translateX(-${currentImageIndex * 100}%)`,
                    }}
                  >
                    {listing.images.map((image, index) => (
                      <div key={index} className="w-full h-full flex-shrink-0">
                        <img
                          src={image}
                          alt={`${listing.title_en || "Business listing"} - Image ${index + 1}`}
                          className="w-full h-full object-cover"
                          loading={index === 0 ? "eager" : "lazy"}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Navigation arrows for multiple images */}
                  {listing.images.length > 1 && (
                    <>
                      <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setCurrentImageIndex((prev) =>
                            prev === 0 ? listing.images!.length - 1 : prev - 1,
                          );
                        }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-3 rounded-full transition-all duration-200 hover:scale-110 z-20 shadow-lg select-none"
                        type="button"
                        aria-label="Previous image"
                        tabIndex={-1}
                      >
                        <ChevronLeft className="w-5 h-5 pointer-events-none" />
                      </button>

                      <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setCurrentImageIndex((prev) =>
                            prev === listing.images!.length - 1 ? 0 : prev + 1,
                          );
                        }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-3 rounded-full transition-all duration-200 hover:scale-110 z-20 shadow-lg select-none"
                        type="button"
                        aria-label="Next image"
                        tabIndex={-1}
                      >
                        <ChevronRight className="w-5 h-5 pointer-events-none" />
                      </button>

                      {/* Image dots indicator */}
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                        {listing.images.map((_, index) => (
                          <button
                            key={index}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setCurrentImageIndex(index);
                            }}
                            className={`w-2 h-2 rounded-full transition-all duration-200 select-none ${
                              index === currentImageIndex
                                ? "bg-white scale-125"
                                : "bg-white/60 hover:bg-white/80"
                            }`}
                            type="button"
                            aria-label={`Go to image ${index + 1}`}
                            tabIndex={-1}
                          />
                        ))}
                      </div>

                      {/* Image counter */}
                      <div className="absolute bottom-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm font-medium z-20">
                        {currentImageIndex + 1} / {listing.images.length}
                      </div>
                    </>
                  )}
                </div>

                {/* Thumbnail strip for multiple images */}
                {listing.images.length > 1 && (
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {listing.images.map((image, index) => (
                      <button
                        key={index}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setCurrentImageIndex(index);
                        }}
                        className={`flex-shrink-0 w-24 h-16 rounded-lg overflow-hidden border-2 transition-all duration-300 hover:scale-105 select-none ${
                          index === currentImageIndex
                            ? "border-blue-500 ring-2 ring-blue-200 scale-105"
                            : "border-gray-300 hover:border-blue-400"
                        }`}
                        type="button"
                        aria-label={`View image ${index + 1}`}
                        tabIndex={-1}
                      >
                        <img
                          src={image}
                          alt={`Thumbnail ${index + 1}`}
                          className="w-full h-full object-cover pointer-events-none"
                          loading="lazy"
                          draggable={false}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Fallback to default image if no images uploaded */
              <img
                src={
                  listing.imageUrl ||
                  "https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                }
                alt={listing.title_en || "Business listing"}
                className="w-full h-80 object-cover rounded-lg"
              />
            )}
          </div>

          {/* Content Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Title and Basic Info */}
              <div>
                <div className={`flex justify-between items-start mb-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <div className={isRtl ? 'text-right' : ''}>
                    <h1 className={`text-3xl font-bold text-gray-900 mb-2 ${isRtl ? 'font-arabic' : ''}`}>
                      {language === "ar" ? listing.title_ar : listing.title_en}
                    </h1>
                    <p className={`text-2xl font-bold text-blue-600 ${isRtl ? 'font-arabic' : ''}`}>
                      {formatCurrency(listing.askingPrice)}
                    </p>
                  </div>
                  {/* Show Edit button only to listing owner */}
                  {user && listing.userId === user.id && (
                    <Button
                      onClick={() => navigate(`/listings/${id}/edit`)}
                      variant="outline"
                      className={`${isRtl ? 'mr-4' : 'ml-4'}`}
                    >
                      {t('listingDetails.actions.editListing')}
                    </Button>
                  )}
                </div>

                <div className={`flex flex-wrap gap-4 text-sm text-gray-600 mb-6 ${isRtl ? 'font-arabic' : ''}`}>
                  <div className="flex items-center">
                    <MapPin className={`h-4 w-4 ${isRtl ? 'ml-1' : 'mr-1'}`} />
                    {getTranslatedLocation(listing.location, t)}
                  </div>
                  <div className="flex items-center">
                    <Building className={`h-4 w-4 ${isRtl ? 'ml-1' : 'mr-1'}`} />
                    {getTranslatedIndustry(listing.industry, t)}
                  </div>
                  {listing.establishedDate && (
                    <div className="flex items-center">
                      <Calendar className={`h-4 w-4 ${isRtl ? 'ml-1' : 'mr-1'}`} />
                      {t('listingDetails.businessOverview.yearEstablished')} {listing.establishedDate}
                    </div>
                  )}
                </div>

                <p className={`text-gray-700 leading-relaxed mb-6 ${isRtl ? 'font-arabic text-right' : ''}`}>
                  {language === "ar" ? listing.description_ar : listing.description_en}
                </p>
              </div>

              {/* Business Details Grid */}
              {(listing.employees ||
                listing.yearEstablished ||
                listing.monthlyRevenue ||
                listing.monthlyProfit) && (
                <div>
                  <h2 className={`text-xl font-bold text-gray-900 mb-4 ${isRtl ? 'font-arabic text-right' : ''}`}>
                    {t('listingDetails.businessOverview.title')}
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {listing.employees && (
                      <div className={`bg-blue-50 rounded-lg p-4 ${isRtl ? 'text-right' : ''}`}>
                        <div className={`text-2xl font-bold text-blue-600 ${isRtl ? 'font-arabic' : ''}`}>
                          {listing.employees}
                        </div>
                        <div className={`text-sm text-gray-600 ${isRtl ? 'font-arabic' : ''}`}>
                          {t('listingDetails.businessOverview.employees')}
                        </div>
                      </div>
                    )}
                    {listing.yearEstablished && (
                      <div className={`bg-green-50 rounded-lg p-4 ${isRtl ? 'text-right' : ''}`}>
                        <div className={`text-2xl font-bold text-green-600 ${isRtl ? 'font-arabic' : ''}`}>
                          {listing.yearEstablished}
                        </div>
                        <div className={`text-sm text-gray-600 ${isRtl ? 'font-arabic' : ''}`}>
                          {t('listingDetails.businessOverview.yearEstablished')}
                        </div>
                      </div>
                    )}
                    {listing.monthlyRevenue && (
                      <div className={`bg-purple-50 rounded-lg p-4 ${isRtl ? 'text-right' : ''}`}>
                        <div className={`text-2xl font-bold text-purple-600 ${isRtl ? 'font-arabic' : ''}`}>
                          {formatCurrency(listing.monthlyRevenue)}
                        </div>
                        <div className={`text-sm text-gray-600 ${isRtl ? 'font-arabic' : ''}`}>
                          {t('listingDetails.businessOverview.monthlyRevenue')}
                        </div>
                      </div>
                    )}
                    {listing.monthlyProfit && (
                      <div className={`bg-yellow-50 rounded-lg p-4 ${isRtl ? 'text-right' : ''}`}>
                        <div className={`text-2xl font-bold text-yellow-600 ${isRtl ? 'font-arabic' : ''}`}>
                          {formatCurrency(listing.monthlyProfit)}
                        </div>
                        <div className={`text-sm text-gray-600 ${isRtl ? 'font-arabic' : ''}`}>
                          {t('listingDetails.businessOverview.monthlyProfit')}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Reason for Selling */}
              {listing.reasonForSelling && (
                <div>
                  <h2 className={`text-xl font-bold text-gray-900 mb-4 ${isRtl ? 'font-arabic text-right' : ''}`}>
                    {t('listingDetails.sellingReason.title')}
                  </h2>
                  <div className="bg-gray-50 rounded-lg p-6">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {listing.reasonForSelling}
                    </p>
                  </div>
                </div>
              )}

              {/* Assets and Liabilities */}
              {(listing.assets || listing.liabilities) && (
                <div>
                  <h2 className={`text-xl font-bold text-gray-900 mb-4 ${isRtl ? 'font-arabic text-right' : ''}`}>
                    {t('listingDetails.assetsLiabilities.title')}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {listing.assets && (
                      <div className="bg-green-50 rounded-lg p-6">
                        <h3 className={`font-semibold text-green-800 mb-3 ${isRtl ? 'font-arabic text-right' : ''}`}>
                          {t('listingDetails.assetsLiabilities.assetsIncluded')}
                        </h3>
                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                          {listing.assets}
                        </p>
                      </div>
                    )}
                    {listing.liabilities && (
                      <div className="bg-red-50 rounded-lg p-6">
                        <h3 className={`font-semibold text-red-800 mb-3 ${isRtl ? 'font-arabic text-right' : ''}`}>
                          {t('listingDetails.assetsLiabilities.liabilities')}
                        </h3>
                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                          {listing.liabilities}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Training and Support */}
              {(listing.training || listing.support || listing.timeframe) && (
                <div>
                  <h2 className={`text-xl font-bold text-gray-900 mb-4 ${isRtl ? 'font-arabic text-right' : ''}`}>
                    {t('listingDetails.trainingSupport.title')}
                  </h2>
                  <div className="space-y-4">
                    {listing.timeframe && (
                      <div className="bg-blue-50 rounded-lg p-4">
                        <h3 className={`font-semibold text-blue-800 mb-2 ${isRtl ? 'font-arabic text-right' : ''}`}>
                          {t('listingDetails.trainingSupport.saleTimeframe')}
                        </h3>
                        <p className="text-gray-700">{listing.timeframe}</p>
                      </div>
                    )}
                    {listing.training && (
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h3 className={`font-semibold text-gray-800 mb-3 ${isRtl ? 'font-arabic text-right' : ''}`}>
                          {t('listingDetails.trainingSupport.trainingProvided')}
                        </h3>
                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                          {listing.training}
                        </p>
                      </div>
                    )}
                    {listing.support && (
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h3 className={`font-semibold text-gray-800 mb-3 ${isRtl ? 'font-arabic text-right' : ''}`}>
                          {t('listingDetails.trainingSupport.postSaleSupport')}
                        </h3>
                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                          {listing.support}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Business Plan Section */}
              {listing.businessPlan && (
                <div>
                  <h2 className={`text-xl font-bold text-gray-900 mb-4 ${isRtl ? 'font-arabic text-right' : ''}`}>
                    {t('listingDetails.businessPlan.title')}
                  </h2>
                  <div className="bg-gray-50 rounded-lg p-6">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {listing.businessPlan}
                    </p>
                  </div>
                </div>
              )}

              {/* Financial Information */}
              {listing.financials && (
                <div>
                  <h2 className={`text-xl font-bold text-gray-900 mb-4 ${isRtl ? 'font-arabic text-right' : ''}`}>
                    {t('listingDetails.financialInfo.title')}
                  </h2>
                  <div className="bg-gray-50 rounded-lg p-6">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {listing.financials}
                    </p>
                  </div>
                </div>
              )}

              {/* Additional Financial Details */}
              {listing.price && listing.price > 0 && (
                <div>
                  <h2 className={`text-xl font-bold text-gray-900 mb-4 ${isRtl ? 'font-arabic text-right' : ''}`}>
                    {t('listingDetails.financialInfo.currentValuePerformance')}
                  </h2>
                  <div className="bg-blue-50 rounded-lg p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h3 className={`font-medium text-gray-900 mb-2 ${isRtl ? 'font-arabic text-right' : ''}`}>
                          {t('listingDetails.financialInfo.currentPriceRevenue')}
                        </h3>
                        <p className="text-2xl font-bold text-blue-600">
                          {formatCurrency(listing.price)}
                        </p>
                      </div>
                      <div>
                        <h3 className={`font-medium text-gray-900 mb-2 ${isRtl ? 'font-arabic text-right' : ''}`}>
                          {t('listingDetails.financialInfo.askingPrice')}
                        </h3>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(listing.askingPrice)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Documents & Resources */}
              <DocumentsSection listingId={listing.id} />
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-6">
              {/* Contact Seller Action */}
              {user?.id !== listing.userId && (
                <div className={`bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200 ${isRtl ? 'text-right' : ''}`}>
                  <h3 className={`text-lg font-semibold text-gray-900 mb-3 ${isRtl ? 'font-arabic' : ''}`}>
                    {t('listingDetails.seller.contactSeller')}
                  </h3>
                  <p className={`text-gray-600 mb-4 ${isRtl ? 'font-arabic' : ''}`}>
                    {t('listingDetails.seller.contactDescription')}
                  </p>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => setIsContactModalOpen(true)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {t('listingDetails.actions.contactSeller')}
                    </Button>
                    <SaveButton listingId={listing.id} />
                  </div>
                </div>
              )}

              {/* Owner Info */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className={`text-lg font-semibold text-gray-900 mb-4 ${isRtl ? 'font-arabic text-right' : ''}`}>
                  {t('listingDetails.seller.title')}
                </h3>
                {seller ? (
                  <>
                    <div className={`flex items-center mb-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
                      <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {seller.fullName
                          ? seller.fullName.charAt(0).toUpperCase()
                          : seller.username.charAt(0).toUpperCase()}
                      </div>
                      <div className={`${isRtl ? 'mr-3' : 'ml-3'} flex-1`}>
                        <p className={`font-bold text-gray-900 ${isRtl ? 'font-arabic text-right' : ''}`}>
                          {seller.fullName || seller.username}
                        </p>
                        <div className={`flex items-center text-sm text-gray-600 ${isRtl ? 'font-arabic flex-row-reverse justify-end' : ''}`}>
                          {seller.verified && (
                            <span className={`text-green-600 ${isRtl ? 'ml-2' : 'mr-2'}`}>
                              ✓ {t('listingDetails.seller.verified')}
                            </span>
                          )}
                          <span className="capitalize">
                            {getTranslatedUserRole(seller.role, t)} {t('listingDetails.seller.seller')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {seller.bio && (
                      <p className={`text-sm text-gray-600 mb-4 ${isRtl ? 'font-arabic text-right' : ''}`}>{seller.bio}</p>
                    )}

                    {seller.company && (
                      <div className={`mb-4 ${isRtl ? 'text-right' : ''}`}>
                        <p className={`text-sm font-medium text-gray-900 mb-1 ${isRtl ? 'font-arabic' : ''}`}>
                          {t('listingDetails.seller.company')}
                        </p>
                        <p className={`text-sm text-gray-600 ${isRtl ? 'font-arabic' : ''}`}>
                          {seller.company}
                        </p>
                      </div>
                    )}

                    {seller.location && (
                      <div className={`mb-4 ${isRtl ? 'text-right' : ''}`}>
                        <p className={`text-sm font-medium text-gray-900 mb-1 ${isRtl ? 'font-arabic' : ''}`}>
                          {t('listingDetails.seller.location')}
                        </p>
                        <p className={`text-sm text-gray-600 ${isRtl ? 'font-arabic' : ''}`}>
                          {getTranslatedLocation(seller.location, t)}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="animate-pulse">
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
                      <div className="ml-3">
                        <div className="h-4 bg-gray-300 rounded w-24 mb-2"></div>
                        <div className="h-3 bg-gray-300 rounded w-16"></div>
                      </div>
                    </div>
                    <div className="h-3 bg-gray-300 rounded w-full mb-2"></div>
                    <div className="h-3 bg-gray-300 rounded w-3/4"></div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Similar Businesses */}
          {similarListings && similarListings.length > 0 && (
            <div className="mt-20 mb-20">
              <h2 className={`text-2xl font-bold text-gray-900 mb-8 ${isRtl ? 'font-arabic text-right' : ''}`}>
                {t('listingDetails.similarListings.title')}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {similarListings.slice(0, 4).map((similar: any) => {
                  // Fallback images only when no uploaded images exist
                  const fallbackImages = [
                    "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
                    "https://images.unsplash.com/photo-1441986300917-64674bd600d8?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
                    "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
                    "https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
                  ];
                  const imageIndex = similar.id % fallbackImages.length;

                  // Prioritize uploaded images, then imageUrl, then fallback
                  let imageUrl =
                    similar.images?.[0] ||
                    similar.imageUrl ||
                    fallbackImages[imageIndex];

                  // Only use fallback if no actual images exist
                  if (
                    !imageUrl ||
                    imageUrl === "/placeholder.jpg" ||
                    imageUrl === "placeholder.svg"
                  ) {
                    imageUrl = fallbackImages[imageIndex];
                  }

                  return (
                    <div
                      key={similar.id}
                      className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
                      onClick={() => navigate(`/listings/${similar.id}`)}
                    >
                      <img
                        src={imageUrl}
                        alt={language === "ar" ? similar.title_ar || similar.title_en : similar.title_en || similar.title_ar || "Business listing"}
                        className="w-full h-48 object-cover"
                      />
                      <div className={`p-5 ${isRtl ? 'text-right' : ''}`}>
                        <h3 className={`font-bold text-gray-900 mb-2 text-sm leading-tight ${isRtl ? 'font-arabic' : ''}`}>
                          {language === "ar" ? similar.title_ar || similar.title_en : similar.title_en || similar.title_ar}
                        </h3>
                        <div className={`text-xs text-gray-600 mb-3 flex items-center ${isRtl ? 'font-arabic flex-row-reverse' : ''}`}>
                          <MapPin className={`h-3 w-3 ${isRtl ? 'ml-1' : 'mr-1'}`} />
                          <span>{getTranslatedLocation(similar.location, t)}</span>
                        </div>
                        <p className={`text-sm font-bold text-blue-600 ${isRtl ? 'font-arabic' : ''}`}>
                          {formatCurrency(similar.askingPrice)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Contact Seller Modal */}
      {listing && (
        <ContactSellerModal
          isOpen={isContactModalOpen}
          onClose={() => setIsContactModalOpen(false)}
          listingId={listing.id}
          listingTitle={
            language === "ar" ? listing.title_ar || listing.title_en : listing.title_en || listing.title_ar || t('listingDetails.breadcrumb.businessListing')
          }
          isAuthenticated={!!user}
        />
      )}

      <Footer />
    </div>
  );
}
