import type { ImageSourcePropType } from 'react-native';

/**
 * Commissioned lesson artwork, keyed by "lessonId/slideId".
 *
 * To add a picture: save it as assets/lessons/<lessonId>/<slideId>.png
 * (or .webp), then add a line here, for example:
 *   'how-labor-begins/welcome': require('../../assets/lessons/how-labor-begins/welcome.png'),
 * Slides with a picture drawn in code (src/components/LessonVisuals.tsx) show that
 * instead. Slides with neither show an "Artwork to come" box with the brief from
 * the lesson file. docs/media/production-list.csv lists every picture still needed.
 */
const ARTWORK: Record<string, ImageSourcePropType> = {};

export function artworkFor(lessonId: string, slideId: string): ImageSourcePropType | null {
  return ARTWORK[`${lessonId}/${slideId}`] ?? null;
}
