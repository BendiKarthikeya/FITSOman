import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { ArrowLeft, Cookie, Shield, Settings, BarChart3 } from "lucide-react";
import { useLanguageContext } from "@/components/providers/language-provider";

export default function CookiesPage() {
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
              <Cookie className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {t("cookies.title", "Cookie Policy")}
          </h1>
          <p className="text-xl text-gray-600">
            {t(
              "cookies.subtitle",
              "How we use cookies and similar technologies on TEEJARTI",
            )}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            {t("cookies.lastUpdated", "Last updated: January 21, 2025")}
          </p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="prose prose-lg max-w-none">
            {/* What are Cookies */}
            <section className="mb-8">
              <div className="flex items-center mb-4">
                <Cookie className={`w-6 h-6 text-primary ${isRtl ? 'ml-3' : 'mr-3'}`} />
                <h2 className="text-2xl font-semibold text-gray-900 m-0">
                  {t("cookies.what.title", "What are Cookies?")}
                </h2>
              </div>
              <p className="text-gray-700 leading-relaxed">
                {t(
                  "cookies.what.content",
                  "Cookies are small text files that are placed on your device (computer, smartphone, or tablet) when you visit our website. They help us provide you with a better experience by remembering your preferences and enabling certain features of our platform.",
                )}
              </p>
            </section>

            {/* Types of Cookies */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                {t("cookies.types.title", "Types of Cookies We Use")}
              </h2>

              <div className="space-y-6">
                {/* Essential Cookies */}
                <div className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center mb-3">
                    <Shield className={`w-5 h-5 text-primary ${isRtl ? 'ml-2' : 'mr-2'}`} />
                    <h3 className="text-lg font-semibold text-gray-800">
                      {t("cookies.types.essential.title", "Essential Cookies")}
                    </h3>
                  </div>
                  <p className="text-gray-700 mb-3">
                    {t(
                      "cookies.types.essential.description",
                      "These cookies are necessary for the website to function properly. They enable basic features like page navigation, access to secure areas, and form submissions.",
                    )}
                  </p>
                  <div className="text-sm text-gray-600">
                    <strong>
                      {t("cookies.types.essential.examples", "Examples:")}
                    </strong>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>
                        {t(
                          "cookies.types.essential.session",
                          "Session management and user authentication",
                        )}
                      </li>
                      <li>
                        {t(
                          "cookies.types.essential.security",
                          "Security tokens and CSRF protection",
                        )}
                      </li>
                      <li>
                        {t(
                          "cookies.types.essential.preferences",
                          "Language and accessibility preferences",
                        )}
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Functional Cookies */}
                <div className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center mb-3">
                    <Settings className={`w-5 h-5 text-primary ${isRtl ? 'ml-2' : 'mr-2'}`} />
                    <h3 className="text-lg font-semibold text-gray-800">
                      {t(
                        "cookies.types.functional.title",
                        "Functional Cookies",
                      )}
                    </h3>
                  </div>
                  <p className="text-gray-700 mb-3">
                    {t(
                      "cookies.types.functional.description",
                      "These cookies enhance your experience by remembering your choices and providing personalized features.",
                    )}
                  </p>
                  <div className="text-sm text-gray-600">
                    <strong>
                      {t("cookies.types.functional.examples", "Examples:")}
                    </strong>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>
                        {t(
                          "cookies.types.functional.saved",
                          "Saved listings and search preferences",
                        )}
                      </li>
                      <li>
                        {t(
                          "cookies.types.functional.language",
                          "Language and region settings",
                        )}
                      </li>
                      <li>
                        {t(
                          "cookies.types.functional.layout",
                          "User interface preferences",
                        )}
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Analytics Cookies */}
                <div className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center mb-3">
                    <BarChart3 className={`w-5 h-5 text-primary ${isRtl ? 'ml-2' : 'mr-2'}`} />
                    <h3 className="text-lg font-semibold text-gray-800">
                      {t("cookies.types.analytics.title", "Analytics Cookies")}
                    </h3>
                  </div>
                  <p className="text-gray-700 mb-3">
                    {t(
                      "cookies.types.analytics.description",
                      "These cookies help us understand how visitors use our website, allowing us to improve our services and user experience.",
                    )}
                  </p>
                  <div className="text-sm text-gray-600">
                    <strong>
                      {t("cookies.types.analytics.examples", "Examples:")}
                    </strong>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>
                        {t(
                          "cookies.types.analytics.usage",
                          "Page views and user interaction tracking",
                        )}
                      </li>
                      <li>
                        {t(
                          "cookies.types.analytics.performance",
                          "Website performance monitoring",
                        )}
                      </li>
                      <li>
                        {t(
                          "cookies.types.analytics.errors",
                          "Error tracking and debugging",
                        )}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* How We Use Cookies */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                {t("cookies.howWeUse.title", "How We Use Cookies")}
              </h2>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>
                  {t(
                    "cookies.howWeUse.authentication",
                    "To keep you logged in and secure during your session",
                  )}
                </li>
                <li>
                  {t(
                    "cookies.howWeUse.preferences",
                    "To remember your language and display preferences",
                  )}
                </li>
                <li>
                  {t(
                    "cookies.howWeUse.functionality",
                    "To provide personalized features like saved listings",
                  )}
                </li>
                <li>
                  {t(
                    "cookies.howWeUse.analytics",
                    "To analyze website usage and improve our services",
                  )}
                </li>
                <li>
                  {t(
                    "cookies.howWeUse.security",
                    "To protect against fraud and maintain platform security",
                  )}
                </li>
              </ul>
            </section>

            {/* Managing Cookies */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                {t(
                  "cookies.managing.title",
                  "Managing Your Cookie Preferences",
                )}
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                {t(
                  "cookies.managing.content",
                  "You have control over which cookies you accept. Here are your options:",
                )}
              </p>

              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-2">
                    {t("cookies.managing.browser.title", "Browser Settings")}
                  </h3>
                  <p className="text-gray-700 text-sm">
                    {t(
                      "cookies.managing.browser.content",
                      "You can control cookies through your browser settings. Most browsers allow you to block cookies, delete existing cookies, or receive notifications when cookies are set.",
                    )}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-2">
                    {t("cookies.managing.platform.title", "Platform Settings")}
                  </h3>
                  <p className="text-gray-700 text-sm">
                    {t(
                      "cookies.managing.platform.content",
                      "In your TEEJARTI account settings, you can control functional cookies related to personalization and saved preferences.",
                    )}
                  </p>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800 text-sm">
                    <strong>
                      {t("cookies.managing.note.title", "Important Note:")}
                    </strong>{" "}
                    {t(
                      "cookies.managing.note.content",
                      "Disabling essential cookies may affect the functionality of our website and prevent you from using certain features.",
                    )}
                  </p>
                </div>
              </div>
            </section>

            {/* Third-Party Cookies */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                {t("cookies.thirdParty.title", "Third-Party Services")}
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                {t(
                  "cookies.thirdParty.content",
                  "We may use third-party services that set their own cookies. These services include:",
                )}
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>
                  {t(
                    "cookies.thirdParty.analytics",
                    "Analytics services for website performance monitoring",
                  )}
                </li>
                <li>
                  {t(
                    "cookies.thirdParty.security",
                    "Security services for fraud protection",
                  )}
                </li>
                <li>
                  {t(
                    "cookies.thirdParty.support",
                    "Customer support and chat services",
                  )}
                </li>
              </ul>
            </section>

            {/* Updates */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                {t("cookies.updates.title", "Updates to This Policy")}
              </h2>
              <p className="text-gray-700 leading-relaxed">
                {t(
                  "cookies.updates.content",
                  'We may update this Cookie Policy from time to time to reflect changes in our practices or applicable laws. We will notify you of any significant changes by posting the updated policy on our website and updating the "last updated" date.',
                )}
              </p>
            </section>

            {/* Contact */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                {t("cookies.contact.title", "Questions About Cookies")}
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                {t(
                  "cookies.contact.content",
                  "If you have any questions about our use of cookies, please contact us:",
                )}
              </p>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700 text-sm">
                  <strong>{t("cookies.contact.email", "Email:")}</strong>{" "}
                  privacy@teejarti.com
                  <br />
                  <strong>{t("cookies.contact.phone", "Phone:")}</strong> +968
                  9123 4567
                  <br />
                  <strong>
                    {t("cookies.contact.address", "Address:")}
                  </strong>{" "}
                  Muscat Business District, Oman
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
