import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  doublePrecision,
  primaryKey,
  foreignKey,
  uuid,
  json,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// User types: entrepreneur, investor, broker, admin, blocked
export const userRoles = [
  "entrepreneur",
  "investor",
  "broker",
  "admin",
  "blocked",
] as const;

// KYC status types
export const kycStatusTypes = ["pending", "approved", "rejected"] as const;

// Listing status types
export const listingStatusTypes = [
  "pending",
  "approved",
  "rejected",
  "archived",
] as const;

// Success story status types
export const successStoryStatusTypes = [
  "pending",
  "approved",
  "rejected",
] as const;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  role: text("role", { enum: userRoles }).notNull(),
  originalRole: text("original_role", { enum: userRoles }), // Stores previous role when blocked
  company: text("company"),
  position: text("position"),
  location: text("location"),
  phone: text("phone"),
  bio: text("bio"),
  profileImageUrl: text("profile_image_url"),
  verified: boolean("verified").default(false),
  isEmailVerified: boolean("is_email_verified").default(false),
  isPhoneVerified: boolean("is_phone_verified").default(false),
  kycStatus: text("kyc_status", { enum: [...kycStatusTypes, "none"] }).default("none"),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * OTP codes for 2FA verification and password reset
 */
export const otpCodes = pgTable("otp_codes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  code: text("code").notNull(),
  type: text("type", { enum: ["email", "phone", "login", "password_reset", "email_verification"] }).notNull(),
  verified: boolean("verified").default(false),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Password reset tokens table
 */
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * User onboarding progress tracking
 */
export const userOnboarding = pgTable("user_onboarding", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .unique()
    .references(() => users.id),
  emailVerified: boolean("email_verified").default(false),
  phoneVerified: boolean("phone_verified").default(false),
  profileCompleted: boolean("profile_completed").default(false),
  kycSubmitted: boolean("kyc_submitted").default(false),
  kycApproved: boolean("kyc_approved").default(false),
  termsAccepted: boolean("terms_accepted").default(false),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  currentStep: text("current_step").default("email_verification"), // email_verification, phone_verification, profile_completion, kyc_submission, pending_approval, completed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Newsletter subscriptions
 */
export const newsletterSubscriptions = pgTable("newsletter_subscriptions", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  status: text("status", { enum: ["active", "unsubscribed"] }).notNull().default("active"),
  subscribedAt: timestamp("subscribed_at").defaultNow(),
  unsubscribedAt: timestamp("unsubscribed_at"),
  unsubscribeToken: text("unsubscribe_token").unique(),
});

/**
 * Manual translation overrides stored in production DB.
 */
export const translations = pgTable("translations", {
  id: serial("id").primaryKey(),
  section: text("section").notNull(),
  key: text("key").notNull(),
  english: text("english").notNull(),
  arabic: text("arabic").notNull(),
  notes: text("notes"),
  lastUpdated: timestamp("last_updated", { withTimezone: true }).defaultNow(),
  addedBy: integer("added_by").references(() => users.id),
});

export const insertTranslationSchema = createInsertSchema(translations).omit({
  id: true,
  lastUpdated: true,
});

/**
 * Categories for classifying business listings
 */
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name_en: text("name_en").notNull(),
  name_ar: text("name_ar").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Locations for business listings
 */
export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  country: text("country").notNull(),
  city: text("city").notNull(),
  region: text("region"),
  name_en: text("name_en").notNull(),
  name_ar: text("name_ar").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Tags for labeling and filtering listings
 */
export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name_en: text("name_en").notNull(),
  name_ar: text("name_ar").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Business listings table
 */
export const listings = pgTable("listings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  categoryId: integer("category_id").references(() => categories.id),
  locationId: integer("location_id").references(() => locations.id),
  title_en: text("title_en").notNull(),
  title_ar: text("title_ar").notNull(),
  industry: text("industry").notNull(),
  location: text("location").notNull(), // Legacy field, to be replaced with locationId
  saleType: text("sale_type").notNull(), // Full Sale, Partial Investment, Partnership, Franchise
  askingPrice: doublePrecision("asking_price").notNull(),
  currency: text("currency").default("OMR"),
  description_en: text("description_en"),
  description_ar: text("description_ar"),
  featured: boolean("featured").default(false),
  verified: boolean("verified").default(false),
  status: text("status", { enum: listingStatusTypes }).default("pending"),
  active: boolean("active").default(true),
  imageUrl: text("image_url"),
  images: text("images").array(), // Multiple image URLs stored as array
  price: doublePrecision("price"),
  businessPlan: text("business_plan"),
  financials: text("financials"),
  establishedDate: text("established_date"), // Year or date when business was established
  // Additional optional business details
  employees: integer("employees"),
  yearEstablished: integer("year_established"),
  monthlyRevenue: doublePrecision("monthly_revenue"),
  monthlyProfit: doublePrecision("monthly_profit"),
  assets: text("assets"),
  liabilities: text("liabilities"),
  reasonForSelling: text("reason_for_selling"),
  timeframe: text("timeframe"),
  training: text("training"),
  support: text("support"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Many-to-many relationship between listings and tags
 */
export const listingTags = pgTable(
  "listing_tags",
  {
    listingId: integer("listing_id")
      .notNull()
      .references(() => listings.id),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.listingId, t.tagId] }),
  }),
);

