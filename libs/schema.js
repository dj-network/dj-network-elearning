import {
  sqliteTable,
  text,
  integer,
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
  memberDiscountStudio: integer("member_discount_studio"),
  memberDiscountStudioPlus: integer("member_discount_studio_plus"),
  isPublished: integer("is_published", { mode: "boolean" }).default(true),
  price: integer("price"),
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
  isRestricted: integer("is_restricted", { mode: "boolean" }).default(false),
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

// ── User Access (download / view rights) ─────────────
export const userAccess = sqliteTable("user_access", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  productId: text("product_id"), // Temporaire pour débloquer la migration
  masterclassId: text("masterclass_id"), // Temporaire pour débloquer la migration
  elearningId: text("elearning_id").references(() => elearnings.id),
  grantedAt: integer("granted_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }), // null = permanent
  source: text("source"), // purchase | subscription | gift | admin
});

