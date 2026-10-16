/**
 * Commissioned lesson videos, keyed by "lessonId/slideId".
 *
 * To add a video: save it as assets/lessons/<lessonId>/<slideId>.mp4, then add
 * a line here, for example:
 *   'pushing-and-birth/pushing-video': require('../../assets/lessons/pushing-and-birth/pushing-video.mp4'),
 * Video slides without an entry show their drawn animation (src/components/LessonAnimations.tsx)
 * or a "Video to come" box with the brief from the lesson file.
 * docs/media/production-list.csv lists every video still needed.
 */
const VIDEOS: Record<string, number> = {
  // A screen recording of the lesson player, made with scripts/record-player-tour.
  'welcome-how-this-class-works/player-tour-video': require('../../assets/lessons/welcome-how-this-class-works/player-tour-video.mp4'),
};

export function videoFor(lessonId: string, slideId: string): number | null {
  return VIDEOS[`${lessonId}/${slideId}`] ?? null;
}
