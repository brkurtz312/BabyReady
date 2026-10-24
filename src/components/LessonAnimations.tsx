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
 * How far down the baby's head has come (0 at the open cervix, 1 at crowning), and
 * whether a push is happening. Each of four contractions brings the head lower,
 * and it slips back a little in the rest after, as the lesson describes.
 */
function descentAt(t: number): { d: number; push: number } {
  const [, pushing, crowning] = PUSH_STARTS;
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
  return { d: 0.8 + 0.2 * ease(Math.min(1, (t - crowning) / 2.5)), push: 0 };
}

/** The birth itself, each part 0 to 1: the head comes out, the shoulders turn, then the body. */
function birthAt(t: number): { head: number; shoulders: number; body: number } {
  const b = t - PUSH_STARTS[3];
  const part = (from: number, to: number) => ease(Math.min(1, Math.max(0, (b - from) / (to - from))));
  return { head: part(0, 1.4), shoulders: part(1.5, 3.2), body: part(3.3, 5.0) };
}

type Birth = { head: number; shoulders: number; body: number };
const NOT_BORN: Birth = { head: 0, shoulders: 0, body: 0 };

function PushingDrawing({ t }: { t: number }) {
  const { d, push } = descentAt(t);
  return <BirthScene birth={t >= PUSH_STARTS[3] ? birthAt(t) : NOT_BORN} d={d} push={push} />;
}

/** Where the baby's head is in the scene, for drawing a vacuum cup or forceps on it. */
type HeadSpot = { cx: number; hy: number; r: number; openY: number };

/**
 * The side view of the second stage: uterus, birth canal and baby, with the head `d`
 * of the way from the open cervix (0) to crowning (1), then born per `birth`. `behind`
 * draws behind the baby and `front` over the canal walls.
 */
