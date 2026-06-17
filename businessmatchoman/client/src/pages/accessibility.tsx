import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import {
  ArrowLeft,
  Eye,
  Keyboard,
  Volume2,
  MousePointer,
  Palette,
  Type,
} from "lucide-react";
import { useLanguageContext } from "@/components/providers/language-provider";

export default function AccessibilityPage() {
  const { t } = useTranslation();
  const { isRtl } = useLanguageContext();

  return (
    <div className={`min-h-screen bg-gray-50 ${isRtl ? 'rtl' : 'ltr'}`}>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Back Navigation */}
        <Link
          href="/"
          className="inline-flex items-center text-primary hover:text-primary/80 transition-colors mb-8"
        >
          <ArrowLeft className={`w-4 h-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
          {t("common.back", "Back to Home")}
        </Link>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Eye className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {t("accessibility.title", "Accessibility Statement")}
          </h1>
          <p className="text-xl text-gray-600">
            {t(
              "accessibility.subtitle",
              "Our commitment to making TEEJARTI accessible to everyone",
            )}
          </p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="prose prose-lg max-w-none">
            {/* Commitment */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                {t("accessibility.commitment.title", "Our Commitment")}
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                {t(
                  "accessibility.commitment.content",
                  "TEEJARTI is committed to ensuring digital accessibility for people with disabilities. We are continually improving the user experience for everyone and applying the relevant accessibility standards.",
                )}
              </p>
            </section>

            {/* Standards */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                {t("accessibility.standards.title", "Accessibility Standards")}
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                {t(
                  "accessibility.standards.content",
                  "Our platform aims to conform to the Web Content Accessibility Guidelines (WCAG) 2.1 level AA. These guidelines help make web content more accessible to people with disabilities.",
                )}
              </p>
            </section>

            {/* Features */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                {t("accessibility.features.title", "Accessibility Features")}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-row items-center">
                  <div className={`w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center ${isRtl ? 'ml-4' : 'mr-4'} mt-1`}>
                    <Keyboard className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 mb-2">
                      {t(
                        "accessibility.features.keyboard.title",
                        "Keyboard Navigation",
                      )}
                    </h3>
                    <p className="text-gray-700 text-sm">
                      {t(
                        "accessibility.features.keyboard.description",
                        "Full keyboard accessibility with logical tab order and visible focus indicators.",
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex flex-row items-center">
                  <div className={`w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center ${isRtl ? 'ml-4' : 'mr-4'} mt-1`}>
                    <Volume2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 mb-2">
                      {t(
                        "accessibility.features.screen.title",
                        "Screen Reader Support",
                      )}
                    </h3>
                    <p className="text-gray-700 text-sm">
                      {t(
                        "accessibility.features.screen.description",
                        "Semantic HTML and ARIA labels for enhanced screen reader compatibility.",
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex flex-row items-center">
                  <div className={`w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center ${isRtl ? 'ml-4' : 'mr-4'} mt-1`}>
                    <Palette className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 mb-2">
                      {t(
                        "accessibility.features.contrast.title",
                        "High Contrast",
                      )}
                    </h3>
                    <p className="text-gray-700 text-sm">
                      {t(
                        "accessibility.features.contrast.description",
                        "Color combinations that meet WCAG contrast ratio requirements.",
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex flex-row items-center">
                  <div className={`w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center ${isRtl ? 'ml-4' : 'mr-4'} mt-1`}>
                    <Type className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 mb-2">
                      {t("accessibility.features.text.title", "Scalable Text")}
                    </h3>
                    <p className="text-gray-700 text-sm">
                      {t(
                        "accessibility.features.text.description",
                        "Text can be resized up to 200% without loss of functionality or content.",
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex flex-row items-center">
                  <div className={`w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center ${isRtl ? 'ml-4' : 'mr-4'} mt-1`}>
                    <MousePointer className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 mb-2">
                      {t(
                        "accessibility.features.target.title",
                        "Large Touch Targets",
                      )}
                    </h3>
                    <p className="text-gray-700 text-sm">
                      {t(
                        "accessibility.features.target.description",
                        "Interactive elements are sized appropriately for easy interaction.",
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex flex-row items-center">
                  <div className={`w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center ${isRtl ? 'ml-4' : 'mr-4'} mt-1`}>
                    <Eye className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 mb-2">
                      {t(
                        "accessibility.features.images.title",
                        "Image Descriptions",
                      )}
                    </h3>
                    <p className="text-gray-700 text-sm">
                      {t(
                        "accessibility.features.images.description",
                        "Alternative text provided for all meaningful images and graphics.",
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Ongoing Efforts */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                {t("accessibility.efforts.title", "Ongoing Efforts")}
              </h2>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>
                  {t(
                    "accessibility.efforts.testing",
                    "Regular accessibility testing with automated tools and manual review",
                  )}
                </li>
                <li>
                  {t(
                    "accessibility.efforts.feedback",
                    "Collecting and implementing user feedback on accessibility barriers",
                  )}
                </li>
                <li>
                  {t(
                    "accessibility.efforts.training",
                    "Team training on accessibility best practices and inclusive design",
                  )}
                </li>
                <li>
                  {t(
                    "accessibility.efforts.updates",
                    "Continuous updates to improve compliance with accessibility standards",
                  )}
                </li>
                <li>
                  {t(
                    "accessibility.efforts.external",
                    "Working with accessibility consultants for expert evaluation",
                  )}
                </li>
              </ul>
            </section>

            {/* Browser Support */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                {t(
                  "accessibility.browsers.title",
                  "Supported Browsers & Assistive Technologies",
                )}
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                {t(
                  "accessibility.browsers.content",
                  "TEEJARTI is designed to work with the following assistive technologies:",
                )}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">
                    {t(
                      "accessibility.browsers.readers.title",
                      "Screen Readers",
                    )}
                  </h3>
                  <ul className="text-gray-700 text-sm space-y-1">
                    <li>• NVDA (Windows)</li>
                    <li>• JAWS (Windows)</li>
                    <li>• VoiceOver (macOS, iOS)</li>
                    <li>• TalkBack (Android)</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">
                    {t("accessibility.browsers.browsers.title", "Browsers")}
                  </h3>
                  <ul className="text-gray-700 text-sm space-y-1">
                    <li>• Chrome (latest)</li>
                    <li>• Firefox (latest)</li>
                    <li>• Safari (latest)</li>
                    <li>• Edge (latest)</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Feedback */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                {t("accessibility.feedback.title", "Feedback & Support")}
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                {t(
                  "accessibility.feedback.content",
                  "We welcome your feedback on the accessibility of TEEJARTI. If you encounter any accessibility barriers or have suggestions for improvement, please contact us:",
                )}
              </p>
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 mb-2">
                      {t("accessibility.feedback.email.title", "Email")}
                    </h3>
                    <p className="text-gray-700 text-sm">
                      accessibility@teejarti.com
                    </p>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 mb-2">
                      {t("accessibility.feedback.phone.title", "Phone")}
                    </h3>
                    <p className="text-gray-700 text-sm">+968 9123 4567</p>
                  </div>
                </div>
                <p className="text-gray-600 text-sm mt-4">
                  {t(
                    "accessibility.feedback.response",
                    "We aim to respond to accessibility feedback within 48 hours and will work with you to provide the information or feature you need.",
                  )}
                </p>
              </div>
            </section>

            {/* Assessment */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                {t(
                  "accessibility.assessment.title",
                  "Accessibility Assessment",
                )}
              </h2>
              <p className="text-gray-700 leading-relaxed">
                {t(
                  "accessibility.assessment.content",
                  "This accessibility statement was last reviewed on January 21, 2025. We conduct ongoing accessibility assessments and update this statement as improvements are made to our platform.",
                )}
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
