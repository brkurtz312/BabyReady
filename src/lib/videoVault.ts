/**
 * The Video Vault: every video recommended after a lesson, gathered by topic like
 * the Pregnancy AI Assistant's vault, each listed once with the lessons it goes with. Built from RECOMMENDED_VIDEOS,
 * so adding a video to a lesson adds it here too.
 *
 * Takes the library and recommendations as arguments and imports only types, so
 * plain Node can test it.
 */
import type { LibraryVideo } from '../content/videoLibrary';

/** The little of a course the vault needs. */
export type VaultCourse = { lessons: { lessonId: string; title: string }[] };

export type VaultVideo = LibraryVideo & { lessons: string[] };
export type VaultGroup = { topic: string; videos: VaultVideo[] };

/** One group per topic, in the order the class first recommends a video from it. */
export function buildVideoVault(courses: VaultCourse[], library: LibraryVideo[], recommended: Record<string, string[]>): VaultGroup[] {
  const byKey = new Map(library.map((v) => [v.key, v]));
  const seen = new Map<string, VaultVideo>();
  const groups = new Map<string, VaultGroup>();
  for (const lesson of courses.flatMap((course) => course.lessons)) {
    for (const key of recommended[lesson.lessonId] ?? []) {
      const known = seen.get(key);
      if (known) {
        if (!known.lessons.includes(lesson.title)) known.lessons.push(lesson.title);
        continue;
      }
      const video = byKey.get(key);
      if (!video) continue;
      const entry = { ...video, lessons: [lesson.title] };
      seen.set(key, entry);
      const group = groups.get(video.topic) ?? { topic: video.topic, videos: [] };
      group.videos.push(entry);
      groups.set(video.topic, group);
    }
  }
  return [...groups.values()];
}

/** Keeps the videos whose title, source, topic or lessons match the search, from the chosen source. */
export function filterVideoVault(groups: VaultGroup[], search: string, source: string | null): VaultGroup[] {
  const q = search.trim().toLowerCase();
  return groups
    .map((group) => ({
      ...group,
      videos: group.videos.filter(
        (v) =>
          (!source || v.source === source) &&
          (!q || [v.title, v.source, v.topic, ...v.lessons].some((text) => text.toLowerCase().includes(q))),
      ),
    }))
    .filter((group) => group.videos.length > 0);
}

/** Every source in the vault, most videos first. */
export function vaultSources(groups: VaultGroup[]): string[] {
  const counts = new Map<string, number>();
  for (const v of groups.flatMap((g) => g.videos)) counts.set(v.source, (counts.get(v.source) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([source]) => source);
}
