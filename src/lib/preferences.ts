export type ReadingFont = "sans" | "serif";

const PREFS_FONT_KEY = "astro_pref_reading_font";

export function loadReadingFont(): ReadingFont {
  if (typeof window === "undefined") return "sans";
  try {
    const val = localStorage.getItem(PREFS_FONT_KEY);
    return val === "serif" ? "serif" : "sans";
  } catch {
    return "sans";
  }
}

export function saveReadingFont(font: ReadingFont): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFS_FONT_KEY, font);
    window.dispatchEvent(new CustomEvent("astro_pref_font_changed", { detail: font }));
  } catch {
    // ignore
  }
}
