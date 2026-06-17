import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import {
  ArrowLeft,
  HelpCircle,
  Search,
  MessageCircle,
  FileText,
  Users,
  Building2,
} from "lucide-react";

export default function HelpPage() {
  const { t } = useTranslation();

  const faqs = [
    {
      question: t("help.faq.1.question", "How do I create a business listing?"),
      answer: t(
        "help.faq.1.answer",
        'To create a business listing, log in to your account and click "List Your Business" in the navigation menu. Fill out the required information about your business, upload images, and submit for review.',
      ),
    },
    {
      question: t(
        "help.faq.2.question",
        "What documents do I need for KYC verification?",
      ),
      answer: t(
        "help.faq.2.answer",
        "For KYC verification, you will need a valid government-issued ID, business registration documents, and proof of address. Additional documents may be required based on your business type.",
      ),
    },
    {
      question: t(
        "help.faq.3.question",
        "How long does the approval process take?",
      ),
      answer: t(
        "help.faq.3.answer",
        "Business listings are typically reviewed within 24-48 hours. KYC verification may take 3-5 business days depending on the completeness of your documentation.",
      ),
    },
    {
      question: t(
        "help.faq.4.question",
        "Can I edit my listing after it's published?",
      ),
      answer: t(
        "help.faq.4.answer",
        "Yes, you can edit your listing at any time through your dashboard. Changes will be subject to review before being published.",
      ),
    },
    {
      question: t(
        "help.faq.5.question",
        "How do I contact potential buyers or investors?",
      ),
      answer: t(
        "help.faq.5.answer",
        'You can contact interested parties through our secure messaging system. Click "Contact Seller" on any listing to send a message.',
      ),
    },
    {
      question: t(
        "help.faq.6.question",
        "What are the fees for using TEEJARTI?",
      ),
      answer: t(
        "help.faq.6.answer",
        "Basic listings are free. Premium features and promoted listings have associated fees. Contact our team for detailed pricing information.",
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
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
              <HelpCircle className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {t("help.title", "Help Center")}
          </h1>
          <p className="text-xl text-gray-600">
            {t("help.subtitle", "Get help with using TEEJARTI platform")}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t("help.actions.search.title", "Search Help Articles")}
            </h3>
            <p className="text-gray-600 text-sm">
              {t(
                "help.actions.search.description",
                "Find answers to common questions",
              )}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t("help.actions.contact.title", "Contact Support")}
            </h3>
            <p className="text-gray-600 text-sm">
              {t(
                "help.actions.contact.description",
                "Get direct help from our team",
              )}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t("help.actions.guides.title", "User Guides")}
            </h3>
            <p className="text-gray-600 text-sm">
              {t("help.actions.guides.description", "Step-by-step tutorials")}
            </p>
          </div>
        </div>

        {/* Getting Started */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex items-center mb-6">
            <Building2 className="w-6 h-6 text-primary mr-3" />
            <h2 className="text-2xl font-semibold text-gray-900">
              {t("help.gettingStarted.title", "Getting Started")}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                {t("help.gettingStarted.sellers.title", "For Business Sellers")}
              </h3>
              <ol className="list-decimal list-inside text-gray-700 space-y-2">
                <li>
                  {t(
                    "help.gettingStarted.sellers.step1",
                    "Create your account and complete profile",
                  )}
                </li>
                <li>
                  {t(
                    "help.gettingStarted.sellers.step2",
                    "Complete KYC verification process",
                  )}
                </li>
                <li>
                  {t(
                    "help.gettingStarted.sellers.step3",
                    "Create your business listing with detailed information",
                  )}
                </li>
                <li>
                  {t(
                    "help.gettingStarted.sellers.step4",
                    "Upload business documents and financial information",
                  )}
                </li>
                <li>
                  {t(
                    "help.gettingStarted.sellers.step5",
                    "Wait for approval and start receiving inquiries",
                  )}
                </li>
              </ol>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                {t(
                  "help.gettingStarted.buyers.title",
                  "For Investors & Buyers",
                )}
              </h3>
              <ol className="list-decimal list-inside text-gray-700 space-y-2">
                <li>
                  {t(
                    "help.gettingStarted.buyers.step1",
                    "Register and verify your investor profile",
                  )}
                </li>
                <li>
                  {t(
                    "help.gettingStarted.buyers.step2",
                    "Browse available business opportunities",
                  )}
                </li>
                <li>
                  {t(
                    "help.gettingStarted.buyers.step3",
                    "Use filters to find businesses that match your criteria",
                  )}
                </li>
                <li>
                  {t(
                    "help.gettingStarted.buyers.step4",
                    "Save interesting listings to your favorites",
                  )}
                </li>
                <li>
                  {t(
                    "help.gettingStarted.buyers.step5",
                    "Contact sellers directly through our platform",
                  )}
                </li>
              </ol>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex items-center mb-6">
            <Users className="w-6 h-6 text-primary mr-3" />
            <h2 className="text-2xl font-semibold text-gray-900">
              {t("help.faq.title", "Frequently Asked Questions")}
            </h2>
          </div>

          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="border-b border-gray-200 pb-6 last:border-b-0"
              >
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  {faq.question}
                </h3>
                <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            {t("help.contact.title", "Still Need Help?")}
          </h2>
          <p className="text-gray-700 leading-relaxed mb-6">
            {t(
              "help.contact.description",
              "Our support team is here to help you succeed. Contact us through any of the following channels:",
            )}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <MessageCircle className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">
                {t("help.contact.email.title", "Email Support")}
              </h3>
              <p className="text-gray-600 text-sm">support@teejarti.com</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <HelpCircle className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">
                {t("help.contact.phone.title", "Phone Support")}
              </h3>
              <p className="text-gray-600 text-sm">+968 9123 4567</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">
                {t("help.contact.hours.title", "Business Hours")}
              </h3>
              <p className="text-gray-600 text-sm">
                {t("help.contact.hours.time", "Sun-Thu: 9AM-6PM GST")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
