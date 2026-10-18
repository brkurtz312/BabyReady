import { useState, type ComponentType } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Polygon, Rect, Text as SvgText } from 'react-native-svg';
import type { LucideProps } from 'lucide-react-native';

import Activity from 'lucide-react-native/icons/activity';
import Ambulance from 'lucide-react-native/icons/ambulance';
import Armchair from 'lucide-react-native/icons/armchair';
import Baby from 'lucide-react-native/icons/baby';
import BadgeCheck from 'lucide-react-native/icons/badge-check';
import Bandage from 'lucide-react-native/icons/bandage';
import Bed from 'lucide-react-native/icons/bed';
import BicepsFlexed from 'lucide-react-native/icons/biceps-flexed';
import Calendar from 'lucide-react-native/icons/calendar';
import Car from 'lucide-react-native/icons/car';
import CircleCheck from 'lucide-react-native/icons/circle-check';
import Clock from 'lucide-react-native/icons/clock';
import CloudSun from 'lucide-react-native/icons/cloud-sun';
import CupSoda from 'lucide-react-native/icons/cup-soda';
import Droplet from 'lucide-react-native/icons/droplet';
import Footprints from 'lucide-react-native/icons/footprints';
import GlassWater from 'lucide-react-native/icons/glass-water';
import Heart from 'lucide-react-native/icons/heart';
import HeartHandshake from 'lucide-react-native/icons/heart-handshake';
import HeartPulse from 'lucide-react-native/icons/heart-pulse';
import Hospital from 'lucide-react-native/icons/hospital';
import Hourglass from 'lucide-react-native/icons/hourglass';
import House from 'lucide-react-native/icons/house';
import Lightbulb from 'lucide-react-native/icons/lightbulb';
import Luggage from 'lucide-react-native/icons/luggage';
import MessageCircleQuestionMark from 'lucide-react-native/icons/message-circle-question-mark';
import Moon from 'lucide-react-native/icons/moon';
import Palette from 'lucide-react-native/icons/palette';
import PawPrint from 'lucide-react-native/icons/paw-print';
import PersonStanding from 'lucide-react-native/icons/person-standing';
import Phone from 'lucide-react-native/icons/phone';
import Pill from 'lucide-react-native/icons/pill';
import Route from 'lucide-react-native/icons/route';
import ShowerHead from 'lucide-react-native/icons/shower-head';
import Split from 'lucide-react-native/icons/split';
import Stethoscope from 'lucide-react-native/icons/stethoscope';
import TestTube from 'lucide-react-native/icons/test-tube';
import Thermometer from 'lucide-react-native/icons/thermometer';
import Timer from 'lucide-react-native/icons/timer';
import Trees from 'lucide-react-native/icons/trees';
import TriangleAlert from 'lucide-react-native/icons/triangle-alert';
import Users from 'lucide-react-native/icons/users';
import Utensils from 'lucide-react-native/icons/utensils';
import Wind from 'lucide-react-native/icons/wind';
import Scale from 'lucide-react-native/icons/scale';
import CigaretteOff from 'lucide-react-native/icons/cigarette-off';
import Milk from 'lucide-react-native/icons/milk';
import Syringe from 'lucide-react-native/icons/syringe';
import Ear from 'lucide-react-native/icons/ear';
import HeartPlus from 'lucide-react-native/icons/heart-plus';
import CircleDot from 'lucide-react-native/icons/circle-dot';

