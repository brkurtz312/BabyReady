import type { ImageSourcePropType } from 'react-native';

/**
 * Commissioned lesson artwork, keyed by "lessonId/slideId".
 *
 * To add a picture: save it as assets/lessons/<lessonId>/<slideId>.png
 * (or .webp), then add a line here, for example:
 *   'how-labor-begins/welcome': require('../../assets/lessons/how-labor-begins/welcome.png'),
 * Slides without an entry show their drawn picture (src/components/LessonVisuals.tsx)
 * or an "Artwork to come" box with the brief from the lesson file.
 */
const ARTWORK: Record<string, ImageSourcePropType> = {};

export function artworkFor(lessonId: string, slideId: string): ImageSourcePropType | null {
  return ARTWORK[`${lessonId}/${slideId}`] ?? null;
}
