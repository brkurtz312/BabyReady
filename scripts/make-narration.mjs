// Records the class narration with a Gemini text-to-speech voice, one audio file per
// slide, and writes src/content/narration.ts so the player can use it.
//
// Needs: a Gemini API key in the GEMINI_API_KEY environment variable, and ffmpeg.
// Run from the project root:
//   node scripts/make-narration.mjs --dry-run        list what would be recorded
//   node scripts/make-narration.mjs                  record everything that's missing or changed
//   node scripts/make-narration.mjs --only labor-basics/how-labor-begins
//   node scripts/make-narration.mjs --check          transcribe each file back and flag mismatches
// Options: --voice <name> (default Sulafat), --model <name> (default gemini-3.8-flash-tts).
//
// Each clip is read in one request (the API allows only a few requests a minute) and
// cached in narration-drafts/ (not committed); finished recordings are listed in
// docs/media/narration.json. Sentence start times, for the captions, come from the
// pauses in the audio. A later wording change only re-records the clips that changed.
// The player looks clips up by a fingerprint of their text, so a slide whose wording
// changed after recording falls back to the device voice.
//
// The model reads every word it is sent, including any "say this warmly" direction,
// so only the script text itself is sent.

import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { splitSentences, textFingerprint } from '../src/lib/sentences.ts';

const root = path.resolve(import.meta.dirname, '..');
const cacheDir = path.join(root, 'narration-drafts', 'cache');
const outDir = path.join(root, 'assets', 'narration');
const registryPath = path.join(root, 'src', 'content', 'narration.ts');

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const dryRun = flag('dry-run');
const check = flag('check');
const only = option('only', '');
const voice = option('voice', 'Sulafat');
const model = option('model', 'gemini-3.8-flash-tts');
const apiKey = process.env.GEMINI_API_KEY;

const LEAD_IN = 0.15; // seconds of quiet before the first sentence
const TAIL = 0.3; // seconds of quiet after the last sentence
const CONCURRENCY = 4;

// ---------- What to record ----------
// These strings must match what src/screens/ClassPlayerScreen.tsx speaks.
const RIGHT = 'That’s right. ';
const WRONG = 'Not quite. ';

function loadCourses() {
  const lessonsRoot = path.join(root, 'content', 'lessons');
  return readdirSync(lessonsRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) =>
      readdirSync(path.join(lessonsRoot, d.name))
        .filter((f) => f.endsWith('.json'))
        .map((f) => JSON.parse(readFileSync(path.join(lessonsRoot, d.name, f), 'utf8')))
        .sort((a, b) => a.order - b.order),
    );
}

function clipsFor(lessons) {
  const clips = [];
  lessons.forEach((lesson, k) => {
    const add = (name, text) => clips.push({ file: `${lesson.lessonId}/${name}.m4a`, key: `${lesson.courseId}/${lesson.lessonId}`, text });
    for (const slide of lesson.slides) {
      add(slide.id, slide.narration);
      if (slide.question) {
        add(`${slide.id}-right`, RIGHT + slide.question.explanation);
        add(`${slide.id}-wrong`, WRONG + slide.question.explanation);
      }
    }
    lesson.reviewQuiz.forEach((q, i) => {
      add(`quiz-${i + 1}`, `Review question ${i + 1} of ${lesson.reviewQuiz.length}.`);
      add(`quiz-${i + 1}-right`, RIGHT + q.explanation);
      add(`quiz-${i + 1}-wrong`, WRONG + q.explanation);
    });
    const next = lessons[k + 1];
    add('done', `Nice work. You finished the lesson.${next ? ` Next up, ${next.title}.` : ''}`);
  });
  return clips;
}

// Identical lines ("Let's check in.") are recorded once and shared.
const seen = new Set();
const allClips = loadCourses()
  .flatMap(clipsFor)
  .filter((c) => !seen.has(c.text) && seen.add(c.text));
