import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Listing } from "@shared/schema";
import { Language } from "@/hooks/use-language";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get the appropriate language version of a field based on user's language preference
 *
 * @param listing - Listing object with title_en, title_ar, description_en, description_ar
 * @param language - User's preferred language ('en' | 'ar')
 * @returns Object with title and description in the preferred language
 */
export function getLocalizedFields(listing: Listing, language: Language) {
  // Add title and description fields based on language
  const languageSuffix = language === "ar" ? "_ar" : "_en";

  return {
    ...listing,
    title: listing[`title${languageSuffix}`] || listing[`title_en`] || "", // Fallback to English if translation missing
    description:
      listing[`description${languageSuffix}`] ||
      listing[`description_en`] ||
      "", // Fallback to English
  };
}

/**
 * Format a number as currency in OMR (Omani Rial)
 * @param amount - The amount to format
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-OM", {
    style: "currency",
    currency: "OMR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
