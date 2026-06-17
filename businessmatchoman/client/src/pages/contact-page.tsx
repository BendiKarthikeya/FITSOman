import { useState } from "react";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import MobileNavigation from "@/components/layout/mobile-navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { EditableText } from "@/components/ui/editable-text";
import { Mail, Phone, MapPin, Clock, Send } from "lucide-react";

export default function ContactPage() {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Here you would implement the actual contact form submission
      // For now, we'll simulate a successful submission
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast({
        title: t("contact.form.successTitle"),
        description: t("contact.form.successDescription"),
      });

      setFormData({ name: "", email: "", subject: "", message: "" });
    } catch (error) {
      toast({
        title: t("contact.form.errorTitle"),
        description: t("contact.form.errorDescription"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

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
                  translationKey="contact.title"
                  section="contact"
                  keyName="title"
                  as="span"
                />
              </h1>
              <p className="text-xl md:text-2xl text-neutral-cream/90 leading-relaxed">
                <EditableText
                  translationKey="contact.subtitle"
                  section="contact"
                  keyName="subtitle"
                  as="span"
                  multiline
                />
              </p>
            </div>
          </div>
        </section>

        {/* Contact Content */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
              {/* Contact Information */}
              <div>
                <h2 className="text-3xl font-bold text-primary-blue mb-8">
                  <EditableText
                    translationKey="contact.getInTouch"
                    section="contact"
                    keyName="getInTouch"
                    as="span"
                  />
                </h2>
                <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                  <EditableText
                    translationKey="contact.info.subtitle"
                    section="contact"
                    keyName="info.subtitle"
                    as="span"
                    multiline
                  />
                </p>

                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-accent-gold/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-6 h-6 text-accent-gold" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-primary-blue mb-2">
                        {t("contact.info.location.title")}
                      </h3>
                      <p className="text-gray-700 whitespace-pre-line">
                        {t("contact.info.location.address")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-accent-gold/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Phone className="w-6 h-6 text-accent-gold" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-primary-blue mb-2">
                        {t("contact.info.phone.title")}
                      </h3>
                      <p className="text-gray-700">
                        {t("contact.info.phone.main")}: +968 2234 5678
                        <br />
                        {t("contact.info.phone.whatsapp")}: +968 9123 4567
                        <br />
                        {t("contact.info.phone.tollfree")}: 800 BUSINESS
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-accent-gold/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Mail className="w-6 h-6 text-accent-gold" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-primary-blue mb-2">
                        {t("contact.info.email.title")}
                      </h3>
                      <p className="text-gray-700">
                        {t("contact.info.email.general")}: info@teejarti.com
                        <br />
                        {t("contact.info.email.support")}: support@teejarti.com
                        <br />
                        {t("contact.info.email.partnerships")}: partners@teejarti.com
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-accent-gold/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Clock className="w-6 h-6 text-accent-gold" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-primary-blue mb-2">
                        {t("contact.info.hours.title")}
                      </h3>
                      <p className="text-gray-700">
                        {t("contact.info.hours.sunday")}
                        <br />
                        {t("contact.info.hours.friday")}
                        <br />
                        {t("contact.info.hours.saturday")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Links */}
                <div className="mt-10 p-6 bg-neutral-cream/30 rounded-xl">
                  <h3 className="font-semibold text-primary-blue mb-4">
                    {t("contact.quickSupport.title")}
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">{t("contact.quickSupport.platformSupport")}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-accent-gold text-accent-gold hover:bg-accent-gold hover:text-white"
                      >
                        <EditableText
                          translationKey="contact.quickSupport.liveChat"
                          section="contact"
                          keyName="quickSupport.liveChat"
                          as="span"
                        />
                      </Button>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">{t("contact.quickSupport.scheduleDemo")}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-accent-gold text-accent-gold hover:bg-accent-gold hover:text-white"
                      >
                        <EditableText
                          translationKey="contact.quickSupport.bookNow"
                          section="contact"
                          keyName="quickSupport.bookNow"
                          as="span"
                        />
                      </Button>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">{t("contact.quickSupport.downloadBrochure")}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-accent-gold text-accent-gold hover:bg-accent-gold hover:text-white"
                      >
                        <EditableText
                          translationKey="contact.quickSupport.download"
                          section="contact"
                          keyName="quickSupport.download"
                          as="span"
                        />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Form */}
              <div className="bg-neutral-cream/20 p-8 rounded-xl">
                <h2 className="text-3xl font-bold text-primary-blue mb-8">
                  <EditableText
                    translationKey="contact.form.title"
                    section="contact"
                    keyName="form.title"
                    as="span"
                  />
                </h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-primary-blue mb-2"
                    >
                      {t("contact.form.name")} *
                    </label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      placeholder={t("contact.form.namePlaceholder")}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-primary-blue mb-2"
                    >
                      {t("contact.form.email")} *
                    </label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      placeholder={t("contact.form.emailPlaceholder")}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="subject"
                      className="block text-sm font-medium text-primary-blue mb-2"
                    >
                      {t("contact.form.subject")} *
                    </label>
                    <Input
                      id="subject"
                      name="subject"
                      type="text"
                      required
                      value={formData.subject}
                      onChange={handleChange}
                      placeholder={t("contact.form.subjectPlaceholder")}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="message"
                      className="block text-sm font-medium text-primary-blue mb-2"
                    >
                      {t("contact.form.message")} *
                    </label>
                    <Textarea
                      id="message"
                      name="message"
                      required
                      value={formData.message}
                      onChange={handleChange}
                      placeholder={t("contact.form.messagePlaceholder")}
                      rows={6}
                      className="w-full"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-accent-gold hover:bg-accent-gold/90 text-deep-contrast py-3 text-lg font-semibold"
                  >
                    {isSubmitting ? (
                      <EditableText
                        translationKey="contact.form.sending"
                        section="contact"
                        keyName="form.sending"
                        as="span"
                      />
                    ) : (
                      <>
                        <Send className="w-5 h-5 mr-2" />
                        <EditableText
                          translationKey="contact.form.send"
                          section="contact"
                          keyName="form.send"
                          as="span"
                        />
                      </>
                    )}
                  </Button>
                </form>

                <div className="mt-6 text-sm text-gray-600 text-center">
                  {t("contact.form.privacyAgreement")}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 bg-neutral-cream/30">
          <div className="container mx-auto px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-primary-blue mb-4">
                <EditableText
                  translationKey="contact.faq.title"
                  section="contact"
                  keyName="faq.title"
                  as="span"
                />
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                <EditableText
                  translationKey="contact.faq.subtitle"
                  section="contact"
                  keyName="faq.subtitle"
                  as="span"
                  multiline
                />
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <h3 className="font-semibold text-primary-blue mb-3">
                  {t("contact.faq.questions.howToList.question")}
                </h3>
                <p className="text-gray-700">
                  {t("contact.faq.questions.howToList.answer")}
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm">
                <h3 className="font-semibold text-primary-blue mb-3">
                  {t("contact.faq.questions.businessTypes.question")}
                </h3>
                <p className="text-gray-700">
                  {t("contact.faq.questions.businessTypes.answer")}
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm">
                <h3 className="font-semibold text-primary-blue mb-3">
                  {t("contact.faq.questions.fees.question")}
                </h3>
                <p className="text-gray-700">
                  {t("contact.faq.questions.fees.answer")}
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm">
                <h3 className="font-semibold text-primary-blue mb-3">
                  {t("contact.faq.questions.verification.question")}
                </h3>
                <p className="text-gray-700">
                  {t("contact.faq.questions.verification.answer")}
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <MobileNavigation />
    </div>
  );
}
