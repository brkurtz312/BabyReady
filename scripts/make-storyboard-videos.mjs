// Makes draft lesson videos from the storyboards in docs/media/storyboards.json: a short
// sequence of pictures (drawn by Google's Gemini image model, in the style of the lesson
// pictures) and plain cards, with on-screen captions, gentle zooms and crossfades.
//
// Needs: a Gemini API key in GEMINI_API_KEY, ffmpeg, and Playwright with Chromium (for the captions).
// Run from the project root:
//   node scripts/make-storyboard-videos.mjs                     make every video in the storyboards
//   node scripts/make-storyboard-videos.mjs --only pushing-and-birth/pushing-video
//   node scripts/make-storyboard-videos.mjs --only <key> --redo 3 --note "the partner faces her"
// Options: --redo <scene numbers, e.g. 3,5> redraws those pictures (counting from 1, title card included),
//          --model <name> (default gemini-2.5-flash-image), --stills-only (skip building the MP4s).
//
// Drafts go to artwork-drafts/videos/<lessonId>/<slideId>.mp4 (not committed), with the scene
// pictures beside them. The videos are silent, 1920x1080, H.264 with an AAC track, as the style
// guide asks. Every video needs clinical review before it is copied into assets/lessons and listed
// in src/content/videos.ts.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const draftsDir = path.join(root, 'artwork-drafts', 'videos');

// ---------- Options ----------
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const only = option('only', '').split(',').filter(Boolean);
const redo = option('redo', '').split(',').filter(Boolean).map(Number);
const note = option('note', '');
const model = option('model', 'gemini-2.5-flash-image');
const stillsOnly = flag('stills-only');
const apiKey = process.env.GEMINI_API_KEY;
const referencePath = path.join(root, 'assets/lessons/early-pregnancy-first-steps/welcome.jpg');

const boards = JSON.parse(readFileSync(path.join(root, 'docs/media/storyboards.json'), 'utf8'));
const keys = Object.keys(boards).filter((k) => !k.startsWith('_') && (!only.length || only.includes(k)));

// Lesson file facts: each video's length limit.
const maxSeconds = {};
for (const course of ['early-pregnancy-basics', 'preparing-for-birth', 'labor-basics']) {
  const dir = path.join(root, 'content/lessons', course);
  for (const file of execFileSync('ls', [dir]).toString().split('\n').filter((f) => f.endsWith('.json'))) {
    const lesson = JSON.parse(readFileSync(path.join(dir, file), 'utf8'));
    for (const slide of lesson.slides) if (slide.video) maxSeconds[`${lesson.lessonId}/${slide.id}`] = slide.video.maxSeconds;
  }
}

// ---------- Timing ----------
const FPS = 30;
const FADE = 0.6;
const DEFAULT_SECONDS = { title: 4, card: 7, end: 6, graphic: 8, image: 7 };
const secondsOf = (scene) => scene.seconds ?? DEFAULT_SECONDS[scene.type];
const lengthOf = (scenes) => scenes.reduce((sum, sc) => sum + secondsOf(sc), 0) - FADE * (scenes.length - 1);

// ---------- Pictures ----------
const STYLE =
  'Style: flat, modern editorial illustration for a calm, warm prenatal education app. Soft rounded shapes, simple forms, ' +
  'minimal detail, flat color with gentle soft shading, no textures, no harsh outlines. Color palette: deep teal #23716C as the ' +
  'main color, soft teal #DCEDEA for backgrounds and large areas, navy #1D2940 for dark details, and a small warm accent ' +
  'of marigold #E3A82B, plus natural skin tones and natural hair colors (never teal, green or blue hair). Light, airy background. ' +
  'Mood: calm, hopeful, reassuring. Realistic, respectful body proportions and natural-looking hands. Everyone fully and modestly ' +
  'clothed or covered with a blanket. No text, letters, numbers, labels, or logos anywhere in the image. Nothing graphic: no blood, ' +
  'no medical procedures, no needles. Wide 16:9 landscape image with the main action near the center and the lower fifth kept ' +
  'simple, because a caption will sit there.';

