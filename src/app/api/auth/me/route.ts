import { NextResponse } from "next/server";
import {
  getSessionUser,
  createSessionToken,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";
import { getDb, isDatabaseConfigured } from "@/db";
import { users } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ user: null, isCloudConfigured: false });
  }

  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ user: null, isCloudConfigured: true });
  }

  return NextResponse.json({
    user: {
      id: session.userId,
      email: session.email,
      name: session.name || session.email.split("@")[0],
    },
    isCloudConfigured: true,
  });
}

export async function PATCH(req: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 503 }
    );
  }

  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized. Please sign in." },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { name, email, currentPassword, newPassword } = body as {
      name?: string;
      email?: string;
      currentPassword?: string;
      newPassword?: string;
    };

    const db = getDb();
    if (!db) {
      throw new Error("Database client unavailable");
    }

    const existingRecords = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    const existingUser = existingRecords[0];
    if (!existingUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const nextEmail = email
      ? email.trim().toLowerCase()
      : existingUser.email;
    const nextName =
      typeof name === "string" && name.trim().length > 0
        ? name.trim()
        : existingUser.name || nextEmail.split("@")[0];

    if (!nextEmail.includes("@")) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    // If email changed, verify no other user owns it
    if (nextEmail !== existingUser.email) {
      const emailConflict = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.email, nextEmail), ne(users.id, session.userId)))
        .limit(1);

      if (emailConflict.length > 0) {
        return NextResponse.json(
          { error: "That email address is already in use by another account." },
          { status: 409 }
        );
      }
    }

    let nextPasswordHash = existingUser.passwordHash;
    if (newPassword && newPassword.trim().length > 0) {
      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: "New password must be at least 6 characters long." },
          { status: 400 }
        );
      }
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Current password is required to set a new password." },
          { status: 400 }
        );
      }
      if (existingUser.passwordHash) {
        const isCurrentValid = await bcrypt.compare(
          currentPassword,
          existingUser.passwordHash
        );
        if (!isCurrentValid) {
          return NextResponse.json(
            { error: "Current password is incorrect." },
            { status: 401 }
          );
        }
      }
      nextPasswordHash = await bcrypt.hash(newPassword, 10);
    }

    await db
      .update(users)
      .set({
        name: nextName,
        email: nextEmail,
        passwordHash: nextPasswordHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, session.userId));

    const updatedToken = await createSessionToken({
      userId: session.userId,
      email: nextEmail,
      name: nextName,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: session.userId,
        email: nextEmail,
        name: nextName,
      },
    });

    response.cookies.set(SESSION_COOKIE_NAME, updatedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (err: unknown) {
    console.error("Failed to update user profile:", err);
    const message =
      err instanceof Error ? err.message : "Failed to update profile.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