const clips = only ? allClips.filter((c) => c.key === only || c.key.endsWith(`/${only}`)) : allClips;

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
    // A daily quota won't clear by waiting a minute; stop so the run can be resumed later.
    if (/per_day|PerDay/.test(text)) throw new Error(`daily quota reached for ${model}; run again once it resets`);
    if ((res.status === 429 || res.status >= 500) && attempt < 6) {
      await sleep(2000 * 2 ** attempt);
      continue;
    }
    throw new Error(`Gemini error ${res.status}: ${text.slice(0, 300)}`);
  }
}

/** Records a whole clip in one request (or reuses the cached take); returns a trimmed WAV path. */
async function takeFor(text) {
  const id = createHash('sha1').update(`${model}|${voice}|${text}`).digest('hex').slice(0, 16);
  const trimmed = path.join(cacheDir, `${id}.wav`);
  if (existsSync(trimmed)) return trimmed;
  const audio = await speak(text);
  const raw = path.join(cacheDir, `${id}.raw`);
  writeFileSync(raw, Buffer.from(audio.data, 'base64'));
  // Some models return WAV, others bare 16-bit PCM.
  const rate = /rate=(\d+)/i.exec(audio.mimeType)?.[1] ?? '24000';
  const input = /wav/i.test(audio.mimeType) ? ['-i', raw] : ['-f', 's16le', '-ar', rate, '-ac', '1', '-i', raw];
  // Trim quiet at both ends, so every clip starts and ends the same way.
  const trim = 'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse';
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...input, '-af', trim, '-ar', '24000', '-ac', '1', trimmed]);
  rmSync(raw);
  return trimmed;
}

const duration = (file) =>
  Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString());

/** The pauses in a take, as [start, end] pairs in seconds. */
function pauses(file, shortest = 0.15) {
  // silencedetect reports on stderr.
  const log = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', `silencedetect=noise=-40dB:d=${shortest}`, '-f', 'null', '-'], {
    encoding: 'utf8',
  }).stderr;
  const found = [];
  for (const m of log.matchAll(/silence_end: ([\d.]+) \| silence_duration: ([\d.]+)/g)) {
    found.push([Number(m[1]) - Number(m[2]), Number(m[1])]);
  }
  return found;
}

/**
 * Finds when each sentence starts. Sentence breaks are usually the longest pauses in a
 * take, so this picks, in order, the set of pauses with the most total pause time, with a
 * light pull toward where each break is expected from its share of the text. Short
 * sentences ("But life happens.") break a pure share-of-text guess, so length matters more.
 */
function sentenceStarts(sentences, take) {
  const total = duration(take);
  const n = sentences.length - 1; // breaks to find
  if (n === 0) return [0];
  const sum = sentences.reduce((a, s) => a + s.length, 0);
  const expected = [];
  let before = 0;
  for (let i = 0; i < n; i++) {
    before += sentences[i].length;
    expected.push((before / sum) * total);
  }
  // Quick speech can leave fewer clear pauses than breaks; look for shorter ones before guessing.
  let gaps = pauses(take);
  if (gaps.length < n) gaps = pauses(take, 0.06);
  if (gaps.length < n) return [0, ...expected];
  const score = (i, k) => gaps[k][1] - gaps[k][0] - Math.abs((gaps[k][0] + gaps[k][1]) / 2 - expected[i]) / total;
  // best[i][k]: best total score with break i placed at pause k.
  const best = Array.from({ length: n }, () => new Array(gaps.length).fill(-Infinity));
  const from = Array.from({ length: n }, () => new Array(gaps.length).fill(-1));
  for (let k = 0; k < gaps.length; k++) best[0][k] = score(0, k);
  for (let i = 1; i < n; i++) {
    for (let k = i; k < gaps.length; k++) {
      for (let j = i - 1; j < k; j++) {
        const value = best[i - 1][j] + score(i, k);
        if (value > best[i][k]) {
          best[i][k] = value;
          from[i][k] = j;
        }
      }
    }
  }
  let k = best[n - 1].indexOf(Math.max(...best[n - 1]));
  const picked = [];
  for (let i = n - 1; i >= 0; i--) {
    picked.unshift(k);
    k = from[i][k];
  }
  return [0, ...picked.map((g) => Math.max(gaps[g][1] - 0.05, 0))];
}

