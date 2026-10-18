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
  // Storyboard videos made with scripts/make-storyboard-videos.mjs from docs/media/storyboards.json.
  'birth-preferences/prenatal-visit-video': require('../../assets/lessons/birth-preferences/prenatal-visit-video.mp4'),
  'building-your-support-team/labor-rehearsal-video': require('../../assets/lessons/building-your-support-team/labor-rehearsal-video.mp4'),
  'care-team-and-birth-setting/tour-and-questions-video': require('../../assets/lessons/care-team-and-birth-setting/tour-and-questions-video.mp4'),
  'early-labor-at-home/early-labor-video': require('../../assets/lessons/early-labor-at-home/early-labor-video.mp4'),
  'early-pregnancy-first-steps/nausea-tips-video': require('../../assets/lessons/early-pregnancy-first-steps/nausea-tips-video.mp4'),
  'first-prenatal-visit/visit-prep-video': require('../../assets/lessons/first-prenatal-visit/visit-prep-video.mp4'),
  'first-trimester-common-changes/calling-video': require('../../assets/lessons/first-trimester-common-changes/calling-video.mp4'),
  'getting-ready-bags-routes-car-seat/harness-check-video': require('../../assets/lessons/getting-ready-bags-routes-car-seat/harness-check-video.mp4'),
  'how-labor-begins/timing-contractions-video': require('../../assets/lessons/how-labor-begins/timing-contractions-video.mp4'),
  'placenta-and-first-hour/golden-hour-video': require('../../assets/lessons/placenta-and-first-hour/golden-hour-video.mp4'),
  'pushing-and-birth/pushing-video': require('../../assets/lessons/pushing-and-birth/pushing-video.mp4'),
  'third-trimester-body/side-sleeping-video': require('../../assets/lessons/third-trimester-body/side-sleeping-video.mp4'),
  'when-to-contact-your-care-team/practice-call-video': require('../../assets/lessons/when-to-contact-your-care-team/practice-call-video.mp4'),
  'postpartum-warning-signs/speaking-up-video': require('../../assets/lessons/postpartum-warning-signs/speaking-up-video.mp4'),
  'when-to-call-about-your-baby/calming-video': require('../../assets/lessons/when-to-call-about-your-baby/calming-video.mp4'),
  'safe-sleep/safe-sleep-video': require('../../assets/lessons/safe-sleep/safe-sleep-video.mp4'),
  // Reuses the Preparing for Birth harness video (video.assetId in the lesson file).
  'car-seat-safety/harness-refresher': require('../../assets/lessons/getting-ready-bags-routes-car-seat/harness-check-video.mp4'),
  'making-decisions-with-your-care-team/decision-video': require('../../assets/lessons/making-decisions-with-your-care-team/decision-video.mp4'),
  'positions-and-movement/practice-positions': require('../../assets/lessons/positions-and-movement/practice-positions.mp4'),
};

export function videoFor(lessonId: string, slideId: string): number | null {
  return VIDEOS[`${lessonId}/${slideId}`] ?? null;
}
