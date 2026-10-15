/**
 * Commissioned lesson videos, keyed by "lessonId/slideId".
 *
 * To add a video: save it as assets/lessons/<lessonId>/<slideId>.mp4, then add
 * a line here, for example:
 *   'stages-of-labor/dilation-video': require('../../assets/lessons/stages-of-labor/dilation-video.mp4'),
 * Video slides without an entry show a "Video to come" box with the brief from
 * the lesson file. docs/media/production-list.csv lists every video still needed.
 */
const VIDEOS: Record<string, number> = {};

export function videoFor(lessonId: string, slideId: string): number | null {
  return VIDEOS[`${lessonId}/${slideId}`] ?? null;
}
