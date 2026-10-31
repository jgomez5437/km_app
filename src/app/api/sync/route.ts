import { NextResponse } from "next/server";
import { getDb, isDatabaseConfigured } from "@/db";
import { notes } from "@/db/schema";
import { sql, desc } from "drizzle-orm";
import { Note } from "@/types/vault";

export async function POST(req: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({
      success: true,
      isCloud: false,
      message: "Running in local-only mode (DATABASE_URL not set).",
    });
  }

  try {
    const body = await req.json();
    const clientNotes: Note[] = body.notes || [];
    const db = getDb();
    if (!db) throw new Error("Database client unavailable");

    // Upsert each note from client
    for (const note of clientNotes) {
      await db
        .insert(notes)
        .values({
          id: note.id,
          title: note.title,
          content: note.content,
          folder: note.folder || null,
          tags: note.tags || [],
          links: note.links || [],
          pinned: Boolean(note.pinned),
          createdAt: note.createdAt || Date.now(),
          updatedAt: note.updatedAt || Date.now(),
        })
        .onConflictDoUpdate({
          target: notes.id,
          set: {
            title: sql`excluded.title`,
            content: sql`excluded.content`,
            folder: sql`excluded.folder`,
            tags: sql`excluded.tags`,
            links: sql`excluded.links`,
            pinned: sql`excluded.pinned`,
            updatedAt: sql`excluded.updated_at`,
            syncedAt: sql`NOW()`,
          },
          where: sql`excluded.updated_at > ${notes.updatedAt}`,
        });
    }

    // Return the latest consolidated notes from Neon
    const masterNotes = await db
      .select()
      .from(notes)
      .orderBy(desc(notes.updatedAt));

    const formattedNotes: Note[] = masterNotes.map((n) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      folder: n.folder || undefined,
      tags: (n.tags as string[]) || [],
      links: (n.links as string[]) || [],
      pinned: Boolean(n.pinned),
      createdAt: Number(n.createdAt),
      updatedAt: Number(n.updatedAt),
    }));

    return NextResponse.json({
      success: true,
      isCloud: true,
      notes: formattedNotes,
      syncedCount: clientNotes.length,
    });
  } catch (error: any) {
    console.error("Batch sync error:", error);
    return NextResponse.json(
      { error: "Sync failed", details: error.message },
      { status: 500 }
    );
  }
}
