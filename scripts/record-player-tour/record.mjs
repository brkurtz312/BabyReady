// Records the lesson player tour video (Start Here, "A quick tour of the controls"): the real
// web app in a phone frame, then a close-up of the controls, with on-screen captions read aloud
// in the class narrator's voice.
//
// Needs Playwright (with Chromium), ffmpeg, and a Gemini API key in GEMINI_API_KEY. Run from the
// project root:
//   npx expo export --platform web --output-dir dist-tour
//   node scripts/record-player-tour/record.mjs
// It writes assets/lessons/welcome-how-this-class-works/player-tour-video.mp4 (1920x1080, with
// narration). Each caption is recorded first (cached in narration-drafts/tour/), and the tour waits
// for each line to finish before the next. Re-record whenever the player controls change.
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const projectRoot = path.resolve(import.meta.dirname, '../..');
const root = path.join(projectRoot, 'dist-tour');
const stagePage = path.join(import.meta.dirname, 'stage.html');
const output = path.join(projectRoot, 'assets/lessons/welcome-how-this-class-works/player-tour-video.mp4');
if (!fs.existsSync(root)) throw new Error('Build the web app first: npx expo export --platform web --output-dir dist-tour');
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error('Set GEMINI_API_KEY first (in the environment settings, never in the code).');

// ---------- The narrator's voice (same voice and model as scripts/make-narration.mjs) ----------
const voice = 'Sulafat';
const model = 'gemini-3.8-flash-tts';
const cacheDir = path.join(projectRoot, 'narration-drafts', 'tour');
fs.mkdirSync(cacheDir, { recursive: true });
/** Each line spoken, with when it started (ms from the start of the recording). */
const spoken = [];
let t0 = 0;
let busyUntil = 0;

/** Records one line (or reuses the cached take); returns its WAV path and length in ms, silence trimmed. */
async function lineAudio(text) {
  const id = createHash('sha1').update(`${model}|${voice}|${text}`).digest('hex').slice(0, 16);
  const wav = path.join(cacheDir, `${id}.wav`);
  if (!fs.existsSync(wav)) {
    const body = {
      contents: [{ parts: [{ text }] }],
      generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } },
    };
    let audio;
    for (let attempt = 1; !audio; attempt++) {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(body),
      });
      if (res.ok) audio = (await res.json()).candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData;
      else if ((res.status === 429 || res.status >= 500) && attempt < 6) await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
      else throw new Error(`Gemini error ${res.status}: ${(await res.text()).slice(0, 200)}`);
      if (!audio && attempt >= 6) throw new Error('Gemini returned no audio');
    }
    const raw = `${wav}.raw`;
    fs.writeFileSync(raw, Buffer.from(audio.data, 'base64'));
    const rate = /rate=(\d+)/i.exec(audio.mimeType)?.[1] ?? '24000';
    const input = /wav/i.test(audio.mimeType) ? ['-i', raw] : ['-f', 's16le', '-ar', rate, '-ac', '1', '-i', raw];
    const trim = 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse';
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...input, '-af', trim, '-ac', '1', '-ar', '48000', wav]);
    fs.rmSync(raw);
  }
  const seconds = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', wav]).toString());
  return { wav, ms: Math.round(seconds * 1000) };
}
const types = { '.m4a': 'audio/mp4', '.mp4': 'video/mp4', '.jpg': 'image/jpeg', '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.ttf': 'font/ttf', '.png': 'image/png', '.json': 'application/json' };
const srv = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  let p = url === '/__stage.html' ? stagePage : path.join(root, url);
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(root, 'index.html');
  res.setHeader('Content-Type', types[path.extname(p)] || 'application/octet-stream');
  fs.createReadStream(p).pipe(res);
}).listen(8097);

// Headless Chromium can't decode the AAC narration clips, so the lesson's clips are swapped for MP3
// copies in this build: the app then plays its narration and moves its captions on as on a phone.
for (const dir of fs.readdirSync(root, { recursive: true, withFileTypes: true })) {
  const file = path.join(dir.parentPath ?? dir.path, dir.name);
  if (dir.isFile() && file.includes('welcome-how-this-class-works') && file.endsWith('.m4a')) {
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', file, '-codec:a', 'libmp3lame', '-b:a', '64k', '-f', 'mp3', `${file}.mp3`]);
    fs.renameSync(`${file}.mp3`, file);
  }
}

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'player-tour-'));
fs.rmSync(outDir, { recursive: true, force: true });
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  recordVideo: { dir: outDir, size: { width: 1920, height: 1080 } },
});
// Stand-in speech voice so the player behaves as on a phone: each sentence "speaks" for a natural length of time.
await context.addInitScript(() => {
  const voice = { voiceURI: 'tour', name: 'Tour', lang: 'en-US', localService: true, default: true };
  let timers = [];
  const synth = {
    speaking: false, pending: false, paused: false, onvoiceschanged: null,
    getVoices: () => [voice],
    speak(u) {
      synth.speaking = true;
      timers.push(setTimeout(() => u.onstart && u.onstart({}), 10));
      timers.push(setTimeout(() => { synth.speaking = false; u.onend && u.onend({}); }, Math.max(1200, u.text.length * 62)));
    },
    cancel() { timers.forEach(clearTimeout); timers = []; synth.speaking = false; },
    pause() {}, resume() {},
    addEventListener() {}, removeEventListener() {},
  };
  Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
  window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text || ''; } };
});

