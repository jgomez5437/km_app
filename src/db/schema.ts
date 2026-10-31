import {
  pgTable,
  varchar,
  text,
  jsonb,
  boolean,
  bigint,
  timestamp,
  integer,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";

// 1. Users Table (Auth.js / NextAuth / Custom Auth compatible)
export const users = pgTable("users", {
  id: varchar("id", { length: 128 }).primaryKey(),
  name: text("name"),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 2. Accounts Table (OAuth credentials for GitHub, Google, etc.)
export const accounts = pgTable(
  "accounts",
  {
    userId: varchar("user_id", { length: 128 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
    index("idx_accounts_user_id").on(account.userId),
  ]
);

// 3. Sessions Table
export const sessions = pgTable("sessions", {
  sessionToken: varchar("session_token", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 128 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
});

// 4. Vaults Table (Workspaces / Separate Knowledge Bases per user)
export const vaults = pgTable(
  "vaults",
  {
    id: varchar("id", { length: 128 }).primaryKey(),
    userId: varchar("user_id", { length: 128 }).references(() => users.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull().default("Personal Vault"),
    description: text("description"),
    isDefault: boolean("is_default").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("idx_vaults_user_id").on(table.userId)]
);

// 5. Notes Table
export const notes = pgTable(
  "notes",
  {
    id: varchar("id", { length: 128 }).primaryKey(),
    vaultId: varchar("vault_id", { length: 128 }).references(() => vaults.id, {
      onDelete: "cascade",
    }),
    userId: varchar("user_id", { length: 128 }).references(() => users.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    content: text("content").notNull(),
    folder: text("folder"),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    links: jsonb("links").$type<string[]>().notNull().default([]),
    pinned: boolean("pinned").default(false),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
    syncedAt: timestamp("synced_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_notes_user_id").on(table.userId),
    index("idx_notes_vault_id").on(table.vaultId),
    index("idx_notes_updated_at").on(table.updatedAt),
  ]
);

export type User = typeof users.$inferSelect;
export type Vault = typeof vaults.$inferSelect;
export type DBNote = typeof notes.$inferSelect;
export type NewDBNote = typeof notes.$inferInsert;