function BirthScene({
  d,
  push,
  birth,
  behind,
  front,
}: {
  d: number;
  push: number;
  birth: Birth;
  behind?: (head: HeadSpot) => React.ReactNode;
  front?: (head: HeadSpot) => React.ReactNode;
}) {
  const cx = 180;
  const neckY = 130;
  const openY = 224;

  // The head runs from the cervix down to crowning at the opening; once born, it
  // comes clear of the opening, waits while the shoulders turn, then the body follows
  // and the baby is turned on its side just below the opening.
  const r = 22;
  const hy = d < 1 ? neckY - 12 + d * (openY - neckY + 12) : openY + 26 * birth.head + 18 * birth.body;
  const lying = 90 * ease(Math.max(0, (birth.body - 0.55) / 0.45));
  // Inside, the shoulders lie side to side and look narrow from this side view; as
  // they turn front to back they look wide.
  const shoulderX = 17 + 13 * birth.shoulders;
  const sy = hy - 30;
  const ty = hy - 62;
  // Inside the canal until the body is out.
  const inside = birth.body < 1;

  // The canal opens to fit the baby wherever it is, and closes again behind it.
  const widthAt = (y: number) => {
    if (!inside || lying > 0) return 0;
    const circle = (cy: number, rad: number) => (Math.abs(y - cy) < rad ? Math.sqrt(rad * rad - (y - cy) ** 2) : 0);
    const ellipse = (cy: number, rx: number, ry: number) => (Math.abs(y - cy) < ry ? rx * Math.sqrt(1 - ((y - cy) / ry) ** 2) : 0);
    return Math.max(circle(hy, r), ellipse(sy, shoulderX, 12), ellipse(ty, 25, 30));
  };
  const half = (y: number) => {
    const base = 30 - ((y - neckY) / (openY - neckY)) * 13;
    return Math.max(base, widthAt(y) + 5);
  };
  const steps = 40;
  const wallPath = (sign: number) =>
    'M ' +
    Array.from({ length: steps + 1 }, (_, i) => {
      const y = neckY + ((openY - neckY) * i) / steps;
      return `${(cx + sign * half(y)).toFixed(1)} ${y.toFixed(1)}`;
    }).join(' L ');

  const s = 1 - 0.035 * push - 0.18 * birth.body;
  const wall = 10;
  const uh = 31;
  const top = (y: number) => neckY + (y - neckY) * s;
  const uterus = `M ${cx - uh} ${neckY}
    C ${cx - uh - 18} ${top(116)}, ${cx - 72} ${top(102)}, ${cx - 72} ${top(74)}
    C ${cx - 72} ${top(10)}, ${cx + 72} ${top(10)}, ${cx + 72} ${top(74)}
    C ${cx + 72} ${top(102)}, ${cx + uh + 18} ${top(116)}, ${cx + uh} ${neckY}`;
  // The ear shows the head turning to face the side as the shoulders turn.
  const earX = cx - 10 + 18 * birth.shoulders;
  const turning = birth.shoulders > 0.02 && birth.shoulders < 0.98;

  return (
    <G>
      <Path d={uterus} fill="none" stroke={push > 0.05 ? c.lagoon : '#3E8A84'} strokeLinecap="round" strokeWidth={wall} />
      {behind ? behind({ cx, hy, r, openY }) : null}
      {/* The baby, head down: body, shoulders, head; outlined first, then filled as one shape. */}
      <G origin={`${cx}, ${hy}`} rotation={lying}>
        <Ellipse cx={cx} cy={ty} rx={25} ry={30} stroke={c.babyLine} strokeWidth={3} />
        <Ellipse cx={cx} cy={sy} rx={shoulderX} ry={12} stroke={c.babyLine} strokeWidth={3} />
        <Circle cx={cx} cy={hy} r={r} stroke={c.babyLine} strokeWidth={3} />
        <Ellipse cx={cx} cy={ty} fill={c.baby} rx={25} ry={30} />
        <Ellipse cx={cx} cy={sy} fill={c.baby} rx={shoulderX} ry={12} />
        <Circle cx={cx} cy={hy} fill={c.baby} r={r} />
        <Ellipse cx={earX} cy={hy - 2} fill={c.babyLine} opacity={0.55} rx={3.5} ry={5} />
      </G>
      <Path d={wallPath(-1)} fill="none" stroke="#3E8A84" strokeLinecap="round" strokeLinejoin="round" strokeWidth={6} />
      <Path d={wallPath(1)} fill="none" stroke="#3E8A84" strokeLinecap="round" strokeLinejoin="round" strokeWidth={6} />
      {front ? front({ cx, hy, r, openY }) : null}
      {turning ? (
        <G opacity={Math.min(1, Math.sin(birth.shoulders * Math.PI) * 2)}>
          <Path d={`M ${cx + 40} ${sy + 18} A 34 14 0 0 0 ${cx - 40} ${sy + 18}`} fill="none" stroke={c.marigold} strokeLinecap="round" strokeWidth={3} />
          <Path d={`M ${cx - 40} ${sy + 18} l 9 -6 M ${cx - 40} ${sy + 18} l 10 4`} fill="none" stroke={c.marigold} strokeLinecap="round" strokeWidth={3} />
          <SvgText fill={c.ink} fontFamily={FONT} fontSize={13} fontWeight="700" textAnchor="start" x={cx + 48} y={sy + 22}>
            Shoulders turn
          </SvgText>
        </G>
      ) : null}
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
      <SvgText fill={c.muted} fontFamily={FONT} fontSize={12} textAnchor="end" x={132} y={openY + 4}>
        Vaginal opening
      </SvgText>
    </G>
  );
}

// ---------- Assisted vaginal birth: vacuum and forceps ----------

type Step = { seconds: number; title: string; detail: string };

const startsOf = (steps: Step[]) => steps.map((_, i) => steps.slice(0, i).reduce((sum, step) => sum + step.seconds, 0));
const totalOf = (steps: Step[]) => steps.reduce((sum, step) => sum + step.seconds, 0);
/** How far through step `i` the time `t` is, 0 to 1. */
const progress = (t: number, starts: number[], steps: Step[], i: number) => Math.min(1, Math.max(0, (t - starts[i]) / steps[i].seconds));

const LOW = 0.6;
const instrument = '#3B4D66';

