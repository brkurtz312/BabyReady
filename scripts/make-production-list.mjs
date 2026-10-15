// Writes docs/media/production-list.csv: one row for every lesson picture or
// video that still needs an illustrator or animator.
//
// Run with: node scripts/make-production-list.mjs
//
// Pictures drawn in code (src/components/LessonVisuals.tsx) and comparison
// tables are left out, because they are already finished in the app.
// A row's status turns to "Delivered" once its file exists in assets/lessons.

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

// Course order and names, as on the app's home screen (src/content/lessons.ts).
const COURSES = [
  ['early-pregnancy-basics', 'Early Pregnancy Basics'],
  ['preparing-for-birth', 'Preparing for Birth'],
  ['labor-basics', 'Labor Basics and When to Call'],
];

const drawnSource = readFileSync(path.join(root, 'src/components/LessonVisuals.tsx'), 'utf8');
const drawn = new Set([...drawnSource.matchAll(/^ {2}'([a-z0-9-]+\/[a-z0-9-]+)': \(\)/gm)].map((m) => m[1]));

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
      if (slide.video) {
        kind = 'video';
        brief = `${slide.video.brief} Up to ${slide.video.maxSeconds} seconds.`;
        extension = 'mp4';
      } else if (slide.visual && !drawn.has(key) && ['illustration', 'diagram'].includes(slide.visual.kind)) {
        kind = slide.visual.kind;
        brief = slide.visual.description;
        extension = 'png';
      } else {
        return;
      }
      const target = `assets/lessons/${lesson.lessonId}/${slide.id}.${extension}`;
      const delivered = existsSync(path.join(root, target)) || (extension === 'png' && existsSync(path.join(root, target.replace(/\.png$/, '.webp'))));
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
