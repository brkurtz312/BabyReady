import type { ComponentType } from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
};

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
  const pct = (w: number) => `${((w - start) / (end - start)) * 100}%` as const;
  const zoneColor = { alert: c.alertSoft, marigold: c.marigoldSoft, lagoon: c.lagoonSoft, line: c.line, sky: c.sky };
  return (
    <Frame label={label}>
      <View style={s.scaleArea}>
        {marker ? (
          <View style={[s.marker, { left: pct(marker.week) }]}>
            <Text style={s.markerText}>{marker.label}</Text>
            <View style={s.markerLine} />
          </View>
        ) : null}
        <View style={s.zoneTrack}>
          {zones.map((z) => (
            <View
              key={z.label}
              style={[s.zone, { left: pct(z.from), width: `${((z.to - z.from) / (end - start)) * 100}%`, backgroundColor: zoneColor[z.tone] }]}
            >
              <Text numberOfLines={2} style={s.zoneText}>
                {z.label}
              </Text>
            </View>
          ))}
        </View>
        <View style={s.tickRow}>
          {ticks.map((t) => (
            <Text key={t} style={[s.tick, { left: pct(t) }]}>
              {t}
            </Text>
          ))}
        </View>
      </View>
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
    { flex: 7, title: 'Stage 1', detail: 'Cervix opens', tone: c.lagoonSoft },
    { flex: 2.2, title: 'Stage 2', detail: 'Push and birth', tone: c.marigoldSoft },
    { flex: 1.2, title: '3', detail: 'Placenta', tone: c.sky },
  ];
  return (
    <Frame label="Three stages of labor: stage 1, the cervix opens, usually the longest; stage 2, pushing and birth; stage 3, the placenta is delivered. Then the first hours of recovery and bonding.">
      <View style={s.stageRow}>
        {stages.map((st) => (
          <View key={st.title} style={[s.stage, { flex: st.flex, backgroundColor: st.tone }]}>
            <Text numberOfLines={1} style={s.stageTitle}>
              {st.title}
            </Text>
            <Text numberOfLines={2} style={s.stageDetail}>
              {st.detail}
            </Text>
          </View>
        ))}
        <View style={s.stageAfter}>
          <Text numberOfLines={3} style={s.stageAfterText}>
            First hours: recovery and bonding
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
          const d = Math.max(8, (cm / max) * 64);
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
  marker: { position: 'absolute', top: 0, bottom: 20, width: 2, marginLeft: -1, alignItems: 'center', zIndex: 2 },
  markerText: { position: 'absolute', top: 0, width: 120, textAlign: 'center', color: c.ink, fontSize: 12, fontWeight: '800' },
  markerLine: { position: 'absolute', top: 18, bottom: 0, width: 2, backgroundColor: c.ink },
  tickRow: { height: 18, position: 'relative', marginTop: 4 },
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

  stageRow: { flexDirection: 'row', alignItems: 'stretch', gap: 3, minHeight: 64 },
  stage: { borderRadius: 8, padding: 8, justifyContent: 'center', minWidth: 0 },
  stageTitle: { color: c.ink, fontSize: 13, fontWeight: '800' },
  stageDetail: { color: c.ink, fontSize: 12 },
  stageAfter: {
    flex: 1.6,
    borderRadius: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: c.lagoon,
    padding: 6,
    justifyContent: 'center',
    minWidth: 0,
  },
  stageAfterText: { color: c.lagoon, fontSize: 11, fontWeight: '700' },

  circleRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end' },
  circleCol: { alignItems: 'center', gap: 6 },
  circleBox: { height: 66, justifyContent: 'flex-end', alignItems: 'center' },
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
