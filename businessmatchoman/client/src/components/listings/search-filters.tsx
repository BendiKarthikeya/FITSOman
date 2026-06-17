import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  BUSINESS_CATEGORIES,
  LOCATIONS,
  TRANSACTION_TYPES,
} from "@shared/types";
import { useState } from "react";
import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/hooks/use-language";
import { useRTL } from "@/hooks/use-rtl";

// Helper functions to convert values to translation keys
const getLocationKey = (location: string) => {
  return location.toLowerCase().replace(/\s+/g, '').replace(/[^a-z]/g, '');
};

const getTransactionTypeKey = (type: string) => {
  return type.toLowerCase().replace(/\s+/g, '').replace(/[^a-z]/g, '');
};

interface SearchFiltersProps {
  industry: string;
  location: string;
  saleType: string;
  priceRange: number[];
  businessAge: string;
  verifiedOnly: boolean;
  featuredOnly: boolean;
  hasFinancials: boolean;
  hasDocuments: boolean;
  searchTerm: string;
  onIndustryChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onSaleTypeChange: (value: string) => void;
  onPriceRangeChange: (value: number[]) => void;
  onBusinessAgeChange: (value: string) => void;
  onVerifiedOnlyChange: (value: boolean) => void;
  onFeaturedOnlyChange: (value: boolean) => void;
  onHasFinancialsChange: (value: boolean) => void;
  onHasDocumentsChange: (value: boolean) => void;
  onSearchChange: (value: string) => void;
}

