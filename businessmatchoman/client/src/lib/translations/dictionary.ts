import { Language } from "@/hooks/use-language";

/**
 * Dictionary of common translations for quick lookup
 * This serves as a fallback when the API is unavailable or for very common terms
 */
export const dictionary: Record<string, Record<Language, string>> = {
  // Navigation & Common UI elements
  Home: {
    en: "Home",
    ar: "الرئيسية",
  },
  Listings: {
    en: "Listings",
    ar: "القوائم",
  },
  Dashboard: {
    en: "Dashboard",
    ar: "لوحة التحكم",
  },
  Login: {
    en: "Login",
    ar: "تسجيل الدخول",
  },
  Register: {
    en: "Register",
    ar: "تسجيل",
  },
  "Sign In": {
    en: "Sign In",
    ar: "تسجيل الدخول",
  },
  "Sign Out": {
    en: "Sign Out",
    ar: "تسجيل الخروج",
  },
  "Create Listing": {
    en: "Create Listing",
    ar: "إنشاء قائمة",
  },
  Profile: {
    en: "Profile",
    ar: "الملف الشخصي",
  },
  Settings: {
    en: "Settings",
    ar: "الإعدادات",
  },
  Search: {
    en: "Search",
    ar: "بحث",
  },

  // Business categories
  "All Categories": {
    en: "All Categories",
    ar: "جميع الفئات",
  },
  Retail: {
    en: "Retail",
    ar: "تجزئة",
  },
  "Food & Beverage": {
    en: "Food & Beverage",
    ar: "الأغذية والمشروبات",
  },
  Technology: {
    en: "Technology",
    ar: "تكنولوجيا",
  },
  Healthcare: {
    en: "Healthcare",
    ar: "الرعاية الصحية",
  },
  Manufacturing: {
    en: "Manufacturing",
    ar: "تصنيع",
  },
  "Real Estate": {
    en: "Real Estate",
    ar: "العقارات",
  },

  // Transaction types
  Sale: {
    en: "Sale",
    ar: "بيع",
  },
  Investment: {
    en: "Investment",
    ar: "استثمار",
  },
  Partnership: {
    en: "Partnership",
    ar: "شراكة",
  },

  // User roles
  Entrepreneur: {
    en: "Entrepreneur",
    ar: "رائد أعمال",
  },
  Investor: {
    en: "Investor",
    ar: "مستثمر",
  },
  Broker: {
    en: "Broker",
    ar: "وسيط",
  },
  Admin: {
    en: "Admin",
    ar: "مسؤول",
  },
  "Admin Access": {
    en: "Admin Access",
    ar: "وصول المسؤول",
  },
  "admin_panel_settings Admin": {
    en: "Admin",
    ar: "المسؤول",
  },

  // Homepage sections
  "Connect, Invest & Grow": {
    en: "Connect, Invest & Grow",
    ar: "تواصل، استثمر & انمو",
  },
  "Featured Listings": {
    en: "Featured Listings",
    ar: "القوائم المميزة",
  },
  "How It Works": {
    en: "How It Works",
    ar: "كيف يعمل",
  },
  Testimonials: {
    en: "Testimonials",
    ar: "الشهادات",
  },
  "Join Now": {
    en: "Join Now",
    ar: "انضم الآن",
  },

  // Form labels
  Email: {
    en: "Email",
    ar: "البريد الإلكتروني",
  },
  Password: {
    en: "Password",
    ar: "كلمة المرور",
  },
  "Full Name": {
    en: "Full Name",
    ar: "الاسم الكامل",
  },
  Company: {
    en: "Company",
    ar: "شركة",
  },
  Phone: {
    en: "Phone",
    ar: "هاتف",
  },
  Location: {
    en: "Location",
    ar: "الموقع",
  },
  Description: {
    en: "Description",
    ar: "الوصف",
  },
  Submit: {
    en: "Submit",
    ar: "إرسال",
  },
  Cancel: {
    en: "Cancel",
    ar: "إلغاء",
  },
  Save: {
    en: "Save",
    ar: "حفظ",
  },

  // Status terms
  Pending: {
    en: "Pending",
    ar: "قيد الانتظار",
  },
  Approved: {
    en: "Approved",
    ar: "موافق عليه",
  },
  Rejected: {
    en: "Rejected",
    ar: "مرفوض",
  },
  Active: {
    en: "Active",
    ar: "نشط",
  },
  Inactive: {
    en: "Inactive",
    ar: "غير نشط",
  },
  KYC: {
    en: "KYC",
    ar: "التحقق من الهوية",
  },

  // Other common terms
  Price: {
    en: "Price",
    ar: "السعر",
  },
  Revenue: {
    en: "Revenue",
    ar: "الإيرادات",
  },
  Established: {
    en: "Established",
    ar: "تأسست",
  },
  Employees: {
    en: "Employees",
    ar: "الموظفين",
  },
  "View Details": {
    en: "View Details",
    ar: "عرض التفاصيل",
  },
  "Contact Seller": {
    en: "Contact Seller",
    ar: "اتصل بالبائع",
  },
  Messages: {
    en: "Messages",
    ar: "الرسائل",
  },
  Documents: {
    en: "Documents",
    ar: "المستندات",
  },
  Upload: {
    en: "Upload",
    ar: "تحميل",
  },
  Download: {
    en: "Download",
    ar: "تنزيل",
  },
};
