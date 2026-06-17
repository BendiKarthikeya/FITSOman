import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useRTL } from "@/hooks/use-rtl";
import { FileText, Handshake, CheckCircle } from "lucide-react";
import { EditableText } from "@/components/ui/editable-text";

export default function HowItWorks() {
  const { t } = useTranslation();
  const { isRtl } = useRTL();

  return (
    <section className="py-20 md:py-24 bg-neutral-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className={`text-3xl md:text-4xl font-bold mb-6 text-gray-800 ${isRtl ? 'font-arabic' : 'font-heading'}`}>
            <EditableText
              translationKey="home.howItWorks.title"
              section="home"
              keyName="howItWorks.title"
              as="span"
            />
          </h2>
          <p className={`text-gray-600 max-w-3xl mx-auto text-lg leading-relaxed ${isRtl ? 'font-arabic' : ''}`}>
            <EditableText
              translationKey="home.howItWorks.subtitle"
              section="home"
              keyName="howItWorks.subtitle"
              as="span"
              multiline
            />
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 lg:gap-10">
          {/* Step 1 */}
          <div className="bg-white p-7 md:p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5 bg-primary text-white">
              <FileText className="h-8 w-8" />
            </div>
            <h3 className={`text-xl font-semibold mb-3 text-gray-800 ${isRtl ? 'font-arabic' : ''}`}>
              <EditableText
                translationKey="home.howItWorks.step1.title"
                section="home"
                keyName="howItWorks.step1.title"
                as="span"
              />
            </h3>
            <p className={`text-gray-600 text-center ${isRtl ? 'font-arabic' : ''}`}>
              <EditableText
                translationKey="home.howItWorks.step1.description"
                section="home"
                keyName="howItWorks.step1.description"
                as="span"
                multiline
              />
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-white p-7 md:p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5 bg-primary text-white">
              <Handshake className="h-8 w-8" />
            </div>
            <h3 className={`text-xl font-semibold mb-3 text-gray-800 ${isRtl ? 'font-arabic' : ''}`}>
              <EditableText
                translationKey="home.howItWorks.step2.title"
                section="home"
                keyName="howItWorks.step2.title"
                as="span"
              />
            </h3>
            <p className={`text-gray-600 text-center ${isRtl ? 'font-arabic' : ''}`}>
              <EditableText
                translationKey="home.howItWorks.step2.description"
                section="home"
                keyName="howItWorks.step2.description"
                as="span"
                multiline
              />
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-white p-7 md:p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5 bg-primary text-white">
              <CheckCircle className="h-8 w-8" />
            </div>
            <h3 className={`text-xl font-semibold mb-3 text-gray-800 ${isRtl ? 'font-arabic' : ''}`}>
              <EditableText
                translationKey="home.howItWorks.step3.title"
                section="home"
                keyName="howItWorks.step3.title"
                as="span"
              />
            </h3>
            <p className={`text-gray-600 text-center ${isRtl ? 'font-arabic' : ''}`}>
              <EditableText
                translationKey="home.howItWorks.step3.description"
                section="home"
                keyName="howItWorks.step3.description"
                as="span"
                multiline
              />
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-14 text-center">
          <div className="mb-6">
            <p className={`text-gray-700 text-lg mb-4 ${isRtl ? 'font-arabic' : ''}`}>
              <EditableText
                translationKey="home.howItWorks.ctaText"
                section="home"
                keyName="howItWorks.ctaText"
                as="span"
              />
            </p>
          </div>
          <div className={`flex flex-col sm:flex-row justify-center gap-4 ${isRtl ? 'sm:flex-row-reverse' : ''}`}>
            <Link href="/auth?tab=register">
              <Button
                size="lg"
                className="px-8 py-3 bg-primary-blue text-white font-heading font-semibold rounded-lg hover:bg-primary-blue/90 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
              >
                <EditableText
                  translationKey="nav.getStarted"
                  section="nav"
                  keyName="getStarted"
                  as="span"
                />
              </Button>
            </Link>
            <Link href="/listings">
              <Button
                size="lg"
                variant="outline"
                className="px-8 py-3 border-2 border-primary-blue text-primary-blue font-heading font-semibold rounded-lg hover:bg-primary-blue hover:text-white transition duration-300"
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
    </section>
  );
}
