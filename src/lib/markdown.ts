import { Note } from "@/types/vault";

export interface BacklinkItem {
  noteId: string;
  noteTitle: string;
  contextSnippet: string;
}

// Extract [[wikilinks]] from text
export function extractWikilinks(content: string): string[] {
  const matches = content.match(/\[\[(.*?)\]\]/g);
  if (!matches) return [];
  return Array.from(
    new Set(
      matches.map((match) => {
        // Handle alias: [[Target Note|Display Text]]
        const raw = match.slice(2, -2).trim();
        const parts = raw.split("|");
        return parts[0].trim();
      })
    )
  );
}

// Extract #tags from text
export function extractTags(content: string): string[] {
  const matches = content.match(/(?:^|\s)#([a-zA-Z0-9_\-]+)/g);
  if (!matches) return [];
  return Array.from(
    new Set(matches.map((m) => m.trim().replace(/^#/, "").toLowerCase()))
  );
}

// Find all notes that link back to a specific target note
export function getIncomingBacklinks(
  targetNote: Note,
  allNotes: Note[]
): BacklinkItem[] {
  const backlinks: BacklinkItem[] = [];

  for (const note of allNotes) {
    if (note.id === targetNote.id) continue;

    const lowerTarget = targetNote.title.toLowerCase();
    const links = extractWikilinks(note.content);
    const hasLink = links.some((l) => l.toLowerCase() === lowerTarget);

    if (hasLink) {
      // Find a snippet around the match
      const regex = new RegExp(`\\[\\[${targetNote.title}(?:\\|[^\\]]+)?\\]\\]`, "i");
      const matchIndex = note.content.search(regex);
      let snippet = "";
      if (matchIndex !== -1) {
        const start = Math.max(0, matchIndex - 40);
        const end = Math.min(note.content.length, matchIndex + 70);
        snippet = (start > 0 ? "..." : "") + note.content.slice(start, end).replace(/\n/g, " ") + (end < note.content.length ? "..." : "");
      }

      backlinks.push({
        noteId: note.id,
        noteTitle: note.title,
        contextSnippet: snippet || `Referenced in ${note.title}`,
      });
    }
  }

  return backlinks;
}
