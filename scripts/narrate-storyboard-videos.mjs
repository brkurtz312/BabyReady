// Adds a narration track to the storyboard lesson videos, read in the class narrator's
// voice: each scene's on-screen words, timed to start as its caption appears. The
// pictures and timing don't change; only the (silent) sound track is replaced.
//
// Needs: a Gemini API key in the GEMINI_API_KEY environment variable, and ffmpeg.
// Run from the project root:
//   node scripts/narrate-storyboard-videos.mjs --dry-run      show each line and its time budget
//   node scripts/narrate-storyboard-videos.mjs                narrate every storyboard video
//   node scripts/narrate-storyboard-videos.mjs --only safe-sleep/safe-sleep-video
//   node scripts/narrate-storyboard-videos.mjs --only <key> --one-by-one   record each line separately
// Options: --voice <name> (default Sulafat), --model <name> (default gemini-3.8-flash-tts),
//          the same voice and model as scripts/make-narration.mjs.
//
// Each video is read in one request (the free tier allows about 100 a day), cached in
// narration-drafts/videos/ (not committed), then cut into lines at the pauses between them.
// If the pauses can't be trusted, its lines are recorded one by one instead.
// The narrated videos replace the files in assets/lessons, which still need clinical review.

import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const cacheDir = path.join(root, 'narration-drafts', 'videos');

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const dryRun = flag('dry-run');
const oneByOne = flag('one-by-one');
const only = option('only', '').split(',').filter(Boolean);
const voice = option('voice', 'Sulafat');
const model = option('model', 'gemini-3.8-flash-tts');
const apiKey = process.env.GEMINI_API_KEY;

// ---------- Timing (must match scripts/make-storyboard-videos.mjs) ----------
const FADE = 0.6;
const DEFAULT_SECONDS = { title: 4, card: 7, end: 6, graphic: 8, image: 7 };
const secondsOf = (scene) => scene.seconds ?? DEFAULT_SECONDS[scene.type];
/** When a line starts after its scene begins: as the caption fades in. */
const LINE_DELAY = 0.6;
/** Quiet kept between one line's end and the next line's start. */
const GAP = 0.25;
/** The most a line may be sped up to fit its scene. */
const MAX_SPEEDUP = 1.15;

const boards = JSON.parse(readFileSync(path.join(root, 'docs/media/storyboards.json'), 'utf8'));
const keys = Object.keys(boards).filter((k) => !k.startsWith('_') && (!only.length || only.includes(k)));

/** The words a scene shows, as one line to read. */
function lineFor(scene) {
  const parts = scene.type === 'image' || scene.type === 'graphic' ? [scene.caption, scene.sub] : [scene.text, scene.sub];
  const [first, sub] = parts.filter(Boolean).map((p) => p.trim());
  if (!sub) return first.replace(/,\s*$/, '.');
  // A subtitle that starts a new sentence needs a full stop before it, or it's read
  // as one run-on line; one that carries on the caption ("right on your chest.") doesn't.
  const joined = /^[a-z]/.test(sub) || /[.!?:;,”"]$/.test(first) ? `${first} ${sub}` : `${first}. ${sub}`;
  return joined.replace(/,\s*$/, '.');
}

/** How far a long line may run into the next scene, pushing that scene's line later. */
const SPILL = 1.5;

/**
 * Each scene's line: when it should start (as the caption appears), the earliest it may
 * start, and the latest it may end (a little into the next scene, if it must).
 */
function schedule(scenes) {
  const starts = [];
  let t = 0;
  for (const scene of scenes) {
    starts.push(t);
    t += secondsOf(scene) - FADE;
  }
  const total = t + FADE;
  return scenes.map((scene, i) => ({
    start: starts[i] + LINE_DELAY,
    earliest: starts[i] + 0.1,
    latest: i + 1 < scenes.length ? starts[i + 1] + SPILL : total - 0.3,
  }));
}

// ---------- Gemini ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function speak(text) {
  const body = {
    contents: [{ parts: [{ text }] }],
    generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } },
  };
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data = await res.json();
      const part = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
      if (part) return part.inlineData;
      if (attempt < 4) continue;
      throw new Error(`no audio returned (${data.candidates?.[0]?.finishReason ?? 'unknown'})`);
    }
    const text = await res.text();
    if (/per_day|PerDay/.test(text)) throw new Error(`daily quota reached for ${model}; run again once it resets`);
    if ((res.status === 429 || res.status >= 500) && attempt < 6) {
      await sleep(2000 * 2 ** attempt);
      continue;
    }
    throw new Error(`Gemini error ${res.status}: ${text.slice(0, 300)}`);
  }
}

