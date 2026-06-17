import { useQuery } from "@tanstack/react-query";
import { Listing } from "@shared/schema";
import { useLanguage } from "@/hooks/use-language";
import { useTranslation } from "react-i18next";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import MobileNavigation from "@/components/layout/mobile-navigation";
import { PageTransition } from "@/components/ui/page-transition";
import EnhancedListingCard from "@/components/listings/enhanced-listing-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Filter,
  TrendingUp,
  Building2,
  MapPin,
  DollarSign,
  Star,
  Users,
  Briefcase,
  Target,
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

export default function BusinessShowcasePage() {
  const { language, isRtl } = useLanguage();
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [selectedSaleType, setSelectedSaleType] = useState("all");

  // Fetch all listings
  const { data: listings = [], isLoading } = useQuery<Listing[]>({
    queryKey: ["/api/listings", { language }],
  });

  // Fetch featured listings
  const { data: featuredListings = [] } = useQuery<Listing[]>({
    queryKey: ["/api/listings/featured", { language, limit: 3 }],
  });

  // Fetch category counts
  const { data: categoryCounts = [] } = useQuery<
    Array<{ category: string; count: number }>
  >({
    queryKey: ["/api/listings/counts-by-category"],
  });

  // Filter listings based on search criteria
  const filteredListings = listings.filter((listing) => {
    const titleEn = listing.title_en?.toLowerCase() || "";
    const titleAr = listing.title_ar?.toLowerCase() || "";
    const descEn = listing.description_en?.toLowerCase() || "";
    const descAr = listing.description_ar?.toLowerCase() || "";

    // Include tag search
    const tagMatch =
      listing.tags?.some(
        (tag) =>
          tag.name_en.toLowerCase().includes(searchTerm.toLowerCase()) ||
          tag.name_ar.toLowerCase().includes(searchTerm.toLowerCase()),
      ) || false;

    const matchesSearch =
      !searchTerm ||
      titleEn.includes(searchTerm.toLowerCase()) ||
      titleAr.includes(searchTerm.toLowerCase()) ||
      descEn.includes(searchTerm.toLowerCase()) ||
      descAr.includes(searchTerm.toLowerCase()) ||
      listing.industry.toLowerCase().includes(searchTerm.toLowerCase()) ||
      listing.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tagMatch;

    const matchesIndustry =
      !selectedIndustry ||
      selectedIndustry === "all" ||
      listing.industry === selectedIndustry;
    const matchesLocation =
      !selectedLocation ||
      selectedLocation === "all" ||
      listing.location === selectedLocation;
    const matchesSaleType =
      !selectedSaleType ||
      selectedSaleType === "all" ||
      listing.saleType === selectedSaleType;

    return (
      matchesSearch && matchesIndustry && matchesLocation && matchesSaleType
    );
  });

  // Check if any filters are active
  const hasActiveFilters =
    searchTerm ||
    selectedIndustry !== "all" ||
    selectedLocation !== "all" ||
    selectedSaleType !== "all";

  const industriesSet = new Set(listings.map((l) => l.industry));
  const locationsSet = new Set(listings.map((l) => l.location));
  const saleTypesSet = new Set(listings.map((l) => l.saleType));

  const industries: string[] = [];
  const locations: string[] = [];
  const saleTypes: string[] = [];

  industriesSet.forEach((item) => industries.push(item));
  locationsSet.forEach((item) => locations.push(item));
  saleTypesSet.forEach((item) => saleTypes.push(item));

  const totalInvestmentValue = listings.reduce(
    (sum, listing) => sum + (listing.askingPrice || 0),
    0,
  );

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      <PageTransition>
        <main className="flex-1">
          {/* Minimal Header */}
          <section className="border-b bg-white py-8">
            <div className="container mx-auto px-4">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-semibold text-gray-900 mb-2">
                  {language === "ar"
                    ? "فرص الاستثمار"
                    : "Investment Opportunities"}
                </h1>
                <p className="text-gray-600">
                  {language === "ar"
                    ? "اكتشف الفرص التجارية في عمان ودول الخليج"
                    : "Discover business opportunities in Oman and GCC"}
                </p>
              </div>

              {/* Compact Filter Bar */}
              <div className="max-w-6xl mx-auto">
                <div className="flex flex-col lg:flex-row gap-3 items-center justify-between bg-gray-50 p-4 rounded-lg border">
                  <div className="flex flex-1 gap-3 w-full lg:w-auto">
                    <div className="relative flex-1 lg:min-w-80">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder={
                          language === "ar"
                            ? "ابحث..."
                            : "Search opportunities..."
                        }
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-white border-gray-200"
                      />
                    </div>

                    <Select
                      value={selectedIndustry}
                      onValueChange={setSelectedIndustry}
                    >
                      <SelectTrigger className="w-36 bg-white border-gray-200">
                        <SelectValue placeholder="Industry" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Industries</SelectItem>
                        {industries.map((industry) => (
                          <SelectItem key={industry} value={industry}>
                            {industry}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={selectedLocation}
                      onValueChange={setSelectedLocation}
                    >
                      <SelectTrigger className="w-32 bg-white border-gray-200">
                        <SelectValue placeholder="Location" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Locations</SelectItem>
                        {locations.map((location) => (
                          <SelectItem key={location} value={location}>
                            {location}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={selectedSaleType}
                      onValueChange={setSelectedSaleType}
                    >
                      <SelectTrigger className="w-32 bg-white border-gray-200">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {saleTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-3">
                    {hasActiveFilters && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSearchTerm("");
                          setSelectedIndustry("all");
                          setSelectedLocation("all");
                          setSelectedSaleType("all");
                        }}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        Clear
                      </Button>
                    )}

                    <Badge variant="outline" className="text-sm font-medium">
                      {filteredListings.length} found
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* All Listings - Clean Grid */}
          <section className="py-12 bg-gray-50">
            <div className="container mx-auto px-4">
              {/* Show loading state */}
              {isLoading ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-white rounded-lg border h-96 animate-pulse"
                    >
                      <div className="w-full h-48 bg-gray-200 rounded-t-lg"></div>
                      <div className="p-4 space-y-3">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredListings.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-gray-400 mb-4">
                    <Building2 className="h-16 w-16 mx-auto" />
                  </div>
                  <h3 className="text-xl font-medium text-gray-900 mb-2">
                    {language === "ar"
                      ? "لا توجد فرص متاحة"
                      : "No opportunities found"}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {language === "ar"
                      ? "جرب تعديل الفلاتر أو البحث للعثور على ما تبحث عنه"
                      : "Try adjusting your filters or search to find what you're looking for"}
                  </p>
                  {hasActiveFilters && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchTerm("");
                        setSelectedIndustry("all");
                        setSelectedLocation("all");
                        setSelectedSaleType("all");
                      }}
                    >
                      Clear all filters
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredListings.map((listing) => (
                    <EnhancedListingCard key={listing.id} listing={listing} />
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Clean Call to Action */}
          <section className="py-16 bg-white border-t">
            <div className="container mx-auto px-4 text-center">
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">
                {language === "ar"
                  ? "هل لديك فرصة استثمارية؟"
                  : "Have an Investment Opportunity?"}
              </h2>
              <p className="text-gray-600 mb-8 max-w-xl mx-auto">
                {language === "ar"
                  ? "انضم إلى منصتنا واعرض فرصتك أمام المستثمرين"
                  : "Join our platform and showcase your opportunity to investors"}
              </p>
              <div className="flex gap-3 justify-center">
                <Link href="/create-listing">
                  <Button className="bg-gray-900 hover:bg-gray-800">
                    {language === "ar" ? "أضف فرصتك" : "List Opportunity"}
                  </Button>
                </Link>
                <Link href="/auth/register">
                  <Button variant="outline">
                    {language === "ar" ? "انضم كمستثمر" : "Join as Investor"}
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        </main>
      </PageTransition>

      <Footer />
      <MobileNavigation />
    </div>
  );
}
