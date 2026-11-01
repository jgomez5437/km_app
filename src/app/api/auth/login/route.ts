import { NextResponse } from "next/server";
import { getDb, isDatabaseConfigured } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST(req: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Database not configured. Cannot log in." },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const db = getDb();
    if (!db) throw new Error("Database client unavailable");

    // Query user
    const foundUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        passwordHash: users.passwordHash,
      })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    const user = foundUsers[0];

    // Timing attack defense: perform dummy comparison if user not found
    if (!user || !user.passwordHash) {
      await bcrypt.compare(
        password,
        "$2a$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuv"
      );
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // Create session token
    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name || undefined,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || user.email.split("@")[0],
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
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Login failed", details: error.message },
      { status: 500 }
    );
  }
}