function assistSteps(tool: 'vacuum' | 'forceps'): Step[] {
  const low = { seconds: 4, title: 'Baby low in the pelvis', detail: 'The cervix is fully open and your baby’s head is low, close to the opening.' };
  const pull = { seconds: 9, title: 'Pull with your push', detail: 'With each contraction, you push and your provider gently pulls. Your baby comes down faster.' };
  const rest = { seconds: 4, title: 'The rest of the birth', detail: 'The shoulders turn and the body is born, as in any vaginal birth.' };
  return tool === 'vacuum'
    ? [
        low,
        { seconds: 4, title: 'The cup goes on', detail: 'Your provider places the soft cup on the top of your baby’s head.' },
        { seconds: 3, title: 'Gentle suction', detail: 'A hand pump makes gentle suction, so the cup holds on.' },
        pull,
        { seconds: 4, title: 'The head is born', detail: 'The suction is released and the cup comes off.' },
        rest,
      ]
    : [
        low,
        { seconds: 5, title: 'One blade at a time', detail: 'Your provider slides one smooth blade along each side of your baby’s head.' },
        { seconds: 3, title: 'The handles lock', detail: 'The handles lock together, so the blades cradle the head like cupped hands.' },
        pull,
        { seconds: 4, title: 'The head is born', detail: 'The blades are taken off.' },
        rest,
      ];
}

/** The baby's descent with help: two pulled contractions take the head from low to crowning, then the birth. */
function assistedAt(t: number, steps: Step[]): { d: number; push: number; birth: Birth } {
  const starts = startsOf(steps);
  if (t < starts[3]) return { d: LOW, push: 0, birth: NOT_BORN };
  if (t < starts[4]) {
    const cycle = steps[3].seconds / 2;
    const n = Math.floor((t - starts[3]) / cycle);
    const phase = ((t - starts[3]) % cycle) / cycle;
    const before = LOW + n * 0.2;
    if (phase < 0.6) return { d: before + 0.22 * ease(phase / 0.6), push: Math.sin((phase / 0.6) * Math.PI), birth: NOT_BORN };
    return { d: before + 0.22 - 0.02 * ease((phase - 0.6) / 0.4), push: 0, birth: NOT_BORN };
  }
  const head = progress(t, starts, steps, 4);
  const after = progress(t, starts, steps, 5);
  return {
    d: 1,
    push: 0,
    birth: { head: ease(Math.min(1, head * 1.6)), shoulders: ease(Math.min(1, after * 1.8)), body: ease(Math.max(0, after * 1.8 - 0.8)) },
  };
}

/** A small "gentle pull" arrow beside the handle while the provider pulls. */
function PullArrow({ x, y, push }: { x: number; y: number; push: number }) {
  if (push < 0.05) return null;
  return (
    <G opacity={Math.min(1, push * 2)}>
      <Path d={`M ${x} ${y} l 0 22 M ${x - 6} ${y + 15} l 6 7 l 6 -7`} fill="none" stroke={c.marigold} strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} />
      <SvgText fill={c.ink} fontFamily={FONT} fontSize={12} fontWeight="700" textAnchor="start" x={x + 10} y={y + 16}>
        Gentle pull
      </SvgText>
    </G>
  );
}

