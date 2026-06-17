import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLanguageContext } from "@/components/providers/language-provider";

export default function TermsAndConditionsPage() {
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const { isRtl } = useLanguageContext();

  return (
    <div className={`min-h-screen bg-white ${isRtl ? 'rtl' : 'ltr'}`}>
      <Navbar />

      <div className="max-w-5xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => window.history.back()}
            className="mb-3"
          >
            <ArrowLeft className={`w-4 h-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
            {t('terms.back')}
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            {t('terms.title')}
          </h1>
          <p className="text-gray-600 text-sm">{t('terms.lastUpdated')}</p>
        </div>

        {/* Content */}
        <div className="prose prose-gray max-w-none">
          <section className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              {t('terms.acceptance.title')}
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              {t('terms.acceptance.content')}
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              {t('terms.platform.title')}
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              {t('terms.platform.content')}
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              {t('terms.userResponsibilities.title')}
            </h2>
            <div className="text-gray-700 leading-relaxed">
              <p className="mb-4">{t('terms.userResponsibilities.intro')}</p>
              <ul className={`list-disc ${isRtl ? 'pr-6' : 'pl-6'} mb-4 space-y-2`}>
                {(t('terms.userResponsibilities.items', { returnObjects: true }) as string[]).map((item: string, index: number) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              {t('terms.verification.title')}
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              {t('terms.verification.content')}
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              {t('terms.privacy.title')}
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              {t('terms.privacy.content')}
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              {t('terms.financialTransactions.title')}
            </h2>
            <div className="text-gray-700 leading-relaxed">
              <p className="mb-4">
                {t('terms.financialTransactions.intro')}
              </p>
              <ul className={`list-disc ${isRtl ? 'pr-6' : 'pl-6'} mb-4 space-y-2`}>
                {(t('terms.financialTransactions.items', { returnObjects: true }) as string[]).map((item: string, index: number) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              {t('terms.prohibited.title')}
            </h2>
            <div className="text-gray-700 leading-relaxed">
              <p className="mb-4">{t('terms.prohibited.intro')}</p>
              <ul className={`list-disc ${isRtl ? 'pr-6' : 'pl-6'} mb-4 space-y-2`}>
                {(t('terms.prohibited.items', { returnObjects: true }) as string[]).map((item: string, index: number) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              {t('terms.liability.title')}
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              {t('terms.liability.content')}
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              {t('terms.intellectualProperty.title')}
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              {t('terms.intellectualProperty.content')}
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              {t('terms.termination.title')}
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              {t('terms.termination.content')}
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              {t('terms.governingLaw.title')}
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              {t('terms.governingLaw.content')}
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              {t('terms.contact.title')}
            </h2>
            <div className="text-gray-700 leading-relaxed">
              <p className="mb-4">
                {t('terms.contact.intro')}
              </p>
              <ul className="list-none space-y-2">
                <li>
                  <strong>{t('terms.contact.email')}</strong>
                </li>
                <li>
                  <strong>{t('terms.contact.phone')}</strong>
                </li>
                <li>
                  <strong>{t('terms.contact.address')}</strong>
                </li>
              </ul>
            </div>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              {t('terms.changes.title')}
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              {t('terms.changes.content')}
            </p>
          </section>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
            <h3 className="text-lg font-bold text-blue-900 mb-3">
              {t('terms.cta.title')}
            </h3>
            <p className="text-blue-800 mb-4">
              {t('terms.cta.description')}
            </p>
            <Button
              onClick={() =>
                (window.location.href = "/auth?tab=register&terms=accepted")
              }
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
            >
              {t('terms.cta.button')}
            </Button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
