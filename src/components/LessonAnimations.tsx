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

function DilationAnimation({ onPlay }: { onPlay: () => void }) {
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
      if (now >= TOTAL) {
        setT(TOTAL);
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

  const m = momentAt(t);
  const squeeze = playing ? squeezeAt(t) : 0;
  const finished = t >= TOTAL;

  function toggle() {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (finished) setT(0);
    onPlay();
    setPlaying(true);
  }

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
        <Pressable
          accessibilityLabel={playing ? 'Pause animation' : finished ? 'Replay animation' : 'Play animation'}
          accessibilityRole="button"
          onPress={toggle}
          style={s.button}
        >
          <Text style={s.buttonText}>{playing ? '❚❚  Pause' : finished ? '↺  Replay' : '▶  Play'}</Text>
        </Pressable>
        <Text style={s.note}>Not to scale in time. Every labor has its own pace.</Text>
      </View>
    </View>
  );
}

// ---------- The registry ----------

const ANIMATIONS: Record<string, (onPlay: () => void) => React.ReactElement> = {
  'stages-of-labor/dilation-video': (onPlay) => <DilationAnimation onPlay={onPlay} />,
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
  footer: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  button: { backgroundColor: c.lagoon, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 9 },
  buttonText: { color: c.surface, fontSize: 15, fontWeight: '800' },
  note: { color: c.muted, fontSize: 12, flexShrink: 1 },
});
