// Makes draft lesson pictures with Google's Gemini image model, from the briefs in
// docs/media/production-list.csv, in the style of a reference picture.
//
// Needs: a Gemini API key in the GEMINI_API_KEY environment variable, and ffmpeg.
// Run from the project root:
//   node scripts/make-artwork.mjs --dry-run            show the prompts, call nothing
//   node scripts/make-artwork.mjs --limit 5            make the first 5 missing pictures
//   node scripts/make-artwork.mjs                      make every missing illustration
//   node scripts/make-artwork.mjs --only stages-of-labor/active-labor --note "make the room brighter"
// Options: --model <name> (default gemini-2.5-flash-image), --force (remake existing drafts),
//          --reference <path> (default: the Your First Steps welcome picture).
//
// Drafts go to artwork-drafts/<lessonId>/<slideId>.jpg (not committed) with a manifest
// of the prompts used. Every draft needs clinical review before it is copied into
// assets/lessons and listed in src/content/artwork.ts. Diagrams are left out on purpose:
// they show anatomy or maps, and are drawn in the app or by a medical illustrator.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const draftsDir = path.join(root, 'artwork-drafts');

// ---------- Options ----------
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const dryRun = flag('dry-run');
const force = flag('force');
const limit = Number(option('limit', '0')) || Infinity;
const only = option('only', '').split(',').filter(Boolean);
const note = option('note', '');
const model = option('model', 'gemini-2.5-flash-image');
const referencePath = path.resolve(root, option('reference', 'assets/lessons/early-pregnancy-first-steps/welcome.jpg'));
const apiKey = process.env.GEMINI_API_KEY;

// ---------- The production list ----------
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [header, ...body] = rows;
  return body.map((r) => Object.fromEntries(header.map((h, k) => [h, r[k] ?? ''])));
}

const list = parseCsv(readFileSync(path.join(root, 'docs/media/production-list.csv'), 'utf8')).map((r) => {
  const [, , lessonId, file] = r['target file name'].split('/');
  return { ...r, lessonId, slideId: file.replace(/\.[a-z]+$/, ''), key: `${lessonId}/${file.replace(/\.[a-z]+$/, '')}` };
});

const jobs = list
  .filter((r) => r.kind === 'illustration')
  .filter((r) => (only.length ? only.includes(r.key) : r.status !== 'Delivered'))
  .slice(0, limit);

// ---------- Prompts ----------
const STYLE =
  'Style: flat, modern editorial illustration for a calm, warm prenatal education app. Soft rounded shapes, simple forms, ' +
  'minimal detail, flat color with gentle soft shading, no textures, no harsh outlines. Color palette: deep teal #23716C as the ' +
  'main color, soft teal #DCEDEA for backgrounds and large areas, navy #1D2940 for hair and dark details, and a small warm accent ' +
  'of marigold #E3A82B, plus natural skin tones. Light, airy background with space around the subject. Mood: calm, hopeful, ' +
  'reassuring. Realistic, respectful body proportions and natural-looking hands. Everyone fully and modestly clothed or covered ' +
  'with a blanket. No text, letters, numbers, labels, or logos anywhere in the image. Nothing graphic: no blood, no medical ' +
  'procedures, no needles. Wide landscape image, with nothing important near the left and right edges.';

const HAS_PEOPLE = /\b(person|people|parent|partner|nurse|doula|midwife|midwives|clinician|doctor|physician|obstetrician|anesthesiologist|instructor|woman|women|man|men|father|mother|couple|family|grandparent|friend|supporter|hand|hands|newborn|baby|toddler|child|team|patient|staff)\b/i;
const HAS_WORDS = /['"‘’“”]|\d|\blabel(?:ed|led|s)?\b|\breading\b|\btitled\b|\bbanner\b|\bsign\b|\bicon\b/i;

function promptFor(row) {
  const people = HAS_PEOPLE.test(row.brief);
  const parts = [
    'Use the attached image only as a reference for the illustration style, colors, and level of detail, so this picture looks like part of the same set.' +
      (people ? ' Do not reuse its people or its room. If this scene includes people, draw new, different people in a new setting.' : ''),
    `Scene: ${row.brief}`,
    'Where the scene names colors, use them only as small accents; follow the palette below.',
  ];
  if (HAS_WORDS.test(row.brief)) {
    parts.push('Leave out any words, numbers, labels, signs, or on-screen text mentioned in the scene; draw those objects plain, with no writing.');
  }
  if (note) parts.push(`Also: ${note}`);
  parts.push(STYLE);
  return parts.join('\n\n');
}

// ---------- Gemini ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function listImageModels() {
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': apiKey } });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.models || []).map((m) => m.name.replace(/^models\//, '')).filter((n) => /image/i.test(n));
}