/**
 * Pictures drawn in code for lesson slides: icon panels and simple diagrams.
 * Each one is built only from what its slide already says, so it adds no new
 * clinical claim. Keyed by "lessonId/slideId". Slides not listed here show
 * commissioned artwork (src/content/artwork.ts) or an "Artwork to come" box.
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
  alert: '#B3262F',
  alertSoft: '#FBE6E7',
  sky: '#E4ECF7',
  baby: '#F3D9C4',
  babyLine: '#C99E80',
  skin: '#E8C4A6',
  skinLine: '#B98D6E',
  pelvis: '#F1E3C2',
};

// SVG text otherwise falls back to a serif face on the web.
const FONT = Platform.OS === 'web' ? 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' : undefined;

type Icon = ComponentType<LucideProps>;
type IconItem = { icon: Icon; label: string; tone?: 'lagoon' | 'marigold' | 'alert' };

// ---------- Building blocks ----------

function Frame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View accessibilityLabel={label} accessibilityRole="image" style={s.frame}>
      {children}
    </View>
  );
}

function IconPanel({ items, caption, label }: { items: IconItem[]; caption?: string; label: string }) {
  return (
    <Frame label={label}>
      <View style={s.iconRow}>
        {items.map((item) => {
          const IconComponent = item.icon;
          const tone = item.tone ?? 'lagoon';
          return (
            <View key={item.label} style={s.iconTile}>
              <View style={[s.iconCircle, tone === 'marigold' && s.circleMarigold, tone === 'alert' && s.circleAlert]}>
                <IconComponent
                  color={tone === 'alert' ? c.alert : tone === 'marigold' ? c.ink : c.lagoon}
                  size={28}
                  strokeWidth={1.8}
                />
              </View>
              <Text style={s.iconLabel}>{item.label}</Text>
            </View>
          );
        })}
      </View>
      {caption ? <Text style={s.caption}>{caption}</Text> : null}
    </Frame>
  );
}

type Zone = { from: number; to: number; label: string; tone: 'alert' | 'marigold' | 'lagoon' | 'line' | 'sky' };

/** A horizontal week scale with shaded zones and an optional marker. */
function WeekScale({
  start,
  end,
  zones,
  marker,
  ticks,
  axisLabel,
  label,
}: {
  start: number;
  end: number;
  zones: Zone[];
  marker?: { week: number; label: string };
  ticks: number[];
  axisLabel: string;
  label: string;
}) {
  const [trackWidth, setTrackWidth] = useState(0);
  const pct = (w: number) => `${((w - start) / (end - start)) * 100}%` as const;
  const zoneColor = { alert: c.alertSoft, marigold: c.marigoldSoft, lagoon: c.lagoonSoft, line: c.line, sky: c.sky };
  // A zone too narrow for the longest word of its label (on small phones) shows the label in a key below instead.
  const fits = (z: Zone) =>
    trackWidth === 0 ||
    ((z.to - z.from) / (end - start)) * trackWidth >= Math.max(...z.label.split(' ').map((w) => w.length)) * 6.6 + 4;
  const keyed = zones.filter((z) => !fits(z));
  return (
    <Frame label={label}>
      <View style={s.scaleArea}>
        {marker ? (
          <View style={[s.marker, { left: pct(marker.week) }]}>
            <Text style={s.markerText}>{marker.label}</Text>
            <View style={s.markerLine} />
          </View>
        ) : null}
        <View onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)} style={s.zoneTrack}>
          {zones.map((z) => (
            <View
              key={z.label}
              style={[s.zone, { left: pct(z.from), width: `${((z.to - z.from) / (end - start)) * 100}%`, backgroundColor: zoneColor[z.tone] }]}
            >
              {fits(z) ? (
                <Text numberOfLines={2} style={s.zoneText}>
                  {z.label}
                </Text>
              ) : null}
            </View>
          ))}
          {marker ? <View style={[s.markerNotch, { left: pct(marker.week) }]} /> : null}
        </View>
        <View style={s.tickRow}>
          {ticks.map((t) => (
            <Text key={t} style={[s.tick, { left: pct(t) }]}>
              {t}
            </Text>
          ))}
        </View>
      </View>
      {keyed.length ? (
        <View style={s.zoneKey}>
          {keyed.map((z) => (
            <View key={z.label} style={s.zoneKeyItem}>
              <View style={[s.zoneSwatch, { backgroundColor: zoneColor[z.tone] }]} />
              <Text style={s.zoneKeyText}>{z.label}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <Text style={s.caption}>{axisLabel}</Text>
    </Frame>
  );
}

function Steps({
  steps,
  label,
}: {
  steps: { title: string; detail: string; tone: 'lagoon' | 'marigold' | 'alert' }[];
  label: string;
}) {
  return (
    <Frame label={label}>
      <View style={s.steps}>
        {steps.map((step, i) => (
          <View
            key={step.title}
            style={[
              s.step,
              step.tone === 'lagoon' && { backgroundColor: c.lagoonSoft },
              step.tone === 'marigold' && { backgroundColor: c.marigoldSoft },
              step.tone === 'alert' && { backgroundColor: c.alertSoft, borderColor: c.alert, borderWidth: 1.5 },
            ]}
          >
            <Text style={[s.stepNumber, step.tone === 'alert' && { color: c.alert }]}>{i + 1}</Text>
            <View style={s.stepCopy}>
              <Text style={[s.stepTitle, step.tone === 'alert' && { color: c.alert }]}>{step.title}</Text>
              <Text style={s.stepDetail}>{step.detail}</Text>
            </View>
          </View>
        ))}
      </View>
    </Frame>
  );
}

// ---------- Diagrams ----------

function FiveOneOne() {
  const parts = [
    { big: '5', unit: 'minutes', note: 'apart or less' },
    { big: '1', unit: 'minute', note: 'each contraction lasts' },
    { big: '1', unit: 'hour', note: 'of this pattern' },
  ];
  return (
    <Frame label="5-1-1: contractions 5 minutes apart or less, each about 1 minute long, for at least 1 hour. Your care team's rule comes first.">
      <View style={s.fiveRow}>
        {parts.map((p, i) => (
          <View key={i} style={s.fiveBlock}>
            <Text style={s.fiveBig}>{p.big}</Text>
            <Text style={s.fiveUnit}>{p.unit}</Text>
            <Text style={s.fiveNote}>{p.note}</Text>
          </View>
        ))}
      </View>
      <Text style={s.caption}>Your care team's rule comes first.</Text>
    </Frame>
  );
}

function ThreeStages() {
  const stages = [
    { flex: 7, n: '1', title: 'Stage 1', detail: 'Cervix opens', tone: c.lagoonSoft },
    { flex: 2.2, n: '2', title: 'Stage 2', detail: 'Push and birth', tone: c.marigoldSoft },
    { flex: 1.2, n: '3', title: 'Stage 3', detail: 'Placenta', tone: c.sky },
  ];
  // The bar shows relative length only; the labels sit in a key below so they never get cut off.
  return (
    <Frame label="Three stages of labor: stage 1, the cervix opens, usually the longest; stage 2, pushing and birth; stage 3, the placenta is delivered. Then the first hours of recovery and bonding.">
      <View style={s.stageRow}>
        {stages.map((st) => (
          <View key={st.title} style={[s.stage, { flex: st.flex, backgroundColor: st.tone }]}>
            <Text style={s.stageTitle}>{st.n}</Text>
          </View>
        ))}
        <View style={s.stageAfter} />
      </View>
      <View style={s.stageKey}>
        {stages.map((st) => (
          <View key={st.title} style={s.zoneKeyItem}>
            <View style={[s.zoneSwatch, { backgroundColor: st.tone }]} />
            <Text style={s.zoneKeyText}>
              <Text style={s.stageKeyTitle}>{st.title}</Text> · {st.detail}
            </Text>
          </View>
        ))}
        <View style={s.zoneKeyItem}>
          <View style={[s.zoneSwatch, s.stageAfterSwatch]} />
          <Text style={s.zoneKeyText}>
            <Text style={s.stageKeyTitle}>First hours</Text> · Recovery and bonding
          </Text>
        </View>
      </View>
      <Text style={s.caption}>Stage 1 is usually the longest by far.</Text>
    </Frame>
  );
}

function CervixCircles() {
  const sizes = [1, 4, 6, 8, 10];
  const max = 10;
  return (
    <Frame label="Cervical dilation from 1 to 10 centimeters, drawn to relative size. 10 centimeters means fully open.">
      <View style={s.circleRow}>
        {sizes.map((cm) => {
          const d = Math.max(8, (cm / max) * 52);
          const full = cm === 10;
          return (
            <View key={cm} style={s.circleCol}>
              <View style={s.circleBox}>
                <View
                  style={[
                    s.dilation,
                    { width: d, height: d, borderRadius: d / 2 },
                    full && { backgroundColor: c.lagoon, borderColor: c.lagoon },
                  ]}
                />
              </View>
              <Text style={[s.circleLabel, full && { color: c.lagoon, fontWeight: '800' }]}>{cm} cm</Text>
            </View>
          );
        })}
      </View>
      <Text style={s.caption}>10 centimeters means fully open.</Text>
    </Frame>
  );
}

function PushingRange() {
  return (
    <Frame label="Pushing can take anywhere from a few minutes to a few hours, and is often longer with a first baby or an epidural.">
      <View style={s.rangeTrack}>
        <View style={s.rangeFill} />
        <View style={s.rangeLong}>
          <Text style={s.rangeLongText}>Often longer here: first baby, epidural</Text>
        </View>
      </View>
      <View style={s.rangeEnds}>
        <Text style={s.rangeEnd}>A few minutes</Text>
        <Text style={s.rangeEnd}>A few hours</Text>
      </View>
    </Frame>
  );
}

function CareLevels() {
  const levels = [
    { level: 'Level I', name: 'Basic care' },
    { level: 'Level II', name: 'Specialty care' },
    { level: 'Level III', name: 'Subspecialty care' },
    { level: 'Level IV', name: 'Regional center for the most complex needs' },
  ];
  return (
    <Frame label="Four levels of maternal care in hospitals, from Level I basic care up to Level IV regional centers for the most complex needs.">
      <View style={s.levels}>
        {levels.map((l, i) => (
          <View key={l.level} style={[s.levelStep, { marginLeft: `${i * 6}%`, opacity: 0.7 + i * 0.1 }]}>
            <Text style={s.levelTag}>{l.level}</Text>
            <Text style={s.levelName}>{l.name}</Text>
          </View>
        ))}
      </View>
    </Frame>
  );
}

function SixModules() {
  const modules: { icon: Icon; name: string }[] = [
    { icon: Calendar, name: 'Preparing for Birth' },
    { icon: Phone, name: 'Labor Basics and When to Call' },
    { icon: PersonStanding, name: 'Comfort, Movement, and Support Skills' },
    { icon: Split, name: 'Interventions and Flexible Decisions' },
    { icon: Baby, name: 'Feeding and Newborn Care' },
    { icon: Heart, name: 'Postpartum Recovery, Mood, and Red Flags' },
  ];
  return (
    <Frame label="The six modules of the class. You are in module 1, Preparing for Birth.">
      <View style={s.moduleGrid}>
        {modules.map((m, i) => {
          const IconComponent = m.icon;
          const here = i === 0;
          return (
            <View key={m.name} style={[s.moduleCard, here && s.moduleHere]}>
              <View style={s.moduleTop}>
                <Text style={[s.moduleNumber, here && { color: c.surface }]}>{i + 1}</Text>
                <IconComponent color={here ? c.surface : c.lagoon} size={20} strokeWidth={1.8} />
              </View>
              <Text style={[s.moduleName, here && { color: c.surface }]}>{m.name}</Text>
              {here ? <Text style={s.moduleHereText}>You are here</Text> : null}
            </View>
          );
        })}
      </View>
    </Frame>
  );
}

function Brain() {
  const rows: { letter: string; icon: Icon; word: string; q: string }[] = [
    { letter: 'B', icon: Heart, word: 'Benefits', q: 'How could this help?' },
    { letter: 'R', icon: TriangleAlert, word: 'Risks', q: 'How could it cause harm?' },
    { letter: 'A', icon: Split, word: 'Alternatives', q: 'What other choices are there?' },
    { letter: 'I', icon: Lightbulb, word: 'Intuition', q: 'What does my gut say?' },
    { letter: 'N', icon: Hourglass, word: 'Nothing', q: 'What if we wait?' },
  ];
  return (
    <Frame label="BRAIN questions for shared decisions: benefits, risks, alternatives, intuition, and nothing, or waiting.">
      <View style={s.brain}>
        {rows.map((r) => {
          const IconComponent = r.icon;
          return (
            <View key={r.letter} style={s.brainRow}>
              <Text style={s.brainLetter}>{r.letter}</Text>
              <IconComponent color={c.lagoon} size={20} strokeWidth={1.8} />
              <Text style={s.brainWord}>{r.word}</Text>
              <Text style={s.brainQ}>{r.q}</Text>
            </View>
          );
        })}
      </View>
    </Frame>
  );
}

function BackAndHeartburn() {
  const groups: { title: string; items: IconItem[] }[] = [
    {
      title: 'Backache',
      items: [
        { icon: Footprints, label: 'Supportive shoes' },
        { icon: Armchair, label: 'Back support' },
        { icon: PersonStanding, label: 'Lift with your knees' },
        { icon: Thermometer, label: 'Heat or cold' },
      ],
    },
    {
      title: 'Heartburn',
      items: [
        { icon: Utensils, label: 'Smaller meals' },
        { icon: Bed, label: 'Raise the head of your bed', tone: 'marigold' },
      ],
    },
  ];
  return (
    <Frame label="Backache: supportive shoes, back support, lifting with your knees, heat or cold. Heartburn: smaller meals, raising the head of your bed.">
      {groups.map((g) => (
        <View key={g.title} style={s.group}>
          <Text style={s.groupTitle}>{g.title}</Text>
          <View style={s.iconRow}>
            {g.items.map((item) => {
              const IconComponent = item.icon;
              return (
                <View key={item.label} style={s.iconTile}>
                  <View style={[s.iconCircle, item.tone === 'marigold' && s.circleMarigold]}>
                    <IconComponent color={item.tone === 'marigold' ? c.ink : c.lagoon} size={26} strokeWidth={1.8} />
                  </View>
                  <Text style={s.iconLabel}>{item.label}</Text>
                </View>
              );
            })}
          </View>
        </View>
      ))}
    </Frame>
  );
}

// ---------- Maps and side views drawn with SVG ----------

/** A drawing in a frame, scaled to the slide's width, with an optional caption. */
function Drawing({ label, caption, height = 200, children }: { label: string; caption?: string; height?: number; children: React.ReactNode }) {
  return (
    <Frame label={label}>
      <Svg style={[s.drawing, { aspectRatio: 360 / height }]} viewBox={`0 0 360 ${height}`}>
        {children}
      </Svg>
      {caption ? <Text style={s.caption}>{caption}</Text> : null}
    </Frame>
  );
}

function Label({ x, y, children, color = c.ink, size = 12, weight = '700' }: { x: number; y: number; children: string; color?: string; size?: number; weight?: '400' | '700' | '800' }) {
  return (
    <SvgText fill={color} fontFamily={FONT} fontSize={size} fontWeight={weight} textAnchor="middle" x={x} y={y}>
      {children}
    </SvgText>
  );
}

function HouseIcon({ x, y }: { x: number; y: number }) {
  return (
    <G>
      <Polygon fill={c.marigold} points={`${x - 24},${y - 14} ${x},${y - 34} ${x + 24},${y - 14}`} />
      <Rect fill={c.surface} height={28} rx={3} stroke={c.ink} strokeWidth={2} width={40} x={x - 20} y={y - 14} />
      <Rect fill={c.lagoon} height={14} rx={2} width={10} x={x - 5} y={y} />
    </G>
  );
}

function BirthCenterIcon({ x, y }: { x: number; y: number }) {
  return (
    <G>
      <Rect fill={c.surface} height={34} rx={4} stroke={c.ink} strokeWidth={2} width={48} x={x - 24} y={y - 20} />
      <Path d={`M ${x} ${y + 2} c -9 -6 -11 -14 -5 -16 c 3 -1 5 1 5 3 c 0 -2 2 -4 5 -3 c 6 2 4 10 -5 16 z`} fill={c.marigold} />
    </G>
  );
}

function HospitalIcon({ x, y }: { x: number; y: number }) {
  return (
    <G>
      <Rect fill={c.surface} height={52} rx={4} stroke={c.ink} strokeWidth={2} width={58} x={x - 29} y={y - 38} />
      <Rect fill={c.lagoon} height={18} width={6} x={x - 3} y={y - 30} />
      <Rect fill={c.lagoon} height={6} width={18} x={x - 9} y={y - 24} />
      <Rect fill={c.lagoonSoft} height={10} width={10} x={x - 20} y={y - 2} />
      <Rect fill={c.lagoonSoft} height={10} width={10} x={x + 10} y={y - 2} />
    </G>
  );
}

function CarIcon({ x, y }: { x: number; y: number }) {
  return (
    <G>
      <Path d={`M ${x - 18} ${y} L ${x - 18} ${y - 8} L ${x - 10} ${y - 16} L ${x + 8} ${y - 16} L ${x + 18} ${y - 8} L ${x + 18} ${y} Z`} fill={c.lagoon} />
      <Rect fill={c.lagoonSoft} height={6} rx={1} width={14} x={x - 8} y={y - 14} />
      <Circle cx={x - 10} cy={y} fill={c.ink} r={4.5} />
      <Circle cx={x + 10} cy={y} fill={c.ink} r={4.5} />
    </G>
  );
}

function ClockIcon({ x, y, r = 13 }: { x: number; y: number; r?: number }) {
  return (
    <G>
      <Circle cx={x} cy={y} fill={c.surface} r={r} stroke={c.ink} strokeWidth={2} />
      <Line stroke={c.ink} strokeLinecap="round" strokeWidth={2} x1={x} x2={x} y1={y} y2={y - r + 4} />
      <Line stroke={c.ink} strokeLinecap="round" strokeWidth={2} x1={x} x2={x + r - 5} y1={y} y2={y} />
    </G>
  );
}

function PersonBadge({ x, y, tone }: { x: number; y: number; tone: string }) {
  return (
    <G>
      <Circle cx={x} cy={y} fill={tone} r={15} />
      <Circle cx={x} cy={y - 4} fill={c.surface} r={4.5} />
      <Path d={`M ${x - 8} ${y + 9} a 8 7 0 0 1 16 0 z`} fill={c.surface} />
    </G>
  );
}

function TransferPlan() {
  return (
    <Drawing
      caption="Know which hospital, how you'll get there, and who comes with you."
      label="Map of a transfer plan: dotted routes lead from a home and from a birth center to a nearby hospital, with a car and a clock along the way."
    >
      <Rect fill={c.lagoonSoft} height={176} rx={12} width={344} x={8} y={8} />
      <Path d="M 70 62 C 150 62, 170 96, 262 104" fill="none" stroke={c.lagoon} strokeDasharray="2 9" strokeLinecap="round" strokeWidth={4} />
      <Path d="M 70 148 C 150 148, 170 116, 262 110" fill="none" stroke={c.lagoon} strokeDasharray="2 9" strokeLinecap="round" strokeWidth={4} />
      <HouseIcon x={52} y={64} />
      <Label x={52} y={96}>Home</Label>
      <BirthCenterIcon x={52} y={146} />
      <Label x={52} y={178}>Birth center</Label>
      <HospitalIcon x={296} y={112} />
      <Label x={296} y={146}>Hospital</Label>
      <CarIcon x={176} y={92} />
      <ClockIcon x={176} y={138} />
    </Drawing>
  );
}

function PlanYourRoute() {
  return (
    <Drawing
      caption="Do a practice drive, and pick a backup route and a backup driver."
      height={236}
      label="Map from home to the hospital: a solid main route and a dotted backup route, a clock for travel time, and two people: a driver and a backup driver."
    >
      <Rect fill={c.sky} height={176} rx={12} width={344} x={8} y={8} />
      <Path d="M 78 96 C 140 40, 220 40, 268 92" fill="none" stroke={c.lagoon} strokeLinecap="round" strokeWidth={6} />
      <Path d="M 78 104 C 140 162, 220 162, 268 112" fill="none" stroke={c.lagoon} strokeDasharray="2 10" strokeLinecap="round" strokeWidth={5} />
      <Label x={172} y={34}>Main route</Label>
      <Label x={172} y={174}>Backup route</Label>
      <HouseIcon x={52} y={104} />
      <Label x={52} y={136}>Home</Label>
      <HospitalIcon x={300} y={110} />
      <Label x={300} y={144}>Hospital</Label>
      <ClockIcon x={172} y={84} r={14} />
      <Label color={c.muted} size={11} weight="400" x={172} y={116}>Travel time</Label>
      <PersonBadge tone={c.lagoon} x={96} y={214} />
      <Label x={138} y={218}>Driver</Label>
      <PersonBadge tone={c.marigold} x={204} y={214} />
      <Label x={274} y={218}>Backup driver</Label>
    </Drawing>
  );
}

/**
 * A side view of the body, facing right, in local units (170 wide, 210 tall): head, back, belly and the
 * pelvis (the sacrum behind, the pubic bone in front). `belly` is how far the belly reaches forward,
 * `low` how far down it sits. Children (the uterus, baby, arrows) draw inside, on top of the pelvis.
 */
function BodySide({ x, belly, low = 0, children }: { x: number; belly: number; low?: number; children?: React.ReactNode }) {
  const f = 96 + belly; // the front of the belly at its fullest
  const y = 132 + low; // the height of the fullest point
  const body = `M 52 44 C 40 62, 34 92, 40 120 C 44 140, 30 160, 34 184 L 34 206 L 98 206 L 98 192
    C ${f - 10} ${186 + low * 0.2}, ${f + 2} ${y + 26}, ${f} ${y}
    C ${f - 2} ${y - 36 + low * 0.3}, ${f - 22} ${86 + low * 0.4}, 92 74 C 88 62, 82 52, 72 46 Z`;
  return (
    <G transform={`translate(${x} 0)`}>
      <Rect fill={c.skin} height={14} rx={4} stroke={c.skinLine} strokeWidth={2} width={14} x={55} y={34} />
      <Circle cx={62} cy={24} fill={c.skin} r={16} stroke={c.skinLine} strokeWidth={2} />
      <Path d={body} fill="#FBF6F1" stroke={c.skinLine} strokeLinejoin="round" strokeWidth={2} />
      {/* Pelvis: the sacrum curving down the back, and the pubic bone at the front. */}
      <Path d="M 48 128 C 42 146, 42 166, 54 184" fill="none" stroke={c.pelvis} strokeLinecap="round" strokeWidth={11} />
      <Ellipse cx={90} cy={182} fill={c.pelvis} rx={7} ry={11} />
      {children}
    </G>
  );
}

/** A pear-shaped uterus between `left` and `right`, from `top` down to the cervix at `bottom`. */
function Uterus({ top, bottom = 176, left = 58, right = 124, open = false, firm = false }: { top: number; bottom?: number; left?: number; right?: number; open?: boolean; firm?: boolean }) {
  const h = bottom - top;
  const cx = (left + right) / 2 - 6;
  const sides = `C ${left} ${bottom - h * 0.25}, ${left} ${top + h * 0.3}, ${left + 10} ${top + h * 0.1}
    C ${left + 20} ${top - 3}, ${right - 8} ${top - 3}, ${right} ${top + h * 0.25}
    C ${right + 4} ${top + h * 0.55}, ${right - 14} ${bottom - h * 0.15},`;
  const d = open ? `M ${cx - 9} ${bottom + 2} ${sides} ${cx + 9} ${bottom + 4}` : `M ${cx - 5} ${bottom} ${sides} ${cx + 5} ${bottom + 1} Z`;
  return <Path d={d} fill={open ? 'none' : c.lagoonSoft} stroke={c.lagoon} strokeLinecap="round" strokeLinejoin="round" strokeWidth={firm ? 6 : 3} />;
}

/** A baby curled head-down: the head centred at (hx, hy), the body above it toward the mother's front. */
function BabyCurled({ hx, hy, ghost = false }: { hx: number; hy: number; ghost?: boolean }) {
  if (ghost) return <Circle cx={hx} cy={hy} fill="none" r={11} stroke={c.babyLine} strokeDasharray="3 4" strokeWidth={2} />;
  return (
    <G>
      <Ellipse cx={hx + 12} cy={hy - 30} fill={c.baby} rx={16} ry={23} stroke={c.babyLine} strokeWidth={2} transform={`rotate(-18 ${hx + 12} ${hy - 30})`} />
      <Circle cx={hx} cy={hy} fill={c.baby} r={11} stroke={c.babyLine} strokeWidth={2} />
    </G>
  );
}

function SignsLaborClose() {
  return (
    <Drawing
      caption="Not every baby drops before labor. It can happen days or weeks ahead."
      label="Two side views of a pregnant body. Before: the baby's head sits above the pelvis and the belly is high. After the baby drops: the head has settled lower, into the pelvis, and the belly sits lower."
      height={236}
    >
      <BodySide belly={36} x={6}>
        <Uterus bottom={168} top={70} />
        <BabyCurled hx={86} hy={150} />
      </BodySide>
      <BodySide belly={36} low={14} x={186}>
        <Uterus bottom={186} left={60} top={88} />
        <BabyCurled hx={86} hy={170} />
      </BodySide>
      <Path d="M 172 120 L 190 120" stroke={c.muted} strokeLinecap="round" strokeWidth={2.5} />
      <Path d="M 184 114 L 190 120 L 184 126" fill="none" stroke={c.muted} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} />
      <Label x={90} y={226}>Before</Label>
      <Label x={270} y={226}>After the baby drops</Label>
    </Drawing>
  );
}

function SecondStage() {
  return (
    <Drawing
      caption="Once the cervix is fully open, your baby moves down through your pelvis."
      label="Side view of the body: with the cervix fully open, the baby's head moves down through the pelvis, between the sacrum behind and the pubic bone in front. An arrow shows the direction, down and forward."
      height={214}
    >
      <BodySide belly={36} low={10} x={70}>
        <Uterus open top={84} />
        <BabyCurled ghost hx={76} hy={158} />
        <BabyCurled hx={72} hy={178} />
      </BodySide>
      <Path d="M 232 92 C 238 124, 232 152, 212 174" fill="none" stroke={c.marigold} strokeLinecap="round" strokeWidth={4} />
      <Path d="M 210 162 L 212 174 L 223 170" fill="none" stroke={c.marigold} strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} />
      <Label x={296} y={136}>Moving down</Label>
      <Label color={c.muted} size={11} weight="400" x={44} y={198}>Sacrum</Label>
      <Line stroke={c.muted} strokeWidth={1.2} x1={66} x2={114} y1={194} y2={178} />
      <Label color={c.muted} size={11} weight="400" x={272} y={204}>Pubic bone</Label>
      <Line stroke={c.muted} strokeWidth={1.2} x1={242} x2={166} y1={200} y2={188} />
    </Drawing>
  );
}

function ThirdStage() {
  return (
    <Drawing
      caption="Your uterus keeps contracting after birth, which helps the placenta separate."
      label="Side view of the body after birth: the uterus is much smaller and contracting, and the placenta gently separates from its upper wall."
      height={214}
    >
      <BodySide belly={16} low={4} x={70}>
        <Uterus bottom={174} firm left={62} right={106} top={120} />
        {/* The placenta, lifting away from the upper wall of the uterus. */}
        <Path d="M 68 134 C 72 126, 84 122, 94 125 C 90 133, 78 138, 68 134 Z" fill={c.marigoldSoft} stroke={c.marigold} strokeWidth={2} />
        <Path d="M 67 130 C 71 121, 84 117, 96 121" fill="none" stroke={c.surface} strokeDasharray="2 3" strokeWidth={1.8} />
        {[[44, 150, 1], [124, 150, -1]].map(([ax, ay, dir]) => (
          <G key={ax}>
            <Line stroke={c.muted} strokeLinecap="round" strokeWidth={2.5} x1={ax} x2={ax + 10 * dir} y1={ay} y2={ay} />
            <Path d={`M ${ax + 5 * dir} ${ay - 5} L ${ax + 10 * dir} ${ay} L ${ax + 5 * dir} ${ay + 5}`} fill="none" stroke={c.muted} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} />
          </G>
        ))}
      </BodySide>
      <Label x={290} y={108}>Placenta</Label>
      <Label color={c.muted} size={11} weight="400" x={290} y={122}>separating</Label>
      <Line stroke={c.muted} strokeWidth={1.5} x1={164} x2={258} y1={128} y2={114} />
      <Label x={290} y={168}>Uterus</Label>
      <Label color={c.muted} size={11} weight="400" x={290} y={182}>contracting</Label>
      <Line stroke={c.muted} strokeWidth={1.5} x1={198} x2={262} y1={162} y2={170} />
    </Drawing>
  );
}

