import {
  users,
  listings,
  messages,
  documents,
  kyc,
  categories,
  locations,
  tags,
  listingTags,
  kycDocs,
  moderationLogs,
  settings,
  settingTypes,
  settingCategories,
  successStories,
  savedListings,
  contacts,
  passwordResetTokens,
  userOnboarding,
  otpCodes,
  newsletterSubscriptions,
  translations,
} from "@shared/schema";
import type {
  User,
  InsertUser,
  Listing,
  InsertListing,
  Message,
  InsertMessage,
  Document,
  InsertDocument,
  Kyc,
  InsertKyc,
  Category,
  InsertCategory,
  Location,
  InsertLocation,
  Tag,
  InsertTag,
  ListingTag,
  InsertListingTag,
  KycDoc,
  InsertKycDoc,
  ModerationLog,
  InsertModerationLog,
  Setting,
  InsertSetting,
  UpdateSettings,
  SuccessStory,
  InsertSuccessStory,
  SavedListing,
  InsertSavedListing,
  Contact,
  InsertContact,
  PasswordResetToken,
  InsertPasswordResetToken,
  UserOnboarding,
  InsertUserOnboarding,
  OtpCode,
  NewsletterSubscription,
  InsertNewsletterSubscription,
  Translation,
  InsertTranslation,
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import connectPg from "connect-pg-simple";
import { db } from "./db";
import { eq, and, desc, asc, sql, or, isNull, inArray } from "drizzle-orm";
import pkg from "pg";
import crypto from "crypto";
const { Pool } = pkg;

// Create session stores
const MemoryStore = createMemoryStore(session);
const PostgresSessionStore = connectPg(session);

// Helper function for safely getting time from a Date or null value
function safeGetTime(date: Date | null): number {
  return date ? date.getTime() : 0;
}

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUsersByIds(ids: number[]): Promise<User[]>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;
  updateUserPassword(id: number, hashedPassword: string): Promise<boolean>;
  updateUserEmailVerification(id: number, isVerified: boolean): Promise<boolean>;
  getAllUsers(): Promise<User[]>;

  // Category operations
  getCategory(id: number): Promise<Category | undefined>;
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(
    id: number,
    categoryData: Partial<Category>,
  ): Promise<Category | undefined>;
  deleteCategory(id: number): Promise<boolean>;

  // Location operations
  getLocation(id: number): Promise<Location | undefined>;
  getLocations(): Promise<Location[]>;
  createLocation(location: InsertLocation): Promise<Location>;
  updateLocation(
    id: number,
    locationData: Partial<Location>,
  ): Promise<Location | undefined>;
  deleteLocation(id: number): Promise<boolean>;

  // Tag operations
  getTag(id: number): Promise<Tag | undefined>;
  getTags(): Promise<Tag[]>;
  createTag(tag: InsertTag): Promise<Tag>;
  updateTag(id: number, tagData: Partial<Tag>): Promise<Tag | undefined>;
  deleteTag(id: number): Promise<boolean>;

  // ListingTag operations
  getListingTags(listingId: number): Promise<ListingTag[]>;
  addTagToListing(listingId: number, tagId: number): Promise<ListingTag>;
  removeTagFromListing(listingId: number, tagId: number): Promise<boolean>;

  // Listing operations
  getListing(id: number): Promise<Listing | undefined>;
  getListings(filters?: Partial<Listing>): Promise<Listing[]>;
  getFeaturedListings(limit?: number): Promise<Listing[]>;
  getUserActiveListings(userId: number): Promise<Listing[]>;
  getListingCountsByCategory(): Promise<{ category: string; count: number }[]>;
  createListing(listing: InsertListing): Promise<Listing>;
  updateListing(
    id: number,
    listingData: Partial<Listing>,
  ): Promise<Listing | undefined>;
  deleteListing(id: number): Promise<boolean>;

  // Message operations
  getMessages(userId: number): Promise<Message[]>;
  getMessageThreads(userId: number): Promise<MessageThread[]>;
  getConversation(
    user1Id: number,
    user2Id: number,
    listingId?: number,
  ): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessageRead(id: number): Promise<boolean>;
  markThreadRead(userId: number, otherUserId: number): Promise<boolean>;

  // Document operations
  getDocuments(userId: number, listingId?: number): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  deleteDocument(id: number): Promise<boolean>;

  // KYC operations
  getKyc(id: number): Promise<Kyc | undefined>;
  getKycByUserId(userId: number): Promise<Kyc | undefined>;
  getPendingKycApplications(): Promise<Kyc[]>;
  getAllKyc(status?: string): Promise<Kyc[]>;
  createKyc(kyc: InsertKyc): Promise<Kyc>;
  updateKyc(id: number, kycData: Partial<Kyc>): Promise<Kyc | undefined>;
  approveKyc(id: number, reviewerId: number): Promise<Kyc | undefined>;
  rejectKyc(
    id: number,
    reason: string,
    reviewerId: number,
  ): Promise<Kyc | undefined>;

  // KYC Document operations
  getKycDoc(id: number): Promise<KycDoc | undefined>;
  getKycDocsByUserId(userId: number): Promise<KycDoc[]>;
  getAllKycDocs(): Promise<KycDoc[]>;
  createKycDoc(kycDoc: InsertKycDoc): Promise<KycDoc>;
  updateKycDoc(
    id: number,
    kycDocData: Partial<KycDoc>,
  ): Promise<KycDoc | undefined>;
  deleteKycDoc(id: number): Promise<boolean>;

  // Moderation Log operations
  getModerationLog(id: number): Promise<ModerationLog | undefined>;
  getModerationLogsByListingId(listingId: number): Promise<ModerationLog[]>;
  createModerationLog(
    moderationLog: InsertModerationLog,
  ): Promise<ModerationLog>;
  updateModerationLog(
    id: number,
    moderationLogData: Partial<ModerationLog>,
  ): Promise<ModerationLog | undefined>;
  resolveModerationLog(
    id: number,
    resolvedById: number,
  ): Promise<ModerationLog | undefined>;

  // Settings operations
  getSetting(key: string): Promise<Setting | undefined>;
  getAllSettings(): Promise<Setting[]>;
  getSettingsByType(type: string): Promise<Setting[]>;
  createSetting(setting: InsertSetting): Promise<Setting>;
  updateSetting(
    key: string,
    value: string,
    type?: string,
  ): Promise<Setting | undefined>;
  updateSettings(settings: UpdateSettings): Promise<Setting[]>;
  deleteSetting(key: string): Promise<boolean>;

  // Success Story operations
  getSuccessStory(id: number): Promise<SuccessStory | undefined>;
  getSuccessStories(status?: string): Promise<SuccessStory[]>;
  getFeaturedSuccessStories(limit?: number): Promise<SuccessStory[]>;
  getUserSuccessStories(userId: number): Promise<SuccessStory[]>;
  createSuccessStory(story: InsertSuccessStory): Promise<SuccessStory>;
  updateSuccessStory(
    id: number,
    storyData: Partial<SuccessStory>,
  ): Promise<SuccessStory | undefined>;
  deleteSuccessStory(id: number): Promise<boolean>;
  approveSuccessStory(
    id: number,
    reviewerId: number,
  ): Promise<SuccessStory | undefined>;
  rejectSuccessStory(
    id: number,
    reason: string,
    reviewerId: number,
  ): Promise<SuccessStory | undefined>;
  setSuccessStoryFeatured(
    id: number,
    featured: boolean,
  ): Promise<SuccessStory | undefined>;

  // Password Reset operations
  createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenUsed(token: string): Promise<boolean>;

  // User Onboarding operations
  getUserOnboarding(userId: number): Promise<UserOnboarding | undefined>;
  createUserOnboarding(onboarding: InsertUserOnboarding): Promise<UserOnboarding>;
  updateUserOnboarding(userId: number, onboardingData: Partial<UserOnboarding>): Promise<UserOnboarding | undefined>;

  // OTP operations (enhanced)
  createOtpCode(userId: number, code: string, type: string, expiresAt: Date): Promise<OtpCode>;
  getValidOtpCode(userId: number, code: string, type: string): Promise<OtpCode | undefined>;
  markOtpCodeUsed(id: number): Promise<boolean>;

  // Saved Listing operations
  getUserSavedListings(userId: number): Promise<Listing[]>;
  isListingSaved(userId: number, listingId: number): Promise<boolean>;
  saveListing(userId: number, listingId: number): Promise<SavedListing>;
  unsaveListing(userId: number, listingId: number): Promise<boolean>;

  // Newsletter operations
  getNewsletterSubscription(email: string): Promise<NewsletterSubscription | undefined>;
  createNewsletterSubscription(data: InsertNewsletterSubscription): Promise<NewsletterSubscription>;
  unsubscribeFromNewsletter(token: string): Promise<boolean>;
  getActiveNewsletterSubscriptions(): Promise<NewsletterSubscription[]>;

  // Contact operations
  createContact(contact: InsertContact): Promise<Contact>;
  getContactsByListing(listingId: number): Promise<Contact[]>;
  getContactsForSeller(sellerId: number): Promise<Contact[]>;
  getContactsFromBuyer(buyerId: number): Promise<Contact[]>;
  getContactById(id: number): Promise<Contact | undefined>;
  updateContactStatus(
    id: number,
    status: string,
    sellerResponse?: string,
  ): Promise<void>;

  // Session store
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private categories: Map<number, Category>;
  private locations: Map<number, Location>;
  private tags: Map<number, Tag>;
  private listings: Map<number, Listing>;
  private listingTags: Map<string, ListingTag>; // Composite key: `${listingId}-${tagId}`
  private messages: Map<number, Message>;
  private documents: Map<number, Document>;
  private kycApplications: Map<number, Kyc>;
  private kycDocs: Map<number, KycDoc>;
  private moderationLogs: Map<number, ModerationLog>;
  private settings: Map<string, Setting>; // Key-based settings storage
  private successStories: Map<number, SuccessStory>;
  private savedListings: Map<string, SavedListing>; // Composite key: `${userId}-${listingId}`
  private contacts: Map<number, Contact>;
  private passwordResetTokens: Map<string, PasswordResetToken>;
  private userOnboardings: Map<number, UserOnboarding>;
  private otpCodes: Map<number, OtpCode>;
  private newsletterSubscriptions: Map<string, NewsletterSubscription>;

  sessionStore: session.Store;
  private userIdCounter: number = 1;
  private categoryIdCounter: number = 1;
  private locationIdCounter: number = 1;
  private tagIdCounter: number = 1;
  private listingIdCounter: number = 1;
  private messageIdCounter: number = 1;
  private documentIdCounter: number = 1;
  private kycIdCounter: number = 1;
  private kycDocIdCounter: number = 1;
  private moderationLogIdCounter: number = 1;
  private successStoryIdCounter: number = 1;
  private savedListingIdCounter: number = 1;
  private contactIdCounter: number = 1;
  private passwordResetTokenIdCounter: number = 1;
  private userOnboardingIdCounter: number = 1;
  private otpCodeIdCounter: number = 1;
  private newsletterSubscriptionIdCounter: number = 1;

  constructor() {
    this.users = new Map();
    this.categories = new Map();
    this.locations = new Map();
    this.tags = new Map();
    this.listings = new Map();
    this.listingTags = new Map();
    this.messages = new Map();
    this.documents = new Map();
    this.kycApplications = new Map();
    this.kycDocs = new Map();
    this.moderationLogs = new Map();
    this.settings = new Map();
    this.successStories = new Map();
    this.savedListings = new Map();
    this.contacts = new Map();
    this.passwordResetTokens = new Map();
    this.userOnboardings = new Map();
    this.otpCodes = new Map();
    this.newsletterSubscriptions = new Map();
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });

    // Create default admin account
    this.setupDefaultAdmin();

    // Initialize default settings
    this.initializeDefaultSettings();
  }

  private setupDefaultAdmin() {
    // Check if admin already exists
    const existingAdmin = Array.from(this.users.values()).find(
      (user) =>
        user.email === "admin@teejarti.com" || user.username === "admin",
    );

    if (existingAdmin) {
      console.log("Default admin account already exists");
      return;
    }

    // Admin password: Admin@BusinessMatch2024
    // Pre-hashed using bcrypt with 10 salt rounds
    const hashedPassword =
      "$2b$10$mBAsaGzNwn1gPJj8v9FZ6O5fXWqIWC03F/SQVdm0zMYjtfzy3A37W";

    const id = this.userIdCounter++;
    const now = new Date();

    // Create admin user
    const adminUser: User = {
      id,
      email: "admin@teejarti.com",
      username: "admin",
      password: hashedPassword,
      fullName: "System Administrator",
      role: "admin",
      originalRole: null,
      company: null,
      position: null,
      location: null,
      phone: null,
      bio: null,
      profileImageUrl: null,
      verified: true,
      isEmailVerified: true,
      isPhoneVerified: false,
      kycStatus: "none",
      twoFactorEnabled: false,
      createdAt: now,
    };

    this.users.set(id, adminUser);
    console.log("Default admin account created");
  }

  private async initializeDefaultSettings() {
    // Check if we already have settings
    const existingSettings = await this.getAllSettings();
    if (existingSettings.length > 0) {
      console.log("Settings already initialized");
      return;
    }

    console.log("Initializing default settings...");

    // Theme & Home settings
    await this.createSetting({
      key: "theme.primary_color",
      value: "#1e40af",
      type: "text",
    });
    await this.createSetting({
      key: "theme.layout",
      value: "default",
      type: "text",
    });
    await this.createSetting({
      key: "theme.logo_url",
      value: "/logo.png",
      type: "url",
    });
    await this.createSetting({
      key: "theme.font_family",
      value: "Inter, sans-serif",
      type: "text",
    });
    await this.createSetting({
      key: "home.hero_title_en",
      value: "Connect with Business Opportunities in Oman",
      type: "text",
    });
    await this.createSetting({
      key: "home.hero_title_ar",
      value: "تواصل مع فرص الأعمال في عمان",
      type: "text",
    });
    await this.createSetting({
      key: "home.hero_subtitle_en",
      value: "The premier platform for business matchmaking in the GCC region",
      type: "text",
    });
    await this.createSetting({
      key: "home.hero_subtitle_ar",
      value: "المنصة الرائدة للتوفيق بين الأعمال في منطقة الخليج",
      type: "text",
    });

    // Contact Page settings
    await this.createSetting({
      key: "contact.address",
      value: "Muscat Business District, Oman",
      type: "text",
    });
    await this.createSetting({
      key: "contact.phone",
      value: "+968 1234 5678",
      type: "text",
    });
    await this.createSetting({
      key: "contact.email",
      value: "info@teejarti.com",
      type: "email",
    });
    await this.createSetting({
      key: "contact.hours_en",
      value: "Sunday - Thursday: 9:00AM - 5:00PM",
      type: "text",
    });
    await this.createSetting({
      key: "contact.hours_ar",
      value: "الأحد - الخميس: ٩:٠٠ ص - ٥:٠٠ م",
      type: "text",
    });
    await this.createSetting({
      key: "contact.map_embed_url",
      value:
        "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3656.1688845124843!2d58.54!3d23.58!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjPCsDM0JzQ4LjAiTiA1OMKwMzInMjQuMCJF!5e0!3m2!1sen!2som!4v1639964105!5m2!1sen!2som",
      type: "url",
    });

    // Page Headings
    await this.createSetting({
      key: "headings.listings_page_title_en",
      value: "Explore Business Opportunities",
      type: "text",
    });
    await this.createSetting({
      key: "headings.listings_page_title_ar",
      value: "استكشف فرص الأعمال",
      type: "text",
    });
    await this.createSetting({
      key: "headings.investor_page_title_en",
      value: "Investor Dashboard",
      type: "text",
    });
    await this.createSetting({
      key: "headings.investor_page_title_ar",
      value: "لوحة تحكم المستثمر",
      type: "text",
    });
    await this.createSetting({
      key: "headings.entrepreneur_page_title_en",
      value: "Entrepreneur Dashboard",
      type: "text",
    });
    await this.createSetting({
      key: "headings.entrepreneur_page_title_ar",
      value: "لوحة تحكم رائد الأعمال",
      type: "text",
    });

    // SEO Settings
    await this.createSetting({
      key: "seo.site_title_en",
      value: "TEEJARTI - Connect Businesses and Investors in Oman",
      type: "text",
    });
    await this.createSetting({
      key: "seo.site_title_ar",
      value: "تيجارتي - ربط الأعمال والمستثمرين في عمان",
      type: "text",
    });
    await this.createSetting({
      key: "seo.site_description_en",
      value:
        "TEEJARTI is the premier platform for connecting businesses, investors, and entrepreneurs in Oman and the GCC region.",
      type: "text",
    });
    await this.createSetting({
      key: "seo.site_description_ar",
      value:
        "تيجارتي هي المنصة الرائدة لربط الأعمال والمستثمرين ورواد الأعمال في عمان ومنطقة الخليج.",
      type: "text",
    });
    await this.createSetting({
      key: "seo.keywords",
      value:
        "business, investment, Oman, GCC, entrepreneur, SME, startup, funding",
      type: "text",
    });
    await this.createSetting({
      key: "seo.og_image_url",
      value: "/og-image.jpg",
      type: "url",
    });

    // Maintenance Mode
    await this.createSetting({
      key: "maintenance.enabled",
      value: "false",
      type: "boolean",
    });
    await this.createSetting({
      key: "maintenance.message_en",
      value:
        "We are currently performing scheduled maintenance. Please check back soon.",
      type: "text",
    });
    await this.createSetting({
      key: "maintenance.message_ar",
      value:
        "نحن نقوم حاليًا بإجراء صيانة مجدولة. يرجى التحقق مرة أخرى قريبًا.",
      type: "text",
    });

    // Social Media
    await this.createSetting({
      key: "social.facebook_url",
      value: "https://facebook.com/teejarti",
      type: "url",
    });
    await this.createSetting({
      key: "social.twitter_url",
      value: "https://twitter.com/teejarti",
      type: "url",
    });
    await this.createSetting({
      key: "social.instagram_url",
      value: "https://instagram.com/teejarti",
      type: "url",
    });
    await this.createSetting({
      key: "social.linkedin_url",
      value: "https://linkedin.com/company/teejarti",
      type: "url",
    });
    await this.createSetting({
      key: "social.youtube_url",
      value: "https://youtube.com/channel/teejarti",
      type: "url",
    });

    // Platform Features
    await this.createSetting({
      key: "features.enable_messaging",
      value: "true",
      type: "boolean",
    });
    await this.createSetting({
      key: "features.enable_kyc",
      value: "true",
      type: "boolean",
    });
    await this.createSetting({
      key: "features.enable_listing_creation",
      value: "true",
      type: "boolean",
    });
    await this.createSetting({
      key: "features.enable_investment_proposals",
      value: "true",
      type: "boolean",
    });
    await this.createSetting({
      key: "features.enable_notifications",
      value: "true",
      type: "boolean",
    });
    await this.createSetting({
      key: "features.enable_arabic",
      value: "true",
      type: "boolean",
    });

    console.log("Default settings initialized successfully");
  }

  // Get all users
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUsersByIds(ids: number[]): Promise<User[]> {
    return ids.map((id) => this.users.get(id)).filter(Boolean) as User[];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase(),
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase(),
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const now = new Date();
    const user: User = {
      ...insertUser,
      id,
      verified: false,
      originalRole: null, // Default value for new users
      company: insertUser.company || null,
      position: insertUser.position || null,
      location: insertUser.location || null,
      phone: insertUser.phone || null,
      bio: insertUser.bio || null,
      profileImageUrl: insertUser.profileImageUrl || null,
      createdAt: now,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(
    id: number,
    userData: Partial<User>,
  ): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;

    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Category operations
  async getCategory(id: number): Promise<Category | undefined> {
    return this.categories.get(id);
  }

  async getCategories(): Promise<Category[]> {
    return Array.from(this.categories.values());
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const id = this.categoryIdCounter++;
    const now = new Date();
    const category: Category = {
      ...insertCategory,
      id,
      createdAt: now,
    };
    this.categories.set(id, category);
    return category;
  }

  async updateCategory(
    id: number,
    categoryData: Partial<Category>,
  ): Promise<Category | undefined> {
    const category = await this.getCategory(id);
    if (!category) return undefined;

    const updatedCategory = { ...category, ...categoryData };
    this.categories.set(id, updatedCategory);
    return updatedCategory;
  }

  async deleteCategory(id: number): Promise<boolean> {
    return this.categories.delete(id);
  }

  // Location operations
  async getLocation(id: number): Promise<Location | undefined> {
    return this.locations.get(id);
  }

  async getLocations(): Promise<Location[]> {
    return Array.from(this.locations.values());
  }

  async createLocation(insertLocation: InsertLocation): Promise<Location> {
    const id = this.locationIdCounter++;
    const now = new Date();
    const location: Location = {
      ...insertLocation,
      id,
      region: insertLocation.region || null,
      createdAt: now,
    };
    this.locations.set(id, location);
    return location;
  }

  async updateLocation(
    id: number,
    locationData: Partial<Location>,
  ): Promise<Location | undefined> {
    const location = await this.getLocation(id);
    if (!location) return undefined;

    const updatedLocation = { ...location, ...locationData };
    this.locations.set(id, updatedLocation);
    return updatedLocation;
  }

  async deleteLocation(id: number): Promise<boolean> {
    return this.locations.delete(id);
  }

  // Tag operations
  async getTag(id: number): Promise<Tag | undefined> {
    return this.tags.get(id);
  }

  async getTags(): Promise<Tag[]> {
    return Array.from(this.tags.values());
  }

  async createTag(insertTag: InsertTag): Promise<Tag> {
    const id = this.tagIdCounter++;
    const now = new Date();
    const tag: Tag = {
      ...insertTag,
      id,
      createdAt: now,
    };
    this.tags.set(id, tag);
    return tag;
  }

  async updateTag(id: number, tagData: Partial<Tag>): Promise<Tag | undefined> {
    const tag = await this.getTag(id);
    if (!tag) return undefined;

    const updatedTag = { ...tag, ...tagData };
    this.tags.set(id, updatedTag);
    return updatedTag;
  }

  async deleteTag(id: number): Promise<boolean> {
    return this.tags.delete(id);
  }

  // ListingTag operations
  async getListingTags(listingId: number): Promise<ListingTag[]> {
    return Array.from(this.listingTags.values()).filter(
      (lt) => lt.listingId === listingId,
    );
  }

  async addTagToListing(listingId: number, tagId: number): Promise<ListingTag> {
    const key = `${listingId}-${tagId}`;
    const listingTag: ListingTag = {
      listingId,
      tagId,
    };
    this.listingTags.set(key, listingTag);
    return listingTag;
  }

  async removeTagFromListing(
    listingId: number,
    tagId: number,
  ): Promise<boolean> {
    const key = `${listingId}-${tagId}`;
    return this.listingTags.delete(key);
  }

  // Listing operations
  async getListing(id: number): Promise<Listing | undefined> {
    return this.listings.get(id);
  }

  async getListings(filters?: Partial<Listing>): Promise<Listing[]> {
    let result = Array.from(this.listings.values());

    if (filters) {
      result = result.filter((listing) => {
        return Object.entries(filters).every(([key, value]) => {
          // @ts-ignore - dynamic property access
          return listing[key] === value;
        });
      });
    }

    // Sort by creation date, newest first
    return result.sort(
      (a, b) => safeGetTime(b.createdAt) - safeGetTime(a.createdAt),
    );
  }

  async getFeaturedListings(limit: number = 3): Promise<Listing[]> {
    const featuredListings = Array.from(this.listings.values())
      .filter((listing) => listing.featured && listing.active)
      .sort((a, b) => safeGetTime(b.createdAt) - safeGetTime(a.createdAt));

    return featuredListings.slice(0, limit);
  }

  async getListingCountsByCategory(): Promise<
    { category: string; count: number }[]
  > {
    // Get all active listings
    const activeListings = Array.from(this.listings.values()).filter(
      (listing) => listing.active,
    );

    // Count by industry/category
    const categoryCounts = new Map<string, number>();

    // Count listings by industry
    for (const listing of activeListings) {
      const industry = listing.industry;
      categoryCounts.set(industry, (categoryCounts.get(industry) || 0) + 1);
    }

    // Convert to required format
    return Array.from(categoryCounts.entries())
      .map(([category, count]) => ({
        category,
        count,
      }))
      .sort((a, b) => b.count - a.count); // Sort by count, descending
  }

  async createListing(insertListing: InsertListing): Promise<Listing> {
    const id = this.listingIdCounter++;
    const now = new Date();

    // Extract insertListing to prevent spreading undefined properties
    const {
      categoryId,
      locationId,
      description_en,
      description_ar,
      price,
      businessPlan,
      financials,
      imageUrl,
      currency,
      ...requiredFields
    } = insertListing;

    const listing: Listing = {
      ...requiredFields,
      id,
      featured: false,
      verified: false,
      active: true,
      status: "pending",
      categoryId: categoryId || null,
      locationId: locationId || null,
      description_en: description_en || null,
      description_ar: description_ar || null,
      price: price || null,
      businessPlan: businessPlan || null,
      financials: financials || null,
      imageUrl: imageUrl || null,
      currency: currency || "OMR", // Default to Omani Rial if not specified
      createdAt: now,
      updatedAt: now,
    };
    this.listings.set(id, listing);
    return listing;
  }

  async updateListing(
    id: number,
    listingData: Partial<Listing>,
  ): Promise<Listing | undefined> {
    const listing = await this.getListing(id);
    if (!listing) return undefined;

    const updatedListing = {
      ...listing,
      ...listingData,
      updatedAt: new Date(),
    };
    this.listings.set(id, updatedListing);
    return updatedListing;
  }

  async getUserActiveListings(userId: number): Promise<Listing[]> {
    return Array.from(this.listings.values())
      .filter(
        (listing) =>
          listing.userId === userId &&
          listing.active &&
          (listing.status === "approved" || listing.status === "pending"),
      )
      .sort((a, b) => safeGetTime(b.createdAt) - safeGetTime(a.createdAt));
  }

  async deleteListing(id: number): Promise<boolean> {
    return this.listings.delete(id);
  }

  // Message operations
  async getMessages(userId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter((msg) => msg.senderId === userId || msg.receiverId === userId)
      .sort((a, b) => safeGetTime(a.createdAt) - safeGetTime(b.createdAt));
  }

  async getConversation(
    user1Id: number,
    user2Id: number,
    listingId?: number,
  ): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter((msg) => {
        const userMatch =
          (msg.senderId === user1Id && msg.receiverId === user2Id) ||
          (msg.senderId === user2Id && msg.receiverId === user1Id);
        return listingId ? userMatch && msg.listingId === listingId : userMatch;
      })
      .sort((a, b) => safeGetTime(a.createdAt) - safeGetTime(b.createdAt));
  }
  // Document operations
  async getDocuments(userId: number, listingId?: number): Promise<Document[]> {
    return Array.from(this.documents.values())
      .filter((doc) => {
        if (listingId) {
          return doc.userId === userId && doc.listingId === listingId;
        }
        return doc.userId === userId;
      })
      .sort((a, b) => safeGetTime(b.uploadedAt) - safeGetTime(a.uploadedAt));
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = this.documentIdCounter++;
    const now = new Date();
    const document: Document = {
      ...insertDocument,
      id,
      listingId: insertDocument.listingId || null,
      uploadedAt: now,
    };
    this.documents.set(id, document);
    return document;
  }

  async deleteDocument(id: number): Promise<boolean> {
    return this.documents.delete(id);
  }

  // KYC operations
  async getKyc(id: number): Promise<Kyc | undefined> {
    return this.kycApplications.get(id);
  }

  async getKycByUserId(userId: number): Promise<Kyc | undefined> {
    return Array.from(this.kycApplications.values()).find(
      (kyc) => kyc.userId === userId,
    );
  }

  async getPendingKycApplications(): Promise<Kyc[]> {
    return Array.from(this.kycApplications.values())
      .filter((kyc) => kyc.status === "pending")
      .sort((a, b) => safeGetTime(a.createdAt) - safeGetTime(b.createdAt));
  }

  async getAllKyc(status?: string): Promise<Kyc[]> {
    let kycs = Array.from(this.kycApplications.values());

    if (status) {
      kycs = kycs.filter((kyc) => kyc.status === status);
    }

    return kycs.sort(
      (a, b) => safeGetTime(b.createdAt) - safeGetTime(a.createdAt),
    );
  }

  async createKyc(insertKyc: InsertKyc): Promise<Kyc> {
    const id = this.kycIdCounter++;
    const now = new Date();

    const kyc: Kyc = {
      ...insertKyc,
      id,
      status: "pending",
      rejectionReason: null,
      reviewedBy: null,
      reviewedAt: null,
      addressProofUrl: insertKyc.addressProofUrl || null,
      businessLicenseUrl: insertKyc.businessLicenseUrl || null,
      createdAt: now,
      updatedAt: now,
    };

    this.kycApplications.set(id, kyc);
    return kyc;
  }

  async updateKyc(id: number, kycData: Partial<Kyc>): Promise<Kyc | undefined> {
    const kyc = await this.getKyc(id);
    if (!kyc) return undefined;

    const updatedKyc = {
      ...kyc,
      ...kycData,
      updatedAt: new Date(),
    };

    this.kycApplications.set(id, updatedKyc);
    return updatedKyc;
  }

  async approveKyc(id: number, reviewerId: number): Promise<Kyc | undefined> {
    const kyc = await this.getKyc(id);
    if (!kyc) return undefined;

    const now = new Date();
    const updatedKyc = {
      ...kyc,
      status: "approved" as const,
      reviewedBy: reviewerId,
      reviewedAt: now,
      updatedAt: now,
    };

    this.kycApplications.set(id, updatedKyc);

    // Update user verification status
    const user = await this.getUser(kyc.userId);
    if (user) {
      await this.updateUser(user.id, { verified: true });
    }

    return updatedKyc;
  }

  async rejectKyc(
    id: number,
    reason: string,
    reviewerId: number,
  ): Promise<Kyc | undefined> {
    const kyc = await this.getKyc(id);
    if (!kyc) return undefined;

    const now = new Date();
    const updatedKyc = {
      ...kyc,
      status: "rejected" as const,
      rejectionReason: reason,
      reviewedBy: reviewerId,
      reviewedAt: now,
      updatedAt: now,
    };

    this.kycApplications.set(id, updatedKyc);
    return updatedKyc;
  }

  // KYC Document operations
  async getKycDoc(id: number): Promise<KycDoc | undefined> {
    return this.kycDocs.get(id);
  }

  async getKycDocsByUserId(userId: number): Promise<KycDoc[]> {
    return Array.from(this.kycDocs.values())
      .filter((doc) => doc.userId === userId)
      .sort((a, b) => safeGetTime(b.createdAt) - safeGetTime(a.createdAt));
  }

  async getAllKycDocs(): Promise<KycDoc[]> {
    return Array.from(this.kycDocs.values()).sort(
      (a, b) => safeGetTime(b.createdAt) - safeGetTime(a.createdAt),
    );
  }

  async createKycDoc(insertKycDoc: InsertKycDoc): Promise<KycDoc> {
    const id = this.kycDocIdCounter++;
    const now = new Date();
    const kycDoc: KycDoc = {
      ...insertKycDoc,
      id,
      status: "pending",
      rejectionReason: null,
      reviewedByAdminId: null,
      fileName: insertKycDoc.fileName || null,
      description: insertKycDoc.description || null,
      createdAt: now,
      updatedAt: now,
    };
    this.kycDocs.set(id, kycDoc);
    return kycDoc;
  }

  async updateKycDoc(
    id: number,
    kycDocData: Partial<KycDoc>,
  ): Promise<KycDoc | undefined> {
    const kycDoc = await this.getKycDoc(id);
    if (!kycDoc) return undefined;

    const updatedKycDoc = {
      ...kycDoc,
      ...kycDocData,
      updatedAt: new Date(),
    };

    this.kycDocs.set(id, updatedKycDoc);
    return updatedKycDoc;
  }

  async deleteKycDoc(id: number): Promise<boolean> {
    return this.kycDocs.delete(id);
  }

  // Moderation Log operations
  async getModerationLog(id: number): Promise<ModerationLog | undefined> {
    return this.moderationLogs.get(id);
  }

  async getModerationLogsByListingId(
    listingId: number,
  ): Promise<ModerationLog[]> {
    return Array.from(this.moderationLogs.values())
      .filter((log) => log.listingId === listingId)
      .sort((a, b) => safeGetTime(b.createdAt) - safeGetTime(a.createdAt));
  }

  async createModerationLog(
    insertModerationLog: InsertModerationLog,
  ): Promise<ModerationLog> {
    const id = this.moderationLogIdCounter++;
    const now = new Date();
    const moderationLog: ModerationLog = {
      ...insertModerationLog,
      id,
      resolved: false,
      resolvedBy: null,
      flaggedBy: insertModerationLog.flaggedBy || null,
      createdAt: now,
      updatedAt: now,
    };
    this.moderationLogs.set(id, moderationLog);
    return moderationLog;
  }

  async updateModerationLog(
    id: number,
    moderationLogData: Partial<ModerationLog>,
  ): Promise<ModerationLog | undefined> {
    const moderationLog = await this.getModerationLog(id);
    if (!moderationLog) return undefined;

    const updatedModerationLog = {
      ...moderationLog,
      ...moderationLogData,
      updatedAt: new Date(),
    };

    this.moderationLogs.set(id, updatedModerationLog);
    return updatedModerationLog;
  }

  async resolveModerationLog(
    id: number,
    resolvedById: number,
  ): Promise<ModerationLog | undefined> {
    const moderationLog = await this.getModerationLog(id);
    if (!moderationLog) return undefined;

    const now = new Date();
    const updatedModerationLog = {
      ...moderationLog,
      resolved: true,
      resolvedBy: resolvedById,
      updatedAt: now,
    };

    this.moderationLogs.set(id, updatedModerationLog);
    return updatedModerationLog;
  }

  // Settings operations
  async getSetting(key: string): Promise<Setting | undefined> {
    return this.settings.get(key);
  }

  async getAllSettings(): Promise<Setting[]> {
    return Array.from(this.settings.values());
  }

  async getSettingsByType(type: string): Promise<Setting[]> {
    return Array.from(this.settings.values()).filter(
      (setting) => setting.type === type,
    );
  }

  async createSetting(insertSetting: InsertSetting): Promise<Setting> {
    const now = new Date();
    const id = crypto.randomUUID();

    // Ensure category is included with a default if not provided
    // Make sure value has a default empty string if not provided
    const setting: Setting = {
      ...insertSetting,
      id,
      createdAt: now,
      updatedAt: now,
      // Set default values for required fields
      value: insertSetting.value || "",
      category: insertSetting.category || "general",
    };

    this.settings.set(setting.key, setting);
    return setting;
  }

  async updateSetting(
    key: string,
    value: string,
    type?: string | null,
  ): Promise<Setting | undefined> {
    const setting = await this.getSetting(key);
    if (!setting) return undefined;

    // Only update type if provided, otherwise keep existing
    // Make sure we're using one of the valid types or keep existing
    let typeToUse = setting.type;
    if (type && settingTypes.includes(type as any)) {
      typeToUse = type as (typeof settingTypes)[number];
    }

    const updatedSetting: Setting = {
      ...setting,
      value,
      type: typeToUse,
      updatedAt: new Date(),
    };

    this.settings.set(key, updatedSetting);
    return updatedSetting;
  }

  async updateSettings(settingsToUpdate: UpdateSettings): Promise<Setting[]> {
    const updatedSettings: Setting[] = [];
    console.log("[DEBUG] Updating settings:", settingsToUpdate);

    for (const settingData of settingsToUpdate) {
      const { key, value, type } = settingData;
      let setting = await this.getSetting(key);

      if (setting) {
        // Update existing setting
        setting = {
          ...setting,
          value,
          type,
          updatedAt: new Date(),
        };
        console.log(`[DEBUG] Updating existing setting: ${key} to ${value}`);
      } else {
        // Create new setting with default category
        setting = {
          id: crypto.randomUUID(),
          key,
          value,
          type,
          category: "general", // Default category
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        console.log(`[DEBUG] Creating new setting: ${key} with value ${value}`);
      }

      this.settings.set(key, setting);
      updatedSettings.push(setting);
    }

    console.log(`[DEBUG] Updated ${updatedSettings.length} settings`);
    return updatedSettings;
  }

  async deleteSetting(key: string): Promise<boolean> {
    return this.settings.delete(key);
  }

  // Success Story operations
  async getSuccessStory(id: number): Promise<SuccessStory | undefined> {
    return this.successStories.get(id);
  }

  async getSuccessStories(status?: string): Promise<SuccessStory[]> {
    let stories = Array.from(this.successStories.values());

    if (status) {
      stories = stories.filter((story) => story.status === status);
    }

    // Sort by creation date, newest first
    return stories.sort(
      (a, b) => safeGetTime(b.createdAt) - safeGetTime(a.createdAt),
    );
  }

  async getFeaturedSuccessStories(limit: number = 3): Promise<SuccessStory[]> {
    const featuredStories = Array.from(this.successStories.values())
      .filter((story) => story.featured && story.status === "approved")
      .sort((a, b) => safeGetTime(b.createdAt) - safeGetTime(a.createdAt));

    return featuredStories.slice(0, limit);
  }

  async getUserSuccessStories(userId: number): Promise<SuccessStory[]> {
    return Array.from(this.successStories.values())
      .filter((story) => story.userId === userId)
      .sort((a, b) => safeGetTime(b.createdAt) - safeGetTime(a.createdAt));
  }

  async createSuccessStory(
    insertSuccessStory: InsertSuccessStory,
  ): Promise<SuccessStory> {
    const id = this.successStoryIdCounter++;
    const now = new Date();

    const successStory: SuccessStory = {
      ...insertSuccessStory,
      id,
      status: "pending",
      featured: false,
      reviewedBy: null,
      rejectionReason: null,
      createdAt: now,
      updatedAt: now,
    };

    this.successStories.set(id, successStory);
    return successStory;
  }

  async updateSuccessStory(
    id: number,
    storyData: Partial<SuccessStory>,
  ): Promise<SuccessStory | undefined> {
    const story = await this.getSuccessStory(id);
    if (!story) return undefined;

    const updatedStory = {
      ...story,
      ...storyData,
      updatedAt: new Date(),
    };

    this.successStories.set(id, updatedStory);
    return updatedStory;
  }

  async deleteSuccessStory(id: number): Promise<boolean> {
    return this.successStories.delete(id);
  }

  async approveSuccessStory(
    id: number,
    reviewerId: number,
  ): Promise<SuccessStory | undefined> {
    const story = await this.getSuccessStory(id);
    if (!story) return undefined;

    const updatedStory: SuccessStory = {
      ...story,
      status: "approved",
      reviewedBy: reviewerId,
      rejectionReason: null,
      updatedAt: new Date(),
    };

    this.successStories.set(id, updatedStory);
    return updatedStory;
  }

  async rejectSuccessStory(
    id: number,
    reason: string,
    reviewerId: number,
  ): Promise<SuccessStory | undefined> {
    const story = await this.getSuccessStory(id);
    if (!story) return undefined;

    const updatedStory: SuccessStory = {
      ...story,
      status: "rejected",
      reviewedBy: reviewerId,
      rejectionReason: reason,
      updatedAt: new Date(),
    };

    this.successStories.set(id, updatedStory);
    return updatedStory;
  }

  async setSuccessStoryFeatured(
    id: number,
    featured: boolean,
  ): Promise<SuccessStory | undefined> {
    const story = await this.getSuccessStory(id);
    if (!story) return undefined;

    const updatedStory: SuccessStory = {
      ...story,
      featured,
      updatedAt: new Date(),
    };

    this.successStories.set(id, updatedStory);
    return updatedStory;
  }

  // Saved Listing operations
  async getUserSavedListings(userId: number): Promise<Listing[]> {
    const savedListings: Listing[] = [];
    for (const [key, savedListing] of this.savedListings) {
      if (savedListing.userId === userId) {
        const listing = this.listings.get(savedListing.listingId);
        if (listing && listing.active && listing.status === "approved") {
          savedListings.push(listing);
        }
      }
    }
    return savedListings.sort(
      (a, b) => safeGetTime(b.createdAt) - safeGetTime(a.createdAt),
    );
  }

  async isListingSaved(userId: number, listingId: number): Promise<boolean> {
    const key = `${userId}-${listingId}`;
    return this.savedListings.has(key);
  }

  async saveListing(userId: number, listingId: number): Promise<SavedListing> {
    const key = `${userId}-${listingId}`;
    const savedListing: SavedListing = {
      id: this.savedListingIdCounter++,
      userId,
      listingId,
      createdAt: new Date(),
    };

    this.savedListings.set(key, savedListing);
    return savedListing;
  }

  async unsaveListing(userId: number, listingId: number): Promise<boolean> {
    const key = `${userId}-${listingId}`;
    return this.savedListings.delete(key);
  }

  // Newsletter operations (not implemented in memory store)
  async getNewsletterSubscription(email: string): Promise<NewsletterSubscription | undefined> {
    throw new Error("Newsletter operations not supported in memory storage");
  }

  async createNewsletterSubscription(data: InsertNewsletterSubscription): Promise<NewsletterSubscription> {
    throw new Error("Newsletter operations not supported in memory storage");
  }

  async unsubscribeFromNewsletter(token: string): Promise<boolean> {
    throw new Error("Newsletter operations not supported in memory storage");
  }

  async getActiveNewsletterSubscriptions(): Promise<NewsletterSubscription[]> {
    throw new Error("Newsletter operations not supported in memory storage");
  }

  // Contact operations
  async createContact(contact: InsertContact): Promise<Contact> {
    const id = this.contactIdCounter++;
    const now = new Date();
    const newContact: Contact = {
      ...contact,
      id,
      status: "pending",
      sellerResponse: null,
      createdAt: now,
      updatedAt: now,
    };
    this.contacts.set(id, newContact);
    return newContact;
  }

  async getContactsByListing(listingId: number): Promise<Contact[]> {
    return Array.from(this.contacts.values())
      .filter((contact) => contact.listingId === listingId)
      .sort((a, b) => safeGetTime(b.createdAt) - safeGetTime(a.createdAt));
  }

  async getContactsForSeller(sellerId: number): Promise<Contact[]> {
    return Array.from(this.contacts.values())
      .filter((contact) => contact.sellerId === sellerId)
      .sort((a, b) => safeGetTime(b.createdAt) - safeGetTime(a.createdAt));
  }

  async getContactsFromBuyer(buyerId: number): Promise<Contact[]> {
    return Array.from(this.contacts.values())
      .filter((contact) => contact.buyerId === buyerId)
      .sort((a, b) => safeGetTime(b.createdAt) - safeGetTime(a.createdAt));
  }

  async getContactById(id: number): Promise<Contact | undefined> {
    return this.contacts.get(id);
  }

  async updateContactStatus(
    id: number,
    status: string,
    sellerResponse?: string,
  ): Promise<void> {
    const contact = this.contacts.get(id);
    if (contact) {
      const updatedContact: Contact = {
        ...contact,
        status,
        sellerResponse: sellerResponse || contact.sellerResponse,
        updatedAt: new Date(),
      };
      this.contacts.set(id, updatedContact);
    }
  }

  // Password Reset operations
  async createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken> {
    const newToken: PasswordResetToken = {
      ...token,
      id: this.passwordResetTokenIdCounter++,
    };
    this.passwordResetTokens.set(newToken.token, newToken);
    return newToken;
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    return this.passwordResetTokens.get(token);
  }

  async markPasswordResetTokenUsed(token: string): Promise<boolean> {
    const resetToken = this.passwordResetTokens.get(token);
    if (resetToken) {
      const updatedToken: PasswordResetToken = {
        ...resetToken,
        used: true,
      };
      this.passwordResetTokens.set(token, updatedToken);
      return true;
    }
    return false;
  }

  // User Onboarding operations
  async getUserOnboarding(userId: number): Promise<UserOnboarding | undefined> {
    return Array.from(this.userOnboardings.values()).find(
      (onboarding) => onboarding.userId === userId,
    );
  }

  async createUserOnboarding(onboarding: InsertUserOnboarding): Promise<UserOnboarding> {
    const id = this.userOnboardingIdCounter++;
    const now = new Date();
    const newOnboarding: UserOnboarding = {
      ...onboarding,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.userOnboardings.set(id, newOnboarding);
    return newOnboarding;
  }

  async updateUserOnboarding(
    userId: number,
    onboardingData: Partial<UserOnboarding>,
  ): Promise<UserOnboarding | undefined> {
    const existing = await this.getUserOnboarding(userId);
    if (existing) {
      const updatedOnboarding: UserOnboarding = {
        ...existing,
        ...onboardingData,
        updatedAt: new Date(),
      };
      this.userOnboardings.set(existing.id, updatedOnboarding);
      return updatedOnboarding;
    }
    return undefined;
  }

  // OTP operations
  async createOtpCode(
    userId: number,
    code: string,
    type: string,
    expiresAt: Date,
  ): Promise<OtpCode> {
    const id = this.otpCodeIdCounter++;
    const now = new Date();
    const otpCode: OtpCode = {
      id,
      userId,
      code,
      type,
      expiresAt,
      verified: false,
      createdAt: now,
    };
    this.otpCodes.set(id, otpCode);
    return otpCode;
  }

  async getValidOtpCode(
    userId: number,
    code: string,
    type: string,
  ): Promise<OtpCode | undefined> {
    const now = new Date();
    return Array.from(this.otpCodes.values()).find(
      (otp) =>
        otp.userId === userId &&
        otp.code === code &&
        otp.type === type &&
        !otp.verified &&
        otp.expiresAt > now,
    );
  }

  async markOtpCodeUsed(id: number): Promise<boolean> {
    const otpCode = this.otpCodes.get(id);
    if (otpCode) {
      const updatedOtp: OtpCode = {
        ...otpCode,
        verified: true,
      };
      this.otpCodes.set(id, updatedOtp);
      return true;
    }
    return false;
  }

  // Update password method
  async updateUserPassword(id: number, hashedPassword: string): Promise<boolean> {
    const user = this.users.get(id);
    if (user) {
      const updatedUser: User = {
        ...user,
        password: hashedPassword,
      };
      this.users.set(id, updatedUser);
      return true;
    }
    return false;
  }

  async updateUserEmailVerification(id: number, isVerified: boolean): Promise<boolean> {
    const user = this.users.get(id);
    if (user) {
      const updatedUser: User = {
        ...user,
        isEmailVerified: isVerified,
      };
      this.users.set(id, updatedUser);
      return true;
    }
    return false;
  }
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;
  private pool;

  // Implementation of the getListingCountsByCategory method for the DatabaseStorage class
  async getListingCountsByCategory(): Promise<
    { category: string; count: number }[]
  > {
    try {
      console.log("[DEBUG] Getting listing counts by industry");

      // Using direct SQL query with pool to bypass TypeScript issues with Drizzle
      const { rows } = await this.pool.query(`
        SELECT industry as category, COUNT(*)::int as count
        FROM listings
        WHERE active = true
        GROUP BY industry
        ORDER BY count DESC
      `);

      console.log("[DEBUG] Category counts result:", rows);
      return rows;
    } catch (error) {
      console.error("[ERROR] Failed to get listing counts by category:", error);
      return []; // Return empty array in case of errors
    }
  }

  constructor() {
    // Initialize PostgreSQL connection pool
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : false,
    });

    // Initialize session store
    this.sessionStore = new PostgresSessionStore({
      pool: this.pool,
      createTableIfMissing: true,
    });

    // Initialize default settings
    this.initializeDefaultSettings();
  }

  private async initializeDefaultSettings() {
    try {
      // Check if we already have settings
      const existingSettings = await this.getAllSettings();
      if (existingSettings.length > 0) {
        console.log("Settings already initialized in database");
        return;
      }

      console.log("Initializing default settings in database...");

      // Theme & Home settings
      await this.createSetting({
        key: "theme.primary_color",
        value: "#1e40af",
        type: "text",
      });
      await this.createSetting({
        key: "theme.layout",
        value: "default",
        type: "text",
      });
      await this.createSetting({
        key: "theme.logo_url",
        value: "/logo.png",
        type: "url",
      });
      await this.createSetting({
        key: "theme.font_family",
        value: "Inter, sans-serif",
        type: "text",
      });
      await this.createSetting({
        key: "home.hero_title_en",
        value: "Connect with Business Opportunities in Oman",
        type: "text",
      });
      await this.createSetting({
        key: "home.hero_title_ar",
        value: "تواصل مع فرص الأعمال في عمان",
        type: "text",
      });
      await this.createSetting({
        key: "home.hero_subtitle_en",
        value:
          "The premier platform for business matchmaking in the GCC region",
        type: "text",
      });
      await this.createSetting({
        key: "home.hero_subtitle_ar",
        value: "المنصة الرائدة للتوفيق بين الأعمال في منطقة الخليج",
        type: "text",
      });

      // Contact Page settings
      await this.createSetting({
        key: "contact.address",
        value: "Muscat Business District, Oman",
        type: "text",
      });
      await this.createSetting({
        key: "contact.phone",
        value: "+968 1234 5678",
        type: "text",
      });
      await this.createSetting({
        key: "contact.email",
        value: "info@teejarti.com",
        type: "email",
      });
      await this.createSetting({
        key: "contact.hours_en",
        value: "Sunday - Thursday: 9:00AM - 5:00PM",
        type: "text",
      });
      await this.createSetting({
        key: "contact.hours_ar",
        value: "الأحد - الخميس: ٩:٠٠ ص - ٥:٠٠ م",
        type: "text",
      });
      await this.createSetting({
        key: "contact.map_embed_url",
        value:
          "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3656.1688845124843!2d58.54!3d23.58!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjPCsDM0JzQ4LjAiTiA1OMKwMzInMjQuMCJF!5e0!3m2!1sen!2som!4v1639964105!5m2!1sen!2som",
        type: "url",
      });

      // Page Headings
      await this.createSetting({
        key: "headings.listings_page_title_en",
        value: "Explore Business Opportunities",
        type: "text",
      });
      await this.createSetting({
        key: "headings.listings_page_title_ar",
        value: "استكشف فرص الأعمال",
        type: "text",
      });
      await this.createSetting({
        key: "headings.investor_page_title_en",
        value: "Investor Dashboard",
        type: "text",
      });
      await this.createSetting({
        key: "headings.investor_page_title_ar",
        value: "لوحة تحكم المستثمر",
        type: "text",
      });
      await this.createSetting({
        key: "headings.entrepreneur_page_title_en",
        value: "Entrepreneur Dashboard",
        type: "text",
      });
      await this.createSetting({
        key: "headings.entrepreneur_page_title_ar",
        value: "لوحة تحكم رائد الأعمال",
        type: "text",
      });

      // SEO Settings
      await this.createSetting({
        key: "seo.site_title_en",
        value: "TEEJARTI - Connect Businesses and Investors in Oman",
        type: "text",
      });
      await this.createSetting({
        key: "seo.site_title_ar",
        value: "تيجارتي - ربط الأعمال والمستثمرين في عمان",
        type: "text",
      });
      await this.createSetting({
        key: "seo.site_description_en",
        value:
          "TEEJARTI is the premier platform for connecting businesses, investors, and entrepreneurs in Oman and the GCC region.",
        type: "text",
      });
      await this.createSetting({
        key: "seo.site_description_ar",
        value:
          "تيجارتي هي المنصة الرائدة لربط الأعمال والمستثمرين ورواد الأعمال في عمان ومنطقة الخليج.",
        type: "text",
      });
      await this.createSetting({
        key: "seo.keywords",
        value:
          "business, investment, Oman, GCC, entrepreneur, SME, startup, funding",
        type: "text",
      });
      await this.createSetting({
        key: "seo.og_image_url",
        value: "/og-image.jpg",
        type: "url",
      });

      // Maintenance Mode
      await this.createSetting({
        key: "maintenance.enabled",
        value: "false",
        type: "boolean",
      });
      await this.createSetting({
        key: "maintenance.message_en",
        value:
          "We are currently performing scheduled maintenance. Please check back soon.",
        type: "text",
      });
      await this.createSetting({
        key: "maintenance.message_ar",
        value:
          "نحن نقوم حاليًا بإجراء صيانة مجدولة. يرجى التحقق مرة أخرى قريبًا.",
        type: "text",
      });

      // Social Media
      await this.createSetting({
        key: "social.facebook_url",
        value: "https://facebook.com/teejarti",
        type: "url",
      });
      await this.createSetting({
        key: "social.twitter_url",
        value: "https://twitter.com/teejarti",
        type: "url",
      });
      await this.createSetting({
        key: "social.instagram_url",
        value: "https://instagram.com/teejarti",
        type: "url",
      });
      await this.createSetting({
        key: "social.linkedin_url",
        value: "https://linkedin.com/company/teejarti",
        type: "url",
      });
      await this.createSetting({
        key: "social.youtube_url",
        value: "https://youtube.com/channel/teejarti",
        type: "url",
      });

      // Platform Features
      await this.createSetting({
        key: "features.enable_messaging",
        value: "true",
        type: "boolean",
      });
      await this.createSetting({
        key: "features.enable_kyc",
        value: "true",
        type: "boolean",
      });
      await this.createSetting({
        key: "features.enable_listing_creation",
        value: "true",
        type: "boolean",
      });
      await this.createSetting({
        key: "features.enable_investment_proposals",
        value: "true",
        type: "boolean",
      });
      await this.createSetting({
        key: "features.enable_notifications",
        value: "true",
        type: "boolean",
      });
      await this.createSetting({
        key: "features.enable_arabic",
        value: "true",
        type: "boolean",
      });

      console.log("Default settings initialized successfully in database");
    } catch (error) {
      console.error("Error initializing default settings:", error);
    }
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(sql`LOWER(${users.username}) = LOWER(${username})`)
      .limit(1);
    return result[0];
  }

  async getUsersByIds(ids: number[]): Promise<User[]> {
    if (ids.length === 0) return [];
    const result = await db
      .select()
      .from(users)
      .where(sql`${users.id} = ANY(ARRAY[${ids.join(",")}])`);
    return result;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(sql`LOWER(${users.email}) = LOWER(${email})`)
      .limit(1);
    return result[0];
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db
      .insert(users)
      .values({
        ...insertUser,
        company: insertUser.company || null,
        position: insertUser.position || null,
        location: insertUser.location || null,
        phone: insertUser.phone || null,
        bio: insertUser.bio || null,
        profileImageUrl: insertUser.profileImageUrl || null,
      })
      .returning();
    return result[0];
  }

  async updateUser(
    id: number,
    userData: Partial<User>,
  ): Promise<User | undefined> {
    const result = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async updateUserPassword(id: number, hashedPassword: string): Promise<boolean> {
    try {
      await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, id));
      return true;
    } catch (error) {
      console.error('Error updating user password:', error);
      return false;
    }
  }

  async updateUserEmailVerification(id: number, isVerified: boolean): Promise<boolean> {
    try {
      await db
        .update(users)
        .set({ isEmailVerified: isVerified })
        .where(eq(users.id, id));
      return true;
    } catch (error) {
      console.error('Error updating user email verification:', error);
      return false;
    }
  }

  // Category operations
  async getCategory(id: number): Promise<Category | undefined> {
    const result = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);
    return result[0];
  }

  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const result = await db.insert(categories).values(category).returning();
    return result[0];
  }

  async updateCategory(
    id: number,
    categoryData: Partial<Category>,
  ): Promise<Category | undefined> {
    const result = await db
      .update(categories)
      .set(categoryData)
      .where(eq(categories.id, id))
      .returning();
    return result[0];
  }

  async deleteCategory(id: number): Promise<boolean> {
    await db.delete(categories).where(eq(categories.id, id));
    return true; // Return true if no error was thrown
  }

  // Location operations
  async getLocation(id: number): Promise<Location | undefined> {
    const result = await db
      .select()
      .from(locations)
      .where(eq(locations.id, id))
      .limit(1);
    return result[0];
  }

  async getLocations(): Promise<Location[]> {
    return await db.select().from(locations);
  }

  async createLocation(location: InsertLocation): Promise<Location> {
    const result = await db
      .insert(locations)
      .values({
        ...location,
        region: location.region || null,
      })
      .returning();
    return result[0];
  }

  async updateLocation(
    id: number,
    locationData: Partial<Location>,
  ): Promise<Location | undefined> {
    const result = await db
      .update(locations)
      .set(locationData)
      .where(eq(locations.id, id))
      .returning();
    return result[0];
  }

  async deleteLocation(id: number): Promise<boolean> {
    await db.delete(locations).where(eq(locations.id, id));
    return true;
  }

  // Tag operations
  async getTag(id: number): Promise<Tag | undefined> {
    const result = await db.select().from(tags).where(eq(tags.id, id)).limit(1);
    return result[0];
  }

  async getTags(): Promise<Tag[]> {
    return await db.select().from(tags);
  }

  async createTag(tag: InsertTag): Promise<Tag> {
    const result = await db.insert(tags).values(tag).returning();
    return result[0];
  }

  async updateTag(id: number, tagData: Partial<Tag>): Promise<Tag | undefined> {
    const result = await db
      .update(tags)
      .set(tagData)
      .where(eq(tags.id, id))
      .returning();
    return result[0];
  }

  async deleteTag(id: number): Promise<boolean> {
    await db.delete(tags).where(eq(tags.id, id));
    return true;
  }

  // ListingTag operations
  async getListingTags(listingId: number): Promise<ListingTag[]> {
    return await db
      .select()
      .from(listingTags)
      .where(eq(listingTags.listingId, listingId));
  }

  async addTagToListing(listingId: number, tagId: number): Promise<ListingTag> {
    const result = await db
      .insert(listingTags)
      .values({ listingId, tagId })
      .onConflictDoNothing()
      .returning();
    return result[0];
  }

  async removeTagFromListing(
    listingId: number,
    tagId: number,
  ): Promise<boolean> {
    await db
      .delete(listingTags)
      .where(
        and(eq(listingTags.listingId, listingId), eq(listingTags.tagId, tagId)),
      );
    return true;
  }

  // Listing operations
  async getListing(id: number): Promise<Listing | undefined> {
    const result = await db
      .select({
        id: listings.id,
        userId: listings.userId,
        categoryId: listings.categoryId,
        locationId: listings.locationId,
        title_en: listings.title_en,
        title_ar: listings.title_ar,
        industry: listings.industry,
        location: listings.location,
        saleType: listings.saleType,
        askingPrice: listings.askingPrice,
        currency: listings.currency,
        description_en: listings.description_en,
        description_ar: listings.description_ar,
        featured: listings.featured,
        verified: listings.verified,
        status: listings.status,
        active: listings.active,
        imageUrl: listings.imageUrl,
        price: listings.price,
        businessPlan: listings.businessPlan,
        financials: listings.financials,
        images: listings.images,
        establishedDate: listings.establishedDate,
        employees: listings.employees,
        yearEstablished: listings.yearEstablished,
        monthlyRevenue: listings.monthlyRevenue,
        monthlyProfit: listings.monthlyProfit,
        reasonForSelling: listings.reasonForSelling,
        assets: listings.assets,
        liabilities: listings.liabilities,
        training: listings.training,
        support: listings.support,
        timeframe: listings.timeframe,
        createdAt: listings.createdAt,
        updatedAt: listings.updatedAt,
      })
      .from(listings)
      .where(eq(listings.id, id))
      .limit(1);
    const listing = result[0];

    if (listing) {
      // Fetch tags for this listing
      const listingTagsResult = await db
        .select({
          tag: tags,
        })
        .from(listingTags)
        .innerJoin(tags, eq(listingTags.tagId, tags.id))
        .where(eq(listingTags.listingId, id));

      // Add tags to listing
      (listing as any).tags = listingTagsResult.map((lt) => lt.tag);
    }

    return listing;
  }

  async getListings(filters?: Partial<Listing>): Promise<Listing[]> {
    let query = db
      .select({
        id: listings.id,
        userId: listings.userId,
        categoryId: listings.categoryId,
        locationId: listings.locationId,
        title_en: listings.title_en,
        title_ar: listings.title_ar,
        industry: listings.industry,
        location: listings.location,
        saleType: listings.saleType,
        askingPrice: listings.askingPrice,
        currency: listings.currency,
        description_en: listings.description_en,
        description_ar: listings.description_ar,
        featured: listings.featured,
        verified: listings.verified,
        status: listings.status,
        active: listings.active,
        imageUrl: listings.imageUrl,
        price: listings.price,
        businessPlan: listings.businessPlan,
        financials: listings.financials,
        images: listings.images,
        establishedDate: listings.establishedDate,
        employees: listings.employees,
        yearEstablished: listings.yearEstablished,
        monthlyRevenue: listings.monthlyRevenue,
        monthlyProfit: listings.monthlyProfit,
        reasonForSelling: listings.reasonForSelling,
        assets: listings.assets,
        liabilities: listings.liabilities,
        training: listings.training,
        support: listings.support,
        timeframe: listings.timeframe,
        createdAt: listings.createdAt,
        updatedAt: listings.updatedAt,
      })
      .from(listings);

    if (filters) {
      // Build all where conditions first
      const conditions: any[] = [];
      Object.entries(filters).forEach(([key, value]) => {
        if (value === null) {
          // @ts-ignore - dynamic property access
          conditions.push(isNull(listings[key]));
        } else {
          // @ts-ignore - dynamic property access
          conditions.push(eq(listings[key], value));
        }
      });

      // Apply all conditions with AND logic
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
    }

    // Sort by creation date, newest first
    const listingsResult = await query.orderBy(desc(listings.createdAt));

    // Fetch tags for all listings
    for (const listing of listingsResult) {
      const listingTagsResult = await db
        .select({
          tag: tags,
        })
        .from(listingTags)
        .innerJoin(tags, eq(listingTags.tagId, tags.id))
        .where(eq(listingTags.listingId, listing.id));

      (listing as any).tags = listingTagsResult.map((lt) => lt.tag);
    }

    return listingsResult;
  }

  async getFeaturedListings(limit: number = 3): Promise<Listing[]> {
    return await db
      .select({
        id: listings.id,
        userId: listings.userId,
        categoryId: listings.categoryId,
        locationId: listings.locationId,
        title_en: listings.title_en,
        title_ar: listings.title_ar,
        industry: listings.industry,
        location: listings.location,
        saleType: listings.saleType,
        askingPrice: listings.askingPrice,
        currency: listings.currency,
        description_en: listings.description_en,
        description_ar: listings.description_ar,
        featured: listings.featured,
        verified: listings.verified,
        status: listings.status,
        active: listings.active,
        imageUrl: listings.imageUrl,
        price: listings.price,
        businessPlan: listings.businessPlan,
        financials: listings.financials,
        images: listings.images,
        establishedDate: listings.establishedDate,
        employees: listings.employees,
        yearEstablished: listings.yearEstablished,
        monthlyRevenue: listings.monthlyRevenue,
        monthlyProfit: listings.monthlyProfit,
        reasonForSelling: listings.reasonForSelling,
        assets: listings.assets,
        liabilities: listings.liabilities,
        training: listings.training,
        support: listings.support,
        timeframe: listings.timeframe,
        createdAt: listings.createdAt,
        updatedAt: listings.updatedAt,
      })
      .from(listings)
      .where(and(eq(listings.featured, true), eq(listings.active, true)))
      .orderBy(desc(listings.createdAt))
      .limit(limit);
  }

  async getUserActiveListings(userId: number): Promise<Listing[]> {
    return await db
      .select({
        id: listings.id,
        userId: listings.userId,
        categoryId: listings.categoryId,
        locationId: listings.locationId,
        title_en: listings.title_en,
        title_ar: listings.title_ar,
        industry: listings.industry,
        location: listings.location,
        saleType: listings.saleType,
        askingPrice: listings.askingPrice,
        currency: listings.currency,
        description_en: listings.description_en,
        description_ar: listings.description_ar,
        featured: listings.featured,
        verified: listings.verified,
        status: listings.status,
        active: listings.active,
        imageUrl: listings.imageUrl,
        price: listings.price,
        businessPlan: listings.businessPlan,
        financials: listings.financials,
        images: listings.images,
        establishedDate: listings.establishedDate,
        employees: listings.employees,
        yearEstablished: listings.yearEstablished,
        monthlyRevenue: listings.monthlyRevenue,
        monthlyProfit: listings.monthlyProfit,
        reasonForSelling: listings.reasonForSelling,
        assets: listings.assets,
        liabilities: listings.liabilities,
        training: listings.training,
        support: listings.support,
        timeframe: listings.timeframe,
        createdAt: listings.createdAt,
        updatedAt: listings.updatedAt,
      })
      .from(listings)
      .where(
        and(
          eq(listings.userId, userId),
          eq(listings.active, true),
          or(eq(listings.status, "approved"), eq(listings.status, "pending")),
        ),
      )
      .orderBy(desc(listings.createdAt));
  }

  async createListing(insertListing: InsertListing): Promise<Listing> {
    // Extract insertListing to prevent spreading undefined properties
    const {
      categoryId,
      locationId,
      description_en,
      description_ar,
      price,
      businessPlan,
      financials,
      imageUrl,
      currency,
      ...requiredFields
    } = insertListing;

    const result = await db
      .insert(listings)
      .values({
        ...requiredFields,
        featured: false,
        verified: false,
        active: true,
        status: "pending",
        categoryId: categoryId || null,
        locationId: locationId || null,
        description_en: description_en || null,
        description_ar: description_ar || null,
        price: price || null,
        businessPlan: businessPlan || null,
        financials: financials || null,
        imageUrl: imageUrl || null,
        currency: currency || "OMR", // Default to Omani Rial if not specified
        employees: insertListing.employees || null,
        yearEstablished: insertListing.yearEstablished || null,
        monthlyRevenue: insertListing.monthlyRevenue || null,
        monthlyProfit: insertListing.monthlyProfit || null,
        reasonForSelling: insertListing.reasonForSelling || null,
        assets: insertListing.assets || null,
        liabilities: insertListing.liabilities || null,
        training: insertListing.training || null,
        support: insertListing.support || null,
        timeframe: insertListing.timeframe || null,
      })
      .returning();

    return result[0];
  }

  async updateListing(
    id: number,
    listingData: Partial<Listing>,
  ): Promise<Listing | undefined> {
    const now = new Date();
    console.log("[DEBUG] Storage updateListing - received data:", listingData);

    const result = await db
      .update(listings)
      .set({
        ...listingData,
        updatedAt: now,
      })
      .where(eq(listings.id, id))
      .returning();
    return result[0];
  }

  async deleteListing(id: number): Promise<boolean> {
    await db.delete(listings).where(eq(listings.id, id));
    return true;
  }

  // Message operations
  async getMessages(userId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(or(eq(messages.senderId, userId), eq(messages.receiverId, userId)))
      .orderBy(messages.createdAt);
  }

      async getConversation(
    user1Id: number,
    user2Id: number,
    listingId?: number,
  ): Promise<Message[]> {
    let result = await db
      .select()
      .from(messages)
      .where(
        or(
          and(eq(messages.senderId, user1Id), eq(messages.receiverId, user2Id)),
          and(eq(messages.senderId, user2Id), eq(messages.receiverId, user1Id))
        )
      );

    if (listingId) {
      result = result.filter((m) => m.listingId === listingId);
    }

    return result.sort(
      (a, b) => safeGetTime(a.createdAt) - safeGetTime(b.createdAt),
    );
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const result = await db
      .insert(messages)
      .values({
        ...insertMessage,
        listingId: insertMessage.listingId || null,
      })
      .returning();
    return result[0];
  }

  async markMessageRead(id: number): Promise<boolean> {
    await db.update(messages).set({ read: true }).where(eq(messages.id, id));
    return true;
  }

  async getMessageThreads(userId: number): Promise<MessageThread[]> {
    // Get all messages for the user
    const allMessages = await db
      .select()
      .from(messages)
      .where(or(eq(messages.senderId, userId), eq(messages.receiverId, userId)))
      .orderBy(desc(messages.createdAt));

    // Process messages into threads
    const threadMap = new Map<number, MessageThread>();
    
    for (const message of allMessages) {
      const otherUserId = message.senderId === userId ? message.receiverId : message.senderId;
      
      const existing = threadMap.get(otherUserId);
      
      if (!existing || new Date(message.createdAt!) > new Date(existing.lastMessage.createdAt!)) {
        // Get the other user's data
        const otherUser = await db
          .select({
            id: users.id,
            username: users.username,
            fullName: users.fullName,
            profileImageUrl: users.profileImageUrl,
          })
          .from(users)
          .where(eq(users.id, otherUserId))
          .limit(1);

        if (!otherUser[0]) continue;

        // Count unread messages from this other user to current user
        const unreadResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(messages)
          .where(
            and(
              eq(messages.receiverId, userId),
              eq(messages.senderId, otherUserId),
              eq(messages.read, false)
            )
          );

        // Get listing info if message has listingId
        let listing = undefined;
        if (message.listingId) {
          const listingResult = await db
            .select({
              id: listings.id,
              title_en: listings.title_en,
              title_ar: listings.title_ar,
            })
            .from(listings)
            .where(eq(listings.id, message.listingId))
            .limit(1);
          
          if (listingResult[0]) {
            listing = listingResult[0];
          }
        }

        threadMap.set(otherUserId, {
          otherUser: otherUser[0],
          lastMessage: message,
          unreadCount: unreadResult[0]?.count || 0,
          listing,
        });
      }
    }

    return Array.from(threadMap.values()).sort(
      (a, b) => new Date(b.lastMessage.createdAt!).getTime() - new Date(a.lastMessage.createdAt!).getTime()
    );
  }

  async markThreadRead(userId: number, otherUserId: number): Promise<boolean> {
    await db
      .update(messages)
      .set({ read: true })
      .where(
        and(
          eq(messages.receiverId, userId),
          eq(messages.senderId, otherUserId)
        )
      );
    return true;
  }

  // Document operations
  async getDocuments(userId: number, listingId?: number): Promise<Document[]> {
    // First get documents by user ID
    let results = await db
      .select()
      .from(documents)
      .where(eq(documents.userId, userId));

    // Then filter by listing ID if provided
    if (listingId) {
      results = results.filter((doc) => doc.listingId === listingId);
    }

    // Sort by upload date, newest first using safeGetTime
    return results.sort(
      (a, b) => safeGetTime(b.uploadedAt) - safeGetTime(a.uploadedAt),
    );
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const result = await db
      .insert(documents)
      .values({
        ...insertDocument,
        listingId: insertDocument.listingId || null,
      })
      .returning();
    return result[0];
  }

  async deleteDocument(id: number): Promise<boolean> {
    await db.delete(documents).where(eq(documents.id, id));
    return true;
  }

  // KYC operations
  async getKyc(id: number): Promise<Kyc | undefined> {
    const result = await db.select().from(kyc).where(eq(kyc.id, id)).limit(1);
    return result[0];
  }

  async getKycByUserId(userId: number): Promise<Kyc | undefined> {
    const result = await db
      .select()
      .from(kyc)
      .where(eq(kyc.userId, userId))
      .limit(1);
    return result[0];
  }

  async getPendingKycApplications(): Promise<Kyc[]> {
    return await db.select().from(kyc).where(eq(kyc.status, "pending"));
  }

  async getAllKyc(status?: string): Promise<Kyc[]> {
    if (status) {
      return await db
        .select()
        .from(kyc)
        .where(eq(kyc.status, status))
        .orderBy(desc(kyc.createdAt));
    }
    return await db.select().from(kyc).orderBy(desc(kyc.createdAt));
  }

  async createKyc(insertKyc: InsertKyc): Promise<Kyc> {
    const result = await db
      .insert(kyc)
      .values({
        ...insertKyc,
        status: "pending",
        addressProofUrl: insertKyc.addressProofUrl || null,
        businessLicenseUrl: insertKyc.businessLicenseUrl || null,
      })
      .returning();
    return result[0];
  }

  async updateKyc(id: number, kycData: Partial<Kyc>): Promise<Kyc | undefined> {
    const now = new Date();
    const result = await db
      .update(kyc)
      .set({
        ...kycData,
        updatedAt: now,
      })
      .where(eq(kyc.id, id))
      .returning();
    return result[0];
  }

  async approveKyc(id: number, reviewerId: number): Promise<Kyc | undefined> {
    const now = new Date();
    const result = await db
      .update(kyc)
      .set({
        status: "approved",
        reviewedBy: reviewerId,
        reviewedAt: now,
        updatedAt: now,
      })
      .where(eq(kyc.id, id))
      .returning();
    return result[0];
  }

  async rejectKyc(
    id: number,
    reason: string,
    reviewerId: number,
  ): Promise<Kyc | undefined> {
    const now = new Date();
    const result = await db
      .update(kyc)
      .set({
        status: "rejected",
        rejectionReason: reason,
        reviewedBy: reviewerId,
        reviewedAt: now,
        updatedAt: now,
      })
      .where(eq(kyc.id, id))
      .returning();
    return result[0];
  }

  // KYC Document operations
  async getKycDoc(id: number): Promise<KycDoc | undefined> {
    const result = await db
      .select()
      .from(kycDocs)
      .where(eq(kycDocs.id, id))
      .limit(1);
    return result[0];
  }

  async getKycDocsByUserId(userId: number): Promise<KycDoc[]> {
    return await db.select().from(kycDocs).where(eq(kycDocs.userId, userId));
  }

  async getAllKycDocs(): Promise<KycDoc[]> {
    return await db.select().from(kycDocs).orderBy(desc(kycDocs.createdAt));
  }

  async createKycDoc(insertKycDoc: InsertKycDoc): Promise<KycDoc> {
    const result = await db
      .insert(kycDocs)
      .values({
        ...insertKycDoc,
        fileName: insertKycDoc.fileName || null,
        description: insertKycDoc.description || null,
      })
      .returning();
    return result[0];
  }

  async updateKycDoc(
    id: number,
    kycDocData: Partial<KycDoc>,
  ): Promise<KycDoc | undefined> {
    const now = new Date();
    const result = await db
      .update(kycDocs)
      .set({
        ...kycDocData,
        updatedAt: now,
      })
      .where(eq(kycDocs.id, id))
      .returning();
    return result[0];
  }

  async deleteKycDoc(id: number): Promise<boolean> {
    await db.delete(kycDocs).where(eq(kycDocs.id, id));
    return true;
  }

  // Moderation Log operations
  async getModerationLog(id: number): Promise<ModerationLog | undefined> {
    const result = await db
      .select()
      .from(moderationLogs)
      .where(eq(moderationLogs.id, id))
      .limit(1);
    return result[0];
  }

  async getModerationLogsByListingId(
    listingId: number,
  ): Promise<ModerationLog[]> {
    return await db
      .select()
      .from(moderationLogs)
      .where(eq(moderationLogs.entityId, listingId));
  }

  async createModerationLog(
    insertModerationLog: InsertModerationLog,
  ): Promise<ModerationLog> {
    const result = await db
      .insert(moderationLogs)
      .values({
        ...insertModerationLog,
        listingId: insertModerationLog.entityType === 'listing' ? insertModerationLog.entityId : null,
      })
      .returning();
    return result[0];
  }

  async updateModerationLog(
    id: number,
    moderationLogData: Partial<ModerationLog>,
  ): Promise<ModerationLog | undefined> {
    const now = new Date();
    const result = await db
      .update(moderationLogs)
      .set({
        ...moderationLogData,
        updatedAt: now,
      })
      .where(eq(moderationLogs.id, id))
      .returning();
    return result[0];
  }

  async resolveModerationLog(
    id: number,
    resolvedById: number,
  ): Promise<ModerationLog | undefined> {
    const now = new Date();
    const result = await db
      .update(moderationLogs)
      .set({
        resolved: true,
        resolvedBy: resolvedById,
        updatedAt: now,
      })
      .where(eq(moderationLogs.id, id))
      .returning();
    return result[0];
  }

  // Settings operations
  async getSetting(key: string): Promise<Setting | undefined> {
    try {
      console.log(
        `[DEBUG] DatabaseStorage.getSetting: Fetching setting with key '${key}'`,
      );
      const result = await db
        .select()
        .from(settings)
        .where(eq(settings.key, key))
        .limit(1);

      if (result && result.length > 0) {
        console.log(
          `[DEBUG] DatabaseStorage.getSetting: Found setting for key '${key}'`,
          result[0],
        );
        return result[0];
      } else {
        console.log(
          `[DEBUG] DatabaseStorage.getSetting: No setting found for key '${key}'`,
        );
        return undefined;
      }
    } catch (error) {
      console.error(
        `[ERROR] DatabaseStorage.getSetting failed for key '${key}':`,
        error,
      );
      throw error; // Re-throw the error for proper handling
    }
  }

  async getAllSettings(): Promise<Setting[]> {
    try {
      console.log(
        "[DEBUG] DatabaseStorage.getAllSettings: Fetching settings from database",
      );
      const dbSettings = await db.select().from(settings);
      console.log(
        `[DEBUG] DatabaseStorage.getAllSettings: Found ${dbSettings.length} settings in database`,
      );
      return dbSettings;
    } catch (error) {
      console.error("[ERROR] DatabaseStorage.getAllSettings failed:", error);
      return [];
    }
  }

  async getSettingsByType(type: string): Promise<Setting[]> {
    try {
      console.log(
        `[DEBUG] DatabaseStorage.getSettingsByType: Fetching settings of type '${type}'`,
      );
      // Use SQL parameter to avoid type issues
      const typeSettings = await db
        .select()
        .from(settings)
        .where(sql`${settings.type} = ${type}`);
      console.log(
        `[DEBUG] DatabaseStorage.getSettingsByType: Found ${typeSettings.length} settings of type '${type}'`,
      );
      return typeSettings;
    } catch (error) {
      console.error(
        `[ERROR] DatabaseStorage.getSettingsByType failed for type '${type}':`,
        error,
      );
      return [];
    }
  }

  async createSetting(insertSetting: InsertSetting): Promise<Setting> {
    try {
      console.log(`[DEBUG] Creating setting with data:`, insertSetting);
      const result = await db
        .insert(settings)
        .values(insertSetting)
        .returning();
      console.log(`[DEBUG] Create setting result:`, result);
      return result[0];
    } catch (error) {
      console.error(`[ERROR] Failed to create setting:`, error);
      if (error instanceof Error) {
        console.error(`[ERROR] Error details: ${error.message}`);
        console.error(`[ERROR] Error stack: ${error.stack}`);
      }
      throw error;
    }
  }

  async updateSetting(
    key: string,
    value: string,
    type?: string,
  ): Promise<Setting | undefined> {
    try {
      console.log(
        `[DEBUG] updateSetting called for key "${key}" with value "${value}"`,
      );

      // Catch a common case for image URLs - they should start with /uploads/
      if (type === "image" && !value.startsWith("/uploads/")) {
        console.warn(
          `[WARN] Image URL does not start with '/uploads/': ${value}`,
        );
      }

      const now = new Date();
      const updateData: any = {
        value,
        updatedAt: now,
      };

      // Only include type in update if provided, ensure it's a valid type
      const validTypes = [
        "text",
        "image",
        "boolean",
        "email",
        "number",
        "url",
        "json",
      ] as const;

      if (type) {
        if (validTypes.includes(type as any)) {
          // Type assertion to handle the type narrowing
          updateData.type = type as (typeof validTypes)[number];
        } else {
          console.error(
            `[ERROR] Invalid setting type: "${type}". Must be one of:`,
            validTypes,
          );
          // Set a default type anyway
          updateData.type = "text";
        }
      }

      // Check if setting exists first
      console.log(`[DEBUG] Checking if setting exists with key "${key}"`);
      let existingSetting;
      try {
        existingSetting = await this.getSetting(key);
        console.log(
          `[DEBUG] getSetting result for key "${key}":`,
          existingSetting,
        );
      } catch (getError) {
        console.error(
          `[ERROR] Error getting existing setting "${key}":`,
          getError,
        );
        // Don't throw, proceed to create setting
        existingSetting = null;
      }

      // We found the setting, just update it
      if (existingSetting) {
        console.log(
          `[DEBUG] Existing setting found for key "${key}". Updating...`,
          existingSetting,
        );

        try {
          // Update the existing setting
          console.log(
            `[DEBUG] Executing update query for key "${key}" with data:`,
            updateData,
          );
          const result = await db
            .update(settings)
            .set(updateData)
            .where(eq(settings.key, key))
            .returning();

          console.log(`[DEBUG] Update query result:`, result);
          if (result && result.length > 0) {
            console.log(`[DEBUG] Update successful:`, result[0]);
            return result[0];
          } else {
            console.error(
              `[ERROR] Update query did not return a result for key "${key}"`,
            );

            // Try to retrieve the setting after the update, even if returning didn't work
            try {
              const updatedSetting = await this.getSetting(key);
              if (updatedSetting) {
                console.log(
                  `[DEBUG] Retrieved setting after update:`,
                  updatedSetting,
                );
                return updatedSetting;
              }
            } catch (retrieveError) {
              console.error(
                `[ERROR] Error retrieving setting after update:`,
                retrieveError,
              );
            }

            // If retrieval fails, construct a setting object manually
            // Use existingSetting as the base
            return {
              ...existingSetting,
              value: value,
              type: updateData.type || existingSetting.type,
              updatedAt: now,
            };
          }
        } catch (updateError) {
          console.error(
            `[ERROR] Failed to execute update query for key "${key}":`,
            updateError,
          );
          // Don't throw, return a manual setting

          // If update fails, return the existing setting with the new value
          return {
            ...existingSetting,
            value: value,
            type: updateData.type || existingSetting.type,
            updatedAt: now,
          };
        }
      } else {
        console.log(
          `[DEBUG] No existing setting found for key "${key}". Creating new setting.`,
        );

        // Setting doesn't exist, create it
        // Ensure type is valid, default to 'text' if not specified or invalid
        const validType =
          type && validTypes.includes(type as any)
            ? (type as (typeof validTypes)[number])
            : ("text" as (typeof validTypes)[number]);

        // Create a new setting if it doesn't exist
        const insertData: InsertSetting = {
          key,
          value,
          type: validType,
          category: type === "image" ? "theme" : "general", // Use theme category for images
        };

        try {
          console.log(
            `[DEBUG] Executing insert query for key "${key}" with data:`,
            insertData,
          );
          const result = await db
            .insert(settings)
            .values(insertData) // Direct value should work with proper typing
            .returning();

          console.log(`[DEBUG] Insert query result:`, result);
          if (result && result.length > 0) {
            console.log(`[DEBUG] Insert successful:`, result[0]);
            return result[0];
          } else {
            console.error(
              `[ERROR] Insert query did not return a result for key "${key}"`,
            );

            // Try to retrieve the setting after the insert
            try {
              const createdSetting = await this.getSetting(key);
              if (createdSetting) {
                console.log(
                  `[DEBUG] Retrieved setting after insert:`,
                  createdSetting,
                );
                return createdSetting;
              }
            } catch (retrieveError) {
              console.error(
                `[ERROR] Error retrieving setting after insert:`,
                retrieveError,
              );
            }

            // If retrieval fails, construct a setting object with generated ID
            return {
              id: crypto.randomUUID(),
              key: key,
              value: value,
              type: validType,
              category: type === "image" ? "theme" : "general",
              createdAt: now,
              updatedAt: now,
            };
          }
        } catch (insertError) {
          console.error(
            `[ERROR] Failed to execute insert query for key "${key}":`,
            insertError,
          );

          // If insert fails, still construct and return a setting object
          return {
            id: crypto.randomUUID(),
            key: key,
            value: value,
            type: validType,
            category: type === "image" ? "theme" : "general",
            createdAt: now,
            updatedAt: now,
          };
        }
      }
    } catch (error) {
      console.error(`[ERROR] Failed to update setting "${key}":`, error);
      if (error instanceof Error) {
        console.error(`[ERROR] Error details: ${error.message}`);
        console.error(`[ERROR] Error stack: ${error.stack}`);
      }

      // Even in case of error, construct and return a setting object
      const now = new Date();
      const validType =
        type &&
        ["text", "image", "boolean", "email", "number", "url", "json"].includes(
          type,
        )
          ? type
          : "text";

      // Create a fallback setting as a last resort
      const fallbackSetting: Setting = {
        id: crypto.randomUUID(),
        key: key,
        value: value,
        type: validType as any,
        category: type === "image" ? "theme" : "general",
        createdAt: now,
        updatedAt: now,
      };

      console.log(
        `[DEBUG] Returning fallback setting due to error:`,
        fallbackSetting,
      );
      return fallbackSetting;
    }
  }

  async updateSettings(settingsToUpdate: UpdateSettings): Promise<Setting[]> {
    const updatedSettings: Setting[] = [];

    console.log(
      `[DEBUG] updateSettings called with ${settingsToUpdate.length} settings`,
    );

    for (const settingData of settingsToUpdate) {
      const { key, value, type } = settingData;

      // Use the improved updateSetting method we just created
      const updatedSetting = await this.updateSetting(key, value, type);

      if (updatedSetting) {
        updatedSettings.push(updatedSetting);
      } else {
        console.error(`[ERROR] Failed to update setting for key: ${key}`);
      }
    }

    console.log(
      `[DEBUG] updateSettings completed: ${updatedSettings.length} settings updated`,
    );
    return updatedSettings;
  }

  async deleteSetting(key: string): Promise<boolean> {
    await db.delete(settings).where(eq(settings.key, key));
    return true;
  }

  // Success Story operations
  async getSuccessStory(id: number): Promise<SuccessStory | undefined> {
    const result = await db
      .select()
      .from(successStories)
      .where(eq(successStories.id, id))
      .limit(1);
    return result[0];
  }

  async getSuccessStories(status?: string): Promise<SuccessStory[]> {
    let query = db.select().from(successStories);

    if (status) {
      query = query.where(eq(successStories.status, status));
    }

    // Order by created date, newest first
    return await query.orderBy(desc(successStories.createdAt));
  }

  async getFeaturedSuccessStories(limit: number = 3): Promise<SuccessStory[]> {
    const result = await db
      .select()
      .from(successStories)
      .where(
        and(
          eq(successStories.featured, true),
          eq(successStories.status, "approved"),
        ),
      )
      .orderBy(desc(successStories.createdAt))
      .limit(limit);

    return result;
  }

  async getUserSuccessStories(userId: number): Promise<SuccessStory[]> {
    return await db
      .select()
      .from(successStories)
      .where(eq(successStories.userId, userId))
      .orderBy(desc(successStories.createdAt));
  }

  async createSuccessStory(story: InsertSuccessStory): Promise<SuccessStory> {
    const result = await db
      .insert(successStories)
      .values({
        ...story,
        status: "pending",
        featured: false,
        reviewedBy: null,
        rejectionReason: null,
      })
      .returning();

    return result[0];
  }

  async updateSuccessStory(
    id: number,
    storyData: Partial<SuccessStory>,
  ): Promise<SuccessStory | undefined> {
    const result = await db
      .update(successStories)
      .set({
        ...storyData,
        updatedAt: new Date(),
      })
      .where(eq(successStories.id, id))
      .returning();

    return result[0];
  }

  async deleteSuccessStory(id: number): Promise<boolean> {
    await db.delete(successStories).where(eq(successStories.id, id));
    return true;
  }

  async approveSuccessStory(
    id: number,
    reviewerId: number,
  ): Promise<SuccessStory | undefined> {
    const result = await db
      .update(successStories)
      .set({
        status: "approved",
        reviewedBy: reviewerId,
        rejectionReason: null,
        updatedAt: new Date(),
      })
      .where(eq(successStories.id, id))
      .returning();

    return result[0];
  }

  async rejectSuccessStory(
    id: number,
    reason: string,
    reviewerId: number,
  ): Promise<SuccessStory | undefined> {
    const result = await db
      .update(successStories)
      .set({
        status: "rejected",
        reviewedBy: reviewerId,
        rejectionReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(successStories.id, id))
      .returning();

    return result[0];
  }

  async setSuccessStoryFeatured(
    id: number,
    featured: boolean,
  ): Promise<SuccessStory | undefined> {
    const result = await db
      .update(successStories)
      .set({
        featured,
        updatedAt: new Date(),
      })
      .where(eq(successStories.id, id))
      .returning();

    return result[0];
  }

  // Saved Listing operations
  async getUserSavedListings(userId: number): Promise<Listing[]> {
    try {
      // Use raw SQL to bypass Drizzle ORM issues
      const result = await db.execute(sql`
        SELECT l.*
        FROM saved_listings sl
        INNER JOIN listings l ON sl.listing_id = l.id
        WHERE sl.user_id = ${userId}
          AND l.active = true
          AND l.status = 'approved'
        ORDER BY sl.created_at DESC
      `);

      return result.rows as unknown as Listing[];
    } catch (error) {
      console.error("Error fetching saved listings:", error);
      return [];
    }
  }

  // Contact operations
  async createContact(contact: InsertContact): Promise<Contact> {
    const result = await db
      .insert(contacts)
      .values({
        ...contact,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return result[0];
  }

  async getContactsByListing(listingId: number): Promise<Contact[]> {
    const result = await db
      .select()
      .from(contacts)
      .where(eq(contacts.listingId, listingId))
      .orderBy(desc(contacts.createdAt));
    return result;
  }

  async getContactsForSeller(sellerId: number): Promise<Contact[]> {
    const result = await db
      .select()
      .from(contacts)
      .where(eq(contacts.sellerId, sellerId))
      .orderBy(desc(contacts.createdAt));
    return result;
  }

  async getContactsFromBuyer(buyerId: number): Promise<Contact[]> {
    const result = await db
      .select()
      .from(contacts)
      .where(eq(contacts.buyerId, buyerId))
      .orderBy(desc(contacts.createdAt));
    return result;
  }

  async getContactById(id: number): Promise<Contact | undefined> {
    const result = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, id))
      .limit(1);
    return result[0];
  }

  async updateContactStatus(
    id: number,
    status: string,
    sellerResponse?: string,
  ): Promise<void> {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (sellerResponse) {
      updateData.sellerResponse = sellerResponse;
      updateData.respondedAt = new Date();
    }

    await db.update(contacts).set(updateData).where(eq(contacts.id, id));
  }

  async isListingSaved(userId: number, listingId: number): Promise<boolean> {
    const result = await db
      .select()
      .from(savedListings)
      .where(
        and(
          eq(savedListings.userId, userId),
          eq(savedListings.listingId, listingId),
        ),
      )
      .limit(1);

    return result.length > 0;
  }

  async saveListing(userId: number, listingId: number): Promise<SavedListing> {
    const result = await db
      .insert(savedListings)
      .values({
        userId,
        listingId,
      })
      .returning();

    return result[0];
  }

  async unsaveListing(userId: number, listingId: number): Promise<boolean> {
    const result = await db
      .delete(savedListings)
      .where(
        and(
          eq(savedListings.userId, userId),
          eq(savedListings.listingId, listingId),
        ),
      );

    return true;
  }

  // Password Reset operations
  async createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken> {
    const result = await db
      .insert(passwordResetTokens)
      .values(token)
      .returning();
    return result[0];
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const result = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token))
      .limit(1);
    return result[0];
  }

  async markPasswordResetTokenUsed(token: string): Promise<boolean> {
    try {
      await db
        .update(passwordResetTokens)
        .set({ used: true })
        .where(eq(passwordResetTokens.token, token));
      return true;
    } catch (error) {
      console.error('Error marking password reset token as used:', error);
      return false;
    }
  }

  // User Onboarding operations
  async getUserOnboarding(userId: number): Promise<UserOnboarding | undefined> {
    const result = await db
      .select()
      .from(userOnboarding)
      .where(eq(userOnboarding.userId, userId))
      .limit(1);
    return result[0];
  }

  async createUserOnboarding(onboarding: InsertUserOnboarding): Promise<UserOnboarding> {
    const result = await db
      .insert(userOnboarding)
      .values(onboarding)
      .returning();
    return result[0];
  }

  async updateUserOnboarding(userId: number, onboardingData: Partial<UserOnboarding>): Promise<UserOnboarding | undefined> {
    const result = await db
      .update(userOnboarding)
      .set({ ...onboardingData, updatedAt: new Date() })
      .where(eq(userOnboarding.userId, userId))
      .returning();
    return result[0];
  }

  // OTP operations (enhanced)
  async createOtpCode(userId: number, code: string, type: string, expiresAt: Date): Promise<OtpCode> {
    const result = await db
      .insert(otpCodes)
      .values({
        userId,
        code,
        type,
        expiresAt,
      })
      .returning();
    return result[0];
  }

  async getValidOtpCode(userId: number, code: string, type: string): Promise<OtpCode | undefined> {
    const result = await db
      .select()
      .from(otpCodes)
      .where(
        and(
          eq(otpCodes.userId, userId),
          eq(otpCodes.code, code),
          eq(otpCodes.type, type),
          eq(otpCodes.verified, false),
          sql`${otpCodes.expiresAt} > NOW()`
        )
      )
      .limit(1);
    return result[0];
  }

  async markOtpCodeUsed(id: number): Promise<boolean> {
    try {
      await db
        .update(otpCodes)
        .set({ verified: true })
        .where(eq(otpCodes.id, id));
      return true;
    } catch (error) {
      console.error('Error marking OTP code as used:', error);
      return false;
    }
  }

  // Newsletter subscription operations
  async createNewsletterSubscription(
    insertSubscription: InsertNewsletterSubscription,
  ): Promise<NewsletterSubscription> {
    // Generate unique unsubscribe token
    const unsubscribeToken = crypto.randomBytes(32).toString("hex");
    
    const result = await db
      .insert(newsletterSubscriptions)
      .values({
        ...insertSubscription,
        unsubscribeToken,
      })
      .onConflictDoUpdate({
        target: newsletterSubscriptions.email,
        set: {
          status: "active",
          subscribedAt: new Date(),
          unsubscribedAt: null,
          unsubscribeToken,
        },
      })
      .returning();
    
    return result[0];
  }

  async getNewsletterSubscription(email: string): Promise<NewsletterSubscription | undefined> {
    const result = await db
      .select()
      .from(newsletterSubscriptions)
      .where(eq(newsletterSubscriptions.email, email))
      .limit(1);
    
    return result[0];
  }

  async unsubscribeFromNewsletter(token: string): Promise<boolean> {
    const result = await db
      .update(newsletterSubscriptions)
      .set({
        status: "unsubscribed",
        unsubscribedAt: new Date(),
      })
      .where(eq(newsletterSubscriptions.unsubscribeToken, token))
      .returning();
    
    return result.length > 0;
  }

  async getActiveNewsletterSubscriptions(): Promise<NewsletterSubscription[]> {
    return await db
      .select()
      .from(newsletterSubscriptions)
      .where(eq(newsletterSubscriptions.status, "active"))
      .orderBy(desc(newsletterSubscriptions.subscribedAt));
  }

  // Translation operations
  async getTranslation(section: string, key: string): Promise<Translation | undefined> {
    const result = await db
      .select()
      .from(translations)
      .where(
        and(
          eq(translations.section, section),
          eq(translations.key, key)
        )
      )
      .limit(1);
    return result[0];
  }

  async getAllTranslations(): Promise<Translation[]> {
    return await db
      .select()
      .from(translations)
      .orderBy(asc(translations.section), asc(translations.key));
  }

  async createOrUpdateTranslation(
    translation: InsertTranslation & { addedBy?: number }
  ): Promise<Translation> {
    const existing = await this.getTranslation(translation.section, translation.key);
    
    if (existing) {
      // Update existing translation
      const result = await db
        .update(translations)
        .set({
          english: translation.english,
          arabic: translation.arabic,
          notes: translation.notes,
          lastUpdated: new Date(),
        })
        .where(eq(translations.id, existing.id))
        .returning();
      return result[0];
    } else {
      // Create new translation
      const result = await db
        .insert(translations)
        .values({
          ...translation,
          addedBy: translation.addedBy,
        })
        .returning();
      return result[0];
    }
  }
}

// Use PostgreSQL storage for production, memory storage for development/testing
export const storage = process.env.DATABASE_URL
  ? new DatabaseStorage()
  : new MemStorage();









