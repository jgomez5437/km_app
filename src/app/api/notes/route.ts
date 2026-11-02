import { NextResponse } from "next/server";
import { getDb, isDatabaseConfigured } from "@/db";
import { notes } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({
      configured: false,
      notes: [],
      message: "DATABASE_URL not configured. Running in offline/local-first mode.",
    });
  }

  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({
        configured: true,
        authenticated: false,
        notes: [],
      });
    }

    const db = getDb();
    if (!db) {
      return NextResponse.json({ configured: false, notes: [] });
    }

    const userNotes = await db
      .select()
      .from(notes)
      .where(eq(notes.userId, session.userId))
      .orderBy(desc(notes.updatedAt));

    return NextResponse.json({
      configured: true,
      authenticated: true,
      notes: userNotes,
    });
  } catch (error: unknown) {
    console.error("Failed to query notes from Neon:", error);
    const details = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch notes", details },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 }
    );
  }

  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const db = getDb();
    if (!db) throw new Error("Database client unavailable");

    const inserted = await db
      .insert(notes)
      .values({
        id: body.id,
        userId: session.userId,
        title: body.title,
        content: body.content,
        folderId: body.folderId || null,
        parentId: body.parentId || null,
        tags: body.tags || [],
        pinned: Boolean(body.pinned),
        createdAt: body.createdAt || Date.now(),
        updatedAt: body.updatedAt || Date.now(),
      })
      .returning();

    return NextResponse.json({ success: true, note: inserted[0] });
  } catch (error: unknown) {
    console.error("Failed to insert note into Neon:", error);
    const details = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to create note", details },
      { status: 500 }
    );
  }
}