function VacuumDrawing({ t }: { t: number }) {
  const steps = assistSteps('vacuum');
  const starts = startsOf(steps);
  const { d, push, birth } = assistedAt(t, steps);
  const on = ease(progress(t, starts, steps, 1));
  const suction = progress(t, starts, steps, 2);
  const off = ease(Math.max(0, progress(t, starts, steps, 4) * 2 - 0.9));
  const front = ({ cx, hy, r }: HeadSpot) => {
    if (on <= 0 || off >= 1) return null;
    // The cup slides in from below, sits on the top of the head (the lowest point,
    // as the baby is head-down), and drops away once the head is born.
    const dy = (1 - on) * 70 + off * 40;
    const opacity = Math.min(on * 1.5, 1 - off);
    const cupR = r + 3;
    const a = (40 * Math.PI) / 180;
    const left = `${cx - Math.sin(a) * cupR} ${hy + dy + Math.cos(a) * cupR}`;
    const right = `${cx + Math.sin(a) * cupR} ${hy + dy + Math.cos(a) * cupR}`;
    const bottom = hy + dy + cupR;
    const handleY = bottom + 46;
    const pulsing = suction > 0 && suction < 1 ? 0.5 + 0.5 * Math.sin(suction * Math.PI * 6) : suction >= 1 ? 1 : 0;
    return (
      <G opacity={opacity}>
        {/* A soft bell-shaped cup over the top of the head; it darkens as the suction builds. */}
        <Path
          d={`M ${left} A ${cupR} ${cupR} 0 0 0 ${right} L ${cx + Math.sin(a) * (cupR + 7)} ${hy + dy + Math.cos(a) * (cupR + 7)} A ${cupR + 7} ${cupR + 7} 0 0 1 ${cx - Math.sin(a) * (cupR + 7)} ${hy + dy + Math.cos(a) * (cupR + 7)} Z`}
          fill={pulsing > 0.5 ? c.lagoon : '#7FB5AE'}
          stroke={instrument}
          strokeLinejoin="round"
          strokeWidth={2.5}
        />
        <Line stroke={instrument} strokeLinecap="round" strokeWidth={3} x1={cx} x2={cx} y1={bottom + 7} y2={handleY - 6} />
        <Rect fill={instrument} height={12} rx={6} width={34} x={cx - 17} y={handleY - 6} />
        {suction > 0 && off === 0 ? (
          <SvgText fill={c.lagoon} fontFamily={FONT} fontSize={12} fontWeight="700" opacity={Math.min(1, suction * 3)} textAnchor="start" x={cx + 40} y={hy + dy + 30}>
            Suction
          </SvgText>
        ) : null}
        {on > 0.5 && suction === 0 ? (
          <SvgText fill={c.ink} fontFamily={FONT} fontSize={12} fontWeight="700" opacity={(on - 0.5) * 2} textAnchor="start" x={cx + 40} y={hy + dy + 30}>
            Soft cup
          </SvgText>
        ) : null}
        <PullArrow push={push} x={cx + 30} y={handleY - 14} />
      </G>
    );
  };
  return <BirthScene birth={birth} d={d} front={front} push={push} />;
}

function ForcepsDrawing({ t }: { t: number }) {
  const steps = assistSteps('forceps');
  const starts = startsOf(steps);
  const { d, push, birth } = assistedAt(t, steps);
  const placing = progress(t, starts, steps, 1);
  const first = ease(Math.min(1, placing * 2));
  const second = ease(Math.max(0, placing * 2 - 1));
  const lock = progress(t, starts, steps, 2);
  const off = ease(Math.max(0, progress(t, starts, steps, 4) * 2 - 0.9));
  // In this side view one blade lies along the near side of the head, the other along
  // the far side; each has an open window, and their shanks meet at the lock.
  const blade = (x: number, hy: number, r: number, k: number, near: boolean) => {
    if (k <= 0 || off >= 1) return null;
    const dy = (1 - k) * 80 + off * 50;
    const opacity = Math.min(k * 1.5, 1 - off);
    const y = hy + dy;
    const lockY = y + r + 30;
    return (
      <G opacity={opacity * (near ? 1 : 0.55)}>
        <Ellipse cx={x} cy={y - 2} fill={near ? c.lagoonSoft : 'none'} fillOpacity={0.35} rx={11} ry={r + 2} stroke={instrument} strokeWidth={near ? 4 : 3.5} />
        <Path d={`M ${x} ${y + r} Q ${x} ${lockY - 12} 180 ${lockY}`} fill="none" stroke={instrument} strokeLinecap="round" strokeWidth={near ? 4 : 3.5} />
        <Line stroke={instrument} strokeLinecap="round" strokeWidth={near ? 5 : 4} x1={180} x2={180 + (near ? -7 : 7)} y1={lockY} y2={lockY + 34} />
      </G>
    );
  };
  const behind = ({ cx, hy, r }: HeadSpot) => blade(cx + 6, hy, r, first, false);
  const front = ({ cx, hy, r }: HeadSpot) => {
    const lockY = hy + r + 30;
    return (
      <G>
        {blade(cx - 3, hy, r, second, true)}
        {lock > 0 && off < 1 ? (
          <G opacity={Math.min(lock * 3, 1 - off)}>
            <Circle cx={cx} cy={lockY} fill={c.marigold} r={4.5} />
            {lock < 1 ? (
              <SvgText fill={c.ink} fontFamily={FONT} fontSize={12} fontWeight="700" textAnchor="start" x={cx + 14} y={lockY + 4}>
                Handles lock
              </SvgText>
            ) : null}
          </G>
        ) : null}
        {placing > 0.15 && lock === 0 ? (
          <SvgText fill={c.ink} fontFamily={FONT} fontSize={12} fontWeight="700" textAnchor="start" x={cx + 28} y={hy + 4}>
            {placing < 0.5 ? 'First blade' : 'Second blade'}
          </SvgText>
        ) : null}
        {off < 1 ? <PullArrow push={push} x={cx + 26} y={lockY + 6} /> : null}
      </G>
    );
  };
  return <BirthScene behind={behind} birth={birth} d={d} front={front} push={push} />;
}

