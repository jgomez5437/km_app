import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is missing in .env.local");
  process.exit(1);
}

const sql = neon(databaseUrl);

async function runMigration() {
  console.log("Running migration on Neon PostgreSQL...");

  try {
    // 1. Ensure users table exists and has password_hash
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(128) PRIMARY KEY,
        name TEXT,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash TEXT,
        email_verified TIMESTAMPTZ,
        image TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    await sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
    `;
    console.log("✓ Users table verified with password_hash column");

    // 2. Ensure vaults table exists
    await sql`
      CREATE TABLE IF NOT EXISTS vaults (
        id VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(128) REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL DEFAULT 'Personal Vault',
        description TEXT,
        is_default BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;
    console.log("✓ Vaults table verified");

    // 3. Ensure folders table exists
    await sql`
      CREATE TABLE IF NOT EXISTS folders (
        id VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(128) REFERENCES users(id) ON DELETE CASCADE,
        vault_id VARCHAR(128) REFERENCES vaults(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        color TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;
    console.log("✓ Folders table verified");

    // 4. Ensure notes table exists and has folder_id, parent_id, user_id
    await sql`
      CREATE TABLE IF NOT EXISTS notes (
        id VARCHAR(128) PRIMARY KEY,
        vault_id VARCHAR(128) REFERENCES vaults(id) ON DELETE CASCADE,
        user_id VARCHAR(128) REFERENCES users(id) ON DELETE SET NULL,
        folder_id VARCHAR(128) REFERENCES folders(id) ON DELETE SET NULL,
        parent_id VARCHAR(128),
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        tags JSONB DEFAULT '[]'::jsonb,
        pinned BOOLEAN DEFAULT false,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        synced_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await sql`
      ALTER TABLE notes ADD COLUMN IF NOT EXISTS folder_id VARCHAR(128);
    `;
    await sql`
      ALTER TABLE notes ADD COLUMN IF NOT EXISTS parent_id VARCHAR(128);
    `;
    await sql`
      ALTER TABLE notes ADD COLUMN IF NOT EXISTS user_id VARCHAR(128);
    `;
    console.log("✓ Notes table verified with folder_id, parent_id, and user_id");

    // 5. Indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_notes_folder_id ON notes(folder_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_notes_parent_id ON notes(parent_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at);`;
    console.log("✓ Indexes created successfully");

    console.log("All migrations applied successfully!");
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  }
}

runMigration();
