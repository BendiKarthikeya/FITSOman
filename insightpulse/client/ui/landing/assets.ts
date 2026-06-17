// ─── Hero ────────────────────────────────────────────────────────────────────
export const HERO_SCREENSHOT =
  '/images/hero-screenshot.png';

// ─── Why Choose Us – feature card icon (same for all 3 cards) ────────────────
export const FEAT_CARD_ICON =
  '/images/feat-card-icon.svg';

// ─── Arrow on "Learn More" buttons ───────────────────────────────────────────
export const ARROW_ICON =
  '/images/arrow-icon.svg';

// ─── Industry icons ───────────────────────────────────────────────────────────
export const ICON_LOGISTICS =
  '/images/icon-logistics.svg';
export const ICON_ENTERPRISE =
  '/images/icon-enterprise.svg';
export const ICON_HEALTHCARE =
  '/images/icon-healthcare.svg';
export const ICON_RETAIL =
  '/images/icon-retail.svg';

// ─── Footer social icons ─────────────────────────────────────────────────────
export const SOCIAL_ICON_1 =
  '/images/social-icon-1.svg';
export const SOCIAL_ICON_2 =
  '/images/social-icon-2.svg';
export const SOCIAL_ICON_3 =
  '/images/social-icon-3.svg';

// ─── Company logos for "Trusted by" section ──────────────────────────────────
export interface LogoPart {
  src: string;
  /** CSS inset shorthand: "top right bottom left" */
  inset: string;
}

export interface CompanyLogo {
  alt: string;
  parts: LogoPart[];
}

export const COMPANY_LOGOS: CompanyLogo[] = [
  // ── Row 1 ──
  {
    alt: 'Partner',
    parts: [
      { src: '/images/logo-partner-1.svg', inset: '35.03% 4.61% 35.2% 4.61%' },
    ],
  },
  {
    alt: 'Vercel',
    parts: [
      { src: '/images/logo-vercel-1.svg', inset: '32.36% 0.67% 32.36% 0' },
    ],
  },
  {
    alt: 'Trendspot',
    parts: [
      { src: '/images/logo-trendspot-1.svg', inset: '28.18% 0.49% 28.46% 0' },
    ],
  },
  {
    alt: 'Cursor',
    parts: [
      { src: '/images/logo-cursor-1.svg', inset: '35.52% 86.13% 35.52% 0' },
      { src: '/images/logo-cursor-2.svg', inset: '35.52% 68.96% 35.03% 16.66%' },
      { src: '/images/logo-cursor-3.svg', inset: '35.52% 51.25% 35.52% 34.29%' },
      { src: '/images/logo-cursor-4.svg', inset: '35.52% 35.03% 35.52% 51%' },
      { src: '/images/logo-cursor-5.svg', inset: '35.03% 16.8% 35.03% 66.4%' },
      { src: '/images/logo-cursor-6.svg', inset: '35.52% 0 35.52% 85.55%' },
    ],
  },
  {
    alt: 'Mr. Sig',
    parts: [
      { src: '/images/logo-mrsig-1.svg', inset: '36.76% 73.77% 36.92% 0' },
      { src: '/images/logo-mrsig-2.svg', inset: '36.76% 51.14% 37.25% 33.46%' },
      { src: '/images/logo-mrsig-3.svg', inset: '41.81% 37.78% 36.92% 50.4%' },
      { src: '/images/logo-mrsig-4.svg', inset: '41.81% 25.79% 36.92% 63.37%' },
      { src: '/images/logo-mrsig-5.svg', inset: '36.76% 13.45% 37.25% 75.95%' },
      { src: '/images/logo-mrsig-6.svg', inset: '41.81% -0.01% 36.92% 88.11%' },
    ],
  },
  // ── Row 2 ──
  {
    alt: 'Firebase',
    parts: [
      { src: '/images/logo-firebase-1.svg', inset: '37.74% 0.83% 36.01% 28.3%' },
      { src: '/images/logo-firebase-2.svg', inset: '65.54% 84.93% 27.64% 6.84%' },
      { src: '/images/logo-firebase-3.svg', inset: '44.24% 89.52% 28.97% 0.33%' },
      { src: '/images/logo-firebase-4.svg', inset: '44.69% 88.34% 34.46% 5.76%' },
      { src: '/images/logo-firebase-5.svg', inset: '25.99% 78.9% 29.33% 5.79%' },
    ],
  },
  {
    alt: 'Turbo',
    parts: [
      { src: '/images/logo-turbo-1.svg', inset: '29.58% 72.93% 29.58% 0.05%' },
      { src: '/images/logo-turbo-2.svg', inset: '36.11% 55.46% 36.11% 32.38%' },
      { src: '/images/logo-turbo-3.svg', inset: '36.11% 41.37% 35.59% 45.73%' },
      { src: '/images/logo-turbo-4.svg', inset: '36.11% 27.61% 36.11% 60.49%' },
      { src: '/images/logo-turbo-5.svg', inset: '35.59% 17.29% 35.59% 72.15%' },
      { src: '/images/logo-turbo-6.svg', inset: '35.59% 0.05% 35.59% 83.52%' },
    ],
  },
  {
    alt: 'Shopify',
    parts: [
      { src: '/images/logo-shopify-1.svg', inset: '24.75% 75.5% 25.82% 0' },
      { src: '/images/logo-shopify-2.svg', inset: '30.44% 75.5% 25.82% 15.9%' },
      { src: '/images/logo-shopify-3.svg', inset: '41.62% 87% 33.11% 3.7%' },
      { src: '/images/logo-shopify-4.svg', inset: '34.36% 0.2% 24.58% 28.5%' },
    ],
  },
  {
    alt: 'Airbnb',
    parts: [
      { src: '/images/logo-airbnb-1.svg', inset: '22.26% 0 22.26% 0' },
    ],
  },
  {
    alt: 'Webflow',
    parts: [
      { src: '/images/logo-webflow-1.svg', inset: '35.22% 73.28% 35.15% 0' },
      { src: '/images/logo-webflow-2.svg', inset: '38.1% 24.48% 38.42% 73.22%' },
      { src: '/images/logo-webflow-3.svg', inset: '38.11% 33.52% 38.11% 56.76%' },
      { src: '/images/logo-webflow-4.svg', inset: '39.52% 52.88% 38.42% 30.06%' },
      { src: '/images/logo-webflow-5.svg', inset: '44.72% 44.19% 38.03% 46.17%' },
      { src: '/images/logo-webflow-6.svg', inset: '38.14% 27.69% 38.42% 66.69%' },
      { src: '/images/logo-webflow-7.svg', inset: '44.71% 13.72% 38.06% 76.49%' },
      { src: '/images/logo-webflow-8.svg', inset: '45.06% 0 38.42% 86.2%' },
    ],
  },
];