/**
 * Messages between users about listings
 */
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id")
    .notNull()
    .references(() => users.id),
  receiverId: integer("receiver_id")
    .notNull()
    .references(() => users.id),
  listingId: integer("listing_id").references(() => listings.id),
  contactId: integer("contact_id").references(() => contacts.id),
  content: text("content").notNull(),
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Documents attached to listings (business plans, financials, etc.)
 */
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  listingId: integer("listing_id").references(() => listings.id),
  name: text("name").notNull(),
  fileUrl: text("file_url").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

/**
 * KYC Documents table for user identity verification
 */
export const kycDocs = pgTable("kyc_docs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  documentType: text("document_type").notNull(), // passport, id, license, business_registration, etc.
  fileUrl: text("file_url").notNull(),
  fileName: text("file_name"),
  description: text("description"),
  status: text("status", { enum: kycStatusTypes }).default("pending"),
  rejectionReason: text("rejection_reason"),
  reviewedByAdminId: integer("reviewed_by_admin_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Moderation logs for tracking listing flagging and admin actions
 */
export const moderationLogs = pgTable("moderation_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  entityType: text("entity_type").notNull(), // 'listing', 'kyc', 'user', etc.
  entityId: integer("entity_id").notNull(), // ID of the entity being moderated
  listingId: integer("listing_id").references(() => listings.id), // For listing-specific logs (null for non-listing operations)
  action: text("action").notNull(), // 'approve', 'reject', 'flag', etc.
  reason: text("reason").notNull(),
  resolved: boolean("resolved").default(false),
  resolvedBy: integer("resolved_by").references(() => users.id),
  flaggedBy: integer("flagged_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * KYC table for user verification (existing table)
 */
export const kyc = pgTable("kyc", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .unique()
    .references(() => users.id),
  idNumber: text("id_number").notNull(),
  idType: text("id_type").notNull(), // passport, national ID, etc.
  idDocumentUrl: text("id_document_url").notNull(),
  addressProofUrl: text("address_proof_url"),
  businessLicenseUrl: text("business_license_url"),
  status: text("status", { enum: kycStatusTypes }).default("pending"),
  rejectionReason: text("rejection_reason"),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Settings table for storing platform configuration
 */
export const settingTypes = [
  "text",
  "image",
  "boolean",
  "email",
  "number",
  "url",
  "json",
] as const;
export const settingCategories = [
  "general",
  "theme",
  "contact",
  "seo",
  "social",
  "features",
  "security",
] as const;

export const settings = pgTable("settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  value: text("value").notNull().default(""), // Store file URLs or text, not the raw image data
  type: text("type", { enum: settingTypes }).notNull(),
  category: text("category", { enum: settingCategories }).default("general"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Success stories from users
 */
export const successStories = pgTable("success_stories", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  rating: integer("rating").notNull(), // 1-5 star rating
  company: text("company"),
  position: text("position"),
  imageUrl: text("image_url"), // User/company image
  status: text("status", { enum: successStoryStatusTypes }).default("pending"),
  featured: boolean("featured").default(false),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Saved listings for user favorites system
 */
export const savedListings = pgTable(
  "saved_listings",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    listingId: integer("listing_id")
      .notNull()
      .references(() => listings.id),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    // Unique constraint to prevent duplicate saves
    uniqueSave: primaryKey(table.userId, table.listingId),
  }),
);

/**
 * Contact requests between buyers and sellers
 */
export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  listingId: integer("listing_id")
    .notNull()
    .references(() => listings.id),
  buyerId: integer("buyer_id")
    .notNull()
    .references(() => users.id),
  sellerId: integer("seller_id")
    .notNull()
    .references(() => users.id),
  buyerName: text("buyer_name").notNull(),
  buyerEmail: text("buyer_email").notNull(),
  buyerPhone: text("buyer_phone"),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: text("status", { enum: ["pending", "responded", "closed"] }).default(
    "pending",
  ),
  sellerResponse: text("seller_response"),
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Define table relationships
export const usersRelations = relations(users, ({ one, many }) => ({
  listings: many(listings),
  messages: many(messages),
  documents: many(documents),
  kycDocs: many(kycDocs),
  successStories: many(successStories),
  otpCodes: many(otpCodes),
  passwordResetTokens: many(passwordResetTokens),
  onboarding: one(userOnboarding),
  savedListings: many(savedListings),
  sentContacts: many(contacts, { relationName: "sentContacts" }),
  receivedContacts: many(contacts, { relationName: "receivedContacts" }),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.userId],
    references: [users.id],
  }),
}));

export const userOnboardingRelations = relations(userOnboarding, ({ one }) => ({
  user: one(users, {
    fields: [userOnboarding.userId],
    references: [users.id],
  }),
}));

export const otpCodesRelations = relations(otpCodes, ({ one }) => ({
  user: one(users, {
    fields: [otpCodes.userId],
    references: [users.id],
  }),
}));

export const successStoriesRelations = relations(successStories, ({ one }) => ({
  user: one(users, {
    fields: [successStories.userId],
    references: [users.id],
  }),
}));

export const listingsRelations = relations(listings, ({ one, many }) => ({
  user: one(users, {
    fields: [listings.userId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [listings.categoryId],
    references: [categories.id],
  }),
  location: one(locations, {
    fields: [listings.locationId],
    references: [locations.id],
  }),
  tags: many(listingTags),
  documents: many(documents),
  moderationLogs: many(moderationLogs),
  savedByUsers: many(savedListings),
  contacts: many(contacts),
}));

export const savedListingsRelations = relations(savedListings, ({ one }) => ({
  user: one(users, {
    fields: [savedListings.userId],
    references: [users.id],
  }),
  listing: one(listings, {
    fields: [savedListings.listingId],
    references: [listings.id],
  }),
}));

export const contactsRelations = relations(contacts, ({ one }) => ({
  listing: one(listings, {
    fields: [contacts.listingId],
    references: [listings.id],
  }),
  buyer: one(users, {
    fields: [contacts.buyerId],
    references: [users.id],
  }),
  seller: one(users, {
    fields: [contacts.sellerId],
    references: [users.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  listings: many(listings),
}));

export const locationsRelations = relations(locations, ({ many }) => ({
  listings: many(listings),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  listingTags: many(listingTags),
}));

export const listingTagsRelations = relations(listingTags, ({ one }) => ({
  listing: one(listings, {
    fields: [listingTags.listingId],
    references: [listings.id],
  }),
  tag: one(tags, {
    fields: [listingTags.tagId],
    references: [tags.id],
  }),
}));

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  verified: true,
  originalRole: true, // This is only set for blocked users
  createdAt: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
});

export const insertLocationSchema = createInsertSchema(locations).omit({
  id: true,
  createdAt: true,
});

export const insertTagSchema = createInsertSchema(tags).omit({
  id: true,
  createdAt: true,
});

export const insertListingSchema = createInsertSchema(listings).omit({
  id: true,
  featured: true,
  verified: true,
  status: true, // Status is set automatically to "pending" when created
  createdAt: true,
  updatedAt: true,
});

export const insertListingTagSchema = createInsertSchema(listingTags);

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  read: true,
  createdAt: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  uploadedAt: true,
});

export const insertKycSchema = createInsertSchema(kyc).omit({
  id: true,
  status: true,
  rejectionReason: true,
  reviewedBy: true,
  reviewedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertKycDocSchema = createInsertSchema(kycDocs).omit({
  id: true,
  status: true,
  reviewedByAdminId: true,
  rejectionReason: true,
  createdAt: true,
  updatedAt: true,
});

export const insertModerationLogSchema = createInsertSchema(
  moderationLogs,
).omit({
  id: true,
  resolved: true,
  resolvedBy: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSettingSchema = createInsertSchema(settings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSuccessStorySchema = createInsertSchema(successStories).omit(
  {
    id: true,
    status: true,
    featured: true,
    reviewedBy: true,
    rejectionReason: true,
    createdAt: true,
    updatedAt: true,
  },
);

export const insertOtpCodeSchema = createInsertSchema(otpCodes).omit({
  id: true,
  verified: true,
  createdAt: true,
});

export const insertSavedListingSchema = createInsertSchema(savedListings).omit({
  id: true,
  createdAt: true,
});

export const insertNewsletterSubscriptionSchema = createInsertSchema(newsletterSubscriptions).omit({
  id: true,
  subscribedAt: true,
  unsubscribedAt: true,
  unsubscribeToken: true,
}).extend({
  email: z.string().email("Please enter a valid email address").min(1, "Email is required"),
});

// Settings update schema for bulk updates
export const updateSettingsSchema = z.array(
  z.object({
    key: z.string(),
    value: z.string(),
    type: z.enum(settingTypes),
  }),
);

// Types for frontend usage
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type Location = typeof locations.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;

export type Tag = typeof tags.$inferSelect;
export type InsertTag = z.infer<typeof insertTagSchema>;

export type Listing = typeof listings.$inferSelect & {
  tags?: Tag[];
};
export type InsertListing = z.infer<typeof insertListingSchema>;

export type ListingTag = typeof listingTags.$inferSelect;
export type InsertListingTag = z.infer<typeof insertListingTagSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

// MessageThread type for conversation list with user and listing info
export interface MessageThread {
  otherUser: {
    id: number;
    username: string;
    fullName: string;
    profileImageUrl: string | null;
  };
  lastMessage: Message;
  unreadCount: number;
  listing?: {
    id: number;
    title_en: string | null;
    title_ar: string | null;
  };
}

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

export type Kyc = typeof kyc.$inferSelect;
export type InsertKyc = z.infer<typeof insertKycSchema>;

export type KycDoc = typeof kycDocs.$inferSelect;
export type InsertKycDoc = z.infer<typeof insertKycDocSchema>;

export type ModerationLog = typeof moderationLogs.$inferSelect;
export type InsertModerationLog = z.infer<typeof insertModerationLogSchema>;

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type UpdateSettings = z.infer<typeof updateSettingsSchema>;

export type SuccessStory = typeof successStories.$inferSelect;
export type InsertSuccessStory = z.infer<typeof insertSuccessStorySchema>;

export type OtpCode = typeof otpCodes.$inferSelect;
export type InsertOtpCode = z.infer<typeof insertOtpCodeSchema>;

export type SavedListing = typeof savedListings.$inferSelect;
export type InsertSavedListing = z.infer<typeof insertSavedListingSchema>;

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  status: true,
  sellerResponse: true,
  respondedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  used: true,
  createdAt: true,
});

export const insertUserOnboardingSchema = createInsertSchema(userOnboarding).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;

export type UserOnboarding = typeof userOnboarding.$inferSelect;
export type InsertUserOnboarding = z.infer<typeof insertUserOnboardingSchema>;

export type NewsletterSubscription = typeof newsletterSubscriptions.$inferSelect;
export type InsertNewsletterSubscription = z.infer<typeof insertNewsletterSubscriptionSchema>;
export type Translation = typeof translations.$inferSelect;
export type InsertTranslation = z.infer<typeof insertTranslationSchema>;