/** A vacuum or forceps birth, for the assisted-birth lesson's video slides. */
function AssistedAnimation({ tool, onPlay }: { tool: 'vacuum' | 'forceps'; onPlay: () => void }) {
  const steps = assistSteps(tool);
  const starts = startsOf(steps);
  const { t, playing, finished, toggle } = usePlayback(totalOf(steps), onPlay);
  let step = steps[0];
  steps.forEach((candidate, i) => {
    if (t >= starts[i]) step = candidate;
  });
  const label =
    tool === 'vacuum'
      ? 'Animation of a vacuum-assisted birth, in side view. With the cervix fully open and the baby’s head low, a soft cup is placed on the top of the head and held on with gentle suction. With each contraction, the parent pushes while the provider gently pulls on the handle, and the head comes down faster. Once the head is born, the cup comes off, and the shoulders and body are born.'
      : 'Animation of a forceps-assisted birth, in side view. With the cervix fully open and the baby’s head low, two smooth curved blades are slid in one at a time, one on each side of the head, and the handles lock together. With each contraction, the parent pushes while the provider gently pulls, and the head comes down faster. Once the head is born, the blades are taken off, and the shoulders and body are born.';
  return (
    <View accessibilityLabel={label} style={s.frame}>
      <View accessibilityLiveRegion="polite" style={[s.copy, s.copyTall]}>
        <Text style={s.title}>{step.title}</Text>
        <Text style={s.detail}>{step.detail}</Text>
      </View>
      <Svg style={s.pushing} viewBox="0 0 360 300">
        {tool === 'vacuum' ? <VacuumDrawing t={t} /> : <ForcepsDrawing t={t} />}
      </Svg>
      <View style={s.footer}>
        <PlayButton finished={finished} onPress={toggle} playing={playing} />
        <Text style={s.note}>Not to scale in time, and drawn simply.</Text>
      </View>
    </View>
  );
}

// ---------- Stage 3: the placenta ----------

/** The three steps, then a pause before it loops. Seconds are for pacing only. */
const PLACENTA_STEPS = [
  {
    seconds: 4,
    title: 'Still attached',
    detail: 'After your baby is born, the placenta is still attached inside the uterus. The umbilical cord runs from it through the open cervix.',
  },
  {
    seconds: 5,
    title: 'Separating',
    detail: 'The uterus keeps contracting, more gently now, and the placenta separates from its wall.',
  },
  {
    seconds: 6,
    title: 'Delivered',
    detail: 'The placenta is delivered through the cervix and birth canal. Your care team checks that it’s complete and that your bleeding is under control.',
  },
];
const PLACENTA_TOTAL = PLACENTA_STEPS.reduce((sum, step) => sum + step.seconds, 0);

/** Loops a clock from 0 to `total` seconds while the slide is on screen. */
function useLoop(total: number) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const start = Date.now();
    let frame: number;
    let last = -1;
    const tick = () => {
      const now = ((Date.now() - start) / 1000) % total;
      if (Math.abs(now - last) > 0.033) {
        last = now;
        setT(now);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [total]);
  return t;
}

const placentaColors = { tissue: '#D9A39B', tissueLine: '#B9786F', cord: '#9DB6C8', cordLine: '#6F8FA6' };

