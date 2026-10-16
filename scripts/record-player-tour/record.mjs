// Records the lesson player tour video (Preparing for Birth, lesson 1, "A quick tour of the controls"):
// the real web app in a phone frame, then a close-up of the controls, with on-screen captions.
//
// Needs Playwright (with Chromium) and ffmpeg installed on the machine. Run from the project root:
//   npx expo export --platform web --output-dir dist-tour
//   node scripts/record-player-tour/record.mjs
// It writes assets/lessons/welcome-how-this-class-works/player-tour-video.mp4 (silent, 1920x1080, up to 45 s).
// Re-record whenever the player controls change.
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const projectRoot = path.resolve(import.meta.dirname, '../..');
const root = path.join(projectRoot, 'dist-tour');
const stagePage = path.join(import.meta.dirname, 'stage.html');
const output = path.join(projectRoot, 'assets/lessons/welcome-how-this-class-works/player-tour-video.mp4');
if (!fs.existsSync(root)) throw new Error('Build the web app first: npx expo export --platform web --output-dir dist-tour');
const types = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.ttf': 'font/ttf', '.png': 'image/png', '.json': 'application/json' };
const srv = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  let p = url === '/__stage.html' ? stagePage : path.join(root, url);
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(root, 'index.html');
  res.setHeader('Content-Type', types[path.extname(p)] || 'application/octet-stream');
  fs.createReadStream(p).pipe(res);
}).listen(8097);

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'player-tour-'));
fs.rmSync(outDir, { recursive: true, force: true });
const browser = await chromium.launch();
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
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto('http://localhost:8097/__stage.html');
const app = page.frameLocator('#app');
const wait = (ms) => page.waitForTimeout(ms);
const say = (line, sub) => page.evaluate(([l, s]) => window.stage.say(l, s), [line, sub ?? '']);
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

// Open the Preparing for Birth class (the welcome lesson, with no health information).
await app.getByText('Start class').first().waitFor();
await app.getByLabel('Start Preparing for Birth').click();
await wait(1500);
await app.getByText('Start', { exact: true }).waitFor();
await wait(800);

await say('Each lesson plays like a small class.', '');
await wait(2600);
await tap('div,span', 'Start', app.getByText('Start', { exact: true }));
await clear();
await say('A slide appears, and your instructor talks you through it.', 'Captions show each sentence under the slide.');
await wait(4200);

await page.evaluate(() => window.stage.shot('close'));
await say('Your controls are along the bottom.', 'Here’s what each one does.');
await wait(3000);
await say('Pause anytime.', '');
await tap('[aria-label="Pause narration"]', null, app.getByLabel('Pause narration'));
await wait(1800);
await say('Then play again when you’re ready.', '');
await tap('[aria-label="Play narration"]', null, app.getByLabel('Play narration'));
await clear();
await wait(2200);

await say('Back takes you to the slide before,', 'so you can hear it again.');
await tap('div,span', 'Next', app.getByText('Next', { exact: true }));
await clear();
await wait(1600);
await tap('[aria-label="Previous slide"]', null, app.getByLabel('Previous slide'));
await clear();
await wait(2600);

await say('CC turns captions off…', '');
await tap('[aria-label="Hide captions"]', null, app.getByLabel('Hide captions'));
await clear();
await wait(2000);
await say('…and back on.', '');
await tap('[aria-label="Show captions"]', null, app.getByLabel('Show captions'));
await clear();
await wait(2000);

await say('Mute the voice when you’d rather read quietly.', 'The button changes to “Muted.”');
await tap('[aria-label="Mute narration"]', null, app.getByLabel('Mute narration'));
await wait(2400);
await clear();

await page.evaluate(() => window.stage.card('You’re in control.', 'Go at your own pace.'));
await wait(4200);

const video = page.video();
await context.close();
await browser.close();
srv.close();
if (errors.length) throw new Error('The app reported errors while recording: ' + errors.join('; '));
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', await video.path(), '-t', '45', '-c:v', 'libx264', '-preset', 'slow', '-crf', '24',
  '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart', '-an', '-r', '30', output]);
fs.rmSync(outDir, { recursive: true, force: true });
console.log('Wrote', path.relative(projectRoot, output));
