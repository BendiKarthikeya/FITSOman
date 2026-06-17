import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import {
  ArrowLeft,
  Home,
  Building2,
  Users,
  MessageSquare,
  FileText,
  Shield,
} from "lucide-react";
import { useLanguageContext } from "@/components/providers/language-provider";

export default function SitemapPage() {
  const { t } = useTranslation();
  const { isRtl } = useLanguageContext();

  const siteStructure = [
    {
      title: t("sitemap.main.title", "Main Pages"),
      icon: Home,
      links: [
        { href: "/", label: t("nav.home", "Home") },
        { href: "/listings", label: t("nav.browse", "Browse Listings") },
        {
          href: "/create-listing",
          label: t("nav.create", "List Your Business"),
        },
        { href: "/investors", label: t("nav.investors", "For Investors") },
        {
          href: "/success-stories",
          label: t("nav.success", "Success Stories"),
        },
      ],
    },
    {
      title: t("sitemap.company.title", "Company"),
      icon: Building2,
      links: [
        { href: "/about", label: t("nav.about", "About Us") },
        { href: "/contact", label: t("nav.contact", "Contact") },
        {
          href: "/how-it-works",
          label: t("sitemap.company.howItWorks", "How It Works"),
        },
      ],
    },
    {
      title: t("sitemap.account.title", "User Account"),
      icon: Users,
      links: [
        {
          href: "/auth",
          label: t("sitemap.account.login", "Login / Register"),
        },
        {
          href: "/dashboard",
          label: t("sitemap.account.dashboard", "Dashboard"),
        },
        { href: "/profile", label: t("sitemap.account.profile", "Profile") },
        {
          href: "/saved-listings",
          label: t("sitemap.account.saved", "Saved Listings"),
        },
      ],
    },
    {
      title: t("sitemap.support.title", "Support & Resources"),
      icon: MessageSquare,
      links: [
        { href: "/help", label: t("footer.help", "Help Center") },
        { href: "/faq", label: t("sitemap.support.faq", "FAQ") },
      ],
    },
    {
      title: t("sitemap.legal.title", "Legal & Policies"),
      icon: Shield,
      links: [
        { href: "/terms", label: t("footer.terms", "Terms & Conditions") },
        { href: "/privacy", label: t("footer.privacy", "Privacy Policy") },
        { href: "/cookies", label: t("footer.cookies", "Cookie Policy") },
      ],
    },
    {
      title: t("sitemap.other.title", "Other"),
      icon: FileText,
      links: [
        { href: "/sitemap", label: t("footer.sitemap", "Sitemap") },
        {
          href: "/accessibility",
          label: t("footer.accessibility", "Accessibility"),
        },
      ],
    },
  ];

  return (
    <div className={`min-h-screen bg-gray-50 ${isRtl ? 'rtl' : 'ltr'}`}>
      <div className="container mx-auto px-4 py-12 max-w-6xl">
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
              <FileText className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {t("sitemap.title", "Sitemap")}
          </h1>
          <p className="text-xl text-gray-600">
            {t(
              "sitemap.subtitle",
              "Navigate all pages and features of TEEJARTI platform",
            )}
          </p>
        </div>

        {/* Sitemap Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {siteStructure.map((section, index) => {
            const IconComponent = section.icon;
            return (
              <div
                key={index}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
              >
                <div className="flex items-center mb-4">
                  <div className={`w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center ${isRtl ? 'ml-3' : 'mr-3'}`}>
                    <IconComponent className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {section.title}
                  </h2>
                </div>

                <ul className="space-y-3">
                  {section.links.map((link, linkIndex) => (
                    <li key={linkIndex}>
                      <Link
                        href={link.href}
                        className="text-gray-700 hover:text-primary transition-colors duration-200 flex items-center group"
                      >
                        <span className={`w-1 h-1 bg-primary rounded-full ${isRtl ? 'ml-3' : 'mr-3'} opacity-0 group-hover:opacity-100 transition-opacity`}></span>
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Quick Statistics */}
        <div className="mt-12 bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
            {t("sitemap.stats.title", "Platform Overview")}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">25+</div>
              <div className="text-gray-600 text-sm">
                {t("sitemap.stats.pages", "Total Pages")}
              </div>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">5</div>
              <div className="text-gray-600 text-sm">
                {t("sitemap.stats.categories", "Main Categories")}
              </div>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">2</div>
              <div className="text-gray-600 text-sm">
                {t("sitemap.stats.languages", "Languages Supported")}
              </div>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">100%</div>
              <div className="text-gray-600 text-sm">
                {t("sitemap.stats.mobile", "Mobile Responsive")}
              </div>
            </div>
          </div>
        </div>

        {/* Contact Section */}
        <div className="mt-8 bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl p-8 text-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            {t("sitemap.contact.title", "Need Help Finding Something?")}
          </h3>
          <p className="text-gray-700 mb-6">
            {t(
              "sitemap.contact.description",
              "If you can't find what you're looking for, our support team is here to help.",
            )}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="inline-flex items-center px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              {t("sitemap.contact.button", "Contact Support")}
            </Link>
            <Link
              href="/help"
              className="inline-flex items-center px-6 py-3 bg-white text-primary border border-primary font-medium rounded-lg hover:bg-primary/5 transition-colors"
            >
              <FileText className="w-4 h-4 mr-2" />
              {t("sitemap.help.button", "Visit Help Center")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
