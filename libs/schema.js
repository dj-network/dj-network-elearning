import {
  sqliteTable,
  text,
  integer,
  real,
  primaryKey,
} from "drizzle-orm/sqlite-core";

// ── Users ────────────────────────────────────────────
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", { mode: "timestamp_ms" }),
  image: text("image"),
  password: text("password"), // Hash for Credentials Auth
  role: text("role").default("user"), // user | premium | formateur | admin
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
});

// ── Auths (NextAuth.js standard tables) ─────────────
export const accounts = sqliteTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  ],
);

export const sessions = sqliteTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
});

export const verificationTokens = sqliteTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
  },
  (verificationToken) => [
    primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  ],
);

// ── Categories ───────────────────────────────────────
export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  icon: text("icon"), // Material icon name
  description: text("description"),
  sortOrder: integer("sort_order").default(0),
});

// ── Products (samples, templates, packs, PDFs) ──────
export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  categoryId: text("category_id").references(() => categories.id),
  imageUrl: text("image_url"),
  demoAudioUrl: text("demo_audio_url"),
  fileUrl: text("file_url"),
  fileSize: text("file_size"),
  sortOrder: integer("sort_order").default(0),
  price: real("price"), // null = free
  currency: text("currency").default("EUR"),
  compatibility: text("compatibility"), // JSON string: ["Ableton", "Rekordbox"]
  highlights: text("highlights"), // JSON string: ["Royalty-free", "24-bit", ...]
  packContents: text("pack_contents"), // JSON string: [{label, value}]
  tags: text("tags"), // JSON string
  version: text("version"),
  author: text("author"),
  accessModel: text("access_model").default("purchase_only"),
  accessTier: text("access_tier").default("none"),
  memberDiscountStudio: real("member_discount_studio"),
  memberDiscountStudioPlus: real("member_discount_studio_plus"),
  isPublished: integer("is_published", { mode: "boolean" }).default(true),
  isFeatured: integer("is_featured", { mode: "boolean" }).default(false),
  stripeProductId: text("stripe_product_id"),
  creditCost: integer("credit_cost"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

// ── Masterclasses ────────────────────────────────────
export const masterclasses = sqliteTable("masterclasses", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  instructor: text("instructor").notNull(),
  imageUrl: text("image_url"),
  duration: text("duration"), // e.g. "12h 45m"
  level: text("level"), // Débutant | Intermédiaire | Avancé | Expert
  category: text("category"), // Production | Technique DJ | Mixage | Théorie
  tags: text("tags"), // JSON: ["Mixage", "Vinyl", ...]
  badges: text("badges"), // JSON: ["Vidéo on demand", "Certificat", ...]
  chapters: text("chapters"), // JSON: [{title, start}]
  highlights: text("highlights"), // JSON: ["Point 1", "Point 2", ...]
  downloads: text("downloads"), // JSON: [{title, url}]
  softwares: text("softwares"), // JSON: [{name, url, logoUrl}]
  links: text("links"), // JSON: [{title, url}]
  sortOrder: integer("sort_order").default(0),
  accessModel: text("access_model").default("purchase_only"),
  accessTier: text("access_tier").default("none"),
  memberDiscountStudio: real("member_discount_studio"),
  memberDiscountStudioPlus: real("member_discount_studio_plus"),
  isPublished: integer("is_published", { mode: "boolean" }).default(true),
  price: real("price"), // null = included in premium
  isPremium: integer("is_premium", { mode: "boolean" }).default(true),
  isFeatured: integer("is_featured", { mode: "boolean" }).default(false),
  stripeProductId: text("stripe_product_id"),
  creditCost: integer("credit_cost"),
  videoUrl: text("video_url"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// ── E-learning (formations LMS) ───────────────────────
export const elearnings = sqliteTable("elearnings", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  instructor: text("instructor").notNull(),
  imageUrl: text("image_url"),
  duration: text("duration"),
  level: text("level"),
  category: text("category"),
  tags: text("tags"), // JSON: ["M.A.O", "Business", ...]
  badges: text("badges"), // JSON: ["Vidéo on demand", "Certificat", ...]
  sortOrder: integer("sort_order").default(0),
  accessModel: text("access_model").default("purchase_only"),
  accessTier: text("access_tier").default("none"),
  memberDiscountStudio: real("member_discount_studio"),
  memberDiscountStudioPlus: real("member_discount_studio_plus"),
  isPublished: integer("is_published", { mode: "boolean" }).default(true),
  price: real("price"),
  isPremium: integer("is_premium", { mode: "boolean" }).default(true),
  isFeatured: integer("is_featured", { mode: "boolean" }).default(false),
  stripeProductId: text("stripe_product_id"),
  videoUrl: text("video_url"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// ── Courses (E-learning modules) ─────────────────────
export const courses = sqliteTable("courses", {
  id: text("id").primaryKey(),
  elearningId: text("elearning_id").references(() => elearnings.id),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").default(0),
});

// ── Lessons ──────────────────────────────────────────
export const lessons = sqliteTable("lessons", {
  id: text("id").primaryKey(),
  courseId: text("course_id").references(() => courses.id),
  title: text("title").notNull(),
  description: text("description"),
  videoUrl: text("video_url"),
  chapters: text("chapters"), // JSON: [{title, start}]
  duration: text("duration"), // e.g. "18:30"
  sortOrder: integer("sort_order").default(0),
  resources: text("resources"), // JSON: [{name, url, type, size}]
});

// ── Purchases ────────────────────────────────────────
export const purchases = sqliteTable("purchases", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  productId: text("product_id"),
  masterclassId: text("masterclass_id"),
  price: real("price").notNull(),
  currency: text("currency").default("EUR"),
  status: text("status").default("completed"), // pending | completed | refunded
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// ── Progress (E-learning lesson completion) ──────────
export const progress = sqliteTable("progress", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  lessonId: text("lesson_id").references(() => lessons.id),
  completed: integer("completed", { mode: "boolean" }).default(false),
  progressPercent: integer("progress_percent").default(0),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

// ── Favorites ────────────────────────────────────────
export const favorites = sqliteTable("favorites", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  productId: text("product_id"),
  masterclassId: text("masterclass_id"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const subscriptionPlans = sqliteTable("subscription_plans", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  priceMonthly: real("price_monthly"),
  priceYearly: real("price_yearly"),
  monthlyCredits: integer("monthly_credits").default(0),
  yearlyCredits: integer("yearly_credits").default(0),
  active: integer("active", { mode: "boolean" }).default(true),
});

// ── Subscriptions ────────────────────────────────────
export const subscriptions = sqliteTable("subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  plan: text("plan").notNull(), // free | premium | pro
  planCode: text("plan_code"),
  status: text("status").default("active"), // active | canceled | expired
  startDate: integer("start_date", { mode: "timestamp" }).notNull(),
  endDate: integer("end_date", { mode: "timestamp" }),
  stripePriceId: text("stripe_price_id"),
  creditsBalance: integer("credits_balance").default(0),
  creditsResetAt: integer("credits_reset_at", { mode: "timestamp" }),
  cancelAtPeriodEnd: integer("cancel_at_period_end", { mode: "boolean" }).default(false),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
});

export const creditTransactions = sqliteTable("credit_transactions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  subscriptionId: text("subscription_id").references(() => subscriptions.id, {
    onDelete: "set null",
  }),
  amount: integer("amount").notNull(),
  reason: text("reason").notNull(),
  itemType: text("item_type"),
  itemId: text("item_id"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// ── Orders ───────────────────────────────────────────
export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  totalPrice: real("total_price").notNull(),
  currency: text("currency").default("EUR"),
  status: text("status").default("pending"), // pending | completed | refunded
  stripePaymentId: text("stripe_payment_id"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
});

// ── Order Items ──────────────────────────────────────
export const orderItems = sqliteTable("order_items", {
  id: text("id").primaryKey(),
  orderId: text("order_id").references(() => orders.id, {
    onDelete: "cascade",
  }),
  productId: text("product_id").references(() => products.id),
  masterclassId: text("masterclass_id").references(() => masterclasses.id),
  elearningId: text("elearning_id").references(() => elearnings.id),
  price: real("price").notNull(),
  currency: text("currency").default("EUR"),
});

// ── User Access (download / view rights) ─────────────
export const userAccess = sqliteTable("user_access", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  productId: text("product_id").references(() => products.id),
  masterclassId: text("masterclass_id").references(() => masterclasses.id),
  elearningId: text("elearning_id").references(() => elearnings.id),
  grantedAt: integer("granted_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }), // null = permanent
  source: text("source"), // purchase | subscription | gift | admin
});
