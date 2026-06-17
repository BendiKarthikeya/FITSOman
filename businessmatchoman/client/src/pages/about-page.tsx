import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import MobileNavigation from "@/components/layout/mobile-navigation";
import { useTranslation } from "react-i18next";
import { EditableText } from "@/components/ui/editable-text";
import {
  CheckCircle,
  Users,
  Globe,
  TrendingUp,
  Award,
  Shield,
} from "lucide-react";

export default function AboutPage() {
  const { t } = useTranslation();
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary-blue via-secondary-blue to-primary-blue text-neutral-cream py-20">
          <div className="container mx-auto px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-brand mb-6 leading-tight">
                <EditableText
                  translationKey="about.title"
                  section="about"
                  keyName="title"
                  as="span"
                />
              </h1>
              <p className="text-xl md:text-2xl text-neutral-cream/90 leading-relaxed">
                <EditableText
                  translationKey="about.subtitle"
                  section="about"
                  keyName="subtitle"
                  as="span"
                  multiline
                />
              </p>
            </div>
          </div>
        </section>

        {/* Mission & Vision */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">
              <div>
                <h2 className="text-3xl font-bold text-primary-blue mb-6">
                  <EditableText
                    translationKey="about.mission.title"
                    section="about"
                    keyName="mission.title"
                    as="span"
                  />
                </h2>
                <p className="text-lg text-gray-700 leading-relaxed mb-6">
                  <EditableText
                    translationKey="about.mission.text1"
                    section="about"
                    keyName="mission.text1"
                    as="span"
                    multiline
                  />
                </p>
                <p className="text-lg text-gray-700 leading-relaxed">
                  <EditableText
                    translationKey="about.mission.text2"
                    section="about"
                    keyName="mission.text2"
                    as="span"
                    multiline
                  />
                </p>
              </div>
              <div>
                <h2 className="text-3xl font-bold text-primary-blue mb-6">
                  <EditableText
                    translationKey="about.vision.title"
                    section="about"
                    keyName="vision.title"
                    as="span"
                  />
                </h2>
                <p className="text-lg text-gray-700 leading-relaxed mb-6">
                  <EditableText
                    translationKey="about.vision.text1"
                    section="about"
                    keyName="vision.text1"
                    as="span"
                    multiline
                  />
                </p>
                <p className="text-lg text-gray-700 leading-relaxed">
                  <EditableText
                    translationKey="about.vision.text2"
                    section="about"
                    keyName="vision.text2"
                    as="span"
                    multiline
                  />
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Key Features */}
        <section className="py-16 bg-neutral-cream/30">
          <div className="container mx-auto px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-primary-blue mb-4">
                {t("about.whyChoose.title")}
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                {t("about.whyChoose.subtitle")}
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              <div className="bg-white p-8 rounded-xl shadow-lg">
                <div className="w-12 h-12 bg-accent-gold/20 rounded-lg flex items-center justify-center mb-6">
                  <Shield className="w-6 h-6 text-accent-gold" />
                </div>
                <h3 className="text-xl font-bold text-primary-blue mb-4">
                  <EditableText
                    translationKey="about.features.verifiedListings.title"
                    section="about"
                    keyName="features.verifiedListings.title"
                    as="span"
                  />
                </h3>
                <p className="text-gray-600">
                  <EditableText
                    translationKey="about.features.verifiedListings.description"
                    section="about"
                    keyName="features.verifiedListings.description"
                    as="span"
                    multiline
                  />
                </p>
              </div>

              <div className="bg-white p-8 rounded-xl shadow-lg">
                <div className="w-12 h-12 bg-accent-gold/20 rounded-lg flex items-center justify-center mb-6">
                  <Users className="w-6 h-6 text-accent-gold" />
                </div>
                <h3 className="text-xl font-bold text-primary-blue mb-4">
                  <EditableText
                    translationKey="about.features.expertNetwork.title"
                    section="about"
                    keyName="features.expertNetwork.title"
                    as="span"
                  />
                </h3>
                <p className="text-gray-600">
                  <EditableText
                    translationKey="about.features.expertNetwork.description"
                    section="about"
                    keyName="features.expertNetwork.description"
                    as="span"
                    multiline
                  />
                </p>
              </div>

              <div className="bg-white p-8 rounded-xl shadow-lg">
                <div className="w-12 h-12 bg-accent-gold/20 rounded-lg flex items-center justify-center mb-6">
                  <Globe className="w-6 h-6 text-accent-gold" />
                </div>
                <h3 className="text-xl font-bold text-primary-blue mb-4">
                  <EditableText
                    translationKey="about.features.regionalFocus.title"
                    section="about"
                    keyName="features.regionalFocus.title"
                    as="span"
                  />
                </h3>
                <p className="text-gray-600">
                  <EditableText
                    translationKey="about.features.regionalFocus.description"
                    section="about"
                    keyName="features.regionalFocus.description"
                    as="span"
                    multiline
                  />
                </p>
              </div>

              <div className="bg-white p-8 rounded-xl shadow-lg">
                <div className="w-12 h-12 bg-accent-gold/20 rounded-lg flex items-center justify-center mb-6">
                  <TrendingUp className="w-6 h-6 text-accent-gold" />
                </div>
                <h3 className="text-xl font-bold text-primary-blue mb-4">
                  <EditableText
                    translationKey="about.features.smartMatching.title"
                    section="about"
                    keyName="features.smartMatching.title"
                    as="span"
                  />
                </h3>
                <p className="text-gray-600">
                  <EditableText
                    translationKey="about.features.smartMatching.description"
                    section="about"
                    keyName="features.smartMatching.description"
                    as="span"
                    multiline
                  />
                </p>
              </div>

              <div className="bg-white p-8 rounded-xl shadow-lg">
                <div className="w-12 h-12 bg-accent-gold/20 rounded-lg flex items-center justify-center mb-6">
                  <Award className="w-6 h-6 text-accent-gold" />
                </div>
                <h3 className="text-xl font-bold text-primary-blue mb-4">
                  <EditableText
                    translationKey="about.features.successSupport.title"
                    section="about"
                    keyName="features.successSupport.title"
                    as="span"
                  />
                </h3>
                <p className="text-gray-600">
                  <EditableText
                    translationKey="about.features.successSupport.description"
                    section="about"
                    keyName="features.successSupport.description"
                    as="span"
                    multiline
                  />
                </p>
              </div>

              <div className="bg-white p-8 rounded-xl shadow-lg">
                <div className="w-12 h-12 bg-accent-gold/20 rounded-lg flex items-center justify-center mb-6">
                  <CheckCircle className="w-6 h-6 text-accent-gold" />
                </div>
                <h3 className="text-xl font-bold text-primary-blue mb-4">
                  <EditableText
                    translationKey="about.features.provenResults.title"
                    section="about"
                    keyName="features.provenResults.title"
                    as="span"
                  />
                </h3>
                <p className="text-gray-600">
                  <EditableText
                    translationKey="about.features.provenResults.description"
                    section="about"
                    keyName="features.provenResults.description"
                    as="span"
                    multiline
                  />
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Company Stats */}
        <section className="py-16 bg-primary-blue text-neutral-cream">
          <div className="container mx-auto px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                <EditableText
                  translationKey="about.stats.title"
                  section="about"
                  keyName="stats.title"
                  as="span"
                />
              </h2>
              <p className="text-xl text-neutral-cream/90 max-w-3xl mx-auto">
                <EditableText
                  translationKey="about.stats.subtitle"
                  section="about"
                  keyName="stats.subtitle"
                  as="span"
                  multiline
                />
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-8 max-w-4xl mx-auto text-center">
              <div>
                <div className="text-4xl font-bold text-accent-gold mb-2">
                  500+
                </div>
                <div className="text-neutral-cream/80">
                  <EditableText
                    translationKey="about.stats.activeListings"
                    section="about"
                    keyName="stats.activeListings"
                    as="span"
                  />
                </div>
              </div>
              <div>
                <div className="text-4xl font-bold text-accent-gold mb-2">
                  1,200+
                </div>
                <div className="text-neutral-cream/80">
                  <EditableText
                    translationKey="about.stats.registeredUsers"
                    section="about"
                    keyName="stats.registeredUsers"
                    as="span"
                  />
                </div>
              </div>
              <div>
                <div className="text-4xl font-bold text-accent-gold mb-2">
                  6
                </div>
                <div className="text-neutral-cream/80">
                  <EditableText
                    translationKey="about.stats.gccCountries"
                    section="about"
                    keyName="stats.gccCountries"
                    as="span"
                  />
                </div>
              </div>
              <div>
                <div className="text-4xl font-bold text-accent-gold mb-2">
                  150+
                </div>
                <div className="text-neutral-cream/80">
                  <EditableText
                    translationKey="about.stats.successfulMatches"
                    section="about"
                    keyName="stats.successfulMatches"
                    as="span"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-primary-blue mb-4">
                <EditableText
                  translationKey="about.team.title"
                  section="about"
                  keyName="team.title"
                  as="span"
                />
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                <EditableText
                  translationKey="about.team.subtitle"
                  section="about"
                  keyName="team.subtitle"
                  as="span"
                  multiline
                />
              </p>
            </div>

            <div className="max-w-4xl mx-auto text-center">
              <p className="text-lg text-gray-700 leading-relaxed mb-8">
                <EditableText
                  translationKey="about.team.description1"
                  section="about"
                  keyName="team.description1"
                  as="span"
                  multiline
                />
              </p>
              <p className="text-lg text-gray-700 leading-relaxed">
                <EditableText
                  translationKey="about.team.description2"
                  section="about"
                  keyName="team.description2"
                  as="span"
                  multiline
                />
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <MobileNavigation />
    </div>
  );
}
