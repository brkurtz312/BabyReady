import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

/**
 * Animations drawn in code for video slides, keyed by "lessonId/slideId". Like the
 * drawn pictures (LessonVisuals.tsx), each one uses only what its lesson already
 * says. A slide with a video file (src/content/videos.ts) shows that instead.
 */

const c = {
  ink: '#1D2940',
  muted: '#5A6680',
  line: '#D5DEE6',
  surface: '#FFFFFF',
  bg: '#EEF3F6',
  lagoon: '#23716C',
  lagoonSoft: '#DCEDEA',
  marigold: '#E3A82B',
  marigoldSoft: '#FBF0D6',
  baby: '#F3D9C4',
  babyLine: '#C99E80',
};

// ---------- Cervix thinning and opening ----------

/** One moment of the animation: how thin the cervix is (0 to 1) and how open (0 to 10 cm). */
type Moment = { thin: number; cm: number; title: string; detail: string };

// Each part runs for a share of the animation. These are not clinical times:
// every labor has its own pace, and the lesson says so.
const PARTS: { seconds: number; from: Omit<Moment, 'title' | 'detail'>; to: Omit<Moment, 'title' | 'detail'>; title: string; detail: string }[] = [
  { seconds: 4, from: { thin: 0, cm: 0 }, to: { thin: 0, cm: 0 }, title: 'Before labor', detail: 'The cervix is long, firm, and closed.' },
  { seconds: 9, from: { thin: 0, cm: 0 }, to: { thin: 1, cm: 1 }, title: 'Thinning', detail: 'Contractions thin the cervix. This is called effacement.' },
  { seconds: 15, from: { thin: 1, cm: 1 }, to: { thin: 1, cm: 6 }, title: 'Early labor', detail: 'The cervix slowly opens to around 6 cm. This is called dilation.' },
  { seconds: 7, from: { thin: 1, cm: 6 }, to: { thin: 1, cm: 8.5 }, title: 'Active labor', detail: 'From around 6 cm, the cervix usually opens faster.' },
  { seconds: 5, from: { thin: 1, cm: 8.5 }, to: { thin: 1, cm: 10 }, title: 'Transition', detail: 'The end of active labor, as the cervix nears 10 cm.' },
  { seconds: 5, from: { thin: 1, cm: 10 }, to: { thin: 1, cm: 10 }, title: '10 cm: fully open', detail: 'Ready for the second stage: pushing.' },
];
const TOTAL = PARTS.reduce((sum, p) => sum + p.seconds, 0);

// SVG text otherwise falls back to a serif face on the web.
const FONT = Platform.OS === 'web' ? 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' : undefined;

const ease = (x: number) => x * x * (3 - 2 * x);

function momentAt(t: number): Moment {
  let start = 0;
  for (const part of PARTS) {
    if (t <= start + part.seconds) {
      const k = ease(Math.min(1, Math.max(0, (t - start) / part.seconds)));
      return {
        thin: part.from.thin + (part.to.thin - part.from.thin) * k,
        cm: part.from.cm + (part.to.cm - part.from.cm) * k,
        title: part.title,
        detail: part.detail,
      };
    }
    start += part.seconds;
  }
  const last = PARTS[PARTS.length - 1];
  return { ...last.to, title: last.title, detail: last.detail };
}

/** How strongly the uterus is squeezing at time t (0 to 1): contractions come closer together as labor goes on. */
function squeezeAt(t: number): number {
  if (t < 4 || t > TOTAL - 5) return 0;
  const progress = (t - 4) / (TOTAL - 9);
  const gap = 5 - 2.5 * progress;
  const phase = ((t - 4) % gap) / gap;
  return phase < 0.4 ? Math.sin((phase / 0.4) * Math.PI) : 0;
}

