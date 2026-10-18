// Writes docs/media/production-list.csv: one row for every lesson picture or
// video that still needs an illustrator or animator.
//
// Run with: node scripts/make-production-list.mjs
//
// Pictures and animations drawn in code (src/components/LessonVisuals.tsx and
// LessonAnimations.tsx) and comparison tables are left out, because they are
// already finished in the app.
// A row's status turns to "Delivered" once its file exists in assets/lessons.

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

// Course order and names, as on the app's home screen (src/content/lessons.ts).
const COURSES = [
  ['early-pregnancy-basics', 'Early Pregnancy Basics'],
  ['preparing-for-birth', 'Preparing for Birth'],
  ['labor-basics', 'Labor Basics and When to Call'],
  ['comfort-and-support-skills', 'Comfort, Movement, and Support Skills'],
  ['interventions-and-flexible-decisions', 'Interventions and Flexible Decisions'],
  ['feeding-and-newborn-care', 'Feeding and Newborn Care'],
  ['postpartum-recovery', 'Postpartum Recovery, Mood, and Red Flags'],
];

const drawn = new Set(
  ['LessonVisuals.tsx', 'LessonAnimations.tsx'].flatMap((file) => {
    const source = readFileSync(path.join(root, 'src/components', file), 'utf8');
    return [...source.matchAll(/^ {2}'([a-z0-9-]+\/[a-z0-9-]+)': \(/gm)].map((m) => m[1]);
  }),
);

const csvCell = (value) => {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

const header = ['course', 'lesson', 'slide number', 'slide id', 'heading', 'kind', 'brief', 'target file name', 'status'];
const rows = [];

for (const [courseId, courseTitle] of COURSES) {
  const dir = path.join(root, 'content/lessons', courseId);
  const files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
  for (const file of files) {
    const lesson = JSON.parse(readFileSync(path.join(dir, file), 'utf8'));
    lesson.slides.forEach((slide, index) => {
      const key = `${lesson.lessonId}/${slide.id}`;
      let kind;
      let brief;
      let extension;
      if (slide.video && !drawn.has(key)) {
        kind = 'video';
        brief = `${slide.video.brief} Up to ${slide.video.maxSeconds} seconds.`;
        extension = 'mp4';
      } else if (slide.visual && !drawn.has(key) && ['illustration', 'diagram'].includes(slide.visual.kind)) {
        kind = slide.visual.kind;
        brief = slide.visual.description;
        extension = 'png';
      } else if (slide.visual?.kind === 'icon-list' && !drawn.has(key)) {
        // Icon lists are drawn in src/components/LessonVisuals.tsx; until then the slide shows a placeholder.
        rows.push([courseTitle, `${lesson.order}. ${lesson.title}`, index + 1, slide.id, slide.heading, 'icon-list', slide.visual.description, 'src/components/LessonVisuals.tsx', 'To draw in code']);
        return;
      } else {
        return;
      }
      // A video slide can reuse another slide's video through video.assetId (lessonId/slideId).
      const target = `assets/lessons/${slide.video?.assetId ?? `${lesson.lessonId}/${slide.id}`}.${extension}`;
      const delivered =
        existsSync(path.join(root, target)) ||
        (extension === 'png' && ['.jpg', '.webp'].some((ext) => existsSync(path.join(root, target.replace(/\.png$/, ext)))));
      rows.push([
        courseTitle,
        `${lesson.order}. ${lesson.title}`,
        index + 1,
        slide.id,
        slide.heading,
        kind,
        brief,
        target,
        delivered ? 'Delivered' : 'To commission',
      ]);
    });
  }
}

const out = path.join(root, 'docs/media/production-list.csv');
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n') + '\n');

const count = (k) => rows.filter((r) => r[5] === k).length;
console.log(`Wrote ${rows.length} rows: ${count('illustration')} illustrations, ${count('diagram')} diagrams, ${count('video')} videos.`);