async function generate(prompt, reference) {
  const body = {
    contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: 'image/jpeg', data: reference } }] }],
    generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '16:9' } },
  };
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data = await res.json();
      const parts = data.candidates?.[0]?.content?.parts || [];
      const image = parts.find((p) => p.inlineData || p.inline_data);
      if (image) return image.inlineData || image.inline_data;
      const reason = data.candidates?.[0]?.finishReason || data.promptFeedback?.blockReason || 'no image returned';
      throw new Error(`Gemini returned no image (${reason}).`);
    }
    const text = await res.text();
    if (res.status === 404) {
      const models = await listImageModels();
      throw new Error(`Model "${model}" was not found. Image models on this key: ${models.join(', ') || 'none found'}. Pass one with --model.`);
    }
    if ((res.status === 429 || res.status >= 500) && attempt < 5) {
      const wait = 2000 * 2 ** attempt;
      console.log(`  Gemini is busy (${res.status}); waiting ${wait / 1000} s and trying again.`);
      await sleep(wait);
      continue;
    }
    throw new Error(`Gemini error ${res.status}: ${text.slice(0, 400)}`);
  }
}

/** Crop the centre to the app's 16:10 picture shape and save as a JPEG. */
function saveDraft(image, outFile) {
  const tmp = `${outFile}.source`;
  writeFileSync(tmp, Buffer.from(image.data, 'base64'));
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', tmp, '-vf', "crop='min(iw,ih*16/10)':'min(ih,iw*10/16)'", '-q:v', '3', outFile]);
  rmSync(tmp);
}

// ---------- Run ----------
console.log(`${jobs.length} picture(s) to make with ${model}${dryRun ? ' (dry run: nothing is sent)' : ''}.`);
if (!jobs.length) process.exit(0);
if (!dryRun && !apiKey) {
  console.error('Set GEMINI_API_KEY first (in the environment settings, never in the code).');
  process.exit(1);
}
const reference = readFileSync(referencePath).toString('base64');
const manifestPath = path.join(draftsDir, 'manifest.json');
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
let made = 0;
const failed = [];

for (const row of jobs) {
  const prompt = promptFor(row);
  const outFile = path.join(draftsDir, row.lessonId, `${row.slideId}.jpg`);
  console.log(`\n${row.key}  (${row.course} · ${row.lesson} · slide ${row['slide number']}: ${row.heading})`);
  if (dryRun) {
    console.log(prompt);
    continue;
  }
  if (existsSync(outFile) && !force) {
    console.log('  Draft already exists; skipping (use --force to remake it).');
    continue;
  }
  try {
    const image = await generate(prompt, reference);
    mkdirSync(path.dirname(outFile), { recursive: true });
    saveDraft(image, outFile);
    manifest[row.key] = { prompt, model, made: new Date().toISOString(), course: row.course, lesson: row.lesson, slide: Number(row['slide number']), heading: row.heading };
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    made++;
    console.log(`  Saved ${path.relative(root, outFile)}`);
  } catch (error) {
    failed.push(row.key);
    console.log(`  Failed: ${error.message}`);
    if (/not found|API key|PERMISSION_DENIED|UNAUTHENTICATED/.test(error.message)) break;
  }
  await sleep(1500);
}

if (!dryRun) {
  console.log(`\nMade ${made} draft(s).${failed.length ? ` Failed: ${failed.join(', ')}.` : ''}`);
}