function SideView({ thin, cm, squeeze }: { thin: number; cm: number; squeeze: number }) {
  const cx = 100;
  const neckY = 150;
  const gap = (cm / 10) * 46; // the opening, 0 to 46 units (the baby's head is 52)
  const length = 30 - 26 * thin; // long and closed, then thin
  const wall = 10;
  const half = gap / 2 + wall / 2;
  const s = 1 - 0.035 * squeeze;
  const headY = 122 + (cm / 10) * 12;
  const uterus = `M ${cx - half} ${neckY + length} L ${cx - half} ${neckY}
    C ${cx - half - 18} ${neckY - 14}, ${cx - 70} ${neckY - 30}, ${cx - 70} ${88}
    C ${cx - 70} ${22}, ${cx + 70} ${22}, ${cx + 70} ${88}
    C ${cx + 70} ${neckY - 30}, ${cx + half + 18} ${neckY - 14}, ${cx + half} ${neckY}
    L ${cx + half} ${neckY + length}`;
  return (
    <G>
      <G origin={`${cx}, 90`} scale={s}>
        {/* Baby, head down: outline both shapes, then fill over them so they read as one silhouette. */}
        <Ellipse cx={cx + 6} cy={76} rx={38} ry={33} stroke={c.babyLine} strokeWidth={3} />
        <Circle cx={cx} cy={headY} r={26} stroke={c.babyLine} strokeWidth={3} />
        <Ellipse cx={cx + 6} cy={76} fill={c.baby} rx={38} ry={33} />
        <Circle cx={cx} cy={headY} fill={c.baby} r={26} />
        <Path d={uterus} fill="none" stroke={squeeze > 0.05 ? c.lagoon : '#3E8A84'} strokeLinecap="round" strokeWidth={wall} />
      </G>
      {squeeze > 0.05 ? (
        <SvgText fill={c.lagoon} fontFamily={FONT} fontSize={14} fontWeight="700" opacity={Math.min(1, squeeze * 2)} textAnchor="middle" x={cx} y={14}>
          Contraction
        </SvgText>
      ) : null}
      <SvgText fill={c.muted} fontFamily={FONT} fontSize={13} textAnchor="middle" x={cx} y={198}>
        Side view
      </SvgText>
    </G>
  );
}

function FrontView({ thin, cm }: { thin: number; cm: number }) {
  const cx = 270;
  const cy = 92;
  const open = Math.max(1.5, (cm / 10) * 40);
  const ring = 18 - 13 * thin;
  return (
    <G>
      <Circle cx={cx} cy={cy} fill={c.lagoonSoft} r={open + ring} stroke={c.lagoon} strokeWidth={2} />
      <Circle cx={cx} cy={cy} fill={c.bg} r={open} stroke={c.lagoon} strokeWidth={2} />
      <SvgText fill={c.ink} fontFamily={FONT} fontSize={24} fontWeight="800" textAnchor="middle" x={cx} y={172}>
        {`${Math.round(cm)} cm`}
      </SvgText>
      <SvgText fill={c.muted} fontFamily={FONT} fontSize={13} textAnchor="middle" x={cx} y={198}>
        Opening, seen from below
      </SvgText>
    </G>
  );
}

function CmScale({ cm }: { cm: number }) {
  const x0 = 24;
  const x1 = 336;
  const at = (v: number) => x0 + ((x1 - x0) * v) / 10;
  return (
    <G>
      <Rect fill={c.lagoonSoft} height={10} rx={5} width={at(6) - x0} x={x0} y={18} />
      <Rect fill={c.marigoldSoft} height={10} rx={5} width={x1 - at(6)} x={at(6)} y={18} />
      <SvgText fill={c.ink} fontFamily={FONT} fontSize={13} fontWeight="700" textAnchor="middle" x={(x0 + at(6)) / 2} y={12}>
        Early labor
      </SvgText>
      <SvgText fill={c.ink} fontFamily={FONT} fontSize={13} fontWeight="700" textAnchor="middle" x={(at(6) + x1) / 2} y={12}>
        Active labor
      </SvgText>
      {[0, 6, 10].map((v) => (
        <SvgText fill={c.muted} fontFamily={FONT} fontSize={12} key={v} textAnchor="middle" x={at(v)} y={44}>
          {`${v} cm`}
        </SvgText>
      ))}
      <Line stroke={c.ink} strokeWidth={2} x1={at(cm)} x2={at(cm)} y1={14} y2={32} />
      <Circle cx={at(cm)} cy={23} fill={c.ink} r={5} />
    </G>
  );
}

