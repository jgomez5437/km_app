import {
  pgTable,
  varchar,
  text,
  jsonb,
  boolean,
  bigint,
  timestamp,
} from "drizzle-orm/pg-core";

export const notes = pgTable("notes", {
  id: varchar("id", { length: 128 }).primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  folder: text("folder"),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  links: jsonb("links").$type<string[]>().notNull().default([]),
  pinned: boolean("pinned").default(false),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  syncedAt: timestamp("synced_at").defaultNow(),
});

export type DBNote = typeof notes.$inferSelect;
export type NewDBNote = typeof notes.$inferInsert;
