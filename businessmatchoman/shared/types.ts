// Business Categories
export const BUSINESS_CATEGORIES = [
  {
    id: "food_hospitality",
    name: "Food & Hospitality",
    icon: "restaurant",
    count: 42,
  },
  {
    id: "retail_ecommerce",
    name: "Retail & E-commerce",
    icon: "shopping_cart",
    count: 38,
  },
  {
    id: "technology",
    name: "Technology",
    icon: "code",
    count: 27,
  },
  {
    id: "manufacturing",
    name: "Manufacturing",
    icon: "precision_manufacturing",
    count: 19,
  },
  {
    id: "real_estate",
    name: "Real Estate",
    icon: "real_estate_agent",
    count: 31,
  },
  {
    id: "healthcare",
    name: "Healthcare",
    icon: "medical_services",
    count: 16,
  },
  {
    id: "education",
    name: "Education",
    icon: "school",
    count: 12,
  },
  {
    id: "others",
    name: "Others",
    icon: "more_horiz",
    count: 23,
  },
];

// Locations in Oman and GCC
export const LOCATIONS = [
  "Muscat",
  "Salalah",
  "Sohar",
  "Nizwa",
  "Sur",
  "Dubai",
  "Abu Dhabi",
  "Doha",
  "Riyadh",
  "Jeddah",
  "Manama",
  "Kuwait City",
  "Wahiba Sands",
  "Other GCC",
];

// Transaction Types
export const TRANSACTION_TYPES = [
  "Full Sale",
  "Business Sale",
  "Partial Investment",
  "Investment",
  "Partnership",
  "Franchise",
];

// Languages
export const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "ar", name: "العربية" },
];

// Shared types
export type Language = "en" | "ar";
export type Role = "entrepreneur" | "investor" | "broker" | "admin" | "blocked";
export type ListingStatus = "pending" | "approved" | "rejected" | "archived";
export type KycStatus = "pending" | "approved" | "rejected";
export type DocType = "business" | "personal" | "financial" | "other";

// Analytics types for admin dashboard
export interface AdminAnalytics {
  users: {
    total: number;
    active: number;
    blocked: number;
    admin: number;
    verified: number;
    newThisWeek: number;
    activeLastMonth: number;
    byRole: {
      entrepreneur: number;
      investor: number;
      broker: number;
    };
  };
  listings: {
    total: number;
    newThisWeek: number;
    avgTimeToApproval: string;
    byStatus: {
      pending: number;
      approved: number;
      rejected: number;
      archived: number;
    };
  };
  kyc: {
    pending: number;
    approved: number;
    rejected: number;
  };
  successStories?: {
    total?: number;
    pending?: number;
    approved?: number;
    rejected?: number;
    featured?: number;
  };
}
