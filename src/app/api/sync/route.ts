import { NextResponse } from "next/server";
import { getDb, isDatabaseConfigured } from "@/db";
import { notes, folders } from "@/db/schema";
import { sql, desc, eq } from "drizzle-orm";
import { Note, Folder } from "@/types/vault";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({
      success: true,
      isCloud: false,
      message: "Running in local-only mode (DATABASE_URL not set).",
    });
  }

  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({
        success: true,
        isCloud: false,
        message: "Unauthenticated. Sign in to enable cloud sync.",
      });
    }

    const userId = session.userId;
    const body = await req.json();
    const clientFolders: Folder[] = body.folders || [];
    const clientNotes: Note[] = body.notes || [];

    const db = getDb();
    if (!db) throw new Error("Database client unavailable");

    // 1. Upsert folders first (so note.folderId foreign keys succeed)
    for (const folder of clientFolders) {
      await db
        .insert(folders)
        .values({
          id: folder.id,
          userId,
          name: folder.name,
          color: folder.color || null,
          createdAt: folder.createdAt ? new Date(folder.createdAt) : new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: folders.id,
          set: {
            name: sql`excluded.name`,
            color: sql`excluded.color`,
            updatedAt: sql`NOW()`,
          },
        });
    }

    // 2. Upsert each note from client
    for (const note of clientNotes) {
      await db
        .insert(notes)
        .values({
          id: note.id,
          userId,
          title: note.title,
          content: note.content,
          folderId: note.folderId || null,
          parentId: note.parentId || null,
          tags: note.tags || [],
          pinned: Boolean(note.pinned),
          createdAt: note.createdAt || Date.now(),
          updatedAt: note.updatedAt || Date.now(),
        })
        .onConflictDoUpdate({
          target: notes.id,
          set: {
            title: sql`excluded.title`,
            content: sql`excluded.content`,
            folderId: sql`excluded.folder_id`,
            parentId: sql`excluded.parent_id`,
            tags: sql`excluded.tags`,
            pinned: sql`excluded.pinned`,
            updatedAt: sql`excluded.updated_at`,
            syncedAt: sql`NOW()`,
          },
          where: sql`excluded.updated_at > ${notes.updatedAt}`,
        });
    }

    // 3. Return consolidated user's folders from Neon
    const masterFolders = await db
      .select()
      .from(folders)
      .where(eq(folders.userId, userId))
      .orderBy(desc(folders.createdAt));

    const formattedFolders: Folder[] = masterFolders.map((f) => ({
      id: f.id,
      name: f.name,
      color: f.color || undefined,
      createdAt: f.createdAt ? new Date(f.createdAt).getTime() : Date.now(),
    }));

    // 4. Return consolidated user's notes from Neon
    const masterNotes = await db
      .select()
      .from(notes)
      .where(eq(notes.userId, userId))
      .orderBy(desc(notes.updatedAt));

    const formattedNotes: Note[] = masterNotes.map((n) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      folderId: n.folderId || undefined,
      parentId: n.parentId || undefined,
      tags: (n.tags as string[]) || [],
      pinned: Boolean(n.pinned),
      createdAt: Number(n.createdAt),
      updatedAt: Number(n.updatedAt),
    }));

    return NextResponse.json({
      success: true,
      isCloud: true,
      user: {
        id: session.userId,
        email: session.email,
        name: session.name || session.email.split("@")[0],
      },
      notes: formattedNotes,
      folders: formattedFolders,
      syncedNotesCount: clientNotes.length,
      syncedFoldersCount: clientFolders.length,
    });
  } catch (error: any) {
    console.error("Batch sync error:", error);
    return NextResponse.json(
      { error: "Sync failed", details: error.message },
      { status: 500 }
    );
  }
}