const page = await context.newPage();
t0 = Date.now();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto('http://localhost:8097/__stage.html');
const app = page.frameLocator('#app');
const wait = (ms) => page.waitForTimeout(ms);
// Each caption is read aloud: the next one waits until the last has finished, and `hold` waits at
// least as long as the line still playing.
async function say(line, sub) {
  const now = Date.now();
  if (busyUntil > now) await wait(busyUntil - now);
  await page.evaluate(([l, s]) => window.stage.say(l, s), [line, sub ?? '']);
  const { wav, ms } = await lineAudio(sub ? `${line} ${sub}` : line);
  spoken.push({ wav, at: Date.now() - t0 });
  busyUntil = Date.now() + ms + 350;
}
const hold = (ms) => wait(Math.max(ms, busyUntil - Date.now()));
const clear = () => page.evaluate(() => window.stage.clear());

/** Highlight a control, show a finger tap, and press it. */
async function tap(selector, text, locator) {
  await page.evaluate(([s, t]) => window.stage.highlight(s, t), [selector, text]);
  await wait(900);
  await page.evaluate(([s, t]) => window.stage.finger(s, t), [selector, text]);
  await wait(150);
  const r = await page.evaluate(([s, t]) => window.stage.rect(s, t), [selector, text]);
  if (r) await page.mouse.click(r.x + r.w / 2, r.y + r.h / 2);
  else await locator.click();
  await wait(500);
}

// Open Start Here (the welcome lesson, with no health information).
await app.getByText('Start class').first().waitFor();
await app.getByLabel('Start class: Welcome: How This Class Works').click();
await wait(1500);
await app.getByText('Start', { exact: true }).waitFor();
await wait(800);

await say('Each lesson plays like a small class.', '');
await hold(2600);
await tap('div,span', 'Start', app.getByText('Start', { exact: true }));
await clear();
await say('A slide appears, and your instructor talks you through it.', 'Captions show each sentence under the slide.');
await hold(4200);

await page.evaluate(() => window.stage.shot('close'));
await say('Your controls are along the bottom.', 'Here’s what each one does.');
await hold(3000);
await say('Pause anytime.', '');
await tap('[aria-label="Pause narration"]', null, app.getByLabel('Pause narration'));
await hold(1800);
await say('Then play again when you’re ready.', '');
await tap('[aria-label="Play narration"]', null, app.getByLabel('Play narration'));
await clear();
await hold(2200);

await say('Back takes you to the slide before,', 'so you can hear it again.');
await tap('div,span', 'Next', app.getByText('Next', { exact: true }));
await clear();
await hold(1600);
await tap('[aria-label="Previous slide"]', null, app.getByLabel('Previous slide'));
await clear();
await hold(2600);

await say('CC turns captions off…', '');
await tap('[aria-label="Hide captions"]', null, app.getByLabel('Hide captions'));
await clear();
await hold(2000);
await say('…and back on.', '');
await tap('[aria-label="Show captions"]', null, app.getByLabel('Show captions'));
await clear();
await hold(2000);

await say('Mute the voice when you’d rather read quietly.', 'The button changes to “Muted.”');
await tap('[aria-label="Mute narration"]', null, app.getByLabel('Mute narration'));
await hold(2400);
await clear();

await hold(0);
await page.evaluate(() => window.stage.card('You’re in control.', 'Go at your own pace.'));
{
  const { wav, ms } = await lineAudio('You’re in control. Go at your own pace.');
  spoken.push({ wav, at: Date.now() - t0 });
  await wait(Math.max(4200, ms + 1200));
}

const video = page.video();
await context.close();
await browser.close();
srv.close();
if (errors.length) throw new Error('The app reported errors while recording: ' + errors.join('; '));
// The narration, each line placed when its caption appeared, then mixed, levelled and muxed in.
const inputs = spoken.flatMap((l) => ['-i', l.wav]);
const delays = spoken.map((l, i) => `[${i + 1}]adelay=${l.at}|${l.at}[l${i}]`);
const mix = `${spoken.map((_, i) => `[l${i}]`).join('')}amix=inputs=${spoken.length}:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[a]`;
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', await video.path(), ...inputs, '-filter_complex', [...delays, mix].join(';'),
  '-map', '0:v', '-map', '[a]', '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
  '-r', '30', '-c:a', 'aac', '-b:a', '96k', '-shortest', '-movflags', '+faststart', output]);
fs.rmSync(outDir, { recursive: true, force: true });
console.log('Wrote', path.relative(projectRoot, output));
