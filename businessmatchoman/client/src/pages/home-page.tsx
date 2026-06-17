import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import MobileNavigation from "@/components/layout/mobile-navigation";
import HeroSection from "@/components/home/hero-section";
import SearchSection from "@/components/home/search-section";
import FeaturedListings from "@/components/home/featured-listings";
import HowItWorks from "@/components/home/how-it-works";
import BusinessCategories from "@/components/home/business-categories";
import CallToAction from "@/components/home/call-to-action";
import { useEffect } from "react";

export default function HomePage() {
  // Force scroll to top when this page loads
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    console.log('🏠 HomePage loaded - forced scroll to top');
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <SearchSection />
        <FeaturedListings />
        <HowItWorks />
        <BusinessCategories />
        <CallToAction />
      </main>
      <Footer />
      <MobileNavigation />
    </div>
  );
}
