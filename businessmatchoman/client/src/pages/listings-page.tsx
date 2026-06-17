import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Listing } from "@shared/schema";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import MobileNavigation from "@/components/layout/mobile-navigation";
import ListingCard from "@/components/listings/listing-card";
import SearchFilters from "@/components/listings/search-filters";
import { useLanguage } from "@/hooks/use-language";
import { useTranslation } from "react-i18next";
import { EditableText } from "@/components/ui/editable-text";
import { useRTL } from "@/hooks/use-rtl";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PageTransition } from "@/components/ui/page-transition";

export default function ListingsPage() {
  // Force scroll to top when this page loads
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    console.log('📋 ListingsPage loaded - forced scroll to top');
  }, []);

  // Filters state
  const [industry, setIndustry] = useState<string>("all");
  const [location, setLocation] = useState<string>("all");
  const [saleType, setSaleType] = useState<string>("all");
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Advanced filters state
  const [priceRange, setPriceRange] = useState<number[]>([0, 100]);
  const [businessAge, setBusinessAge] = useState<string>("any");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [hasFinancials, setHasFinancials] = useState(false);
  const [hasDocuments, setHasDocuments] = useState(false);

  // Get the user's language preference
  const { language } = useLanguage();
  const { t } = useTranslation();
  const { isRtl } = useRTL();

  // Initialize filters from URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("industry")) setIndustry(params.get("industry") || "all");
    if (params.get("location")) setLocation(params.get("location") || "all");
    if (params.get("saleType")) setSaleType(params.get("saleType") || "all");
    if (params.get("search")) setSearchTerm(params.get("search") || "");
    if (params.get("businessAge"))
      setBusinessAge(params.get("businessAge") || "any");
    if (params.get("verifiedOnly"))
      setVerifiedOnly(params.get("verifiedOnly") === "true");
    if (params.get("featuredOnly"))
      setFeaturedOnly(params.get("featuredOnly") === "true");
    if (params.get("hasFinancials"))
      setHasFinancials(params.get("hasFinancials") === "true");
    if (params.get("hasDocuments"))
      setHasDocuments(params.get("hasDocuments") === "true");
    if (params.get("sortBy")) setSortBy(params.get("sortBy") || "newest");
    if (params.get("page")) setCurrentPage(parseInt(params.get("page") || "1"));

    // Price range handling
    const minPrice = params.get("minPrice");
    const maxPrice = params.get("maxPrice");
    if (minPrice || maxPrice) {
      const min = minPrice ? Math.floor(parseInt(minPrice) / 1000) : 0;
      const max = maxPrice
        ? parseInt(maxPrice) >= 1000000
          ? 100
          : Math.floor(parseInt(maxPrice) / 10000)
        : 100;
      setPriceRange([min, max]);
    }
  }, []);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (industry !== "all") params.set("industry", industry);
    if (location !== "all") params.set("location", location);
    if (saleType !== "all") params.set("saleType", saleType);
    if (searchTerm.trim()) params.set("search", searchTerm.trim());
    if (businessAge !== "any") params.set("businessAge", businessAge);
    if (verifiedOnly) params.set("verifiedOnly", "true");
    if (featuredOnly) params.set("featuredOnly", "true");
    if (hasFinancials) params.set("hasFinancials", "true");
    if (hasDocuments) params.set("hasDocuments", "true");
    if (sortBy !== "newest") params.set("sortBy", sortBy);
    if (currentPage !== 1) params.set("page", currentPage.toString());

    // Price range
    if (priceRange[0] > 0 || priceRange[1] < 100) {
      const minPrice = priceRange[0] * 1000;
      const maxPrice = priceRange[1] === 100 ? 1000000 : priceRange[1] * 10000;
      params.set("minPrice", minPrice.toString());
      params.set("maxPrice", maxPrice.toString());
    }

    const newUrl = `${window.location.pathname}${params.toString() ? "?" + params.toString() : ""}`;
    window.history.replaceState({}, "", newUrl);
  }, [
    industry,
    location,
    saleType,
    searchTerm,
    businessAge,
    verifiedOnly,
    featuredOnly,
    hasFinancials,
    hasDocuments,
    sortBy,
    currentPage,
    priceRange,
  ]);

  // Fetch listings with filters and pagination
  const {
    data: listingsResponse,
    isLoading,
    error,
    refetch,
  } = useQuery<{
    data: Listing[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }>({
    queryKey: [
      "/api/listings",
      {
        industry,
        location,
        saleType,
        language,
        page: currentPage,
        search: searchTerm,
        priceRange,
        businessAge,
        verifiedOnly,
        featuredOnly,
        hasFinancials,
        hasDocuments,
        sortBy,
      },
    ],
    queryFn: async ({ queryKey }) => {
      // Build query string from filters
      const params = new URLSearchParams();
      if (industry && industry !== "all") params.append("industry", industry);
      if (location && location !== "all") params.append("location", location);
      if (saleType && saleType !== "all") params.append("saleType", saleType);
      if (searchTerm.trim()) params.append("search", searchTerm.trim());
      if (businessAge && businessAge !== "any")
        params.append("businessAge", businessAge);
      if (verifiedOnly) params.append("verifiedOnly", "true");
      if (featuredOnly) params.append("featuredOnly", "true");
      if (hasFinancials) params.append("hasFinancials", "true");
      if (hasDocuments) params.append("hasDocuments", "true");
      if (sortBy) params.append("sortBy", sortBy);

      // Price range filter
      if (priceRange[0] > 0 || priceRange[1] < 100) {
        const minPrice = priceRange[0] * 1000;
        const maxPrice =
          priceRange[1] === 100 ? 1000000 : priceRange[1] * 10000;
        params.append("minPrice", minPrice.toString());
        params.append("maxPrice", maxPrice.toString());
      }

      params.append("language", language);
      params.append("page", currentPage.toString());
      params.append("limit", "12"); // Reasonable page size

      const response = await fetch(`/api/listings?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch listings");
      }
      return response.json();
    },
  });

  // Extract listings array from paginated response (already sorted by backend)
  const listings = listingsResponse?.data || [];

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      handlePageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (listingsResponse?.pagination.hasNext) {
      handlePageChange(currentPage + 1);
    }
  };

  // Reset filters
  const resetFilters = () => {
    setIndustry("all");
    setLocation("all");
    setSaleType("all");
    setPriceRange([0, 100]);
    setBusinessAge("any");
    setVerifiedOnly(false);
    setFeaturedOnly(false);
    setHasFinancials(false);
    setHasDocuments(false);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <PageTransition>
        <main className="flex-1 py-8 bg-neutral-100">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
              {/* Filters Section */}
              <div className="w-full md:w-64 lg:w-72 bg-white p-4 rounded-lg shadow">
                <div className={`flex justify-between items-center mb-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <h2 className={`text-lg font-semibold ${isRtl ? 'font-arabic' : ''}`}>
                    <EditableText
                      translationKey="listings.filters.search"
                      section="listings"
                      keyName="filters.search"
                      as="span"
                    />
                  </h2>
                  <Button variant="ghost" size="sm" onClick={resetFilters}>
                    <EditableText
                      translationKey="listings.filters.clearFilters"
                      section="listings"
                      keyName="filters.clearFilters"
                      as="span"
                    />
                  </Button>
                </div>
                <SearchFilters
                  industry={industry}
                  location={location}
                  saleType={saleType}
                  priceRange={priceRange}
                  businessAge={businessAge}
                  verifiedOnly={verifiedOnly}
                  featuredOnly={featuredOnly}
                  hasFinancials={hasFinancials}
                  hasDocuments={hasDocuments}
                  searchTerm={searchTerm}
                  onIndustryChange={setIndustry}
                  onLocationChange={setLocation}
                  onSaleTypeChange={setSaleType}
                  onPriceRangeChange={setPriceRange}
                  onBusinessAgeChange={setBusinessAge}
                  onVerifiedOnlyChange={setVerifiedOnly}
                  onFeaturedOnlyChange={setFeaturedOnly}
                  onHasFinancialsChange={setHasFinancials}
                  onHasDocumentsChange={setHasDocuments}
                  onSearchChange={setSearchTerm}
                />
              </div>

              {/* Listings Section */}
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                  <div className={isRtl ? 'text-right' : ''}>
                    <h1 className={`text-2xl font-bold mb-2 ${isRtl ? 'font-arabic' : ''}`}>
                      <EditableText
                        translationKey="listings.title"
                        section="listings"
                        keyName="title"
                        as="span"
                      />
                    </h1>
                    {listingsResponse?.pagination && (
                      <p className={`text-sm text-neutral-600 ${isRtl ? 'font-arabic' : ''}`}>
                        <EditableText
                          translationKey="listings.results.showing"
                          section="listings"
                          keyName="results.showing"
                          as="span"
                        /> {listings.length} <EditableText
                          translationKey="listings.results.of"
                          section="listings"
                          keyName="results.of"
                          as="span"
                        />{" "}
                        {listingsResponse.pagination.total} <EditableText
                          translationKey="listings.results.results"
                          section="listings"
                          keyName="results.results"
                          as="span"
                        />
                      </p>
                    )}
                  </div>
                  <div className={`flex items-center ${isRtl ? 'flex-row-reverse space-x-reverse space-x-2' : 'space-x-2'}`}>
                    <span className={`text-sm text-neutral-500 ${isRtl ? 'font-arabic' : ''}`}>
                      <EditableText
                        translationKey="listings.sort.label"
                        section="listings"
                        keyName="sort.label"
                        as="span"
                      />:
                    </span>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder={t('listings.sort.label')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">{t('listings.sort.newest')}</SelectItem>
                        <SelectItem value="oldest">{t('listings.sort.oldest')}</SelectItem>
                        <SelectItem value="price-high">
                          {t('listings.sort.priceHighToLow')}
                        </SelectItem>
                        <SelectItem value="price-low">
                          {t('listings.sort.priceLowToHigh')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Loading state */}
                {isLoading && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-100">
                        <div className="h-48 bg-gray-200 animate-pulse" />
                        <div className="p-4 space-y-3">
                          <div className="h-6 w-3/4 bg-gray-200 rounded animate-pulse" />
                          <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
                          <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                          <div className="h-4 w-5/6 bg-gray-200 rounded animate-pulse" />
                          <div className="flex justify-between items-center pt-2">
                            <div className="h-5 w-20 bg-gray-200 rounded animate-pulse" />
                            <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Error state */}
                {error && (
                  <Alert variant="destructive" className="mb-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle className={isRtl ? 'font-arabic' : ''}>{t('common.error')}</AlertTitle>
                    <AlertDescription className={isRtl ? 'font-arabic' : ''}>
                      {error instanceof Error
                        ? error.message
                        : t('common.errorMessage')}
                    </AlertDescription>
                  </Alert>
                )}

                {/* No results state */}
                {!isLoading && listings && listings.length === 0 && (
                  <div className={`bg-white rounded-lg p-8 text-center ${isRtl ? 'font-arabic' : ''}`}>
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neutral-100 mb-4">
                      <span className="material-icons text-neutral-500 text-3xl">
                        search_off
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold mb-2">
                      {t('listings.results.noResults')}
                    </h3>
                    <p className="text-neutral-500 mb-4">
                      {t('listings.results.tryDifferentFilters')}
                    </p>
                    <Button onClick={resetFilters}>
                      <EditableText
                        translationKey="listings.filters.clearFilters"
                        section="listings"
                        keyName="filters.clearFilters"
                        as="span"
                      />
                    </Button>
                  </div>
                )}

                {/* Listings grid */}
                {!isLoading && listings && listings.length > 0 && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {listings.map((listing) => (
                        <ListingCard key={listing.id} listing={listing} />
                      ))}
                    </div>
                    {/* Pagination Controls */}
                    {listingsResponse?.pagination &&
                      listingsResponse.pagination.totalPages > 1 && (
                        <div className={`mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 ${isRtl ? 'sm:flex-row-reverse' : ''}`}>
                          {/* Page Info */}
                          <div className={`text-sm text-gray-600 ${isRtl ? 'font-arabic' : ''}`}>
                            {t('listings.pagination.page')} {currentPage} {t('listings.pagination.of')}{" "}
                            {listingsResponse.pagination.totalPages} (
                            {listingsResponse.pagination.total} {t('listings.pagination.totalResults')})
                          </div>

                          {/* Pagination Controls */}
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handlePrevPage}
                              disabled={currentPage === 1}
                              aria-label={t('listings.pagination.previousPage')}
                            >
                              {isRtl ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                              {t('listings.pagination.previous')}
                            </Button>

                            {/* Page Numbers */}
                            <div className="flex items-center gap-1">
                              {Array.from(
                                {
                                  length: Math.min(
                                    5,
                                    listingsResponse.pagination.totalPages,
                                  ),
                                },
                                (_, i) => {
                                  const totalPages =
                                    listingsResponse.pagination.totalPages;
                                  let pageNum;

                                  if (totalPages <= 5) {
                                    pageNum = i + 1;
                                  } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                  } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                  } else {
                                    pageNum = currentPage - 2 + i;
                                  }

                                  return (
                                    <Button
                                      key={pageNum}
                                      variant={
                                        currentPage === pageNum
                                          ? "default"
                                          : "outline"
                                      }
                                      size="sm"
                                      onClick={() => handlePageChange(pageNum)}
                                      className="w-10 h-10"
                                      aria-label={`Page ${pageNum}`}
                                    >
                                      {pageNum}
                                    </Button>
                                  );
                                },
                              )}
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleNextPage}
                              disabled={!listingsResponse.pagination.hasNext}
                              aria-label={t('listings.pagination.nextPage')}
                            >
                              {t('listings.pagination.next')}
                              {isRtl ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                      )}
                  </>
                )}
              </div>
            </div>
          </div>
        </main>
      </PageTransition>
      <Footer />
      <MobileNavigation />
    </div>
  );
}
