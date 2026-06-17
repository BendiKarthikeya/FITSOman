import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { ArrowLeft, Shield, Lock, Eye, FileText } from "lucide-react";

export default function PrivacyPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Back Navigation */}
        <Link
          href="/"
          className="inline-flex items-center text-primary hover:text-primary/80 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t("common.back", "Back to Home")}
        </Link>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {t("privacy.title", "Privacy Policy")}
          </h1>
          <p className="text-xl text-gray-600">
            {t(
              "privacy.subtitle",
              "How we collect, use, and protect your personal information",
            )}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            {t("privacy.lastUpdated", "Last updated: January 21, 2025")}
          </p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="prose prose-lg max-w-none">
            {/* Introduction */}
            <section className="mb-8">
              <div className="flex items-center mb-4">
                <Eye className="w-6 h-6 text-primary mr-3" />
                <h2 className="text-2xl font-semibold text-gray-900 m-0">
                  {t("privacy.intro.title", "Introduction")}
                </h2>
              </div>
              <p className="text-gray-700 leading-relaxed">
                {t(
                  "privacy.intro.content",
                  "At TEEJARTI, we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our business matchmaking platform.",
                )}
              </p>
            </section>

            {/* Information Collection */}
            <section className="mb-8">
              <div className="flex items-center mb-4">
                <FileText className="w-6 h-6 text-primary mr-3" />
                <h2 className="text-2xl font-semibold text-gray-900 m-0">
                  {t("privacy.collection.title", "Information We Collect")}
                </h2>
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    {t(
                      "privacy.collection.personal.title",
                      "Personal Information",
                    )}
                  </h3>
                  <ul className="list-disc list-inside text-gray-700 space-y-1">
                    <li>
                      {t(
                        "privacy.collection.personal.name",
                        "Full name and contact information",
                      )}
                    </li>
                    <li>
                      {t(
                        "privacy.collection.personal.email",
                        "Email address and phone number",
                      )}
                    </li>
                    <li>
                      {t(
                        "privacy.collection.personal.business",
                        "Business information and professional details",
                      )}
                    </li>
                    <li>
                      {t(
                        "privacy.collection.personal.kyc",
                        "KYC verification documents and identification",
                      )}
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    {t("privacy.collection.usage.title", "Usage Information")}
                  </h3>
                  <ul className="list-disc list-inside text-gray-700 space-y-1">
                    <li>
                      {t(
                        "privacy.collection.usage.activity",
                        "Platform activity and interaction data",
                      )}
                    </li>
                    <li>
                      {t(
                        "privacy.collection.usage.preferences",
                        "Search preferences and saved listings",
                      )}
                    </li>
                    <li>
                      {t(
                        "privacy.collection.usage.technical",
                        "Technical information about your device and browser",
                      )}
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            {/* How We Use Information */}
            <section className="mb-8">
              <div className="flex items-center mb-4">
                <Lock className="w-6 h-6 text-primary mr-3" />
                <h2 className="text-2xl font-semibold text-gray-900 m-0">
                  {t("privacy.usage.title", "How We Use Your Information")}
                </h2>
              </div>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>
                  {t(
                    "privacy.usage.facilitate",
                    "To facilitate business connections and investment opportunities",
                  )}
                </li>
                <li>
                  {t(
                    "privacy.usage.verify",
                    "To verify user identity and maintain platform security",
                  )}
                </li>
                <li>
                  {t(
                    "privacy.usage.communicate",
                    "To communicate important updates and notifications",
                  )}
                </li>
                <li>
                  {t(
                    "privacy.usage.improve",
                    "To improve our services and user experience",
                  )}
                </li>
                <li>
                  {t(
                    "privacy.usage.comply",
                    "To comply with legal obligations and regulatory requirements",
                  )}
                </li>
              </ul>
            </section>

            {/* Data Protection */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                {t("privacy.protection.title", "Data Protection & Security")}
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                {t(
                  "privacy.protection.content",
                  "We implement industry-standard security measures to protect your personal information, including encryption, secure data transmission, and regular security audits. Access to your information is restricted to authorized personnel only.",
                )}
              </p>
            </section>

            {/* Your Rights */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                {t("privacy.rights.title", "Your Rights")}
              </h2>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>
                  {t(
                    "privacy.rights.access",
                    "Right to access your personal information",
                  )}
                </li>
                <li>
                  {t(
                    "privacy.rights.correct",
                    "Right to correct or update your information",
                  )}
                </li>
                <li>
                  {t(
                    "privacy.rights.delete",
                    "Right to request deletion of your data",
                  )}
                </li>
                <li>
                  {t("privacy.rights.portability", "Right to data portability")}
                </li>
                <li>
                  {t(
                    "privacy.rights.object",
                    "Right to object to certain processing activities",
                  )}
                </li>
              </ul>
            </section>

            {/* Contact Information */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                {t("privacy.contact.title", "Contact Us")}
              </h2>
              <p className="text-gray-700 leading-relaxed">
                {t(
                  "privacy.contact.content",
                  "If you have any questions about this Privacy Policy or wish to exercise your rights, please contact us at:",
                )}
              </p>
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-700">
                  <strong>{t("privacy.contact.email", "Email:")}</strong>{" "}
                  privacy@teejarti.com
                  <br />
                  <strong>{t("privacy.contact.phone", "Phone:")}</strong> +968
                  9123 4567
                  <br />
                  <strong>
                    {t("privacy.contact.address", "Address:")}
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
