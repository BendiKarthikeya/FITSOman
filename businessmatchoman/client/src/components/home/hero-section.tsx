import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useRTL } from "@/hooks/use-rtl";
import { EditableText } from "@/components/ui/editable-text";
import heroImage from "@assets/teejarti-hero_1756999865431.webp";

export default function HeroSection() {
  const { t } = useTranslation();
  const { isRtl, rtlClass } = useRTL();

  return (
    <section
      className="min-h-[60vh] sm:min-h-[70vh] lg:min-h-screen relative overflow-hidden text-neutral-cream"
      role="banner"
      aria-label="Hero section with business opportunities"
    >
      {/* Background Image with optimization */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat will-change-transform"
        style={{
          backgroundImage: `url('${heroImage}')`,
          backgroundAttachment: "fixed",
        }}
        role="img"
        aria-label="Business district skyline background"
      ></div>

      {/* Gradient overlay for brand colors - improved contrast ratio */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-blue/95 via-secondary-blue/90 to-primary-blue/95"></div>

      {/* Dark overlay for better text contrast - enhanced for accessibility */}
      <div className="absolute inset-0 bg-black/40"></div>

      {/* Geometric background pattern with performance optimization */}
      <div
        className="absolute inset-0 opacity-20 will-change-transform"
        aria-hidden="true"
      >
        <div className="absolute top-20 left-20 w-32 h-32 border border-accent-gold/30 rounded-lg transform rotate-12"></div>
        <div className="absolute top-40 right-32 w-24 h-24 border border-neutral-cream/20 rounded-lg transform -rotate-6"></div>
        <div className="absolute bottom-32 left-32 w-20 h-20 border border-accent-gold/20 rounded-lg transform rotate-45"></div>
        <div className="absolute bottom-20 right-20 w-28 h-28 border border-neutral-cream/10 rounded-lg transform -rotate-12"></div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 lg:px-8 relative z-10 min-h-[60vh] sm:min-h-[70vh] lg:min-h-screen flex flex-col justify-center py-8 sm:py-12 lg:pt-20">
        <div className="max-w-6xl mx-auto">
          {/* Main heading */}
          <div className="text-center mb-8 sm:mb-12">
            <h1 className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold ${isRtl ? 'font-arabic' : 'font-brand'} leading-tight mb-4 sm:mb-6 lg:mb-8 px-4`}>
              <span className="block text-white drop-shadow-lg">
                <EditableText
                  translationKey="home.hero.title"
                  section="home"
                  keyName="hero.title"
                  as="span"
                  className="text-white drop-shadow-lg"
                />
              </span>
            </h1>

            <p className={`text-sm sm:text-base md:text-lg lg:text-xl ${isRtl ? 'font-arabic' : 'font-sans'} text-white/95 max-w-3xl mx-auto leading-relaxed mb-6 sm:mb-8 lg:mb-12 drop-shadow-md px-4`}>
              <EditableText
                translationKey="home.hero.subtitle"
                section="home"
                keyName="hero.subtitle"
                as="span"
                multiline
                className="text-white/95 drop-shadow-md"
              />
            </p>
          </div>

          {/* Call-to-Action Buttons */}
          <div className={`flex flex-col sm:flex-row gap-4 justify-center items-center ${isRtl ? 'sm:flex-row-reverse' : ''}`}>
            <Link href="/auth" className="flex-shrink-0">
              <Button 
                size="lg" 
                className="w-full sm:w-auto px-8 py-4 text-lg font-heading font-semibold bg-accent-gold hover:bg-accent-gold/90 text-deep-contrast hover:text-deep-contrast border-2 border-accent-gold hover:border-accent-gold/90 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
              >
                <EditableText
                  translationKey="home.hero.cta"
                  section="home"
                  keyName="hero.cta"
                  as="span"
                />
              </Button>
            </Link>
            
            <Link href="/listings" className="flex-shrink-0">
              <Button 
                size="lg" 
                variant="outline"
                className="w-full sm:w-auto px-8 py-4 text-lg font-heading font-semibold bg-white/10 hover:bg-white/20 text-white border-2 border-white/30 hover:border-white/50 backdrop-blur-sm shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
              >
                <EditableText
                  translationKey="home.hero.searchButton"
                  section="home"
                  keyName="hero.searchButton"
                  as="span"
                />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Subtle bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-neutral-900 to-transparent"></div>
    </section>
  );
}
