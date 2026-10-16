import type { ImageSourcePropType } from 'react-native';

/**
 * Commissioned lesson artwork, keyed by "lessonId/slideId".
 *
 * To add a picture: save it as assets/lessons/<lessonId>/<slideId>.png
 * (or .jpg or .webp), then add a line here, for example:
 *   'how-labor-begins/welcome': require('../../assets/lessons/how-labor-begins/welcome.png'),
 * Slides with a picture drawn in code (src/components/LessonVisuals.tsx) show that
 * instead. Slides with neither show an "Artwork to come" box with the brief from
 * the lesson file. docs/media/production-list.csv lists every picture still needed.
 */
const ARTWORK: Record<string, ImageSourcePropType> = {
  // Trial set made with Gemini (Nano Banana) from the briefs; see docs/media/style-guide.md.
  'early-pregnancy-first-steps/welcome': require('../../assets/lessons/early-pregnancy-first-steps/welcome.jpg'),
  'early-pregnancy-first-steps/who-gives-care': require('../../assets/lessons/early-pregnancy-first-steps/who-gives-care.jpg'),
  'third-trimester-body/sleep-bathroom-breathing': require('../../assets/lessons/third-trimester-body/sleep-bathroom-breathing.jpg'),
  'getting-ready-bags-routes-car-seat/your-labor-bag': require('../../assets/lessons/getting-ready-bags-routes-car-seat/your-labor-bag.jpg'),
  'stages-of-labor/early-labor': require('../../assets/lessons/stages-of-labor/early-labor.jpg'),
};

export function artworkFor(lessonId: string, slideId: string): ImageSourcePropType | null {
  return ARTWORK[`${lessonId}/${slideId}`] ?? null;
}