export default function SearchFilters({
  industry,
  location,
  saleType,
  priceRange,
  businessAge,
  verifiedOnly,
  featuredOnly,
  hasFinancials,
  hasDocuments,
  searchTerm,
  onIndustryChange,
  onLocationChange,
  onSaleTypeChange,
  onPriceRangeChange,
  onBusinessAgeChange,
  onVerifiedOnlyChange,
  onFeaturedOnlyChange,
  onHasFinancialsChange,
  onHasDocumentsChange,
  onSearchChange,
}: SearchFiltersProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { isRtl } = useRTL();

  return (
    <div className="space-y-6">
      {/* Search Field */}
      <div>
        <label className={`text-sm font-medium text-neutral-700 mb-2 block ${isRtl ? 'font-arabic text-right' : ''}`}>
          {t('listings.filters.searchField')}
        </label>
        <div className="relative">
          <input
            type="text"
            placeholder={t('listings.filters.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className={`w-full p-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRtl ? 'text-right font-arabic' : ''}`}
          />
          <Search className={`absolute ${isRtl ? 'left-2' : 'right-2'} top-2.5 h-4 w-4 text-neutral-400`} />
        </div>
      </div>

      {/* Industry Filter */}
      <div>
        <label className={`text-sm font-medium text-neutral-700 mb-2 block ${isRtl ? 'font-arabic text-right' : ''}`}>
          {t('listings.filters.industry')}
        </label>
        <Select value={industry} onValueChange={onIndustryChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t('listings.filters.allIndustries')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('listings.filters.allIndustries')}</SelectItem>
            {BUSINESS_CATEGORIES.map((category) => (
              <SelectItem key={category.id} value={category.name}>
                {t(`home.categories.${category.id}`) || category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Location Filter */}
      <div>
        <label className={`text-sm font-medium text-neutral-700 mb-2 block ${isRtl ? 'font-arabic text-right' : ''}`}>
          {t('listings.filters.location')}
        </label>
        <Select value={location} onValueChange={onLocationChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t('listings.filters.allLocations')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('listings.filters.allLocations')}</SelectItem>
            {LOCATIONS.map((loc) => (
              <SelectItem key={loc} value={loc}>
                {t(`common.locations.${getLocationKey(loc)}`) || loc}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Transaction Type Filter */}
      <div>
        <label className={`text-sm font-medium text-neutral-700 mb-2 block ${isRtl ? 'font-arabic text-right' : ''}`}>
          {t('listings.filters.transactionType')}
        </label>
        <Select value={saleType} onValueChange={onSaleTypeChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t('listings.filters.allTypes')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('listings.filters.allTypes')}</SelectItem>
            {TRANSACTION_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {t(`common.transactionTypes.${getTransactionTypeKey(type)}`) || type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Advanced Filters */}
      <Accordion type="single" collapsible>
        <AccordionItem value="advanced-filters">
          <AccordionTrigger className={`text-sm font-medium ${isRtl ? 'font-arabic' : ''}`}>
            {t('listings.filters.advancedFilters')}
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              {/* Price Range Slider */}
              <div>
                <div className={`flex justify-between mb-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <label className={`text-sm font-medium text-neutral-700 ${isRtl ? 'font-arabic' : ''}`}>
                    {t('listings.filters.priceRange')}
                  </label>
                  <span className={`text-sm text-neutral-500 ${isRtl ? 'font-arabic' : ''}`}>
                    {t('common.currency')} {priceRange[0] * 1000} -{" "}
                    {priceRange[1] * 10000 > 1000000
                      ? "1M+"
                      : priceRange[1] * 10000}
                  </span>
                </div>
                <Slider
                  defaultValue={[0, 100]}
                  max={100}
                  step={1}
                  value={priceRange}
                  onValueChange={onPriceRangeChange}
                />
              </div>

              {/* Business Age */}
              <div>
                <label className={`text-sm font-medium text-neutral-700 mb-2 block ${isRtl ? 'font-arabic text-right' : ''}`}>
                  {t('listings.filters.businessAge')}
                </label>
                <Select value={businessAge} onValueChange={onBusinessAgeChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('listings.filters.anyAge')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">{t('listings.filters.anyAge')}</SelectItem>
                    <SelectItem value="0-2">{t('listings.filters.age0to2')}</SelectItem>
                    <SelectItem value="3-5">{t('listings.filters.age3to5')}</SelectItem>
                    <SelectItem value="6-10">{t('listings.filters.age6to10')}</SelectItem>
                    <SelectItem value="10+">{t('listings.filters.age10plus')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Verification Status */}
              <div className={`flex items-center ${isRtl ? 'space-x-reverse space-x-2' : 'space-x-2'}`}>
                <Switch
                  id="verified"
                  checked={verifiedOnly}
                  onCheckedChange={onVerifiedOnlyChange}
                />
                <Label htmlFor="verified" className={isRtl ? 'font-arabic' : ''}>{t('listings.filters.verifiedOnly')}</Label>
              </div>

              {/* Featured Status */}
              <div className={`flex items-center ${isRtl ? 'space-x-reverse space-x-2' : 'space-x-2'}`}>
                <Switch
                  id="featured"
                  checked={featuredOnly}
                  onCheckedChange={onFeaturedOnlyChange}
                />
                <Label htmlFor="featured" className={isRtl ? 'font-arabic' : ''}>{t('listings.filters.featuredOnly')}</Label>
              </div>

              {/* Additional Options */}
              <div className="space-y-2">
                <label className={`text-sm font-medium text-neutral-700 block ${isRtl ? 'font-arabic text-right' : ''}`}>
                  {t('listings.filters.additionalOptions')}
                </label>
                <div className={`flex items-center ${isRtl ? 'space-x-reverse space-x-2' : 'space-x-2'}`}>
                  <Checkbox
                    id="has-financials"
                    checked={hasFinancials}
                    onCheckedChange={onHasFinancialsChange}
                  />
                  <Label htmlFor="has-financials" className={isRtl ? 'font-arabic' : ''}>{t('listings.filters.hasFinancials')}</Label>
                </div>
                <div className={`flex items-center ${isRtl ? 'space-x-reverse space-x-2' : 'space-x-2'}`}>
                  <Checkbox
                    id="has-documents"
                    checked={hasDocuments}
                    onCheckedChange={onHasDocumentsChange}
                  />
                  <Label htmlFor="has-documents" className={isRtl ? 'font-arabic' : ''}>{t('listings.filters.hasDocuments')}</Label>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
