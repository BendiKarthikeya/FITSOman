import { useTranslation } from "react-i18next";
import { EditableText } from "@/components/ui/editable-text";
import { Link } from "wouter";
import { ArrowLeft, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: "general" | "business" | "investors" | "account" | "technical";
}

export default function FAQPage() {
  const { t } = useTranslation();
  const [openItems, setOpenItems] = useState<string[]>([]);

  const toggleItem = (id: string) => {
    setOpenItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const faqData: FAQItem[] = [
    // General Questions
    {
      id: "what-is-teejarti",
      question: t("faq.general.whatIsTeejarti.question"),
      answer: t("faq.general.whatIsTeejarti.answer"),
      category: "general",
    },
    {
      id: "how-does-it-work",
      question: t("faq.general.howDoesItWork.question"),
      answer: t("faq.general.howDoesItWork.answer"),
      category: "general",
    },
    {
      id: "is-teejarti-free",
      question: t("faq.general.isTeejartieFree.question"),
      answer: t("faq.general.isTeejartieFree.answer"),
      category: "general",
    },

    // Business Listing Questions
    {
      id: "how-to-list-business",
      question: t("faq.business.howToListBusiness.question"),
      answer: t("faq.business.howToListBusiness.answer"),
      category: "business",
    },
    {
      id: "what-documents-needed",
      question: t("faq.business.whatDocumentsNeeded.question"),
      answer: t("faq.business.whatDocumentsNeeded.answer"),
      category: "business",
    },
    {
      id: "how-long-listing-active",
      question: t("faq.business.howLongListingActive.question"),
      answer: t("faq.business.howLongListingActive.answer"),
      category: "business",
    },
    {
      id: "can-edit-listing",
      question: t("faq.business.canEditListing.question"),
      answer: t("faq.business.canEditListing.answer"),
      category: "business",
    },

    // Investor Questions
    {
      id: "how-to-invest",
      question: t("faq.investors.howToInvest.question"),
      answer: t("faq.investors.howToInvest.answer"),
      category: "investors",
    },
    {
      id: "minimum-investment",
      question: t("faq.investors.minimumInvestment.question"),
      answer: t("faq.investors.minimumInvestment.answer"),
      category: "investors",
    },
    {
      id: "investor-protection",
      question: t("faq.investors.investorProtection.question"),
      answer: t("faq.investors.investorProtection.answer"),
      category: "investors",
    },

    // Account Questions
    {
      id: "kyc-process",
      question: t("faq.account.kycProcess.question"),
      answer: t("faq.account.kycProcess.answer"),
      category: "account",
    },
    {
      id: "kyc-how-long",
      question: t("faq.account.kycHowLong.question"),
      answer: t("faq.account.kycHowLong.answer"),
      category: "account",
    },
    {
      id: "forgot-password",
      question: t("faq.account.forgotPassword.question"),
      answer: t("faq.account.forgotPassword.answer"),
      category: "account",
    },

    // Technical Questions
    {
      id: "supported-browsers",
      question: t("faq.technical.supportedBrowsers.question"),
      answer: t("faq.technical.supportedBrowsers.answer"),
      category: "technical",
    },
    {
      id: "mobile-app",
      question: t("faq.technical.mobileApp.question"),
      answer: t("faq.technical.mobileApp.answer"),
      category: "technical",
    },
    {
      id: "data-security",
      question: t("faq.technical.dataSecurity.question"),
      answer: t("faq.technical.dataSecurity.answer"),
      category: "technical",
    },
  ];

  const categories = [
    { id: "general", name: t("faq.categories.general"), icon: "🔍" },
    { id: "business", name: t("faq.categories.business"), icon: "🏢" },
    { id: "investors", name: t("faq.categories.investors"), icon: "💰" },
    { id: "account", name: t("faq.categories.account"), icon: "👤" },
    { id: "technical", name: t("faq.categories.technical"), icon: "⚙️" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Back Navigation */}
        <Link
          href="/"
          className="inline-flex items-center text-primary hover:text-primary/80 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t("common.back")}
        </Link>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <HelpCircle className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            <EditableText
              translationKey="faq.title"
              section="faq"
              keyName="title"
              as="span"
            />
          </h1>
          <p className="text-xl text-gray-600">
            <EditableText
              translationKey="faq.subtitle"
              section="faq"
              keyName="subtitle"
              as="span"
              multiline
            />
          </p>
        </div>

        {/* Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {categories.map((category) => (
            <div
              key={category.id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{category.icon}</span>
                <div>
                  <h3 className="font-semibold text-gray-800">
                    {category.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {
                      faqData.filter((item) => item.category === category.id)
                        .length
                    }{" "}
                    {t("faq.questionsLabel")}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ Items */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {categories.map((category) => (
            <div
              key={category.id}
              className="border-b border-gray-200 last:border-b-0"
            >
              <div className="p-6 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <span className="text-xl">{category.icon}</span>
                  <h2 className="text-xl font-semibold text-gray-800">
                    {category.name}
                  </h2>
                </div>
              </div>

              <div className="divide-y divide-gray-100">
                {faqData
                  .filter((item) => item.category === category.id)
                  .map((faq) => (
                    <Collapsible key={faq.id} open={openItems.includes(faq.id)}>
                      <CollapsibleTrigger
                        className="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors"
                        onClick={() => toggleItem(faq.id)}
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-gray-800 pr-4">
                            {faq.question}
                          </h3>
                          {openItems.includes(faq.id) ? (
                            <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                          )}
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-6 pb-4 text-gray-700 leading-relaxed">
                          {faq.answer}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
              </div>
            </div>
          ))}
        </div>

        {/* Contact Support */}
        <div className="mt-12 text-center bg-white rounded-xl border border-gray-200 p-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            {t("faq.stillNeedHelp")}
          </h2>
          <p className="text-gray-600 mb-6">
            {t("faq.contactSupport")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact">
              <button className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
                <EditableText
                  translationKey="faq.contactUs"
                  section="faq"
                  keyName="contactUs"
                  as="span"
                />
              </button>
            </Link>
            <a
              href="mailto:support@teejarti.com"
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <EditableText
                translationKey="faq.emailSupport"
                section="faq"
                keyName="emailSupport"
                as="span"
              />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