/** Plays an animation of `total` seconds: the current time, and a play/pause/replay toggle. */
function usePlayback(total: number, onPlay: () => void) {
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const startRef = useRef(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) return;
    startRef.current = Date.now() - t * 1000;
    let last = 0;
    const tick = () => {
      const now = (Date.now() - startRef.current) / 1000;
      if (now >= total) {
        setT(total);
        setPlaying(false);
        return;
      }
      // About 30 frames a second is smooth enough and easy on the phone.
      if (now - last > 0.033) {
        last = now;
        setT(now);
      }
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
    // Restarting the loop only when play state changes; `t` is read once at start.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  const finished = t >= total;

  function toggle() {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (finished) setT(0);
    onPlay();
    setPlaying(true);
  }

  return { t, playing, finished, toggle };
}

function PlayButton({ playing, finished, onPress }: { playing: boolean; finished: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel={playing ? 'Pause animation' : finished ? 'Replay animation' : 'Play animation'}
      accessibilityRole="button"
      onPress={onPress}
      style={s.button}
    >
      <Text style={s.buttonText}>{playing ? '❚❚  Pause' : finished ? '↺  Replay' : '▶  Play'}</Text>
    </Pressable>
  );
}

function DilationAnimation({ onPlay }: { onPlay: () => void }) {
  const { t, playing, finished, toggle } = usePlayback(TOTAL, onPlay);

  const m = momentAt(t);
  const squeeze = playing ? squeezeAt(t) : 0;

  return (
    <View
      accessibilityLabel="Animation of the first stage of labor. A side view and a view from below show the cervix thinning, then opening from 0 to 10 centimeters as contractions pulse. Early labor is up to around 6 centimeters, active labor from around 6 to 10, and transition is the end of active labor. 10 centimeters means fully open."
      style={s.frame}
    >
      <View accessibilityLiveRegion="polite" style={s.copy}>
        <Text style={s.title}>{m.title}</Text>
        <Text style={s.detail}>{m.detail}</Text>
      </View>
      <Svg style={s.drawing} viewBox="0 0 360 205">
        <SideView cm={m.cm} squeeze={squeeze} thin={m.thin} />
        <FrontView cm={m.cm} thin={m.thin} />
      </Svg>
      <Svg style={s.scale} viewBox="0 0 360 50">
        <CmScale cm={m.cm} />
      </Svg>
      <View style={s.footer}>
        <PlayButton finished={finished} onPress={toggle} playing={playing} />
        <Text style={s.note}>Not to scale in time. Every labor has its own pace.</Text>
      </View>
    </View>
  );
}

// ---------- Stage 2: pushing and birth ----------

const PUSH_STEPS = [
  { seconds: 4, title: 'Fully open', detail: 'The cervix is fully open. Your baby begins moving down through your pelvis.' },
  { seconds: 12, title: 'Pushing', detail: 'Push with your contractions, rest between them. Each push moves your baby a little, even when it doesn’t feel like it.' },
  { seconds: 5, title: 'Crowning', detail: 'Your baby’s head reaches the vaginal opening and stays visible between contractions. This is called crowning.' },
  { seconds: 6, title: 'Birth', detail: 'First the head, then the shoulders turn and slip out, and the rest of the body follows quickly.' },
];
const PUSH_TOTAL = PUSH_STEPS.reduce((sum, step) => sum + step.seconds, 0);
const PUSH_STARTS = PUSH_STEPS.map((_, i) => PUSH_STEPS.slice(0, i).reduce((sum, step) => sum + step.seconds, 0));

/**
 * How far down the baby's head has come (0 at the open cervix, 1 at crowning,
 * past 1 as the baby is born), and whether a push is happening. Each of four
 * contractions brings the head lower, and it slips back a little in the rest
 * after, as the lesson describes.
 */
function descentAt(t: number): { d: number; push: number } {
  const [, pushing, crowning, birth] = PUSH_STARTS;
  if (t < pushing) return { d: 0, push: 0 };
  if (t < crowning) {
    const cycle = PUSH_STEPS[1].seconds / 4;
    const n = Math.floor((t - pushing) / cycle);
    const phase = ((t - pushing) % cycle) / cycle;
    const before = n * 0.2;
    const pushPart = 0.55;
    if (phase < pushPart) {
      const k = ease(phase / pushPart);
      return { d: before + 0.28 * k, push: Math.sin((phase / pushPart) * Math.PI) };
    }
    const k = ease((phase - pushPart) / (1 - pushPart));
    return { d: before + 0.28 - 0.08 * k, push: 0 };
  }
  if (t < birth) return { d: 0.8 + 0.2 * ease(Math.min(1, (t - crowning) / 2.5)), push: 0 };
  return { d: 1 + 1.6 * ease(Math.min(1, (t - birth) / (PUSH_STEPS[3].seconds - 1.5))), push: 0 };
}

function PushingDrawing({ t }: { t: number }) {
  const cx = 180;
  const neckY = 130;
  const openY = 224;
  const { d, push } = descentAt(t);
  // The head runs from the cervix down to crowning at the opening, then out, ending
  // with the baby turned on its side just below the opening.
  const hy = d <= 1 ? neckY - 12 + d * (openY - neckY + 12) : openY + (d - 1) * 21;
  const born = Math.max(0, Math.min(1, (d - 1.2) / 1.2));
  const turn = 90 * ease(born);
  const by = hy - 44;
  const s = 1 - 0.035 * push - 0.18 * Math.max(0, d - 1) / 1.6;

  // Canal walls stretch around the baby where it passes.
  const half = (y: number) => {
    const base = 25 + ((y - neckY) / (openY - neckY)) * 2;
    const headBulge = Math.max(0, 27 - base) * Math.exp(-(((y - hy) / 20) ** 2));
    const bodyBulge = Math.max(0, 34 - base) * Math.exp(-(((y - by) / 26) ** 2)) * (born > 0.4 ? 0 : 1);
    return base + Math.max(headBulge, bodyBulge);
  };
  const points = (sign: number) =>
    Array.from({ length: 17 }, (_, i) => {
      const y = neckY + ((openY - neckY) * i) / 16;
      return `${cx + sign * half(y)},${y}`;
    }).join(' ');

  const wall = 10;
  const uh = 31;
  const top = (y: number) => neckY + (y - neckY) * s;
  const uterus = `M ${cx - uh} ${neckY}
    C ${cx - uh - 18} ${top(116)}, ${cx - 72} ${top(102)}, ${cx - 72} ${top(74)}
    C ${cx - 72} ${top(10)}, ${cx + 72} ${top(10)}, ${cx + 72} ${top(74)}
    C ${cx + 72} ${top(102)}, ${cx + uh + 18} ${top(116)}, ${cx + uh} ${neckY}`;

  return (
    <G>
      <Path d={uterus} fill="none" stroke={push > 0.05 ? c.lagoon : '#3E8A84'} strokeLinecap="round" strokeWidth={wall} />
      {/* The baby: head down, then turned to lie on its side once born. */}
      <G origin={`${cx}, ${hy}`} rotation={turn}>
        <Ellipse cx={cx + 6} cy={by} rx={34} ry={30} stroke={c.babyLine} strokeWidth={3} />
        <Circle cx={cx} cy={hy} r={24} stroke={c.babyLine} strokeWidth={3} />
        <Ellipse cx={cx + 6} cy={by} fill={c.baby} rx={34} ry={30} />
        <Circle cx={cx} cy={hy} fill={c.baby} r={24} />
      </G>
      <Path d={`M ${points(-1).split(' ').join(' L ')}`.replace('M ', 'M ')} fill="none" stroke="#3E8A84" strokeLinecap="round" strokeLinejoin="round" strokeWidth={6} />
      <Path d={`M ${points(1).split(' ').join(' L ')}`} fill="none" stroke="#3E8A84" strokeLinecap="round" strokeLinejoin="round" strokeWidth={6} />
      {push > 0.05 ? (
        <SvgText fill={c.lagoon} fontFamily={FONT} fontSize={14} fontWeight="700" opacity={Math.min(1, push * 2)} textAnchor="middle" x={cx} y={14}>
          Contraction: push
        </SvgText>
      ) : null}
      <SvgText fill={c.muted} fontFamily={FONT} fontSize={12} textAnchor="start" x={262} y={66}>
        Uterus
      </SvgText>
      <SvgText fill={c.muted} fontFamily={FONT} fontSize={12} textAnchor="start" x={226} y={neckY + 4}>
        Cervix, fully open
      </SvgText>
      <SvgText fill={c.muted} fontFamily={FONT} fontSize={12} textAnchor="end" x={140} y={openY + 4}>
        Vaginal opening
      </SvgText>
    </G>
  );
}

/** Stage 2 of labor, for its video slide: plays on demand, like the dilation animation. */
function PushingAnimation({ onPlay }: { onPlay: () => void }) {
  const { t, playing, finished, toggle } = usePlayback(PUSH_TOTAL, onPlay);
  let step = PUSH_STEPS[0];
  PUSH_STEPS.forEach((candidate, i) => {
    if (t >= PUSH_STARTS[i]) step = candidate;
  });
  return (
    <View
      accessibilityLabel="Animation of the second stage of labor, in side view. With the cervix fully open, the baby moves down through the birth canal a little with each push, slipping back slightly between contractions. The head reaches the vaginal opening and stays visible, which is crowning. Then the head is born, the shoulders turn, and the rest of the body follows."
      style={s.frame}
    >
      <View accessibilityLiveRegion="polite" style={s.copy}>
        <Text style={s.title}>{step.title}</Text>
        <Text style={s.detail}>{step.detail}</Text>
      </View>
      <Svg style={s.pushing} viewBox="0 0 360 300">
        <PushingDrawing t={t} />
      </Svg>
      <View style={s.footer}>
        <PlayButton finished={finished} onPress={toggle} playing={playing} />
        <Text style={s.note}>Not to scale in time. Pushing can take minutes or a few hours.</Text>
      </View>
    </View>
  );
}

// ---------- Breathing along with a practice contraction ----------

/** One step of a breathing pattern: the circle grows on a breath in and shrinks on a breath out. */
type Breath = { cue: string; seconds: number; to: number };

// The circle's size runs from 0 (empty lungs) to 1 (a full, deep breath).
const cleansing: Breath[] = [
  { cue: 'Cleansing breath in', seconds: 3, to: 1 },
  { cue: 'And sigh it out', seconds: 4, to: 0 },
];
const slow: Breath[] = [
  { cue: 'Breathe in slowly', seconds: 4, to: 0.8 },
  { cue: 'Long, slow breath out', seconds: 6, to: 0.1 },
];
const light: Breath[] = [
  { cue: 'Light breath in', seconds: 1, to: 0.45 },
  { cue: 'Light breath out', seconds: 1, to: 0.2 },
];
const repeat = (pattern: Breath[], times: number) => Array.from({ length: times }, () => pattern).flat();

// Slow breathing follows the lesson: in for about 4 counts, out for about 6.
const BREATHING: Record<'slow' | 'lighter', Breath[]> = {
  slow: [...cleansing, ...repeat(slow, 5), ...cleansing],
  lighter: [...cleansing, ...repeat(slow, 2), ...repeat(light, 8), ...repeat(slow, 2), ...cleansing],
};

function breathAt(pattern: Breath[], t: number): { cue: string; size: number; step: number } {
  let start = 0;
  let from = 0;
  for (const [step, breath] of pattern.entries()) {
    if (t < start + breath.seconds) {
      const x = ease((t - start) / breath.seconds);
      return { cue: breath.cue, size: from + (breath.to - from) * x, step };
    }
    start += breath.seconds;
    from = breath.to;
  }
  return { cue: 'Contraction over. Rest.', size: 0, step: pattern.length };
}

/** How strong the practice contraction is (0 to 1): it builds, peaks in the middle, and fades. */
const strengthAt = (t: number, total: number) => Math.sin(Math.PI * Math.min(Math.max(t / total, 0), 1)) ** 1.5;

function BreathingGuide({ kind, onPlay }: { kind: 'slow' | 'lighter'; onPlay: () => void }) {
  const pattern = BREATHING[kind];
  const total = pattern.reduce((sum, b) => sum + b.seconds, 0);
  const { t, playing, finished, toggle } = usePlayback(total, onPlay);
  const breath = breathAt(pattern, t);
  const strength = strengthAt(t, total);
  const phase = t === 0 ? 'Ready' : finished ? 'Rest' : strength < 0.35 ? 'Building' : strength > 0.85 ? 'Peak' : t < total / 2 ? 'Building' : 'Fading';
  const radius = 34 + breath.size * 46;

  // The wave across the bottom: the contraction's strength over time, with a dot for now.
  const wave = Array.from({ length: 61 }, (_, i) => {
    const x = 20 + (i / 60) * 320;
    const y = 200 - strengthAt((i / 60) * total, total) * 44;
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
  const dotX = 20 + (Math.min(t, total) / total) * 320;
  const dotY = 200 - strength * 44;

  return (
    <View
      accessibilityLabel={
        kind === 'slow'
          ? 'Breathing guide for one practice contraction, about one minute. A cleansing breath, then slow breaths in for about 4 counts and out for about 6, then a closing cleansing breath. A circle grows on each breath in and shrinks on each breath out, and a wave shows the contraction building, peaking, and fading.'
          : 'Breathing guide for one practice contraction, about one minute. A cleansing breath and slow breathing as it builds, lighter quicker breaths at the peak, slow breathing as it fades, and a closing cleansing breath. A circle grows and shrinks with each breath, and a wave shows the contraction building, peaking, and fading.'
      }
      style={s.frame}
    >
      <View accessibilityLiveRegion="polite" style={s.copy}>
        <Text style={s.title}>{t === 0 ? 'Press play when you are ready' : breath.cue}</Text>
        <Text style={s.detail}>Contraction: {phase.toLowerCase()}</Text>
      </View>
      <Svg style={s.breathing} viewBox="0 0 360 215">
        <Circle cx={180} cy={92} fill={c.lagoonSoft} r={80} />
        <Circle cx={180} cy={92} fill={c.lagoon} opacity={0.85} r={radius} />
        <SvgText fill={c.surface} fontFamily={FONT} fontSize={15} fontWeight="700" textAnchor="middle" x={180} y={97}>
          {breath.step >= pattern.length || t === 0 ? '' : breath.cue.includes('out') ? 'Out' : 'In'}
        </SvgText>
        <Line stroke={c.line} strokeWidth={1} x1={20} x2={340} y1={200} y2={200} />
        <Path d={wave} fill="none" stroke={c.marigold} strokeWidth={3} />
        <Circle cx={dotX} cy={dotY} fill={c.ink} r={5} />
      </Svg>
      <View style={s.footer}>
        <PlayButton finished={finished} onPress={toggle} playing={playing} />
        <Text style={s.note}>A practice contraction of about a minute. Real ones vary.</Text>
      </View>
    </View>
  );
}

// ---------- The registry ----------

const ANIMATIONS: Record<string, (onPlay: () => void) => React.ReactElement> = {
  'stages-of-labor/dilation-video': (onPlay) => <DilationAnimation onPlay={onPlay} />,
  'stages-of-labor/pushing-video': (onPlay) => <PushingAnimation onPlay={onPlay} />,
  'breathing-and-relaxation/practice-slow': (onPlay) => <BreathingGuide kind="slow" onPlay={onPlay} />,
  'breathing-and-relaxation/practice-lighter': (onPlay) => <BreathingGuide kind="lighter" onPlay={onPlay} />,
};

/** The drawn animation for a video slide, or null when it has none. */
export function animationFor(lessonId: string, slideId: string, onPlay: () => void): React.ReactElement | null {
  const render = ANIMATIONS[`${lessonId}/${slideId}`];
  return render ? render(onPlay) : null;
}

const s = StyleSheet.create({
  frame: { alignSelf: 'stretch', backgroundColor: c.bg, borderRadius: 14, padding: 14, gap: 8 },
  copy: { gap: 2, minHeight: 62 },
  title: { color: c.lagoon, fontSize: 17, fontWeight: '800' },
  detail: { color: c.ink, fontSize: 14, lineHeight: 19 },
  drawing: { width: '100%', maxWidth: 520, alignSelf: 'center', aspectRatio: 360 / 205 },
  scale: { width: '100%', maxWidth: 520, alignSelf: 'center', aspectRatio: 360 / 50 },
  breathing: { width: '100%', maxWidth: 520, alignSelf: 'center', aspectRatio: 360 / 215 },
  pushing: { width: '100%', maxWidth: 520, alignSelf: 'center', aspectRatio: 360 / 300 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  button: { backgroundColor: c.lagoon, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 9 },
  buttonText: { color: c.surface, fontSize: 15, fontWeight: '800' },
  note: { color: c.muted, fontSize: 12, flexShrink: 1 },
});
