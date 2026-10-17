/**
 * Plain helpers shared by the app and scripts/make-narration.mjs, so the
 * recorded narration and the captions split text the same way.
 * No imports, so plain Node can run this file.
 */

/** Splits narration into sentences so captions can show one at a time. */
export function splitSentences(text: string): string[] {
  return (text.match(/[^.!?]+[.!?]+["'”’]?\s*/g) ?? [text]).map((s) => s.trim()).filter(Boolean);
}

/** Short fingerprint of a narration script, to tell whether a recording still matches it. */
export function textFingerprint(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}