/** Records a clip and returns when each sentence starts, in ms. */
async function recordClip(clip) {
  const sentences = splitSentences(clip.text);
  const take = await takeFor(clip.text);
  const starts = sentenceStarts(sentences, take).map((s) => Math.round((s + LEAD_IN) * 1000));
  const outFile = path.join(outDir, clip.file);
  mkdirSync(path.dirname(outFile), { recursive: true });
  const pad = `adelay=${Math.round(LEAD_IN * 1000)}:all=1,apad=pad_dur=${TAIL}`;
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', take, '-af', pad, '-c:a', 'aac', '-b:a', '40k', '-ar', '24000', '-ac', '1', '-movflags', '+faststart', outFile]);
  return starts;
}

// ---------- Checking ----------
// Script and transcript can write the same thing differently ("400 mcg" or "four hundred m c g",
// "9 to 14" or "nine to fourteen"), so both are normalized: numbers spelled out, and runs of
// single letters joined into one word.
const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
function spell(n) {
  if (n < 20) return ONES.at(n);
  if (n < 100) return TENS.at(Math.floor(n / 10)) + (n % 10 ? ` ${ONES.at(n % 10)}` : '');
  if (n < 1000) return `${ONES.at(Math.floor(n / 100))} hundred${n % 100 ? ` ${spell(n % 100)}` : ''}`;
  if (n < 1000000) return `${spell(Math.floor(n / 1000))} thousand${n % 1000 ? ` ${spell(n % 1000)}` : ''}`;
  return String(n);
}
function words(s) {
  const raw =
    s
      .toLowerCase()
      .replace(/[’']/g, '')
      .replace(/(\d),(\d{3})/g, '$1$2')
      .replace(/(\d+)\.(\d+)/g, (_, a, b) => `${a} point ${b.split('').join(' ')}`)
      .replace(/\d+/g, (d) => ` ${spell(Number(d))} `)
      .replace(/-/g, ' ')
      .match(/[a-z]+/g) ?? [];
  const out = [];
  for (const w of raw) {
    if (w.length === 1 && w !== 'a' && w !== 'i' && out.length && /^[b-hj-z]+$/.test(out.at(-1)) && out.at(-1).length <= 3) out.push(out.pop() + w);
    else out.push(w);
  }
  return out;
}

/** Share of the script's words that appear, in order, in the transcript. */
function overlap(script, heard) {
  const a = words(script);
  const b = words(heard);
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  return { score: dp[a.length][b.length] / Math.max(a.length, 1), extra: b.length - dp[a.length][b.length] };
}

async function transcribe(file) {
  const body = {
    contents: [{ parts: [{ text: 'Transcribe this audio exactly. Output only the words spoken.' }, { inline_data: { mime_type: 'audio/mp4', data: readFileSync(file).toString('base64') } }] }],
  };
  for (let attempt = 1; ; attempt++) {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
    });
    if (res.ok) return (await res.json()).candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const text = await res.text();
    if (/per_day|PerDay/.test(text)) throw new Error('daily quota reached for transcription; run --check again once it resets');
    if ((res.status === 429 || res.status >= 500) && attempt < 6) {
      await sleep(2000 * 2 ** attempt);
      continue;
    }
    throw new Error(`Gemini error ${res.status}`);
  }
}

// ---------- Registry ----------
function writeRegistry(entries) {
  const lines = entries
    .sort((a, b) => a.file.localeCompare(b.file))
    .map((e) => `  '${textFingerprint(e.text)}': { source: require('../../assets/narration/${e.file}'), starts: [${e.starts.join(', ')}] }, // ${e.file}`);
  writeFileSync(
    registryPath,
    `// Generated by scripts/make-narration.mjs (voice: ${voice}). Do not edit by hand.\n` +
      '// Keyed by a fingerprint of the narration text (src/lib/sentences.ts), so a clip is\n' +
      '// only used while the wording still matches what was recorded.\n\n' +
      'export type NarrationClip = {\n  source: number;\n  /** When each sentence starts, in milliseconds, as split by splitSentences. */\n  starts: number[];\n};\n\n' +
      `export const narrationClips: Record<string, NarrationClip> = {\n${lines.join('\n')}\n};\n`,
  );
}

// ---------- Run ----------
async function inPool(items, worker) {
  let next = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < items.length) {
        const item = items[next++];
        await worker(item);
      }
    }),
  );
}

