import { Link } from "wouter";
import {
  Loader2,
  MapPin,
  Mail,
  Phone,
  Building2,
  Globe,
  X as XLogo,
  Instagram,
  Linkedin,
  CheckCircle,
} from "lucide-react";
import { useSettings } from "@/hooks/use-settings";
import { useLanguage } from "@/hooks/use-language";
import { useTranslation } from "react-i18next";
import { useRTL } from "@/hooks/use-rtl";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { EditableText } from "@/components/ui/editable-text";

export default function Footer() {
  const { getSetting, isLoading } = useSettings();
  const { language, toggleLanguage } = useLanguage();
  const { t } = useTranslation();
  const { isRtl } = useRTL();
  const { toast } = useToast();
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Newsletter subscription mutation
  const subscribeToNewsletter = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest("POST", "/api/newsletter/subscribe", { email });
      return await response.json();
    },
    onSuccess: (data) => {
      setIsSubscribed(true);
      setNewsletterEmail("");
      toast({
        title: "Success!",
        description: data.message || "Successfully subscribed to newsletter!",
      });
    },
    onError: (error: any) => {
      console.error("Newsletter subscription error:", error);
      toast({
        title: "Subscription Failed",
        description: error.message || "Failed to subscribe to newsletter. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail || !newsletterEmail.includes("@")) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }
    subscribeToNewsletter.mutate(newsletterEmail);
  };

  // Get contact information and social media from settings
  const address = getSetting("contact.address", "Muscat, Sultanate of Oman");
  const contactEmail = getSetting("contact.email", "info@teejarti.com");
  const phone = getSetting("contact.phone", "+968 9123 4567");
  const twitterUrl = getSetting(
    "social.twitter",
    "https://x.com/teejarti",
  );
  const instagramUrl = getSetting(
    "social.instagram",
    "https://instagram.com/teejarti",
  );
  const linkedinUrl = getSetting(
    "social.linkedin",
    "https://linkedin.com/company/teejarti",
  );

  return (
    <footer className="relative text-white overflow-hidden bg-gradient-to-b from-zinc-900 via-zinc-900 to-zinc-950">
      {/* Gradient overlay for modern look */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900/60 via-gray-800/40 to-primary/10"></div>
      {/* Subtle background accents */}
      <div className="pointer-events-none absolute -top-32 right-[-10%] h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 left-[-10%] h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />

      <div className="relative z-10">
        {/* Main footer content */}
        <div className="container mx-auto px-4 pt-16 pb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 mb-12">
            {/* Company Info */}
            <div className="lg:col-span-1 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-sm p-6 md:p-8 shadow-xl">
              <div className="mb-6">
                <Link href="/" className="inline-block">
                  <div className={`flex items-center ${isRtl ? 'space-x-reverse space-x-3' : 'space-x-3'}`}>
                    <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className={`text-xl font-bold ${isRtl ? 'font-arabic' : ''}`} style={{ color: '#C79F3D' }}>
                        {isRtl ? "تيجارتي" : "TEEJARTI"}
                      </h3>
                      <p className={`text-xs text-gray-400 ${isRtl ? 'font-arabic' : ''}`}>
                        {language === "ar" ? "مركز الأعمال" : "Business Hub"}
                      </p>
                    </div>
                  </div>
                </Link>
              </div>

              <p className="text-gray-300 mb-6 leading-relaxed">
                <EditableText
                  translationKey="footer.description"
                  section="footer"
                  keyName="description"
                  as="span"
                  multiline
                />
              </p>

              {/* Social Media Links */}
              <div className="flex space-x-4">
                <a
                  href={twitterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-white/10 border border-white/10 rounded-xl flex items-center justify-center transition-all duration-300 group backdrop-blur-sm hover:bg-white/20"
                  style={{ '&:hover': { backgroundColor: '#C79F3D' } }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#C79F3D'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                  aria-label="Follow us on X"
                >
                  <XLogo className="w-5 h-5 text-gray-200 group-hover:text-white transition-colors" />
                </a>
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-white/10 border border-white/10 rounded-xl flex items-center justify-center transition-all duration-300 group backdrop-blur-sm hover:bg-white/20"
                  style={{ '&:hover': { backgroundColor: '#C79F3D' } }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#C79F3D'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                  aria-label="Follow us on Instagram"
                >
                  <Instagram className="w-5 h-5 text-gray-200 group-hover:text-white transition-colors" />
                </a>
                <a
                  href={linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-white/10 border border-white/10 rounded-xl flex items-center justify-center transition-all duration-300 group backdrop-blur-sm hover:bg-white/20"
                  style={{ '&:hover': { backgroundColor: '#C79F3D' } }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#C79F3D'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                  aria-label="Connect with us on LinkedIn"
                >
                  <Linkedin className="w-5 h-5 text-gray-200 group-hover:text-white transition-colors" />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-white/5 border border-white/10 rounded-3xl backdrop-blur-sm p-6 md:p-8 shadow-xl">
              <h4 className="text-lg font-semibold mb-6 text-white">
                <EditableText
                  translationKey="footer.quickLinks"
                  section="footer"
                  keyName="quickLinks"
                  as="span"
                />
              </h4>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="/"
                    className="text-gray-300 hover:text-[#C79F3D] transition-colors duration-200 flex items-center group"
                  >
                    <span className="w-1 h-1 bg-[#C79F3D] rounded-full mr-3 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    {t("nav.home", "Home")}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/listings"
                    className="text-gray-300 hover:text-[#C79F3D] transition-colors duration-200 flex items-center group"
                  >
                    <span className="w-1 h-1 bg-[#C79F3D] rounded-full mr-3 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    {t("nav.browse", "Browse Listings")}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/create-listing"
                    className="text-gray-300 hover:text-[#C79F3D] transition-colors duration-200 flex items-center group"
                  >
                    <span className="w-1 h-1 bg-[#C79F3D] rounded-full mr-3 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    {t("nav.create", "List Your Business")}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/investors"
                    className="text-gray-300 hover:text-[#C79F3D] transition-colors duration-200 flex items-center group"
                  >
                    <span className="w-1 h-1 bg-[#C79F3D] rounded-full mr-3 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    {t("nav.investors", "For Investors")}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/faq"
                    className="text-gray-300 hover:text-[#C79F3D] transition-colors duration-200 flex items-center group"
                  >
                    <span className="w-1 h-1 bg-[#C79F3D] rounded-full mr-3 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    {t("nav.faq", "FAQ")}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Resources & Support */}
            <div className="bg-white/5 border border-white/10 rounded-3xl backdrop-blur-sm p-6 md:p-8 shadow-xl">
              <h4 className="text-lg font-semibold mb-6 text-white">
                <EditableText
                  translationKey="footer.resources"
                  section="footer"
                  keyName="resources"
                  as="span"
                />
              </h4>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="/about"
                    className="text-gray-300 hover:text-[#C79F3D] transition-colors duration-200 flex items-center group"
                  >
                    <span className="w-1 h-1 bg-[#C79F3D] rounded-full mr-3 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    {t("nav.about", "About Us")}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contact"
                    className="text-gray-300 hover:text-[#C79F3D] transition-colors duration-200 flex items-center group"
                  >
                    <span className="w-1 h-1 bg-[#C79F3D] rounded-full mr-3 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    {t("nav.contact", "Contact")}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="text-gray-300 hover:text-[#C79F3D] transition-colors duration-200 flex items-center group"
                  >
                    <span className="w-1 h-1 bg-[#C79F3D] rounded-full mr-3 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    <EditableText
                      translationKey="footer.terms"
                      section="footer"
                      keyName="terms"
                      as="span"
                    />
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy"
                    className="text-gray-300 hover:text-[#C79F3D] transition-colors duration-200 flex items-center group"
                  >
                    <span className="w-1 h-1 bg-[#C79F3D] rounded-full mr-3 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    <EditableText
                      translationKey="footer.privacy"
                      section="footer"
                      keyName="privacy"
                      as="span"
                    />
                  </Link>
                </li>
                <li>
                  <Link
                    href="/help"
                    className="text-gray-300 hover:text-[#C79F3D] transition-colors duration-200 flex items-center group"
                  >
                    <span className="w-1 h-1 bg-[#C79F3D] rounded-full mr-3 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    <EditableText
                      translationKey="footer.help"
                      section="footer"
                      keyName="help"
                      as="span"
                    />
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact Info */}
            <div className="bg-white/5 border border-white/10 rounded-3xl backdrop-blur-sm p-6 md:p-8 shadow-xl">
              <h4 className="text-lg font-semibold mb-6 text-white">
                <EditableText
                  translationKey="footer.contact"
                  section="footer"
                  keyName="contact"
                  as="span"
                />
              </h4>
              <ul className="space-y-4">
                <li className="flex items-start group">
                  <div className="w-10 h-10 bg-white/10 border border-white/10 rounded-xl flex items-center justify-center mr-3 group-hover:bg-[#C79F3D] transition-colors duration-200">
                    <MapPin className="w-5 h-5 text-gray-200 group-hover:text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-400 mb-1">
                      <EditableText
                        translationKey="footer.address"
                        section="footer"
                        keyName="address"
                        as="span"
                      />
                    </p>
                    <p className="text-gray-300">
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        address
                      )}
                    </p>
                  </div>
                </li>
                <li className="flex items-start group">
                  <div className="w-10 h-10 bg-white/10 border border-white/10 rounded-xl flex items-center justify-center mr-3 group-hover:bg-[#C79F3D] transition-colors duration-200">
                    <Mail className="w-5 h-5 text-gray-200 group-hover:text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-400 mb-1">
                      <EditableText
                        translationKey="footer.email"
                        section="footer"
                        keyName="email"
                        as="span"
                      />
                    </p>
                    <a
                      href={`mailto:${contactEmail}`}
                      className="text-gray-300 hover:text-[#C79F3D] transition-colors break-all leading-snug"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        contactEmail
                      )}
                    </a>
                  </div>
                </li>
                <li className="flex items-start group">
                  <div className="w-10 h-10 bg-white/10 border border-white/10 rounded-xl flex items-center justify-center mr-3 group-hover:bg-[#C79F3D] transition-colors duration-200">
                    <Phone className="w-5 h-5 text-gray-200 group-hover:text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-400 mb-1">
                      <EditableText
                        translationKey="footer.phone"
                        section="footer"
                        keyName="phone"
                        as="span"
                      />
                    </p>
                    <a
                      href={`tel:${phone}`}
                      className="text-gray-300 hover:text-[#C79F3D] transition-colors"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        phone
                      )}
                    </a>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Row: left chips, centered newsletter, right links */}
          <div className="pt-4 pb-8">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
              {/* Left chips */}
              <div className="flex justify-start">
                <div className="flex flex-col sm:flex-row items-center gap-3 text-sm">
                  <button
                    onClick={toggleLanguage}
                    className="flex items-center space-x-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors backdrop-blur-sm"
                  >
                    <Globe className="w-4 h-4 text-gray-200" />
                    <span className="text-gray-200">{language === "ar" ? "العربية" : "English"}</span>
                  </button>

                  <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-gray-300 backdrop-blur-sm">
                    &copy; {new Date().getFullYear()} TEEJARTI. <EditableText
                      translationKey="footer.rights"
                      section="footer"
                      keyName="rights"
                      as="span"
                    />
                  </div>
                </div>
              </div>

              {/* Center: Newsletter */}
              <div className="bg-white/5 border border-white/10 rounded-3xl backdrop-blur-sm p-5 md:p-6 shadow-xl max-w-xl w-full mx-auto">
                <div className="max-w-2xl mx-auto text-center">
                  <h4 className="text-lg font-semibold mb-2 text-white">
                    <EditableText
                      translationKey="footer.newsletter.title"
                      section="footer"
                      keyName="newsletter.title"
                      as="span"
                    />
                  </h4>
                  <p className="text-gray-300 mb-4 text-sm">
                    <EditableText
                      translationKey="footer.newsletter.subtitle"
                      section="footer"
                      keyName="newsletter.subtitle"
                      as="span"
                      multiline
                    />
                  </p>
                  <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-2.5 max-w-md mx-auto">
                    <input
                      type="email"
                      value={newsletterEmail}
                      onChange={(e) => setNewsletterEmail(e.target.value)}
                      placeholder={t(
                        "footer.newsletter.placeholder",
                        "Enter your email",
                      )}
                      className="flex-1 px-4 py-2.5 bg-white/10 border border-white/10 rounded-xl text-white placeholder-gray-300 focus:outline-none transition-colors backdrop-blur-sm text-sm"
                      style={{ '&:focus': { borderColor: '#C79F3D' } }}
                      onFocus={(e) => e.currentTarget.style.borderColor = '#C79F3D'}
                      onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                      disabled={subscribeToNewsletter.isPending || isSubscribed}
                    />
                    <button 
                      type="submit"
                      disabled={subscribeToNewsletter.isPending || isSubscribed}
                      className="px-5 py-2.5 text-white font-medium rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm" 
                      style={{ backgroundColor: '#C79F3D' }} 
                      onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#B8953A')} 
                      onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#C79F3D')}
                    >
                      {subscribeToNewsletter.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Subscribing...
                        </>
                      ) : isSubscribed ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Subscribed!
                        </>
                      ) : (
                        <EditableText
                          translationKey="footer.newsletter.subscribe"
                          section="footer"
                          keyName="newsletter.subscribe"
                          as="span"
                        />
                      )}
                    </button>
                  </form>
                </div>
              </div>

              {/* Right links */}
              <div className="flex justify-end">
                <div className={`bg-white/5 border border-white/10 rounded-xl px-4 py-2 backdrop-blur-sm flex items-center text-sm ${isRtl ? 'space-x-reverse space-x-6' : 'space-x-6'}`}>
                  <Link
                    href="/sitemap"
                    className="text-gray-300 hover:text-[#C79F3D] transition-colors"
                  >
                    <EditableText
                      translationKey="footer.sitemap"
                      section="footer"
                      keyName="sitemap"
                      as="span"
                    />
                  </Link>
                  <Link
                    href="/accessibility"
                    className="text-gray-300 hover:text-[#C79F3D] transition-colors"
                  >
                    <EditableText
                      translationKey="footer.accessibility"
                      section="footer"
                      keyName="accessibility"
                      as="span"
                    />
                  </Link>
                  <Link
                    href="/cookies"
                    className="text-gray-300 hover:text-[#C79F3D] transition-colors"
                  >
                    <EditableText
                      translationKey="footer.cookies"
                      section="footer"
                      keyName="cookies"
                      as="span"
                    />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