/**
 * A side view after birth: the uterus, the open cervix and the birth canal below it.
 * The placenta sits on the top wall with the cord running down and out; it separates
 * as the uterus contracts, then slides down through the cervix and out.
 */
function PlacentaDrawing({ t }: { t: number }) {
  const cx = 180;
  const neckY = 150;
  const [a, b] = [PLACENTA_STEPS[0].seconds, PLACENTA_STEPS[0].seconds + PLACENTA_STEPS[1].seconds];
  const pulse = t > a && t < b ? Math.max(0, Math.sin(((t - a) / (b - a)) * Math.PI * 2)) : 0;
  const separate = t <= a ? 0 : ease(Math.min(1, (t - a) / (b - a)));
  const travel = t <= b ? 0 : ease(Math.min(1, (t - b) / (PLACENTA_STEPS[2].seconds - 1.5)));
  // After the placenta leaves, the uterus keeps getting smaller.
  const shrink = 1 - 0.04 * pulse - 0.1 * travel;
  const at = (y: number) => neckY + (y - neckY) * shrink;
  const atX = (x: number) => cx + (x - cx) * shrink;

  // The placenta's centre: on the top wall, a little lower once it separates, then
  // down the middle, through the cervix (y 150) and out past the canal (y 210).
  const restY = at(63) + 12 * separate;
  const py = restY + (238 - restY) * travel;
  const px = cx;
  // It narrows as it passes through the cervix.
  const narrow = travel > 0.3 && travel < 0.75 ? 0.6 : travel >= 0.75 ? 0.85 : 1;
  const rx = 36 * narrow;
  const ry = 11 / Math.max(0.7, narrow);
  const tilt = -14 * separate * (1 - travel);

  const half = 13;
  const wall = 10;
  const uterus = `M ${cx - half} ${neckY + 6} L ${cx - half} ${neckY}
    C ${cx - half - 16} ${at(136)}, ${atX(cx - 66)} ${at(124)}, ${atX(cx - 66)} ${at(90)}
    C ${atX(cx - 66)} ${at(26)}, ${atX(cx + 66)} ${at(26)}, ${atX(cx + 66)} ${at(90)}
    C ${atX(cx + 66)} ${at(124)}, ${cx + half + 16} ${at(136)}, ${cx + half} ${neckY}
    L ${cx + half} ${neckY + 6}`;
  // The cord from the placenta down to just outside the birth canal; once the
  // placenta is out, it hangs below it.
  const endY = 228 + 26 * travel;
  const cord =
    py < neckY
      ? `M ${px} ${py + ry - 2} C ${px + 26} ${(py + neckY) / 2}, ${cx - 20} ${neckY - 30}, ${cx} ${neckY} S ${cx + 6} ${endY - 20}, ${cx + 2} ${endY}`
      : `M ${px} ${py + ry - 2} Q ${cx + 6} ${py + ry + 10}, ${cx + 40} ${Math.min(endY, py + ry + 12)}`;
  const gapOpacity = separate * (1 - travel);

  return (
    <G>
      {/* Birth canal below the cervix. */}
      <Line stroke="#3E8A84" strokeLinecap="round" strokeWidth={6} x1={cx - half} x2={cx - 17} y1={neckY + 6} y2={212} />
      <Line stroke="#3E8A84" strokeLinecap="round" strokeWidth={6} x1={cx + half} x2={cx + 17} y1={neckY + 6} y2={212} />
      <Path d={uterus} fill="none" stroke={pulse > 0.05 ? c.lagoon : '#3E8A84'} strokeLinecap="round" strokeWidth={wall} />
      {/* A thin dark crescent where the placenta has come away from the wall. */}
      {gapOpacity > 0.02 ? (
        <Path
          d={`M ${atX(cx - 34)} ${at(52)} Q ${cx} ${at(40)} ${atX(cx + 34)} ${at(52)}`}
          fill="none"
          opacity={gapOpacity * 0.5}
          stroke={c.ink}
          strokeDasharray="3 4"
          strokeWidth={2}
        />
      ) : null}
      <Path d={cord} fill="none" stroke={placentaColors.cordLine} strokeLinecap="round" strokeWidth={6} />
      <Path d={cord} fill="none" stroke={placentaColors.cord} strokeLinecap="round" strokeWidth={3.5} />
      <G origin={`${px}, ${py}`} rotation={tilt}>
        <Ellipse cx={px} cy={py} fill={placentaColors.tissue} rx={rx} ry={ry} stroke={placentaColors.tissueLine} strokeWidth={2.5} />
      </G>
      {pulse > 0.05 ? (
        <SvgText fill={c.lagoon} fontFamily={FONT} fontSize={14} fontWeight="700" opacity={Math.min(1, pulse * 2)} textAnchor="middle" x={cx} y={14}>
          Contraction
        </SvgText>
      ) : null}
      <SvgText fill={c.muted} fontFamily={FONT} fontSize={12} textAnchor="start" x={270} y={70}>
        Uterus
      </SvgText>
      <SvgText fill={c.muted} fontFamily={FONT} fontSize={12} textAnchor="start" x={208} y={154}>
        Cervix
      </SvgText>
      <SvgText fill={c.muted} fontFamily={FONT} fontSize={12} textAnchor="end" x={py < neckY + 10 ? 96 : px - rx - 10} y={py + 4}>
        Placenta
      </SvgText>
      {travel < 0.5 ? (
        <SvgText fill={c.muted} fontFamily={FONT} fontSize={12} textAnchor="end" x={cx - 26} y={232}>
          Cord
        </SvgText>
      ) : null}
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

/** Stage 3 of labor, drawn on the slide: it plays by itself and loops. */
export function PlacentaAnimation() {
  const t = useLoop(PLACENTA_TOTAL + 2);
  let start = 0;
  let step = PLACENTA_STEPS[PLACENTA_STEPS.length - 1];
  let number = PLACENTA_STEPS.length;
  for (const [i, s2] of PLACENTA_STEPS.entries()) {
    if (t < start + s2.seconds) {
      step = s2;
      number = i + 1;
      break;
    }
    start += s2.seconds;
  }
  return (
    <View
      accessibilityLabel="Animation of the third stage of labor, in side view. After birth, the placenta is attached to the top of the uterus, with the umbilical cord running down through the open cervix. The uterus contracts and the placenta separates from the wall, then it moves down through the cervix and birth canal and is delivered, and the uterus gets smaller."
      style={s.frame}
    >
      <View accessibilityLiveRegion="polite" style={s.copy}>
        <Text style={s.title}>{`${number}. ${step.title}`}</Text>
        <Text style={s.detail}>{step.detail}</Text>
      </View>
      <Svg style={s.placenta} viewBox="0 0 360 258">
        <PlacentaDrawing t={Math.min(t, PLACENTA_TOTAL)} />
      </Svg>
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
  'assisted-vaginal-birth/vacuum-video': (onPlay) => <AssistedAnimation onPlay={onPlay} tool="vacuum" />,
  'assisted-vaginal-birth/forceps-video': (onPlay) => <AssistedAnimation onPlay={onPlay} tool="forceps" />,
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
  // Room for three lines of detail, so the drawing doesn't jump between steps.
  copyTall: { minHeight: 82 },
  title: { color: c.lagoon, fontSize: 17, fontWeight: '800' },
  detail: { color: c.ink, fontSize: 14, lineHeight: 19 },
  drawing: { width: '100%', maxWidth: 520, alignSelf: 'center', aspectRatio: 360 / 205 },
  scale: { width: '100%', maxWidth: 520, alignSelf: 'center', aspectRatio: 360 / 50 },
  breathing: { width: '100%', maxWidth: 520, alignSelf: 'center', aspectRatio: 360 / 215 },
  pushing: { width: '100%', maxWidth: 520, alignSelf: 'center', aspectRatio: 360 / 300 },
  placenta: { width: '100%', maxWidth: 520, alignSelf: 'center', aspectRatio: 360 / 258 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  button: { backgroundColor: c.lagoon, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 9 },
  buttonText: { color: c.surface, fontSize: 15, fontWeight: '800' },
  note: { color: c.muted, fontSize: 12, flexShrink: 1 },
});
