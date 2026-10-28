// What an editor is writing, kept in this browser so nothing written is lost (R-02.12, T-3022):
// a lost connection, a reload or a closed tab. One draft per version, shared by the Chart editor
// and the visual editor; Save and signing out forget it. It never leaves the browser.

/** A chart being written, as it would be saved. */
export interface Draft {
  /** The chart's text, as Save would send it. */
  content: string;
  /** The revision it was written on. */
  base: string;
  /** When it was written, in milliseconds since 1970. */
  at: number;
}

const PREFIX = "chartdown:draft:";
const key = (versionId: string) => `${PREFIX}${versionId}`;

const isDraft = (value: unknown): value is Draft =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as Draft).content === "string" &&
  typeof (value as Draft).base === "string" &&
  typeof (value as Draft).at === "number";

/** The draft kept for a version, if any. Storage can be missing or blocked: never required. */
export function readDraft(versionId: string): Draft | null {
  try {
    const stored = window.localStorage.getItem(key(versionId));
    if (stored === null) return null;
    const draft: unknown = JSON.parse(stored);
    return isDraft(draft) ? draft : null;
  } catch {
    return null;
  }
}

export function writeDraft(versionId: string, draft: Draft): void {
  try {
    window.localStorage.setItem(key(versionId), JSON.stringify(draft));
  } catch {
    // Without storage nothing is kept; Save still works.
  }
}

export function forgetDraft(versionId: string): void {
  try {
    window.localStorage.removeItem(key(versionId));
  } catch {
    // Nothing to forget.
  }
}

/** Signing out forgets every draft, so a shared device keeps no one's chart. */
export function forgetAllDrafts(): void {
  try {
    const keys: string[] = [];
    for (let index = 0; index < window.localStorage.length; index++) {
      const name = window.localStorage.key(index);
      if (name?.startsWith(PREFIX)) keys.push(name);
    }
    for (const name of keys) window.localStorage.removeItem(name);
  } catch {
    // Nothing to forget.
  }
}

/** A draft worth offering: written, and not what the editor opened with. */
export const isOffered = (draft: Draft | null, opened: string): draft is Draft =>
  draft !== null && draft.content !== opened;