const manifestPath = path.join(root, 'docs', 'media', 'narration.json');
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
const sentenceCount = clips.reduce((n, c) => n + splitSentences(c.text).length, 0);
console.log(`${clips.length} clip(s), ${sentenceCount} sentence(s), voice ${voice} on ${model}${dryRun ? ' (dry run)' : ''}.`);
if (dryRun) {
  for (const c of clips) console.log(`${c.file}: ${c.text.slice(0, 80)}`);
  process.exit(0);
}
if (!apiKey) {
  console.error('Set GEMINI_API_KEY first (in the environment settings, never in the code).');
  process.exit(1);
}
mkdirSync(cacheDir, { recursive: true });

if (check) {
  // Results are saved, so a check cut short by a daily quota picks up where it stopped.
  const flagged = [];
  let checked = 0;
  let stopped = false;
  await inPool(clips, async (clip) => {
    if (stopped) return;
    const entry = manifest[clip.file];
    const file = path.join(outDir, clip.file);
    if (!entry || entry.fingerprint !== textFingerprint(clip.text) || !existsSync(file)) return flagged.push(`${clip.file}: not recorded yet`);
    if (entry.checked) return;
    try {
      // Transcription varies a little run to run, so a clip that falls short gets a second listen.
      let result = overlap(clip.text, await transcribe(file));
      if (result.score < 0.97 || result.extra > 2) result = overlap(clip.text, await transcribe(file));
      const { score, extra } = result;
      if (score < 0.97 || extra > 2) flagged.push(`${clip.file}: ${Math.round(score * 100)}% of words heard, ${extra} extra`);
      else entry.checked = true;
      writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
      if (++checked % 50 === 0) console.log(`  checked ${checked}`);
    } catch (error) {
      if (/daily quota/.test(error.message)) stopped = true;
      else flagged.push(`${clip.file}: ${error.message}`);
    }
  });
  const passed = clips.filter((c) => manifest[c.file]?.checked).length;
  console.log(`\n${passed} of ${clips.length} clips checked and matching.${stopped ? ' Stopped at the daily quota; run --check again later.' : ''}`);
  if (flagged.length) console.log(`Flagged ${flagged.length}:\n${flagged.join('\n')}`);
  process.exit(0);
}

let done = 0;
const failed = [];
let quotaHit = false;
await inPool(clips, async (clip) => {
  if (quotaHit) return;
  const fp = textFingerprint(clip.text);
  const outFile = path.join(outDir, clip.file);
  if (manifest[clip.file]?.fingerprint === fp && manifest[clip.file]?.voice === voice && existsSync(outFile)) return;
  // Identical lines are shared, and which lesson's file holds a shared line can change as
  // lessons are added. Reuse a recording of the same text under its new name instead of
  // spending quota on it again.
  const earlier = Object.entries(manifest).find(
    ([file, e]) => file !== clip.file && e.fingerprint === fp && e.voice === voice && existsSync(path.join(outDir, file)),
  );
  if (earlier) {
    const [oldFile, entry] = earlier;
    mkdirSync(path.dirname(outFile), { recursive: true });
    renameSync(path.join(outDir, oldFile), outFile);
    manifest[clip.file] = entry;
    delete manifest[oldFile];
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    return;
  }
  try {
    const starts = await recordClip(clip);
    manifest[clip.file] = { fingerprint: fp, voice, model, starts };
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  } catch (error) {
    failed.push(`${clip.file}: ${error.message}`);
    if (/daily quota/.test(error.message)) quotaHit = true;
  }
  if (++done % 25 === 0) console.log(`  recorded ${done}`);
});

// The registry lists every clip that matches the current wording, not just this run's.
const current = allClips
  .filter((c) => manifest[c.file]?.fingerprint === textFingerprint(c.text) && existsSync(path.join(outDir, c.file)))
  .map((c) => ({ ...c, starts: manifest[c.file].starts }));
writeRegistry(current);
console.log(`\nRecorded ${done} clip(s); ${current.length} of ${allClips.length} clips are ready.${failed.length ? `\nFailed:\n${failed.join('\n')}` : ''}`);
