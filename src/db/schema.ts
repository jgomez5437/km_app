import {
  pgTable,
  varchar,
  text,
  jsonb,
  boolean,
  bigint,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

// 1. Users Table
export const users = pgTable("users", {
  id: varchar("id", { length: 128 }).primaryKey(),
  name: text("name"),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash"),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 2. Vaults Table
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

// 5. Folders Table (Organizational categories within vault)
export const folders = pgTable(
  "folders",
  {
    id: varchar("id", { length: 128 }).primaryKey(),
    userId: varchar("user_id", { length: 128 }).references(() => users.id, {
      onDelete: "cascade",
    }),
    vaultId: varchar("vault_id", { length: 128 }).references(() => vaults.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    color: text("color"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_folders_user_id").on(table.userId),
    index("idx_folders_vault_id").on(table.vaultId),
  ]
);

// 6. Notes Table (with Folders and Nested Subpages)
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
    folderId: varchar("folder_id", { length: 128 }).references(() => folders.id, {
      onDelete: "set null",
    }),
    parentId: varchar("parent_id", { length: 128 }),
    title: text("title").notNull(),
    content: text("content").notNull(),
    tags: jsonb("tags").$type<string[]>().default([]),
    pinned: boolean("pinned").default(false),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
    syncedAt: timestamp("synced_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_notes_user_id").on(table.userId),
    index("idx_notes_vault_id").on(table.vaultId),
    index("idx_notes_folder_id").on(table.folderId),
    index("idx_notes_parent_id").on(table.parentId),
    index("idx_notes_updated_at").on(table.updatedAt),
  ]
);

export type User = typeof users.$inferSelect;
export type Vault = typeof vaults.$inferSelect;
export type DBFolder = typeof folders.$inferSelect;
export type DBNote = typeof notes.$inferSelect;
export type NewDBNote = typeof notes.$inferInsert;