/** Reads all of a video's lines in one take (or reuses the cached one); returns a WAV path. */
async function takeFor(lines) {
  // A blank line between lines gives the reader a clear pause to cut at.
  const text = lines.join('\n\n');
  const id = createHash('sha1').update(`${model}|${voice}|${text}`).digest('hex').slice(0, 16);
  const wav = path.join(cacheDir, `${id}.wav`);
  if (existsSync(wav)) return wav;
  const audio = await speak(text);
  const raw = path.join(cacheDir, `${id}.raw`);
  writeFileSync(raw, Buffer.from(audio.data, 'base64'));
  const rate = /rate=(\d+)/i.exec(audio.mimeType)?.[1] ?? '24000';
  const input = /wav/i.test(audio.mimeType) ? ['-i', raw] : ['-f', 's16le', '-ar', rate, '-ac', '1', '-i', raw];
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...input, '-ac', '1', '-ar', '48000', wav]);
  rmSync(raw);
  return wav;
}

// ---------- Cutting the take into lines ----------
function durationOf(file) {
  return Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString());
}

/** Quiet stretches in a recording, as [start, end] seconds. */
function silences(file) {
  const out = spawnSync('ffmpeg', ['-i', file, '-af', 'silencedetect=noise=-38dB:d=0.18', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  const found = [];
  let start = null;
  for (const line of out.split('\n')) {
    const s = /silence_start: ([\d.]+)/.exec(line);
    const e = /silence_end: ([\d.]+)/.exec(line);
    if (s) start = Number(s[1]);
    if (e && start !== null) {
      found.push([start, Number(e[1])]);
      start = null;
    }
  }
  return found;
}

/**
 * Chooses one pause after each line but the last. The reader sometimes pauses as long
 * inside a line (between two sentences) as between lines, so each cut is the pause that
 * best balances being long against sitting where that line should end, judged by how
 * much of the script has been read. Pauses are chosen in order, one per line break.
 */
function pickCuts(pauses, lines, speechStart, speechEnd) {
  const total = lines.reduce((n, l) => n + l.length, 0);
  const span = speechEnd - speechStart;
  let read = 0;
  const expected = lines.slice(0, -1).map((line) => speechStart + (span * (read += line.length)) / total);
  const cost = (k, p) => Math.abs((pauses[p][0] + pauses[p][1]) / 2 - expected[k]) - 1.5 * (pauses[p][1] - pauses[p][0]);
  // best[k][p]: lowest total cost with line break k at pause p.
  const best = expected.map(() => pauses.map(() => Infinity));
  const from = expected.map(() => pauses.map(() => -1));
  pauses.forEach((_, p) => (best[0][p] = cost(0, p)));
  for (let k = 1; k < expected.length; k++) {
    for (let p = k; p < pauses.length; p++) {
      for (let q = k - 1; q < p; q++) {
        const c = best[k - 1][q] + cost(k, p);
        if (c < best[k][p]) {
          best[k][p] = c;
          from[k][p] = q;
        }
      }
    }
  }
  const lastRow = best.at(-1);
  let p = lastRow.indexOf(Math.min(...lastRow));
  const picked = [];
  for (let k = expected.length - 1; k >= 0; k--) {
    picked.unshift(pauses[p]);
    p = from[k][p];
  }
  return picked;
}

/**
 * Splits a take into one segment per line, at the pauses between lines.
 * Returns [start, end] of the speech in each segment.
 */
function cutLines(wav, lines) {
  const length = durationOf(wav);
  const quiet = silences(wav);
  const speechStart = quiet[0] && quiet[0][0] < 0.05 ? quiet[0][1] : 0;
  const last = quiet.at(-1);
  const speechEnd = last && last[1] > length - 0.05 ? last[0] : length;
  const inner = quiet.filter(([s, e]) => s > speechStart + 0.05 && e < speechEnd - 0.05);
  if (inner.length < lines.length - 1) throw new Error(`found ${inner.length} pauses for ${lines.length} lines`);
  const cuts = pickCuts(inner, lines, speechStart, speechEnd);
  const segments = [];
  let from = speechStart;
  for (const [s, e] of cuts) {
    segments.push([from, s]);
    from = e;
  }
  segments.push([from, speechEnd]);
  // Sanity check: each segment's length should roughly follow its line's length.
  const perChar = (speechEnd - speechStart) / lines.reduce((n, l) => n + l.length, 0);
  segments.forEach(([s, e], i) => {
    const expected = lines[i].length * perChar;
    const ratio = (e - s) / expected;
    if (ratio < 0.4 || ratio > 2.5) throw new Error(`line ${i + 1} doesn't line up with its pause (${(e - s).toFixed(1)} s, expected about ${expected.toFixed(1)} s)`);
  });
  return segments;
}

// ---------- Building the sound track ----------
/** Records each line on its own, for a take whose pauses can't be trusted. Returns clips. */
async function linesOneByOne(lines) {
  const clips = [];
  for (const line of lines) {
    const wav = await takeFor([line]);
    const length = durationOf(wav);
    const quiet = silences(wav);
    const s = quiet[0] && quiet[0][0] < 0.05 ? quiet[0][1] : 0;
    const last = quiet.at(-1);
    const e = last && last[1] > length - 0.05 ? last[0] : length;
    clips.push({ wav, s, e });
  }
  return clips;
}

/** clips: one { wav, s, e } per line: the file and the stretch of it to use. */
function narrate(key, lines, clips, slots) {
  const [lessonId, slideId] = key.split('/');
  const video = path.join(root, 'assets/lessons', lessonId, `${slideId}.mp4`);
  if (!existsSync(video)) throw new Error(`no video at ${path.relative(root, video)}`);
  const total = durationOf(video);

  const files = [...new Set(clips.map((c) => c.wav))];
  const filters = [];
  const labels = [];
  let previousEnd = -GAP;
  clips.forEach(({ wav, s, e }, i) => {
    let length = e - s;
    const slot = slots[i];
    const notBefore = Math.max(slot.earliest, previousEnd + GAP);
    let start = Math.max(slot.start, previousEnd + GAP);
    let tempo = 1;
    if (start + length > slot.latest) start = Math.max(notBefore, slot.latest - length);
    if (start + length > slot.latest) {
      tempo = length / (slot.latest - start);
      if (tempo > MAX_SPEEDUP) throw new Error(`line ${i + 1} ("${lines[i]}") needs ${length.toFixed(1)} s but has ${(slot.latest - start).toFixed(1)} s`);
      length /= tempo;
    }
    previousEnd = start + length;
    const delay = Math.round(start * 1000);
    filters.push(`[${files.indexOf(wav)}]atrim=${s.toFixed(3)}:${e.toFixed(3)},asetpts=PTS-STARTPTS${tempo > 1 ? `,atempo=${tempo.toFixed(3)}` : ''},adelay=${delay}|${delay}[l${i}]`);
    labels.push(`[l${i}]`);
  });
  filters.push(`${labels.join('')}amix=inputs=${labels.length}:normalize=0,apad,atrim=0:${total.toFixed(3)},loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[a]`);

  const out = path.join(cacheDir, `${lessonId}-${slideId}.mp4`);
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...files.flatMap((f) => ['-i', f]), '-i', video, '-filter_complex', filters.join(';'),
    '-map', `${files.length}:v`, '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '96k', '-ac', '2', '-t', total.toFixed(3),
    '-movflags', '+faststart', out]);
  renameSync(out, video);
  return path.relative(root, video);
}

