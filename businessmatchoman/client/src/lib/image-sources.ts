/**
 * Centralized image source management for TEEJARTI
 * Sources high-quality images from Unsplash, Pexels, and Pixabay
 */

// Business category default images from Unsplash
export const CATEGORY_IMAGES = {
  food_hospitality:
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
  retail_ecommerce:
    "https://images.unsplash.com/photo-1441986300917-64674bd600d8?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
  technology:
    "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
  manufacturing:
    "https://images.unsplash.com/photo-1565515636369-1f2c4b5cc7df?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
  real_estate:
    "https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
  healthcare:
    "https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
  education:
    "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
  others:
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
};

// Default business listing images for different industries
export const DEFAULT_LISTING_IMAGES = [
  "https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", // Modern office building
  "https://images.unsplash.com/photo-1497366811353-6870744d04b2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", // Business workspace
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", // City skyline business district
  "https://images.unsplash.com/photo-1441986300917-64674bd600d8?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", // Modern retail space
  "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", // Business meeting
  "https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", // Commercial property
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", // Restaurant interior
  "https://images.unsplash.com/photo-1565515636369-1f2c4b5cc7df?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", // Manufacturing facility
  "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", // Technology workspace
  "https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", // Healthcare facility
];

// Default profile images - diverse professional headshots
export const DEFAULT_PROFILE_IMAGES = [
  "https://images.unsplash.com/photo-1566492031773-4f4e44671d66?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1551836022-deb4988cc6c0?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80",
];

// Hero background images - Oman and GCC business landscapes
export const HERO_BACKGROUNDS = [
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80", // Modern city
  "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80", // Dubai skyline
  "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80", // Middle East architecture
];

/**
 * Get a default image for a business category
 */
export function getCategoryImage(categoryId: string): string {
  return (
    CATEGORY_IMAGES[categoryId as keyof typeof CATEGORY_IMAGES] ||
    CATEGORY_IMAGES.others
  );
}

/**
 * Get a random default listing image
 */
export function getDefaultListingImage(index?: number): string {
  if (index !== undefined) {
    return DEFAULT_LISTING_IMAGES[index % DEFAULT_LISTING_IMAGES.length];
  }
  return DEFAULT_LISTING_IMAGES[
    Math.floor(Math.random() * DEFAULT_LISTING_IMAGES.length)
  ];
}

/**
 * Get a random default profile image
 */
export function getDefaultProfileImage(index?: number): string {
  if (index !== undefined) {
    return DEFAULT_PROFILE_IMAGES[index % DEFAULT_PROFILE_IMAGES.length];
  }
  return DEFAULT_PROFILE_IMAGES[
    Math.floor(Math.random() * DEFAULT_PROFILE_IMAGES.length)
  ];
}

/**
 * Get a random hero background image
 */
export function getHeroBackgroundImage(index?: number): string {
  if (index !== undefined) {
    return HERO_BACKGROUNDS[index % HERO_BACKGROUNDS.length];
  }
  return HERO_BACKGROUNDS[Math.floor(Math.random() * HERO_BACKGROUNDS.length)];
}

/**
 * Get industry-specific image for listings
 */
export function getIndustrySpecificImage(
  industry: string,
  index?: number,
): string {
  const industryLower = industry.toLowerCase();

  if (
    industryLower.includes("food") ||
    industryLower.includes("restaurant") ||
    industryLower.includes("hospitality")
  ) {
    return CATEGORY_IMAGES.food_hospitality;
  } else if (
    industryLower.includes("retail") ||
    industryLower.includes("shop") ||
    industryLower.includes("store")
  ) {
    return CATEGORY_IMAGES.retail_ecommerce;
  } else if (
    industryLower.includes("tech") ||
    industryLower.includes("software") ||
    industryLower.includes("it")
  ) {
    return CATEGORY_IMAGES.technology;
  } else if (
    industryLower.includes("manufacturing") ||
    industryLower.includes("factory") ||
    industryLower.includes("production")
  ) {
    return CATEGORY_IMAGES.manufacturing;
  } else if (
    industryLower.includes("real estate") ||
    industryLower.includes("property") ||
    industryLower.includes("construction")
  ) {
    return CATEGORY_IMAGES.real_estate;
  } else if (
    industryLower.includes("health") ||
    industryLower.includes("medical") ||
    industryLower.includes("clinic")
  ) {
    return CATEGORY_IMAGES.healthcare;
  } else if (
    industryLower.includes("education") ||
    industryLower.includes("school") ||
    industryLower.includes("training")
  ) {
    return CATEGORY_IMAGES.education;
  }

  return getDefaultListingImage(index);
}

/**
 * Image fallback handler - checks if image exists and provides fallback
 */
export function getImageWithFallback(
  primaryUrl: string | undefined | null,
  fallbackType: "listing" | "profile" | "category",
  categoryId?: string,
  index?: number,
  industry?: string,
): string {
  // If primary URL exists and is not a placeholder, use it
  if (
    primaryUrl &&
    !primaryUrl.includes("placeholder") &&
    !primaryUrl.includes("/uploads/")
  ) {
    return primaryUrl;
  }

  // Return appropriate fallback
  switch (fallbackType) {
    case "listing":
      // Use industry-specific image if industry is provided
      if (industry) {
        return getIndustrySpecificImage(industry, index);
      }
      return getDefaultListingImage(index);
    case "profile":
      return getDefaultProfileImage(index);
    case "category":
      return getCategoryImage(categoryId || "others");
    default:
      return getDefaultListingImage();
  }
}
