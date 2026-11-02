import { NextResponse } from "next/server";
import { getDb, isDatabaseConfigured } from "@/db";
import { notes, folders } from "@/db/schema";
import { sql, desc, eq, and, inArray } from "drizzle-orm";
import { Note, Folder } from "@/types/vault";
import { getSessionUser } from "@/lib/auth";
import { extractTags } from "@/lib/markdown";

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
    const clientFolders: Folder[] = Array.isArray(body.folders) ? body.folders : [];
    const clientNotes: Note[] = Array.isArray(body.notes) ? body.notes : [];
    const deletedNoteIds: string[] = Array.isArray(body.deletedNoteIds)
      ? body.deletedNoteIds.filter((id: unknown): id is string => typeof id === "string")
      : [];
    const deletedFolderIds: string[] = Array.isArray(body.deletedFolderIds)
      ? body.deletedFolderIds.filter((id: unknown): id is string => typeof id === "string")
      : [];

    const db = getDb();
    if (!db) throw new Error("Database client unavailable");

    // 1. Process explicit deletions scoped strictly to this user
    if (deletedNoteIds.length > 0) {
      await db
        .delete(notes)
        .where(and(eq(notes.userId, userId), inArray(notes.id, deletedNoteIds)));
    }

    if (deletedFolderIds.length > 0) {
      await db
        .update(notes)
        .set({ folderId: null, syncedAt: new Date() })
        .where(
          and(eq(notes.userId, userId), inArray(notes.folderId, deletedFolderIds))
        );
      await db
        .delete(folders)
        .where(
          and(eq(folders.userId, userId), inArray(folders.id, deletedFolderIds))
        );
    }

    // 2. Detect and remap any folder IDs that collide with another user's rows
    const folderIdMap = new Map<string, string>();
    const activeClientFolders = clientFolders.filter(
      (f) => f && typeof f.id === "string" && !deletedFolderIds.includes(f.id)
    );

    if (activeClientFolders.length > 0) {
      const incomingFolderIds = activeClientFolders.map((f) => f.id);
      const existingFolders = await db
        .select({ id: folders.id, userId: folders.userId })
        .from(folders)
        .where(inArray(folders.id, incomingFolderIds));

      const foreignFolderIds = new Set(
        existingFolders
          .filter((f) => f.userId !== userId)
          .map((f) => f.id)
      );

      for (const folder of activeClientFolders) {
        const safeFolderId = foreignFolderIds.has(folder.id)
          ? `${folder.id}_${userId}`
          : folder.id;
        if (safeFolderId !== folder.id) {
          folderIdMap.set(folder.id, safeFolderId);
        }

        await db
          .insert(folders)
          .values({
            id: safeFolderId,
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
            where: eq(folders.userId, userId),
          });
      }
    }

    // 3. Fetch consolidated user's folders from Neon so we can validate note.folderId FKs
    const masterFolders = await db
      .select()
      .from(folders)
      .where(eq(folders.userId, userId))
      .orderBy(desc(folders.createdAt));

    const validUserFolderIds = new Set(masterFolders.map((f) => f.id));

    // 4. Detect and remap any note IDs that collide with another user's rows
    const noteIdMap = new Map<string, string>();
    const activeClientNotes = clientNotes.filter(
      (n) => n && typeof n.id === "string" && !deletedNoteIds.includes(n.id)
    );

    if (activeClientNotes.length > 0) {
      const incomingNoteIds = activeClientNotes.map((n) => n.id);
      const existingNotes = await db
        .select({ id: notes.id, userId: notes.userId })
        .from(notes)
        .where(inArray(notes.id, incomingNoteIds));

      const foreignNoteIds = new Set(
        existingNotes
          .filter((n) => n.userId !== userId)
          .map((n) => n.id)
      );

      for (const note of activeClientNotes) {
        if (foreignNoteIds.has(note.id)) {
          noteIdMap.set(note.id, `${note.id}_${userId}`);
        }
      }

      for (const note of activeClientNotes) {
        const safeNoteId = noteIdMap.get(note.id) || note.id;
        const rawFolderId = note.folderId
          ? folderIdMap.get(note.folderId) || note.folderId
          : null;
        const safeFolderId =
          rawFolderId && validUserFolderIds.has(rawFolderId) ? rawFolderId : null;
        const safeParentId = note.parentId
          ? noteIdMap.get(note.parentId) || note.parentId
          : null;
        const computedTags =
          Array.isArray(note.tags) && note.tags.length > 0
            ? note.tags
            : extractTags(note.content || "");

        await db
          .insert(notes)
          .values({
            id: safeNoteId,
            userId,
            title: note.title || "Untitled Note",
            content: note.content ?? "",
            folderId: safeFolderId,
            parentId: safeParentId,
            tags: computedTags,
            pinned: Boolean(note.pinned),
            createdAt: Number(note.createdAt) || Date.now(),
            updatedAt: Number(note.updatedAt) || Date.now(),
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
            where: and(
              eq(notes.userId, userId),
              sql`excluded.updated_at >= ${notes.updatedAt}`
            ),
          });
      }
    }

    const formattedFolders: Folder[] = masterFolders.map((f) => ({
      id: f.id,
      name: f.name,
      color: f.color || undefined,
      createdAt: f.createdAt ? new Date(f.createdAt).getTime() : Date.now(),
    }));

    // 5. Return consolidated user's notes from Neon
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
      syncedNotesCount: activeClientNotes.length,
      syncedFoldersCount: activeClientFolders.length,
    });
  } catch (error: unknown) {
    console.error("Batch sync error:", error);
    const details = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Sync failed", details },
      { status: 500 }
    );
  }
}

