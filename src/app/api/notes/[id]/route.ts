import { NextResponse } from "next/server";
import { getDb, isDatabaseConfigured } from "@/db";
import { notes } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: Params) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const db = getDb();
    if (!db) throw new Error("Database client unavailable");

    const condition = and(eq(notes.id, id), eq(notes.userId, session.userId));

    const found = await db.select().from(notes).where(condition).limit(1);
    if (found.length === 0) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    return NextResponse.json({ note: found[0] });
  } catch (error: unknown) {
    const details = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch note", details },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request, { params }: Params) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const db = getDb();
    if (!db) throw new Error("Database client unavailable");

    const condition = and(eq(notes.id, id), eq(notes.userId, session.userId));

    const updated = await db
      .update(notes)
      .set({
        title: body.title,
        content: body.content,
        folderId: body.folderId !== undefined ? body.folderId : undefined,
        parentId: body.parentId !== undefined ? body.parentId : undefined,
        tags: body.tags !== undefined ? body.tags : undefined,
        pinned: body.pinned !== undefined ? Boolean(body.pinned) : undefined,
        updatedAt: body.updatedAt || Date.now(),
        syncedAt: new Date(),
      })
      .where(condition)
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ error: "Note not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ success: true, note: updated[0] });
  } catch (error: unknown) {
    const details = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to update note", details },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: Params) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const db = getDb();
    if (!db) throw new Error("Database client unavailable");

    const condition = and(eq(notes.id, id), eq(notes.userId, session.userId));

    await db.delete(notes).where(condition);

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: unknown) {
    const details = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to delete note", details },
      { status: 500 }
    );
  }
}

