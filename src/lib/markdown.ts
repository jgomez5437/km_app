export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Extract #tags from text
export function extractTags(content: string): string[] {
  const matches = content.match(/(?:^|\s)#([a-zA-Z0-9_\-]+)/g);
  if (!matches) return [];
  return Array.from(
    new Set(matches.map((m) => m.trim().replace(/^#/, "").toLowerCase()))
  );
}


