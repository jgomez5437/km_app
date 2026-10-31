import { NextResponse } from "next/server";
import { getDb, isDatabaseConfigured } from "@/db";
import { notes } from "@/db/schema";
import { eq } from "drizzle-orm";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: Params) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const { id } = await params;
    const db = getDb();
    if (!db) throw new Error("Database client unavailable");

    const found = await db.select().from(notes).where(eq(notes.id, id)).limit(1);
    if (found.length === 0) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    return NextResponse.json({ note: found[0] });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to fetch note", details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request, { params }: Params) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const db = getDb();
    if (!db) throw new Error("Database client unavailable");

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
      .where(eq(notes.id, id))
      .returning();

    return NextResponse.json({ success: true, note: updated[0] });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to update note", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: Params) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const { id } = await params;
    const db = getDb();
    if (!db) throw new Error("Database client unavailable");

    await db.delete(notes).where(eq(notes.id, id));

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to delete note", details: error.message },
      { status: 500 }
    );
  }
}
