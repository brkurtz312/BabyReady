/**
 * Tidies the "From:" line the instructor ends each answer with, so it names
 * the slides the answer drew on. The model sometimes writes both "not covered
 * in this lesson" and a heading; when any heading is named, only the
 * headings are shown.
 *
 * This file has no imports so plain Node can run it in tests.
 */

export const NOT_COVERED = 'not covered in this lesson';

export function cleanFrom(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const headings = raw
    .replace(/not covered in (?:this|the) lesson/gi, ';')
    .split(';')
    .map((part) =>
      part
        .replace(/^[,.\s]+|[,.\s]+$/g, '')
        .replace(/^(?:but|and)\s+/i, '')
        .trim(),
    )
    .filter(Boolean);
  if (headings.length) return [...new Set(headings)].join('; ');
  return NOT_COVERED;
}