// ---------- The registry ----------

const VISUALS: Record<string, () => React.ReactElement> = {
  // Early Pregnancy Basics
  'early-pregnancy-first-steps/early-signs': () => (
    <IconPanel
      label="Common early signs of pregnancy: a missed period, feeling tired, feeling queasy or peeing more, and mood swings."
      items={[
        { icon: Calendar, label: 'Missed period' },
        { icon: Moon, label: 'Feeling tired' },
        { icon: GlassWater, label: 'Queasy or peeing more' },
        { icon: HeartPulse, label: 'Mood swings' },
      ]}
    />
  ),
  'early-pregnancy-first-steps/start-care-early': () => (
    <WeekScale
      label="The first trimester, weeks 1 to 13. Starting prenatal care before 10 weeks is ideal."
      start={0}
      end={14}
      zones={[
        { from: 0, to: 10, label: 'Ideal time to start care', tone: 'lagoon' },
        { from: 10, to: 14, label: 'Still first trimester', tone: 'sky' },
      ]}
      ticks={[1, 4, 7, 10, 13]}
      axisLabel="Weeks since the first day of your last period. Starting later? Call now; it's not too late."
    />
  ),
  'first-trimester-common-changes/common-changes': () => (
    <IconPanel
      label="Common first-trimester changes: feeling more tired, nausea or cravings, peeing more, and mood swings."
      items={[
        { icon: Bed, label: 'More tired' },
        { icon: Utensils, label: 'Nausea or cravings' },
        { icon: Droplet, label: 'Peeing more' },
        { icon: CloudSun, label: 'Mood swings' },
      ]}
    />
  ),
  'first-trimester-common-changes/healthy-habits': () => (
    <IconPanel
      label="Healthy habits: 400 micrograms of folic acid a day, no alcohol, ask your team before any medicine, and keep your prenatal visits."
      items={[
        { icon: Pill, label: '400 mcg folic acid' },
        { icon: GlassWater, label: 'No alcohol' },
        { icon: MessageCircleQuestionMark, label: 'Ask before medicines' },
        { icon: Calendar, label: 'Keep your visits' },
      ]}
    />
  ),
  'first-prenatal-visit/what-is-prenatal-care': () => (
    <IconPanel
      label="Prenatal care includes checkups, screening tests, answers to your questions, and help finding support."
      items={[
        { icon: Stethoscope, label: 'Checkups' },
        { icon: TestTube, label: 'Screening tests' },
        { icon: MessageCircleQuestionMark, label: 'Your questions' },
        { icon: Users, label: 'Community support' },
      ]}
    />
  ),

  // Module 1: Preparing for Birth
  'welcome-how-this-class-works/six-modules': () => <SixModules />,
  'third-trimester-body/home-stretch': () => (
    <WeekScale
      label="Pregnancy by trimester. The third trimester starts at 28 weeks."
      start={0}
      end={40}
      zones={[
        { from: 0, to: 14, label: 'First', tone: 'line' },
        { from: 14, to: 28, label: 'Second', tone: 'sky' },
        { from: 28, to: 40, label: 'Third trimester', tone: 'lagoon' },
      ]}
      marker={{ week: 28, label: 'Starts at 28 weeks' }}
      ticks={[0, 14, 28, 40]}
      axisLabel="Weeks of pregnancy"
    />
  ),
  'third-trimester-body/backache-heartburn': () => <BackAndHeartburn />,
  'care-team-and-birth-setting/place-and-model-of-care': () => (
    <IconPanel
      label="Three places to give birth: a hospital, a birth center, or home. Your options depend on your health, insurance, and location."
      items={[
        { icon: Hospital, label: 'Hospital' },
        { icon: Trees, label: 'Birth center' },
        { icon: House, label: 'Home' },
      ]}
      caption="Your options depend on your health, insurance, and location."
    />
  ),
  'care-team-and-birth-setting/hospitals-and-levels': () => <CareLevels />,
  'care-team-and-birth-setting/who-is-a-good-candidate': () => (
    <IconPanel
      label="A birth center or planned home birth needs a healthy, low-risk pregnancy, a qualified midwife or doctor, and a nearby hospital."
      items={[
        { icon: HeartPulse, label: 'Healthy, low-risk pregnancy' },
        { icon: BadgeCheck, label: 'Qualified midwife or doctor' },
        { icon: Ambulance, label: 'A nearby hospital' },
      ]}
    />
  ),
  'building-your-support-team/continuous-support-evidence': () => (
    <IconPanel
      label="Continuous one-to-one support is linked to more births without a vacuum, forceps, or cesarean, slightly shorter labors, and more satisfaction."
      items={[
        { icon: HeartHandshake, label: 'Continuous support' },
        { icon: Baby, label: 'Fewer assisted births' },
        { icon: Timer, label: 'Slightly shorter labors' },
        { icon: Heart, label: 'More satisfaction' },
      ]}
    />
  ),
  'birth-preferences/moving-eating-monitoring': () => (
    <IconPanel
      label="Preferences to discuss: moving freely, a ball, shower, or bath, drinking and eating in labor, and how your baby's heartbeat is checked."
      items={[
        { icon: PersonStanding, label: 'Move freely' },
        { icon: ShowerHead, label: 'Ball, shower, or bath' },
        { icon: CupSoda, label: 'Ask about food and drink' },
        { icon: HeartPulse, label: "Baby's heartbeat" },
      ]}
    />
  ),
  'birth-preferences/shared-decisions': () => <Brain />,
  'getting-ready-bags-routes-car-seat/why-early': () => (
    <IconPanel
      label="Before labor begins: pack your bag, plan your route, install the car seat, and plan care for children, pets, and home."
      items={[
        { icon: Luggage, label: 'Pack your bag' },
        { icon: Route, label: 'Plan your route' },
        { icon: Car, label: 'Install the car seat' },
        { icon: PawPrint, label: 'Kids, pets, and home' },
      ]}
    />
  ),

  // Module 2: Labor Basics and When to Call
  'how-labor-begins/when-labor-starts': () => (
    <WeekScale
      label="Weeks 34 to 42: preterm before 37 weeks, early term 37 to 38, full term 39 to 40, late term 41. The due date is 40 weeks."
      start={34}
      end={42}
      zones={[
        { from: 34, to: 37, label: 'Preterm', tone: 'alert' },
        { from: 37, to: 39, label: 'Early term', tone: 'marigold' },
        { from: 39, to: 41, label: 'Full term', tone: 'lagoon' },
        { from: 41, to: 42, label: 'Late', tone: 'line' },
      ]}
      marker={{ week: 40, label: 'Due date' }}
      ticks={[34, 35, 36, 37, 38, 39, 40, 41, 42]}
      axisLabel="Weeks of pregnancy. Your due date is an estimate, not a deadline."
    />
  ),
  'how-labor-begins/water-breaking': () => (
    <IconPanel
      label="If your water breaks: note the time, note the color, and call your care team."
      items={[
        { icon: Clock, label: 'Note the time' },
        { icon: Droplet, label: 'Note the color' },
        { icon: Phone, label: 'Call your team' },
      ]}
    />
  ),
  'when-to-contact-your-care-team/five-one-one': () => <FiveOneOne />,
  'when-to-contact-your-care-team/water-breaks': () => (
    <IconPanel
      label="When your water breaks: call even without contractions, note the time, note the color, and mention a positive group B strep test."
      items={[
        { icon: Phone, label: 'Call, even without contractions' },
        { icon: Clock, label: 'Note the time' },
        { icon: Palette, label: 'Note the color' },
        { icon: TestTube, label: 'Mention group B strep' },
      ]}
    />
  ),
  'when-to-contact-your-care-team/bleeding': () => (
    <Steps
      label="Bleeding: pink or brownish mucus near term can be normal; any other bleeding, call your care team; heavy bleeding like a period or more, call right away or 911."
      steps={[
        { title: 'Pink or brownish mucus near term', detail: 'Can be normal', tone: 'lagoon' },
        { title: 'Any other bleeding', detail: 'Call your care team', tone: 'marigold' },
        { title: 'Heavy, like a period or more', detail: 'Call right away, or 911', tone: 'alert' },
      ]}
    />
  ),
  'stages-of-labor/three-stages': () => <ThreeStages />,
  'stages-of-labor/cervix': () => <CervixCircles />,
  'early-labor-at-home/rest-and-move': () => (
    <IconPanel
      label="In early labor, alternate rest with gentle activity like walking or a shower."
      items={[
        { icon: Moon, label: 'Rest' },
        { icon: Footprints, label: 'Walk' },
        { icon: ShowerHead, label: 'Shower' },
      ]}
      caption="Alternate, and follow what feels right."
    />
  ),
  'pushing-and-birth/how-long': () => <PushingRange />,
  'pushing-and-birth/tears': () => (
    <IconPanel
      label="Most tears are small and heal well. Ask about perineal massage in late pregnancy."
      items={[
        { icon: CircleCheck, label: 'Most tears are small' },
        { icon: Bandage, label: 'Most heal well' },
        { icon: Calendar, label: 'Ask about perineal massage' },
      ]}
    />
  ),
  'care-team-and-birth-setting/transfer-plans': () => <TransferPlan />,
  'getting-ready-bags-routes-car-seat/plan-your-route': () => <PlanYourRoute />,
  'how-labor-begins/signs-labor-close': () => <SignsLaborClose />,
  'pushing-and-birth/what-it-feels-like': () => <SecondStage />,
  'placenta-and-first-hour/third-stage': () => <ThirdStage />,
  'placenta-and-first-hour/baby-checks': () => (
    <IconPanel
      label="The Apgar score checks breathing, heart rate, color, muscle tone, and reflexes at 1 and 5 minutes after birth."
      items={[
        { icon: Wind, label: 'Breathing' },
        { icon: HeartPulse, label: 'Heart rate' },
        { icon: Palette, label: 'Color' },
        { icon: BicepsFlexed, label: 'Tone' },
        { icon: Activity, label: 'Reflexes' },
      ]}
      caption="Checked at 1 and 5 minutes after birth."
    />
  ),
  'safe-sleep/more-ways': () => (
    <IconPanel
      label="More ways to lower the risk: breastfeed if you can, offer a pacifier at sleep times, don't let your baby get too hot, keep a smoke-free home, and keep vaccines on schedule."
      items={[
        { icon: Milk, label: 'Breastfeed if you can' },
        { icon: Moon, label: 'Pacifier at sleep times' },
        { icon: Thermometer, label: 'Not too hot' },
        { icon: CigaretteOff, label: 'Smoke-free home' },
        { icon: Syringe, label: 'Vaccines on schedule' },
      ]}
    />
  ),
  'postpartum-warning-signs/heavy-bleeding': () => (
    <Steps
      label="Bleeding after birth: bleeding that slowly gets lighter is normal; bad-smelling or greenish fluid, call your care team; soaking two pads an hour for more than an hour or two, large clots, or feeling faint, get care now."
      steps={[
        { title: 'Bleeding that slowly gets lighter', detail: 'Normal', tone: 'lagoon' },
        { title: 'Bad-smelling or greenish fluid', detail: 'Call your care team', tone: 'marigold' },
        { title: 'Two pads an hour for an hour or two, large clots, or feeling faint', detail: 'Get care now', tone: 'alert' },
      ]}
    />
  ),
  'postpartum-warning-signs/blood-clots': () => (
    <Steps
      label="Blood clots: in a leg or arm, swelling, pain, or warm or red skin, call your care team; in the lungs, trouble breathing, chest pain, coughing up blood, or a fast heartbeat, get care immediately."
      steps={[
        { title: 'Leg or arm: swelling, pain, warm or red skin', detail: 'Call your care team', tone: 'marigold' },
        { title: 'Lungs: trouble breathing, chest pain, coughing up blood, fast heartbeat', detail: 'Get care immediately', tone: 'alert' },
      ]}
    />
  ),
  'when-to-call-about-your-baby/feeding-and-diapers': () => (
    <IconPanel
      label="Feeding and diapers: breastfed babies feed about 8 to 12 times a day; after day 5, at least 6 wet diapers a day; call if your baby is too sleepy to feed or you're worried."
      items={[
        { icon: Clock, label: '8 to 12 feeds a day' },
        { icon: Droplet, label: '6+ wet diapers a day after day 5' },
        { icon: Moon, label: 'Too sleepy to feed? Call' },
        { icon: Phone, label: 'Worried? Call' },
      ]}
    />
  ),
  'making-decisions-with-your-care-team/four-questions': () => (
    <IconPanel
      label="Four questions for any recommendation: why it is recommended, its benefits and risks, the other options including waiting, and how much time there is to decide."
      items={[
        { icon: MessageCircleQuestionMark, label: 'Why for me?' },
        { icon: Scale, label: 'Benefits and risks' },
        { icon: Split, label: 'Other options, including waiting' },
        { icon: Clock, label: 'How much time?' },
      ]}
    />
  ),
  'making-decisions-with-your-care-team/how-much-time': () => (
    <Steps
      label="How much time there is: before labor, time to talk at visits; in labor, often minutes to hours; in an emergency, your team acts fast and explains as they go."
      steps={[
        { title: 'Before labor', detail: 'Time to talk it over at visits', tone: 'lagoon' },
        { title: 'In labor', detail: 'Often minutes to hours; ask for a few minutes', tone: 'marigold' },
        { title: 'An emergency', detail: 'Your team acts fast and explains as they go', tone: 'alert' },
      ]}
    />
  ),
  'monitoring-your-baby-in-labor/two-ways': () => (
    <IconPanel
      label="Two ways to check your baby's heartbeat: listening at set times with a handheld device, or continuous monitoring with belts and a monitor."
      items={[
        { icon: Ear, label: 'Listening at set times' },
        { icon: Activity, label: 'Continuous, with belts and a monitor' },
      ]}
    />
  ),
  'monitoring-your-baby-in-labor/when-continuous': () => (
    <IconPanel
      label="Continuous monitoring is often recommended with oxytocin, an epidural, some health conditions, or a change heard while listening."
      items={[
        { icon: Droplet, label: 'Oxytocin to start or speed labor' },
        { icon: Syringe, label: 'An epidural' },
        { icon: HeartPlus, label: 'Some health conditions' },
        { icon: Ear, label: 'A change heard while listening' },
      ]}
    />
  ),
  'medical-pain-relief/three-options': () => (
    <IconPanel
      label="Three main options: an epidural numbs the lower body, IV pain medicine takes the edge off, and nitrous oxide is a gas you breathe through a mask."
      items={[
        { icon: Syringe, label: 'An epidural' },
        { icon: Droplet, label: 'IV pain medicine' },
        { icon: Wind, label: 'Nitrous oxide' },
      ]}
    />
  ),
  'medical-pain-relief/epidural-tradeoffs': () => (
    <IconPanel
      label="Epidurals: the strongest relief, and many people can rest; blood pressure can drop; itching, shivering, or fever can happen; legs feel heavy."
      items={[
        { icon: Moon, label: 'Strong relief; many can rest' },
        { icon: HeartPulse, label: 'Blood pressure can drop' },
        { icon: Thermometer, label: 'Itching, shivering, or fever' },
        { icon: Footprints, label: 'Legs feel heavy' },
      ]}
    />
  ),
  'induction-of-labor/reasons': () => (
    <IconPanel
      label="Common reasons for induction: past 41 weeks, high blood pressure or preeclampsia, diabetes, water broken without labor, and a baby not growing as expected."
      items={[
        { icon: Calendar, label: 'Past 41 weeks' },
        { icon: HeartPulse, label: 'High blood pressure' },
        { icon: TestTube, label: 'Diabetes' },
        { icon: Droplet, label: 'Water broke, no labor' },
        { icon: Baby, label: 'Baby not growing as expected' },
      ]}
    />
  ),
  'induction-of-labor/how-it-works': () => (
    <Steps
      label="How an induction works: first soften and open the cervix if needed, then start contractions, then labor continues, often slowly at first."
      steps={[
        { title: 'Soften the cervix', detail: 'Medicine or a small balloon, if needed', tone: 'lagoon' },
        { title: 'Start contractions', detail: 'Oxytocin, breaking the water, or both', tone: 'marigold' },
        { title: 'Labor continues', detail: 'Often slowly at first', tone: 'lagoon' },
      ]}
    />
  ),
  'assisted-vaginal-birth/what-is': () => (
    <Steps
      label="An assisted vaginal birth happens during pushing: once the cervix is fully open and the baby is low in the pelvis, you push while your provider guides."
      steps={[
        { title: 'Cervix fully open', detail: 'Only during pushing', tone: 'lagoon' },
        { title: 'Baby low in the pelvis', detail: 'Low enough to guide out', tone: 'lagoon' },
        { title: 'You push, they guide', detail: 'With a vacuum or forceps', tone: 'marigold' },
      ]}
    />
  ),
  'assisted-vaginal-birth/when': () => (
    <IconPanel
      label="Why an assisted birth might be suggested: long pushing without progress, exhaustion, a heart rate pattern showing the baby should be born soon, or a health condition that makes hard pushing unsafe."
      items={[
        { icon: Hourglass, label: 'Long pushing, no progress' },
        { icon: Bed, label: 'Too exhausted to push' },
        { icon: HeartPulse, label: "Baby's heart rate" },
        { icon: HeartPlus, label: 'A health condition' },
      ]}
    />
  ),
  'cesarean-birth/reasons': () => (
    <IconPanel
      label="Common reasons for a cesarean: labor stops making progress, the baby's heart rate shows they need to be born soon, the baby isn't head-down, the placenta covers the cervix, or twins or more."
      items={[
        { icon: Hourglass, label: 'Labor stops progressing' },
        { icon: HeartPulse, label: "Baby's heart rate" },
        { icon: Baby, label: 'Baby not head-down' },
        { icon: CircleDot, label: 'Placenta covers the cervix' },
        { icon: Users, label: 'Twins or more' },
      ]}
    />
  ),
  'cesarean-birth/recovery-home': () => (
    <IconPanel
      label="After a cesarean, call your care team for a fever, a red or leaking incision, pain that gets worse, or heavy bleeding."
      items={[
        { icon: Thermometer, label: 'Fever', tone: 'alert' },
        { icon: Bandage, label: 'Red or leaking incision', tone: 'alert' },
        { icon: TriangleAlert, label: 'Pain getting worse', tone: 'alert' },
        { icon: Droplet, label: 'Heavy bleeding', tone: 'alert' },
      ]}
    />
  ),
  'when-plans-change/in-the-moment': () => (
    <IconPanel
      label="When a change comes up: pause and take a breath, ask why, the options, and how much time, talk it over with your support person, and ask what you can still keep."
      items={[
        { icon: Wind, label: 'Pause and breathe' },
        { icon: MessageCircleQuestionMark, label: 'Why, options, time?' },
        { icon: Users, label: 'Talk it over' },
        { icon: Heart, label: 'What can we keep?' },
      ]}
    />
  ),
  'when-plans-change/when-to-get-help': () => (
    <IconPanel
      label="When to get more help: sadness or worry lasting more than 2 weeks, nightmares or flashbacks, feelings that make it hard to care for yourself or your baby; for thoughts of harming yourself, call or text 988."
      items={[
        { icon: Calendar, label: 'Lasting more than 2 weeks' },
        { icon: Moon, label: 'Nightmares or flashbacks' },
        { icon: HeartHandshake, label: 'Hard to care for yourself' },
        { icon: Phone, label: 'Thoughts of harm: 988', tone: 'alert' },
      ]}
    />
  ),
  'understanding-labor-pain/why-it-hurts': () => (
    <IconPanel
      label="Why labor hurts: the uterus tightens with each contraction, the cervix stretches open, and the baby presses down and stretches the birth canal."
      items={[
        { icon: Activity, label: 'Uterus tightens' },
        { icon: CircleDot, label: 'Cervix opens' },
        { icon: Baby, label: 'Baby moves down' },
      ]}
    />
  ),
  'understanding-labor-pain/waves': () => (
    <Steps
      label="Each contraction comes in a wave: it builds, it peaks, and then there's a break to rest, often with no pain at all."
      steps={[
        { title: 'It builds', detail: 'Breathe and loosen your body', tone: 'lagoon' },
        { title: 'It peaks', detail: 'The strongest part, then it eases', tone: 'marigold' },
        { title: 'A break', detail: 'Rest, often with no pain', tone: 'lagoon' },
      ]}
    />
  ),
  'understanding-labor-pain/options-range': () => (
    <IconPanel
      label="Comfort options: breathing, movement, touch and support, and water without medicine; an epidural or IV pain medicine with medicine."
      items={[
        { icon: Wind, label: 'Breathing' },
        { icon: PersonStanding, label: 'Movement' },
        { icon: HeartHandshake, label: 'Touch and support' },
        { icon: ShowerHead, label: 'Water' },
        { icon: Syringe, label: 'Epidural', tone: 'marigold' },
        { icon: Pill, label: 'IV medicine', tone: 'marigold' },
      ]}
    />
  ),
};

