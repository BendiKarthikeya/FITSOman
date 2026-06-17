import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useRTL } from "@/hooks/use-rtl";
import { EditableText } from "@/components/ui/editable-text";

export default function CallToAction() {
  const { t } = useTranslation();
  const { isRtl } = useRTL();
  
  return (
    <section className="py-20 bg-gradient-to-r from-primary-blue via-secondary-blue to-primary-blue relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-32 h-32 bg-accent-gold/20 rounded-full blur-xl"></div>
      <div className="absolute bottom-0 right-0 w-48 h-48 bg-accent-gold/10 rounded-full blur-2xl"></div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className={`text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight ${isRtl ? 'font-arabic' : 'font-brand'}`}>
            <EditableText
              translationKey="home.callToAction.title"
              section="home"
              keyName="callToAction.title"
              as="span"
            />
          </h2>
          <p className={`text-xl md:text-2xl text-white/90 mb-10 leading-relaxed max-w-3xl mx-auto ${isRtl ? 'font-arabic' : 'font-sans'}`}>
            <EditableText
              translationKey="home.callToAction.subtitle"
              section="home"
              keyName="callToAction.subtitle"
              as="span"
              multiline
            />
          </p>

          <div className={`flex flex-col sm:flex-row justify-center gap-4 sm:gap-6`}>
            <Link href="/auth?tab=register">
              <Button
                size="lg"
                className="px-8 py-4 bg-accent-gold text-deep-contrast font-heading font-semibold rounded-xl hover:bg-accent-gold/90 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <EditableText
                  translationKey="home.callToAction.startJourney"
                  section="home"
                  keyName="callToAction.startJourney"
                  as="span"
                />
              </Button>
            </Link>
            <Link href="/listings">
              <Button
                variant="outline"
                size="lg"
                className="px-8 py-4 bg-transparent border-2 border-white text-white font-heading font-semibold rounded-xl hover:bg-white hover:text-primary-blue transition-all duration-300 transform hover:-translate-y-1"
              >
                <EditableText
                  translationKey="home.callToAction.exploreOpportunities"
                  section="home"
                  keyName="callToAction.exploreOpportunities"
                  as="span"
                />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