// ---------- Run ----------
if (!dryRun && !apiKey) {
  console.error('Set GEMINI_API_KEY first (in the environment settings, never in the code).');
  process.exit(1);
}
mkdirSync(cacheDir, { recursive: true });

const failed = [];
for (const key of keys) {
  const scenes = boards[key].scenes;
  const lines = scenes.map(lineFor);
  const slots = schedule(scenes);
  if (dryRun) {
    console.log(`\n${key}`);
    lines.forEach((line, i) => console.log(`  ${(slots[i].latest - slots[i].earliest).toFixed(1).padStart(4)} s  ${line}`));
    continue;
  }
  try {
    let clips;
    if (oneByOne) {
      clips = await linesOneByOne(lines);
    } else {
      const wav = await takeFor(lines);
      try {
        clips = cutLines(wav, lines).map(([s, e]) => ({ wav, s, e }));
      } catch (error) {
        console.log(`  ${key}: ${error.message}; recording its lines one by one`);
        clips = await linesOneByOne(lines);
      }
    }
    console.log(`Narrated ${narrate(key, lines, clips, slots)}`);
  } catch (error) {
    failed.push(`${key}: ${error.message}`);
    if (/daily quota/.test(error.message)) break;
  }
}
if (failed.length) {
  console.log(`\nFailed:\n${failed.join('\n')}`);
  process.exitCode = 1;
}
