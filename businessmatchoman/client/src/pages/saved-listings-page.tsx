import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Heart,
  MapPin,
  Building,
  DollarSign,
  Calendar,
  ShieldCheck,
} from "lucide-react";
import { useLanguageContext } from "@/components/providers/language-provider";
import { Link } from "wouter";
import SaveButton from "@/components/save-button";
import { getAuthToken } from "@/lib/authUtils";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { PageTransition } from "@/components/ui/page-transition";

import type { Listing } from "@shared/schema";

export default function SavedListingsPage() {
  const { user } = useAuth();
  const { language, t } = useLanguageContext();

  const {
    data: savedListingsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/saved-listings"],
    queryFn: async () => {
      const token = getAuthToken();
      const res = await fetch("/api/saved-listings", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) {
        throw new Error("Failed to fetch saved listings");
      }
      return res.json();
    },
    enabled: !!user,
  });

  // Handle different response structures - could be array or object with data property
  const savedListings = Array.isArray(savedListingsData)
    ? savedListingsData
    : savedListingsData?.data || savedListingsData?.listings || [];

  if (!user) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
          <Navbar />
          <main className="container max-w-4xl mx-auto px-4 py-16">
            <Card className="border-0 shadow-lg">
              <CardContent className="text-center py-16">
                <Heart className="h-16 w-16 mx-auto mb-6 text-muted-foreground" />
                <h2 className="text-2xl font-semibold mb-3">
                  Sign in to save listings
                </h2>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Create an account to save your favorite business opportunities
                  and access them anytime
                </p>
                <Link href="/auth">
                  <Button size="lg" className="px-8">
                    Sign In
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </main>
          <Footer />
        </div>
      </PageTransition>
    );
  }

  if (isLoading) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
          <Navbar />
          <main className="container max-w-6xl mx-auto px-4 py-16">
            <div className="flex items-center gap-3 mb-8">
              <Heart className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold text-gray-900">
                My Saved Listings
              </h1>
            </div>
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
                      <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </main>
          <Footer />
        </div>
      </PageTransition>
    );
  }

  if (error) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
          <Navbar />
          <main className="container max-w-4xl mx-auto px-4 py-16">
            <Card className="border-0 shadow-lg">
              <CardContent className="text-center py-16">
                <h2 className="text-2xl font-semibold mb-3 text-destructive">
                  Error loading saved listings
                </h2>
                <p className="text-muted-foreground mb-6">
                  Please try again later
                </p>
                <Button onClick={() => window.location.reload()}>
                  Try Again
                </Button>
              </CardContent>
            </Card>
          </main>
          <Footer />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <Navbar />
        <main className="container max-w-6xl mx-auto px-4 py-16">
          <div className="flex items-center gap-3 mb-8">
            <Heart className="h-8 w-8 text-primary fill-current" />
            <h1 className="text-3xl font-bold text-gray-900">
              My Saved Listings
            </h1>
            <Badge variant="secondary" className="ml-auto text-sm px-3 py-1">
              {savedListings.length} saved
            </Badge>
          </div>

          {savedListings.length === 0 ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="text-center py-16">
                <Heart className="h-20 w-20 mx-auto mb-6 text-muted-foreground" />
                <h2 className="text-2xl font-semibold mb-3">
                  No saved listings yet
                </h2>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Start exploring business opportunities and save the ones that
                  interest you
                </p>
                <Link href="/listings">
                  <Button size="lg" className="px-8">
                    Browse Listings
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedListings.map((listing) => {
                // Get localized title and description
                const title =
                  language === "ar" && listing.title_ar
                    ? listing.title_ar
                    : listing.title_en || listing.title || "Untitled Listing";

                const description =
                  language === "ar" && listing.description_ar
                    ? listing.description_ar
                    : listing.description_en ||
                      listing.description ||
                      "No description available";

                // Handle image URLs - prioritize images array, then imageUrl, then fallback
                let imageUrl = "/placeholder.jpg";
                if (
                  listing.images &&
                  Array.isArray(listing.images) &&
                  listing.images.length > 0
                ) {
                  imageUrl = listing.images[0].startsWith("http")
                    ? listing.images[0]
                    : `/uploads/${listing.images[0]}`;
                } else if (listing.imageUrl) {
                  imageUrl = listing.imageUrl.startsWith("http")
                    ? listing.imageUrl
                    : `/uploads/${listing.imageUrl}`;
                }

                return (
                  <Card
                    key={listing.id}
                    className="group hover:shadow-xl transition-all duration-300 border-0 shadow-md"
                  >
                    <div className="aspect-video relative overflow-hidden rounded-t-lg">
                      <img
                        src={imageUrl}
                        alt={title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        onError={(e) => {
                          e.currentTarget.src =
                            "https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80";
                        }}
                      />
                      <div className="absolute top-3 right-3">
                        <SaveButton listingId={listing.id} />
                      </div>
                      {listing.featured && (
                        <Badge className="absolute top-3 left-3 bg-yellow-500 hover:bg-yellow-600">
                          Featured
                        </Badge>
                      )}
                      {listing.verified && (
                        <div className="absolute bottom-3 left-3 flex items-center bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                          <ShieldCheck className="h-3 w-3 mr-1" />
                          Verified
                        </div>
                      )}
                    </div>

                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-lg leading-tight line-clamp-2">
                          {title}
                        </h3>
                      </div>

                      <p className="text-muted-foreground text-sm line-clamp-2 mb-3">
                        {description}
                      </p>

                      <div className="space-y-2 mb-4">
                        {listing.askingPrice && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <DollarSign className="h-4 w-4 mr-1" />
                            <span className="font-medium text-primary">
                              {listing.currency || "OMR"}{" "}
                              {listing.askingPrice?.toLocaleString()}
                            </span>
                          </div>
                        )}

                        {listing.location && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4 mr-1" />
                            <span>{listing.location}</span>
                          </div>
                        )}

                        {listing.industry && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Building className="h-4 w-4 mr-1" />
                            <span>{listing.industry}</span>
                          </div>
                        )}

                        {listing.createdAt && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4 mr-1" />
                            <span>
                              {new Date(listing.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Link
                          href={`/listings/${listing.id}`}
                          className="flex-1"
                        >
                          <Button className="w-full" size="sm">
                            View Details
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
}