/** The drawn picture for a slide, or null when it has none. */
export function drawnVisualFor(lessonId: string, slideId: string): React.ReactElement | null {
  const render = VISUALS[`${lessonId}/${slideId}`];
  return render ? render() : null;
}

/** Keys of every slide with a drawn picture, for the production list. */
export const DRAWN_VISUAL_KEYS = Object.keys(VISUALS);

const s = StyleSheet.create({
  frame: {
    alignSelf: 'stretch',
    backgroundColor: c.bg,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  caption: { color: c.muted, fontSize: 13, lineHeight: 18, textAlign: 'center' },
  drawing: { width: '100%', maxWidth: 520, alignSelf: 'center' },
  iconRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 },
  iconTile: { width: 104, alignItems: 'center', gap: 6 },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: c.lagoonSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleMarigold: { backgroundColor: c.marigoldSoft },
  circleAlert: { backgroundColor: c.alertSoft },
  iconLabel: { color: c.ink, fontSize: 13, lineHeight: 17, textAlign: 'center', fontWeight: '600' },
  group: { gap: 8 },
  groupTitle: { color: c.lagoon, fontSize: 12, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase', textAlign: 'center' },

  scaleArea: { paddingTop: 30, paddingBottom: 4 },
  zoneTrack: { height: 46, position: 'relative' },
  zone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRightWidth: 2,
    borderRightColor: c.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  zoneText: { color: c.ink, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  marker: { position: 'absolute', top: 0, height: 30, width: 2, marginLeft: -1, alignItems: 'center', zIndex: 2 },
  markerText: { position: 'absolute', top: 0, width: 120, textAlign: 'center', color: c.ink, fontSize: 12, fontWeight: '800' },
  markerLine: { position: 'absolute', top: 18, bottom: 0, width: 2, backgroundColor: c.ink },
  markerNotch: { position: 'absolute', top: 0, height: 8, width: 2, marginLeft: -1, backgroundColor: c.ink },
  tickRow: { height: 18, position: 'relative', marginTop: 4 },
  zoneKey: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 },
  zoneKeyItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  zoneSwatch: { width: 14, height: 14, borderRadius: 4 },
  zoneKeyText: { color: c.ink, fontSize: 12, flexShrink: 1 },
  tick: { position: 'absolute', width: 28, marginLeft: -14, textAlign: 'center', color: c.muted, fontSize: 11 },

  steps: { gap: 8 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, padding: 12 },
  stepNumber: { color: c.lagoon, fontSize: 22, fontWeight: '800', width: 22, textAlign: 'center' },
  stepCopy: { flex: 1, gap: 2 },
  stepTitle: { color: c.ink, fontSize: 15, fontWeight: '700' },
  stepDetail: { color: c.ink, fontSize: 14 },

  fiveRow: { flexDirection: 'row', gap: 8 },
  fiveBlock: { flex: 1, backgroundColor: c.surface, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center' },
  fiveBig: { color: c.lagoon, fontSize: 44, fontWeight: '800', lineHeight: 48 },
  fiveUnit: { color: c.ink, fontSize: 15, fontWeight: '700' },
  fiveNote: { color: c.muted, fontSize: 12, textAlign: 'center' },

  stageRow: { flexDirection: 'row', alignItems: 'stretch', gap: 3, height: 36 },
  stage: { borderRadius: 8, alignItems: 'center', justifyContent: 'center', minWidth: 0 },
  stageTitle: { color: c.ink, fontSize: 14, fontWeight: '800' },
  stageAfter: {
    flex: 1.6,
    borderRadius: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: c.lagoon,
    minWidth: 0,
  },
  stageAfterSwatch: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.lagoon },
  stageKey: { gap: 6, alignSelf: 'center' },
  stageKeyTitle: { fontWeight: '800' },

  circleRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end' },
  circleCol: { flex: 1, alignItems: 'center', gap: 6 },
  circleBox: { height: 54, justifyContent: 'flex-end', alignItems: 'center' },
  dilation: { borderWidth: 2, borderColor: c.lagoon, backgroundColor: c.lagoonSoft },
  circleLabel: { color: c.ink, fontSize: 12, fontWeight: '600' },

  rangeTrack: { height: 40, borderRadius: 20, backgroundColor: c.lagoonSoft, overflow: 'hidden', flexDirection: 'row' },
  rangeFill: { flex: 1 },
  rangeLong: { flex: 1.4, backgroundColor: c.marigoldSoft, justifyContent: 'center', paddingHorizontal: 10 },
  rangeLongText: { color: c.ink, fontSize: 12, fontWeight: '700' },
  rangeEnds: { flexDirection: 'row', justifyContent: 'space-between' },
  rangeEnd: { color: c.muted, fontSize: 12, fontWeight: '600' },

  levels: { gap: 6 },
  levelStep: { backgroundColor: c.lagoon, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, gap: 1 },
  levelTag: { color: c.surface, fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  levelName: { color: c.surface, fontSize: 14 },

  moduleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  moduleCard: {
    flexBasis: '31%',
    flexGrow: 1,
    minWidth: 140,
    backgroundColor: c.surface,
    borderRadius: 12,
    padding: 10,
    gap: 6,
  },
  moduleHere: { backgroundColor: c.lagoon },
  moduleTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  moduleNumber: { color: c.lagoon, fontSize: 20, fontWeight: '800' },
  moduleName: { color: c.ink, fontSize: 13, fontWeight: '700', lineHeight: 17 },
  moduleHereText: { color: c.marigoldSoft, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },

  brain: { gap: 6 },
  brainRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.surface, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, flexWrap: 'wrap' },
  brainLetter: { color: c.lagoon, fontSize: 24, fontWeight: '800', width: 22, textAlign: 'center' },
  brainWord: { color: c.ink, fontSize: 15, fontWeight: '800', minWidth: 96 },
  brainQ: { color: c.muted, fontSize: 14, flexShrink: 1 },
});