function promptFor(board, scene, hasCastReference) {
  return [
    'Use the first attached image only as a reference for the illustration style, colors, and level of detail, so this picture looks like part of the same set. Do not reuse its people or its room.',
    hasCastReference
      ? 'The second attached image is an earlier scene from this same short video: keep the same people looking the same (faces, skin tones, hair, clothes) and the same home or room where it fits.'
      : '',
    `The people in this video: ${board.cast}.`,
    `Scene: ${scene.prompt}`,
    note ? `Also: ${note}` : '',
    STYLE,
  ]
    .filter(Boolean)
    .join('\n\n');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function generate(prompt, images) {
  const body = {
    contents: [{ parts: [{ text: prompt }, ...images.map((data) => ({ inline_data: { mime_type: 'image/jpeg', data } }))] }],
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
      const image = (data.candidates?.[0]?.content?.parts || []).find((p) => p.inlineData || p.inline_data);
      if (image) return (image.inlineData || image.inline_data).data;
      throw new Error(`Gemini returned no image (${data.candidates?.[0]?.finishReason || data.promptFeedback?.blockReason || 'unknown'}).`);
    }
    if ((res.status === 429 || res.status >= 500) && attempt < 5) {
      console.log(`  Gemini is busy (${res.status}); trying again.`);
      await sleep(2000 * 2 ** attempt);
      continue;
    }
    throw new Error(`Gemini error ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
}

/** Saves a picture as a 1920x1080 JPEG, cropped to 16:9 from the centre. */
function savePicture(base64, outFile) {
  const tmp = `${outFile}.source`;
  writeFileSync(tmp, Buffer.from(base64, 'base64'));
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', tmp, '-vf', "crop='min(iw,ih*16/9)':'min(ih,iw*9/16)',scale=1920:1080", '-q:v', '2', outFile]);
  rmSync(tmp);
}

// ---------- Captions, cards and graphics (rendered by Chromium) ----------
const esc = (t = '') => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const PAGE_STYLE = `
  * { margin: 0; box-sizing: border-box; }
  body { width: 1920px; height: 1080px; font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #1D2940; }
  .cap { position: absolute; left: 0; right: 0; bottom: 64px; margin: 0 auto; width: fit-content; max-width: 1600px; background: rgba(255,255,255,0.94);
         border-radius: 28px; padding: 26px 44px; box-shadow: 0 8px 30px rgba(29,41,64,0.14); text-align: center; }
  .cap .main { font-size: 50px; font-weight: 700; line-height: 1.2; }
  .cap .sub { font-size: 38px; font-weight: 500; color: #23716C; margin-top: 8px; line-height: 1.25; }
  .full { width: 1920px; height: 1080px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 0 220px; gap: 28px; }
  .title { background: #DCEDEA; }
  .title .eyebrow { font-size: 30px; font-weight: 700; letter-spacing: 4px; text-transform: uppercase; color: #23716C; }
  .title h1 { font-size: 92px; font-weight: 800; line-height: 1.1; }
  .card { background: #EEF3F6; }
  .card h2 { font-size: 72px; font-weight: 800; line-height: 1.15; }
  .card p { font-size: 50px; font-weight: 500; color: #23716C; line-height: 1.25; }
  .end { background: #23716C; color: #FFFFFF; }
  .end h2 { font-size: 72px; font-weight: 800; line-height: 1.2; }
  .bar { width: 120px; height: 10px; border-radius: 5px; background: #E3A82B; }
  .graphic { background: #EEF3F6; justify-content: flex-start; padding: 70px 0 0; }
`;

/** Waves for the timing-contractions graphics: two contractions with a rest between, and a bracket. */
function contractionSvg(which) {
  const wave = (x) => `M ${x} 330 C ${x + 60} 330, ${x + 90} 120, ${x + 160} 120 C ${x + 230} 120, ${x + 260} 330, ${x + 320} 330`;
  const bracket = (x1, x2, y, label, color) => `
    <path d="M ${x1} ${y + 26} L ${x1} ${y} L ${x2} ${y} L ${x2} ${y + 26}" fill="none" stroke="${color}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="${(x1 + x2) / 2}" y="${y - 24}" font-size="44" font-weight="800" fill="${color}" text-anchor="middle">${label}</text>`;
  const marks = [180, 500, 860, 1180].map((x) => `<line x1="${x}" x2="${x}" y1="330" y2="370" stroke="#5A6680" stroke-width="5"/>`).join('');
  return `<svg width="1640" height="656" viewBox="0 100 1400 560" xmlns="http://www.w3.org/2000/svg" style="font-family: Inter, system-ui, sans-serif">
    <line x1="80" x2="1320" y1="330" y2="330" stroke="#D5DEE6" stroke-width="8" stroke-linecap="round"/>
    <path d="${wave(180)}" fill="#DCEDEA" stroke="#23716C" stroke-width="8"/>
    <path d="${wave(860)}" fill="#DCEDEA" stroke="#23716C" stroke-width="8"/>
    <text x="680" y="310" font-size="36" fill="#5A6680" text-anchor="middle">rest</text>
    ${marks}
    <text x="180" y="420" font-size="32" fill="#5A6680" text-anchor="middle">start</text>
    <text x="500" y="420" font-size="32" fill="#5A6680" text-anchor="middle">end</text>
    <text x="860" y="420" font-size="32" fill="#5A6680" text-anchor="middle">start</text>
    ${which !== 'how-often' ? bracket(180, 500, 520, 'How long', '#23716C') : ''}
    ${which !== 'how-long' ? bracket(180, 860, which === 'both' ? 620 : 520, 'How often', '#B07A10') : ''}
  </svg>`;
}


/** A front view of a baby buckled into an infant seat, with one part of the harness check highlighted. */
function harnessSvg(which) {
  const strapL = 'M 640 214 C 652 260, 668 330, 690 400';
  const strapR = 'M 760 214 C 748 260, 732 330, 710 400';
  const focus = {
    'harness-straps': { x: 700, y: 214, r: 92, label: 'Straps at or below the shoulders' },
    'harness-pinch': { x: 760, y: 236, r: 70, label: 'No slack to pinch at the shoulder' },
    'harness-clip': { x: 700, y: 278, r: 84, label: 'Chest clip at armpit level' },
  }[which];
  const pinch = which === 'harness-pinch'
    ? `<ellipse cx="800" cy="226" rx="16" ry="28" fill="#E8C4A6" stroke="#B98D6E" stroke-width="4" transform="rotate(-30 800 226)"/>
       <ellipse cx="770" cy="262" rx="15" ry="26" fill="#E8C4A6" stroke="#B98D6E" stroke-width="4" transform="rotate(-30 770 262)"/>`
    : '';
  return `<svg width="1640" height="700" viewBox="420 30 1220 520" xmlns="http://www.w3.org/2000/svg" style="font-family: Inter, system-ui, sans-serif">
    <path d="M 560 520 L 540 150 C 540 60, 860 60, 860 150 L 840 520 Z" fill="#23716C"/>
    <path d="M 588 500 L 574 170 C 574 100, 826 100, 826 170 L 812 500 Z" fill="#DCEDEA"/>
    <rect x="626" y="206" width="28" height="12" rx="4" fill="#1D2940"/>
    <rect x="746" y="206" width="28" height="12" rx="4" fill="#1D2940"/>
    <circle cx="700" cy="150" r="58" fill="#F3D9C4" stroke="#C99E80" stroke-width="5"/>
    <path d="M 620 236 C 620 210, 780 210, 780 236 L 772 470 L 628 470 Z" fill="#FFFFFF" stroke="#D5DEE6" stroke-width="4"/>
    <path d="M 624 240 C 596 290, 600 350, 612 380" fill="none" stroke="#FFFFFF" stroke-width="34" stroke-linecap="round"/>
    <path d="M 776 240 C 804 290, 800 350, 788 380" fill="none" stroke="#FFFFFF" stroke-width="34" stroke-linecap="round"/>
    <path d="${strapL}" fill="none" stroke="#1D2940" stroke-width="22" stroke-linecap="round"/>
    <path d="${strapR}" fill="none" stroke="#1D2940" stroke-width="22" stroke-linecap="round"/>
    <path d="M 700 400 L 700 486" stroke="#1D2940" stroke-width="22" stroke-linecap="round"/>
    <rect x="676" y="388" width="48" height="34" rx="8" fill="#5A6680"/>
    <rect x="642" y="266" width="116" height="26" rx="8" fill="#E3A82B" stroke="#B07A10" stroke-width="3"/>
    ${pinch}
    <circle cx="${focus.x}" cy="${focus.y}" r="${focus.r}" fill="none" stroke="#E3A82B" stroke-width="7" stroke-dasharray="14 12"/>
    <line x1="${focus.x + focus.r}" y1="${focus.y}" x2="948" y2="${focus.y}" stroke="#E3A82B" stroke-width="5"/>
    <text x="960" y="${focus.y + 14}" font-size="40" font-weight="800" fill="#1D2940">${focus.label}</text>
  </svg>`;
}

function overlayHtml(scene) {
  const caption = scene.caption ? `<div class="cap"><div class="main">${esc(scene.caption)}</div>${scene.sub ? `<div class="sub">${esc(scene.sub)}</div>` : ''}</div>` : '';
  switch (scene.type) {
    case 'title':
      return `<div class="full title"><div class="eyebrow">Watch</div><h1>${esc(scene.text)}</h1><div class="bar"></div></div>`;
    case 'card':
      return `<div class="full card"><h2>${esc(scene.text)}</h2>${scene.sub ? `<p>${esc(scene.sub)}</p>` : ''}</div>`;
    case 'end':
      return `<div class="full end"><div class="bar"></div><h2>${esc(scene.text)}</h2></div>`;
    case 'graphic':
      return `<div class="full graphic">${scene.graphic.startsWith('harness') ? harnessSvg(scene.graphic) : contractionSvg(scene.graphic)}</div>${caption}`;
    default:
      return caption;
  }
}

async function renderOverlays(jobs) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  for (const { html, out, transparent } of jobs) {
    await page.setContent(`<html><head><style>${PAGE_STYLE}</style></head><body${transparent ? ' style="background: transparent"' : ''}>${html}</body></html>`);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: out, omitBackground: transparent });
  }
  await browser.close();
}

// ---------- Video ----------
function sceneClip(scene, picture, overlay, out) {
  const seconds = secondsOf(scene);
  const frames = Math.round(seconds * FPS);
  if (scene.type === 'image') {
    // A slow push in from 100% to 106%, worked on a 4K copy so the motion stays smooth.
    const filter =
      `[0]scale=3840:2160,zoompan=z='1+0.06*on/${frames}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1920x1080:fps=${FPS}[bg];` +
      `[1]format=rgba,fade=in:st=0.6:d=0.5:alpha=1[cap];[bg][cap]overlay=format=auto,format=yuv420p`;
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-loop', '1', '-framerate', `${FPS}`, '-t', `${seconds}`, '-i', picture,
      '-loop', '1', '-framerate', `${FPS}`, '-t', `${seconds}`, '-i', overlay, '-filter_complex', filter,
      '-frames:v', `${frames}`, '-c:v', 'libx264', '-crf', '16', '-preset', 'fast', out]);
  } else {
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-loop', '1', '-framerate', `${FPS}`, '-t', `${seconds}`, '-i', overlay,
      '-vf', 'format=yuv420p', '-frames:v', `${frames}`, '-c:v', 'libx264', '-crf', '16', '-preset', 'fast', out]);
  }
}

function joinClips(clips, durations, out) {
  const inputs = clips.flatMap((clip) => ['-i', clip]);
  let filter = '';
  let last = '[0:v]';
  let offset = 0;
  for (let i = 1; i < clips.length; i++) {
    offset += durations[i - 1] - FADE;
    const label = i === clips.length - 1 ? '[v]' : `[x${i}]`;
    filter += `${last}[${i}:v]xfade=transition=fade:duration=${FADE}:offset=${offset.toFixed(3)}${label};`;
    last = label;
  }
  const total = lengthOf(durations.map((seconds) => ({ seconds })));
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...inputs, '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo',
    '-filter_complex', filter.replace(/;$/, ''), '-map', '[v]', '-map', `${clips.length}:a`, '-t', total.toFixed(3),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '64k', '-movflags', '+faststart', out]);
}

// ---------- Run ----------
if (!keys.length) {
  console.log('No storyboard matches --only.');
  process.exit(1);
}
if (!apiKey) {
  console.error('Set GEMINI_API_KEY first (in the environment settings, never in the code).');
  process.exit(1);
}
const reference = readFileSync(referencePath).toString('base64');

for (const key of keys) {
  const board = boards[key];
  const [lessonId, slideId] = key.split('/');
  const dir = path.join(draftsDir, lessonId, slideId);
  mkdirSync(dir, { recursive: true });
  const length = lengthOf(board.scenes);
  console.log(`\n${key}: ${board.scenes.length} scenes, ${length.toFixed(1)} s (limit ${maxSeconds[key]} s)`);
  if (maxSeconds[key] && length > maxSeconds[key]) throw new Error(`${key} is ${length.toFixed(1)} s, over its ${maxSeconds[key]} s limit.`);

  // Pictures: the first picture sets the cast; later ones are drawn with it as a reference.
  let castReference = null;
  const pictures = [];
  for (const [i, scene] of board.scenes.entries()) {
    const file = path.join(dir, `scene-${String(i + 1).padStart(2, '0')}.jpg`);
    pictures.push(file);
    if (scene.type !== 'image') continue;
    if (!existsSync(file) || redo.includes(i + 1)) {
      const images = castReference ? [reference, castReference] : [reference];
      const data = await generate(promptFor(board, scene, Boolean(castReference)), images);
      savePicture(data, file);
      console.log(`  Drew scene ${i + 1}`);
      await sleep(1200);
    }
    castReference ??= readFileSync(file).toString('base64');
  }
  if (stillsOnly) continue;

  // Overlays: a transparent caption for each picture, or the full card.
  const overlays = board.scenes.map((_, i) => path.join(dir, `overlay-${String(i + 1).padStart(2, '0')}.png`));
  await renderOverlays(board.scenes.map((scene, i) => ({ html: overlayHtml(scene), out: overlays[i], transparent: scene.type === 'image' })));

  const clips = board.scenes.map((_, i) => path.join(dir, `clip-${String(i + 1).padStart(2, '0')}.mp4`));
  board.scenes.forEach((scene, i) => sceneClip(scene, pictures[i], overlays[i], clips[i]));
  const out = path.join(draftsDir, lessonId, `${slideId}.mp4`);
  joinClips(clips, board.scenes.map(secondsOf), out);
  clips.forEach((clip) => rmSync(clip));
  console.log(`  Saved ${path.relative(root, out)} (${(statSync(out).size / 1e6).toFixed(1)} MB)`);
}
