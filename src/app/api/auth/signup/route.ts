import { NextResponse } from "next/server";
import { getDb, isDatabaseConfigured } from "@/db";
import { users, vaults, folders, notes } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST(req: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Database not configured. Cannot create account." },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const { email, password, name } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const displayName = (name && typeof name === "string" ? name.trim() : "") || normalizedEmail.split("@")[0];

    const db = getDb();
    if (!db) throw new Error("Database client unavailable");

    // Check if user already exists
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Create user
    await db.insert(users).values({
      id: userId,
      email: normalizedEmail,
      name: displayName,
      passwordHash,
    });

    // Create default personal vault
    const vaultId = `vlt_${userId}`;
    await db.insert(vaults).values({
      id: vaultId,
      userId,
      name: "Personal Vault",
      isDefault: true,
    });

    // Seed default folders for the new user
    const folderGettingStarted = `fld_gs_${userId}`;
    const folderAI = `fld_ai_${userId}`;

    await db.insert(folders).values([
      {
        id: folderGettingStarted,
        userId,
        vaultId,
        name: "Getting Started",
        color: "#6366f1",
      },
      {
        id: folderAI,
        userId,
        vaultId,
        name: "AI & Research",
        color: "#38bdf8",
      },
    ]);

    // Seed welcoming note
    const welcomeNoteId = `note_welcome_${userId}`;
    const now = Date.now();
    await db.insert(notes).values({
      id: welcomeNoteId,
      userId,
      vaultId,
      folderId: folderGettingStarted,
      title: "Welcome to Astro",
      content:
        "Welcome to your personal Astro cloud vault!\n\n" +
        "### Key Capabilities:\n" +
        "- **Folders & Subpages**: Group your notes seamlessly with folders and subpage hierarchies.\n" +
        "- **AI Copilot**: Ask questions and synthesize insights from your personal notes.\n" +
        "- **End-to-End Cloud Sync**: Your notes and folders are backed up securely to Neon Serverless PostgreSQL.\n",
      tags: ["welcome", "getting-started"],
      pinned: true,
      createdAt: now,
      updatedAt: now,
    });

    // Create session token
    const token = await createSessionToken({
      userId,
      email: normalizedEmail,
      name: displayName,
    });

    // Create response with cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: normalizedEmail,
        name: displayName,
      },
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    });

    return response;
  } catch (error: unknown) {
    console.error("Sign up error:", error);
    const details = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Account creation failed", details },
      { status: 500 }
    );
  }
}
