import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BUSINESS_CATEGORIES,
  LOCATIONS,
  TRANSACTION_TYPES,
} from "@shared/types";
import { Search, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useRTL } from "@/hooks/use-rtl";
import { EditableText } from "@/components/ui/editable-text";

// Helper functions to convert values to translation keys
const getLocationKey = (location: string) => {
  return location.toLowerCase().replace(/\s+/g, '').replace(/[^a-z]/g, '');
};

const getTransactionTypeKey = (type: string) => {
  return type.toLowerCase().replace(/\s+/g, '').replace(/[^a-z]/g, '');
};

export default function SearchSection() {
  const { t } = useTranslation();
  const { isRtl } = useRTL();
  const [, navigate] = useLocation();
  const [industry, setIndustry] = useState<string | undefined>(undefined);
  const [location, setLocation] = useState<string | undefined>(undefined);
  const [saleType, setSaleType] = useState<string | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    setIsSearching(true);
    
    // Build search parameters
    const params = new URLSearchParams();
    if (searchTerm) params.set("search", searchTerm);
    if (industry && industry !== "all") params.set("industry", industry);
    if (location && location !== "all") params.set("location", location);
    if (saleType && saleType !== "all") params.set("saleType", saleType);

    // Navigate to listings page with search parameters
    const searchQuery = params.toString();
    navigate(`/listings${searchQuery ? `?${searchQuery}` : ""}`);
    
    setIsSearching(false);
  };

  return (
    <section
      className="bg-white py-8"
      role="search"
      aria-label="Business opportunity search"
    >
      <div className="container mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg -mt-8 md:-mt-16 p-4 md:p-6 z-10 relative">
          <h2 className={`text-lg md:text-xl font-medium text-neutral-700 mb-4 ${isRtl ? 'font-arabic' : ''}`}>
            <EditableText
              translationKey="home.searchSection.title"
              section="home"
              keyName="searchSection.title"
              as="span"
            />
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search Field */}
            <div className="relative">
              <label className={`block text-sm font-medium text-neutral-500 mb-1 ${isRtl ? 'font-arabic' : ''}`}>
                <EditableText
                  translationKey="home.searchSection.searchLabel"
                  section="home"
                  keyName="searchSection.searchLabel"
                  as="span"
                />
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder={t('home.searchSection.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full p-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRtl ? 'text-right font-arabic' : ''}`}
                  dir={isRtl ? 'rtl' : 'ltr'}
                />
                <Search className={`absolute ${isRtl ? 'left-3' : 'right-3'} top-3.5 h-4 w-4 text-neutral-400`} />
              </div>
            </div>

            {/* Industry Dropdown */}
            <div className="relative">
              <label className={`block text-sm font-medium text-neutral-500 mb-1 ${isRtl ? 'font-arabic' : ''}`}>
                <EditableText
                  translationKey="home.searchSection.industry"
                  section="home"
                  keyName="searchSection.industry"
                  as="span"
                />
              </label>
              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger className={`${isRtl ? 'text-right font-arabic' : ''}`}>
                  <SelectValue placeholder={t('home.searchSection.allIndustries')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('home.searchSection.allIndustries')}</SelectItem>
                  {BUSINESS_CATEGORIES.map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {t(`home.categories.${category.id}`) || category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Location Dropdown */}
            <div className="relative">
              <label className={`block text-sm font-medium text-neutral-500 mb-1 ${isRtl ? 'font-arabic' : ''}`}>
                <EditableText
                  translationKey="home.searchSection.location"
                  section="home"
                  keyName="searchSection.location"
                  as="span"
                />
              </label>
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger className={`${isRtl ? 'text-right font-arabic' : ''}`}>
                  <SelectValue placeholder={t('home.searchSection.allLocations')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('home.searchSection.allLocations')}</SelectItem>
                  {LOCATIONS.map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {t(`common.locations.${getLocationKey(loc)}`) || loc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Transaction Type Dropdown */}
            <div className="relative">
              <label className={`block text-sm font-medium text-neutral-500 mb-1 ${isRtl ? 'font-arabic' : ''}`}>
                <EditableText
                  translationKey="home.searchSection.transactionType"
                  section="home"
                  keyName="searchSection.transactionType"
                  as="span"
                />
              </label>
              <Select value={saleType} onValueChange={setSaleType}>
                <SelectTrigger className={`${isRtl ? 'text-right font-arabic' : ''}`}>
                  <SelectValue placeholder={t('home.searchSection.allTypes')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('home.searchSection.allTypes')}</SelectItem>
                  {TRANSACTION_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {t(`common.transactionTypes.${getTransactionTypeKey(type)}`) || type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search Button */}
            <div className="relative">
              <label className="block text-sm font-medium text-transparent mb-1">
                Search
              </label>
              <Button
                onClick={handleSearch}
                disabled={isSearching}
                className={`w-full p-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition duration-300 ${isRtl ? 'font-arabic' : ''}`}
              >
                {isSearching ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {t('common.loading')}
                  </div>
                ) : (
                  <EditableText
                    translationKey="home.searchSection.searchButton"
                    section="home"
                    keyName="searchSection.searchButton"
                    as="span"
                  />
                )}
              </Button>
            </div>
          </div>

          {/* Advanced filters toggle */}
          <div className="mt-4">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors ${isRtl ? 'space-x-reverse font-arabic' : ''}`}
            >
              <span className="text-sm font-medium">{t('home.searchSection.advancedFilters')}</span>
              {showAdvanced ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {/* Advanced Filters Content */}
            {showAdvanced && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                {/* Verified Only Filter */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="verified"
                    className="rounded border-neutral-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="verified" className={`text-sm font-medium text-gray-700 ${isRtl ? 'font-arabic' : ''}`}>
                    {t('home.searchSection.verifiedOnly')}
                  </label>
                </div>

                {/* Business Age Filter */}
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRtl ? 'font-arabic' : ''}`}>
                    {t('home.searchSection.businessAge')}
                  </label>
                  <Select>
                    <SelectTrigger className={`w-full ${isRtl ? 'text-right font-arabic' : ''}`}>
                      <SelectValue placeholder={t('home.searchSection.anyAge')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">{t('home.searchSection.anyAge')}</SelectItem>
                      <SelectItem value="0-1">0-1 Years</SelectItem>
                      <SelectItem value="1-5">1-5 Years</SelectItem>
                      <SelectItem value="5-10">5-10 Years</SelectItem>
                      <SelectItem value="10+">10+ Years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Price Range Filter */}
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRtl ? 'font-arabic' : ''}`}>
                    {t('home.searchSection.priceRange')}
                  </label>
                  <div className={`flex gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <input
                      type="number"
                      placeholder={t('home.searchSection.minPrice')}
                      className={`flex-1 p-2 border border-neutral-300 rounded-lg text-sm ${isRtl ? 'text-right font-arabic' : ''}`}
                      dir={isRtl ? 'rtl' : 'ltr'}
                    />
                    <input
                      type="number"
                      placeholder={t('home.searchSection.maxPrice')}
                      className={`flex-1 p-2 border border-neutral-300 rounded-lg text-sm ${isRtl ? 'text-right font-arabic' : ''}`}
                      dir={isRtl ? 'rtl' : 'ltr'}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}