import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import * as Speech from 'expo-speech';
import { StatusBar } from 'expo-status-bar';
import {
  Image,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AskQuestionSheet } from '../components/AskQuestionSheet';
import { animationFor } from '../components/LessonAnimations';
import { LessonListSheet } from '../components/LessonListSheet';
import { LessonVideo } from '../components/LessonVideo';
import { drawnVisualFor } from '../components/LessonVisuals';
import { artworkFor } from '../content/artwork';
import type { Course } from '../content/lessons';
import { recommendedVideosFor, type LibraryVideo } from '../content/videoLibrary';
import { videoFor } from '../content/videos';
import { NARRATION_RATE, pickNarrationVoice, splitSentences } from '../lib/narration';
import { BIRTH_READINESS_REFLECTION_MAX_LENGTH } from '../models/birthReadinessReflection';
import type { CheckInQuestion, Lesson, Slide, Source } from '../models/lesson';
import {
  loadReflection,
  saveReflection,
  type ReflectionKey,
  type ReflectionSaveResult,
} from '../services/birthReadinessReflectionService';

/**
 * Class-style lesson player. Behavior follows docs/handoff/class-player-preview.html:
 * narrated slides with one-sentence captions, auto-advance on teaching slides,
 * check-ins that wait for an answer, safety slides that cannot be skipped until
 * narration finishes, reflections saved for the Birth Readiness Brief, and a
 * review quiz at the end of each lesson.
 */

const colors = {
  bg: '#EEF3F6',
  surface: '#FFFFFF',
  ink: '#1D2940',
  muted: '#5A6680',
  line: '#D5DEE6',
  lagoon: '#23716C',
  lagoonSoft: '#DCEDEA',
  marigold: '#E3A82B',
  marigoldSoft: '#FBF0D6',
  alert: '#B3262F',
  alertSoft: '#FBE6E7',
  caption: '#1D2940',
  captionInk: '#F4F7FA',
};

/** Slides that move on by themselves once narration finishes. */
const AUTO_ADVANCE_TYPES: Slide['type'][] = ['title', 'content', 'comparison', 'summary'];
const AUTO_ADVANCE_DELAY_MS = 1400;

/** Comparison slides about urgent calls get the alert colors. */
const ALERT_COMPARISON_SLIDE_IDS = ['two-kinds-of-calls'];

type Mode = 'intro' | 'slides' | 'quiz' | 'done';

type PlayerState = {
  lessonIndex: number;
  mode: Mode;
  slideIndex: number;
  quizIndex: number;
  score: number;
  /** Option picked on the current check-in or quiz question. */
  answer: number | null;
};

type PlayerAction =
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'answer'; index: number; correct: boolean }
  | { type: 'load'; lessonIndex: number };

function startOfLesson(lessonIndex: number): PlayerState {
  return { lessonIndex, mode: 'intro', slideIndex: 0, quizIndex: 0, score: 0, answer: null };
}

function makeReducer(lessons: Lesson[]) {
  return (state: PlayerState, action: PlayerAction): PlayerState => {
    const lesson = lessons[state.lessonIndex];
    const lastSlide = lesson.slides.length - 1;
    const lastQuiz = lesson.reviewQuiz.length - 1;
    switch (action.type) {
      case 'load':
        return startOfLesson(action.lessonIndex);
      case 'answer':
        if (state.answer !== null) return state;
        return {
          ...state,
          answer: action.index,
          score: state.mode === 'quiz' && action.correct ? state.score + 1 : state.score,
        };
      case 'next': {
        const base = { ...state, answer: null };
        if (state.mode === 'intro') return { ...base, mode: 'slides', slideIndex: 0 };
        if (state.mode === 'slides') {
          if (state.slideIndex >= lastSlide) return { ...base, mode: 'quiz', quizIndex: 0, score: 0 };
          return { ...base, slideIndex: state.slideIndex + 1 };
        }
        if (state.mode === 'quiz') {
          if (state.quizIndex >= lastQuiz) return { ...base, mode: 'done' };
          return { ...base, quizIndex: state.quizIndex + 1 };
        }
        if (state.lessonIndex + 1 < lessons.length) return startOfLesson(state.lessonIndex + 1);
        return { ...startOfLesson(state.lessonIndex), mode: 'slides' };
      }
      case 'back': {
        const base = { ...state, answer: null };
        if (state.mode === 'slides' && state.slideIndex > 0) return { ...base, slideIndex: state.slideIndex - 1 };
        if (state.mode === 'quiz') {
          if (state.quizIndex > 0) return { ...base, quizIndex: state.quizIndex - 1 };
          return { ...base, mode: 'slides', slideIndex: lastSlide };
        }
        if (state.mode === 'done') return { ...base, mode: 'quiz', quizIndex: lastQuiz };
        return state;
      }
    }
  };
}

type ClassPlayerScreenProps = {
  onExit: () => void;
  onOpenBrief: () => void;
  /** Signed-in learner. Without one, reflections are kept on this device only. */
  userId: string | null;
  course: Course;
  /** The lesson to open first, from the home screen's table of contents. */
  initialLessonIndex?: number;
  /** Lessons already finished, for checkmarks in the lesson list. */
  completedLessonIds: string[];
  onLessonOpened: (courseId: string, lessonId: string) => void;
  onLessonCompleted: (lessonId: string) => void;
  /** Lessons that need the full-class purchase. Opening one calls onLockedLesson instead. */
  lockedLessonIds?: string[];
  onLockedLesson?: () => void;
  /** The module after this one, offered when its last lesson is finished. */
  nextCourseTitle?: string;
  onStartNextCourse?: () => void;
};

export function ClassPlayerScreen({
  onExit,
  onOpenBrief,
  userId,
  course,
  initialLessonIndex = 0,
  completedLessonIds,
  onLessonOpened,
  onLessonCompleted,
  lockedLessonIds = [],
  onLockedLesson,
  nextCourseTitle,
  onStartNextCourse,
}: ClassPlayerScreenProps) {
  const lessons = course.lessons;
  const courseTitle = course.title;
  const reducer = useMemo(() => makeReducer(lessons), [lessons]);
  const [state, dispatch] = useReducer(
    reducer,
    Math.min(Math.max(initialLessonIndex, 0), lessons.length - 1),
    startOfLesson,
  );

  const [voiceOn, setVoiceOn] = useState(true);
  const [captionsOn, setCaptionsOn] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [narrationDone, setNarrationDone] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [lessonListOpen, setLessonListOpen] = useState(false);
  const resumeAfterAskRef = useRef(false);

  const voiceIdRef = useRef<string | undefined>(undefined);
  /** Bumped whenever speech is stopped, so callbacks from old speech are ignored. */
  const runRef = useRef(0);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stageRef = useRef<ScrollView>(null);

  const lesson = lessons[state.lessonIndex];
  const slide = state.mode === 'slides' ? lesson.slides[state.slideIndex] : null;
  const quizQuestion = state.mode === 'quiz' ? lesson.reviewQuiz[state.quizIndex] : null;
  const nextLesson = lessons[state.lessonIndex + 1];

  // Remember the lesson the learner is in, and mark it finished once they reach the end.
  useEffect(() => {
    onLessonOpened(lesson.courseId, lesson.lessonId);
    // Only when the lesson changes; the callback is stable enough for this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.lessonId]);
  useEffect(() => {
    if (state.mode === 'done') onLessonCompleted(lesson.lessonId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.mode, lesson.lessonId]);
  const sourcesById = useMemo(
    () => Object.fromEntries(lesson.sources.map((s) => [s.id, s])) as Record<string, Source>,
    [lesson],
  );

  const narration = slide
    ? slide.narration
    : quizQuestion
      ? `Review question ${state.quizIndex + 1} of ${lesson.reviewQuiz.length}.`
      : '';
  const sentences = useMemo(() => splitSentences(narration), [narration]);

  useEffect(() => {
    void pickNarrationVoice().then((id) => {
      voiceIdRef.current = id;
    });
  }, []);

  function clearAdvance() {
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    advanceTimerRef.current = null;
  }

  function stopSpeech() {
    runRef.current += 1;
    void Speech.stop();
  }

  function speakOnce(text: string) {
    const run = ++runRef.current;
    void Speech.stop()
      .catch(() => undefined)
      .finally(() => {
        if (run === runRef.current) {
          Speech.speak(text, { rate: NARRATION_RATE, voice: voiceIdRef.current });
        }
      });
  }

  function onNarrationFinished() {
    setNarrationDone(true);
    if (
      slide &&
      AUTO_ADVANCE_TYPES.includes(slide.type) &&
      state.slideIndex < lesson.slides.length - 1
    ) {
      clearAdvance();
      advanceTimerRef.current = setTimeout(() => dispatch({ type: 'next' }), AUTO_ADVANCE_DELAY_MS);
    }
  }

  /** Speaks the current narration one sentence at a time, starting at `from`. */
  function speakFrom(from: number) {
    clearAdvance();
    const run = ++runRef.current;
    if (!sentences.length) {
      setPlaying(false);
      onNarrationFinished();
      return;
    }
    setPlaying(true);
    setSentenceIndex(from);
    const say = (n: number) => {
      if (run !== runRef.current) return;
      if (n >= sentences.length) {
        setPlaying(false);
        onNarrationFinished();
        return;
      }
      setSentenceIndex(n);
      Speech.speak(sentences[n], {
        rate: NARRATION_RATE,
        voice: voiceIdRef.current,
        onDone: () => say(n + 1),
        onError: () => {
          // If the device can't speak, don't trap anyone on a safety slide.
          if (run !== runRef.current) return;
          setPlaying(false);
          setNarrationDone(true);
        },
      });
    };
    void Speech.stop()
      .catch(() => undefined)
      .finally(() => say(from));
  }

  // Start narration each time the learner lands on a new slide or question.
  const stepKey = `${state.lessonIndex}:${state.mode}:${state.slideIndex}:${state.quizIndex}`;
  useEffect(() => {
    stageRef.current?.scrollTo({ y: 0, animated: false });
    setSentenceIndex(0);
    setNarrationDone(!voiceOn);
    if (voiceOn && (state.mode === 'slides' || state.mode === 'quiz')) {
      speakFrom(0);
    } else {
      setPlaying(false);
      if (voiceOn && state.mode === 'done') {
        speakOnce(`Nice work. You finished the lesson.${nextLesson ? ` Next up, ${nextLesson.title}.` : ''}`);
      }
    }
    return () => {
      clearAdvance();
      stopSpeech();
    };
    // Narration restarts only when the step changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepKey]);

  function goNext() {
    clearAdvance();
    stopSpeech();
    if (state.mode === 'done' && nextLesson && lockedLessonIds.includes(nextLesson.lessonId)) {
      onLockedLesson?.();
      return;
    }
    if (state.mode === 'done' && !nextLesson) {
      onExit();
      return;
    }
    dispatch({ type: 'next' });
  }

  function replayLesson() {
    clearAdvance();
    stopSpeech();
    dispatch({ type: 'load', lessonIndex: state.lessonIndex });
  }

  function goHome() {
    clearAdvance();
    stopSpeech();
    onExit();
  }

  function startNextCourse() {
    clearAdvance();
    stopSpeech();
    onStartNextCourse?.();
  }

  function goBack() {
    clearAdvance();
    stopSpeech();
    dispatch({ type: 'back' });
  }

  function togglePlay() {
    clearAdvance();
    if (playing) {
      stopSpeech();
      setPlaying(false);
    } else {
      speakFrom(narrationDone ? 0 : sentenceIndex);
    }
  }

  /** A lesson video started: stop the narration so the two don't talk over each other. */
  function onVideoPlay() {
    clearAdvance();
    stopSpeech();
    setPlaying(false);
    setNarrationDone(true);
  }

  function openAsk() {
    clearAdvance();
    resumeAfterAskRef.current = playing;
    if (playing) {
      stopSpeech();
      setPlaying(false);
    }
    setAskOpen(true);
  }

  function closeAsk() {
    setAskOpen(false);
    if (resumeAfterAskRef.current && voiceOn && (state.mode === 'slides' || state.mode === 'quiz')) {
      speakFrom(sentenceIndex);
    }
    resumeAfterAskRef.current = false;
  }

  function toggleVoice() {
    clearAdvance();
    if (voiceOn) {
      stopSpeech();
      setPlaying(false);
      setNarrationDone(true);
    }
    setVoiceOn(!voiceOn);
  }

  function answerQuestion(question: CheckInQuestion, index: number) {
    if (state.answer !== null) return;
    const correct = index === question.correctIndex;
    dispatch({ type: 'answer', index, correct });
    clearAdvance();
    setPlaying(false);
    if (voiceOn) speakOnce(`${correct ? 'That’s right. ' : 'Not quite. '}${question.explanation}`);
    else stopSpeech();
  }

  function openLessonList() {
    clearAdvance();
    if (playing) {
      stopSpeech();
      setPlaying(false);
    }
    setLessonListOpen(true);
  }

  function loadLesson(index: number) {
    setLessonListOpen(false);
    clearAdvance();
    stopSpeech();
    if (lockedLessonIds.includes(lessons[index].lessonId)) {
      onLockedLesson?.();
      return;
    }
    dispatch({ type: 'load', lessonIndex: index });
  }

  // Controls
  const isSafety = slide?.type === 'safety';
  let nextLabel = 'Next';
  let nextDisabled = false;
  if (state.mode === 'intro') nextLabel = 'Start';
  else if (state.mode === 'done') {
    if (!nextLesson) nextLabel = 'Home';
    else nextLabel = lockedLessonIds.includes(nextLesson.lessonId) ? 'Unlock next lesson' : 'Next lesson';
  }
  else if (state.mode === 'quiz') {
    nextLabel = state.quizIndex >= lesson.reviewQuiz.length - 1 ? 'Results' : 'Next';
    nextDisabled = state.answer === null;
  } else if (slide) {
    if (state.slideIndex === lesson.slides.length - 1) nextLabel = 'Quiz';
    if (slide.type === 'checkin') {
      nextLabel = 'Continue';
      nextDisabled = state.answer === null;
    }
    if (slide.type === 'safety') {
      nextLabel = 'Got it';
      nextDisabled = voiceOn && !narrationDone;
    }
  }
  const backDisabled = state.mode === 'intro' || (state.mode === 'slides' && state.slideIndex === 0);
  const playDisabled = !voiceOn || state.mode === 'intro' || state.mode === 'done';

  const showCaption = captionsOn && sentences.length > 0 && (state.mode === 'slides' || state.mode === 'quiz');

  // Agenda bar: one segment per slide plus one for the quiz.
  const segmentCount = lesson.slides.length + 1;
  const position =
    state.mode === 'intro' ? -1 : state.mode === 'slides' ? state.slideIndex : state.mode === 'quiz' ? lesson.slides.length : segmentCount;

  return (
    <SafeAreaView style={[styles.safeArea, isSafety && styles.safeAreaSafety]}>
      <StatusBar style="dark" />
      <View style={styles.agenda}>
        <View style={styles.agendaTop}>
          <Pressable
            accessibilityLabel="Leave the class and go home"
            accessibilityRole="button"
            hitSlop={8}
            onPress={onExit}
            style={styles.homeButton}
          >
            <Text style={styles.homeButtonText}>‹ Home</Text>
          </Pressable>
          <Pressable
            accessibilityHint="Shows every lesson in this module, so you can switch."
            accessibilityLabel="Lessons"
            accessibilityRole="button"
            hitSlop={8}
            onPress={openLessonList}
            style={styles.lessonsButton}
            testID="button-open-lesson-list"
          >
            <Text style={styles.homeButtonText}>☰ Lessons</Text>
          </Pressable>
          <Text numberOfLines={1} style={styles.agendaTitle}>
            {lesson.title}
          </Text>
          <Pressable
            accessibilityHint="Ask a question about this lesson."
            accessibilityLabel="Ask a question"
            accessibilityRole="button"
            onPress={openAsk}
            style={styles.askButton}
          >
            <Text style={styles.askButtonText}>Ask</Text>
          </Pressable>
        </View>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.segments}>
          {Array.from({ length: segmentCount }, (_, k) => (
            <View
              key={k}
              style={[styles.segment, k < position && styles.segmentDone, k === position && styles.segmentNow]}
            />
          ))}
        </View>
      </View>

      <ScrollView ref={stageRef} contentContainerStyle={styles.stage} keyboardShouldPersistTaps="handled">
        {state.mode === 'intro' ? (
          <IntroSlide
            completedLessonIds={completedLessonIds}
            courseTitle={courseTitle}
            lesson={lesson}
            lessons={lessons}
            lockedLessonIds={lockedLessonIds}
            onPickLesson={loadLesson}
          />
        ) : null}
        {slide ? (
          <SlideView
            answer={state.answer}
            lesson={lesson}
            onAnswer={answerQuestion}
            onVideoPlay={onVideoPlay}
            userId={userId}
            slide={slide}
            sourcesById={sourcesById}
          />
        ) : null}
        {quizQuestion ? (
          <View style={styles.slide}>
            <Text style={styles.badge}>
              Review {state.quizIndex + 1} of {lesson.reviewQuiz.length}
            </Text>
            <QuestionBlock answer={state.answer} onAnswer={(k) => answerQuestion(quizQuestion, k)} question={quizQuestion} />
          </View>
        ) : null}
        {state.mode === 'done' ? (
          <View style={[styles.slide, styles.centered]}>
            <Text style={styles.kicker}>Lesson complete</Text>
            <Text style={styles.result}>
              {state.score}/{lesson.reviewQuiz.length}
            </Text>
            <Text style={[styles.heading, styles.centerText]}>Nice work finishing {lesson.title}</Text>
            {nextLesson ? null : (
              <Text style={[styles.body, styles.centerText]}>You’ve finished every lesson in this module.</Text>
            )}
            <View style={styles.finishButtons}>
              {nextLesson ? (
                <Pressable accessibilityRole="button" onPress={goNext} style={styles.finishPrimary} testID="button-finish-next-lesson">
                  <Text style={styles.finishPrimaryText}>Next lesson: {nextLesson.title}</Text>
                </Pressable>
              ) : nextCourseTitle && onStartNextCourse ? (
                <Pressable accessibilityRole="button" onPress={startNextCourse} style={styles.finishPrimary} testID="button-finish-next-module">
                  <Text style={styles.finishPrimaryText}>Start the next module: {nextCourseTitle}</Text>
                </Pressable>
              ) : null}
              <Pressable accessibilityRole="button" onPress={goHome} style={styles.finishSecondary} testID="button-finish-home">
                <Text style={styles.finishSecondaryText}>Back to home</Text>
              </Pressable>
              <Pressable accessibilityRole="button" hitSlop={6} onPress={replayLesson} testID="button-finish-replay">
                <Text style={styles.finishLink}>Replay this lesson</Text>
              </Pressable>
            </View>
            {lesson.slides.some((s) => s.type === 'reflection') ? (
              <Pressable
                accessibilityHint="Shows your saved reflection answers and care-team questions."
                accessibilityRole="button"
                onPress={onOpenBrief}
                style={styles.briefButton}
              >
                <Text style={styles.briefButtonText}>See your Birth Readiness Brief</Text>
              </Pressable>
            ) : null}
            <WatchMore key={lesson.lessonId} videos={recommendedVideosFor(lesson.lessonId)} />
          </View>
        ) : null}
      </ScrollView>

      {showCaption ? (
        <View accessibilityLiveRegion="polite" style={styles.caption}>
          {playing ? (
            <Text style={styles.captionText}>{sentences[sentenceIndex]}</Text>
          ) : (
            <ScrollView style={styles.captionScroll}>
              <Text style={[styles.captionText, styles.captionStatic]}>{narration}</Text>
            </ScrollView>
          )}
        </View>
      ) : null}

      <View style={styles.controls}>
        <ControlButton disabled={backDisabled} label="Back" onPress={goBack} accessibilityLabel="Previous slide" />
        <ControlButton
          accessibilityLabel={voiceOn ? 'Mute narration' : 'Turn narration on'}
          label={voiceOn ? 'Voice' : 'Muted'}
          onPress={toggleVoice}
          pressed={voiceOn}
        />
        <Pressable
          accessibilityLabel={playing ? 'Pause narration' : 'Play narration'}
          accessibilityRole="button"
          accessibilityState={{ disabled: playDisabled }}
          disabled={playDisabled}
          onPress={togglePlay}
          style={[styles.playButton, playDisabled && styles.disabled]}
        >
          <Text style={styles.playButtonText}>{playing ? '❚❚' : '▶'}</Text>
        </Pressable>
        <ControlButton
          accessibilityLabel={captionsOn ? 'Hide captions' : 'Show captions'}
          label="CC"
          onPress={() => setCaptionsOn(!captionsOn)}
          pressed={captionsOn}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: nextDisabled }}
          disabled={nextDisabled}
          onPress={goNext}
          style={[styles.nextButton, isSafety && styles.nextButtonSafety, nextDisabled && styles.disabled]}
        >
          <Text style={styles.nextButtonText}>{nextLabel}</Text>
        </Pressable>
      </View>
      <AskQuestionSheet
        lessonId={lesson.lessonId}
        lessonTitle={lesson.title}
        onClose={closeAsk}
        visible={askOpen}
        voiceOn={voiceOn}
      />
      <LessonListSheet
        completedLessonIds={completedLessonIds}
        courseTitle={courseTitle}
        currentLessonId={lesson.lessonId}
        lessons={lessons}
        lockedLessonIds={lockedLessonIds}
        onClose={() => setLessonListOpen(false)}
        onPick={loadLesson}
        visible={lessonListOpen}
      />
    </SafeAreaView>
  );
}

/** Videos from trusted organizations to watch after a lesson. They open on YouTube, outside the app. */
const WATCH_MORE_SHOWN = 3;

function WatchMore({ videos }: { videos: LibraryVideo[] }) {
  const [showAll, setShowAll] = useState(false);
  if (!videos.length) return null;
  const shown = showAll ? videos : videos.slice(0, WATCH_MORE_SHOWN);
  const hidden = videos.length - shown.length;
  return (
    <View style={styles.watchMore}>
      <Text style={styles.sourcesLabel}>Watch more</Text>
      {shown.map((video) => (
        <Pressable
          accessibilityHint={video.kind === 'search' ? 'Opens a YouTube search for this video.' : 'Opens the video on YouTube.'}
          accessibilityRole="link"
          key={video.key}
          onPress={() => void Linking.openURL(video.url).catch(() => undefined)}
          style={styles.watchRow}
          testID={`link-watch-${video.key}`}
        >
          <Text style={styles.watchIcon}>▶</Text>
          <View style={styles.watchText}>
            <Text style={styles.watchTitle}>{video.title}</Text>
            <Text style={styles.watchSource}>
              {video.source}
              {video.kind === 'search' ? ' · YouTube search' : ' · YouTube'}
            </Text>
          </View>
        </Pressable>
      ))}
      {hidden > 0 && (
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowAll(true)}
          style={styles.watchAll}
          testID="button-watch-show-all"
        >
          <Text style={styles.sourceLink}>Show all {videos.length} videos</Text>
        </Pressable>
      )}
      <Text style={styles.watchNote}>Videos open on YouTube, outside BabyReady. They’re made by the organizations named, not BabyReady.</Text>
    </View>
  );
}

function ControlButton({
  label,
  onPress,
  disabled,
  pressed,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  pressed?: boolean;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled, selected: pressed }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.control, pressed === false && styles.controlOff, disabled && styles.disabled]}
    >
      <Text style={styles.controlText}>{label}</Text>
    </Pressable>
  );
}

function IntroSlide({
  lesson,
  lessons,
  courseTitle,
  completedLessonIds,
  lockedLessonIds,
  onPickLesson,
}: {
  lesson: Lesson;
  lessons: Lesson[];
  courseTitle: string;
  completedLessonIds: string[];
  lockedLessonIds: string[];
  onPickLesson: (index: number) => void;
}) {
  return (
    <View style={styles.slide}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.lessonPick}>
        {lessons.map((l, k) => {
          const current = l.lessonId === lesson.lessonId;
          const locked = lockedLessonIds.includes(l.lessonId);
          return (
            <Pressable
              accessibilityHint={locked ? 'Part of the full class. Shows how to unlock it.' : undefined}
              accessibilityRole="button"
              accessibilityState={{ selected: current }}
              key={l.lessonId}
              onPress={() => onPickLesson(k)}
              style={[styles.lessonChip, current && styles.lessonChipCurrent]}
            >
              <Text style={[styles.lessonChipText, current && styles.lessonChipTextCurrent]}>
                {l.order}. {l.title}
                {completedLessonIds.includes(l.lessonId) ? ' ✓' : ''}
                {locked ? ' 🔒' : ''}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Text style={styles.kicker}>
        BabyReady · {courseTitle} · Lesson {lesson.order}
      </Text>
      <Text style={styles.titleHeading}>{lesson.title}</Text>
      <Text style={styles.body}>
        A short class, about {lesson.estimatedMinutes} minutes. Your instructor will talk you through each slide,
        with a couple of quick check-ins along the way.
      </Text>
      <Bullets items={lesson.learningGoals} />
      <Text style={styles.note}>Turn your sound on. Captions are on too, so you can follow along either way.</Text>
    </View>
  );
}

function SlideView({
  slide,
  lesson,
  userId,
  sourcesById,
  answer,
  onAnswer,
  onVideoPlay,
}: {
  slide: Slide;
  lesson: Lesson;
  userId: string | null;
  sourcesById: Record<string, Source>;
  answer: number | null;
  onAnswer: (question: CheckInQuestion, index: number) => void;
  onVideoPlay: () => void;
}) {
  const sources = <SourceList sources={slide.sourceIds.map((id) => sourcesById[id]).filter(Boolean)} />;

  switch (slide.type) {
    case 'title':
      return (
        <View style={[styles.slide, styles.centered]}>
          <Text style={[styles.kicker, styles.centerText]}>{slide.onScreen.join(' · ')}</Text>
          <Text style={[styles.titleHeading, styles.centerText]}>{slide.heading}</Text>
          <SlideVisual lessonId={lesson.lessonId} slide={slide} />
        </View>
      );
    case 'checkin':
      return (
        <View style={styles.slide}>
          <Text style={styles.badge}>Check-in</Text>
          <QuestionBlock answer={answer} onAnswer={(k) => onAnswer(slide.question, k)} question={slide.question} />
        </View>
      );
    case 'safety':
      return (
        <View accessibilityRole="alert" style={[styles.slide, styles.safetySlide]}>
          <Text style={[styles.heading, styles.safetyHeading]}>{slide.heading}</Text>
          <Bullets items={slide.onScreen} />
          <Pressable
            accessibilityHint="Opens your phone to call emergency services."
            accessibilityRole="button"
            onPress={() => void Linking.openURL('tel:911')}
            style={styles.call911}
          >
            <Text style={styles.call911Text}>Call 911</Text>
          </Pressable>
          {sources}
        </View>
      );
    case 'video': {
      const video = videoFor(lesson.lessonId, slide.id);
      const animation = video ? null : animationFor(lesson.lessonId, slide.id, onVideoPlay);
      return (
        <View style={styles.slide}>
          <Text style={styles.heading}>{slide.heading}</Text>
          {video ? (
            <LessonVideo
              key={`${lesson.lessonId}:${slide.id}`}
              label={`Video: ${slide.heading}`}
              onPlay={onVideoPlay}
              source={video}
            />
          ) : animation ? (
            animation
          ) : (
            <View style={styles.videoFrame}>
              <Text style={styles.videoPlay}>▶</Text>
              <Text style={styles.videoTitle}>Video to come (up to {Math.round(slide.video.maxSeconds)} seconds)</Text>
              <Text style={styles.videoBrief}>{slide.video.brief}</Text>
            </View>
          )}
          <Bullets items={slide.onScreen} />
          {sources}
        </View>
      );
    }
    case 'reflection':
      return (
        <View style={styles.slide}>
          <Text style={styles.heading}>{slide.heading}</Text>
          <Bullets items={slide.onScreen} />
          <ReflectionBox
            key={`${lesson.lessonId}:${slide.id}`}
            prompt={slide.prompt}
            reflectionKey={{ courseId: lesson.courseId, lessonId: lesson.lessonId, slideId: slide.id }}
            userId={userId}
          />
          {sources}
        </View>
      );
    case 'comparison': {
      const alert = ALERT_COMPARISON_SLIDE_IDS.includes(slide.id);
      return (
        <View style={styles.slide}>
          <Text style={styles.heading}>{slide.heading}</Text>
          <View style={[styles.table, alert && styles.tableAlert]}>
            <View style={[styles.tableRow, styles.tableHeadRow, alert && styles.tableHeadRowAlert]}>
              {slide.columns.map((c) => (
                <Text key={c} style={[styles.tableCell, styles.tableHead]}>
                  {c}
                </Text>
              ))}
            </View>
            {slide.rows.map((row, k) => (
              <View key={k} style={[styles.tableRow, k > 0 && styles.tableRowDivider]}>
                <Text style={styles.tableCell}>{row[0]}</Text>
                <Text style={styles.tableCell}>{row[1]}</Text>
              </View>
            ))}
          </View>
          <Bullets items={slide.onScreen} />
          {sources}
        </View>
      );
    }
    default:
      return (
        <View style={styles.slide}>
          <Text style={styles.heading}>{slide.heading}</Text>
          <SlideVisual lessonId={lesson.lessonId} slide={slide} />
          <Bullets items={slide.onScreen} />
          {sources}
        </View>
      );
  }
}

function QuestionBlock({
  question,
  answer,
  onAnswer,
}: {
  question: CheckInQuestion;
  answer: number | null;
  onAnswer: (index: number) => void;
}) {
  const answered = answer !== null;
  const correct = answer === question.correctIndex;
  return (
    <View>
      <Text style={styles.question}>{question.prompt}</Text>
      <View style={styles.options}>
        {question.options.map((option, k) => {
          const picked = answer === k;
          const reveal = answered && k === question.correctIndex;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: picked, disabled: answered }}
              disabled={answered}
              key={k}
              onPress={() => onAnswer(k)}
              style={[
                styles.option,
                reveal && styles.optionRight,
                picked && !correct && styles.optionWrong,
              ]}
            >
              <Text style={styles.optionText}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
      {answered ? (
        <View accessibilityLiveRegion="polite" style={styles.explain}>
          <Text style={styles.body}>
            <Text style={styles.bold}>{correct ? 'That’s right. ' : 'Not quite. '}</Text>
            {question.explanation}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function ReflectionBox({
  prompt,
  reflectionKey,
  userId,
}: {
  prompt: string;
  reflectionKey: ReflectionKey;
  userId: string | null;
}) {
  const [text, setText] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | ReflectionSaveResult | 'error'>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Latest unsaved text, so leaving the slide mid-typing still saves it. */
  const pendingRef = useRef<string | null>(null);
  const keyRef = useRef(reflectionKey);
  keyRef.current = reflectionKey;

  function flush() {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = null;
    const value = pendingRef.current;
    if (value === null) return Promise.resolve();
    pendingRef.current = null;
    return saveReflection(userId, keyRef.current, value).then(
      (result) => setStatus(result),
      () => setStatus('error'),
    );
  }

  useEffect(() => {
    let active = true;
    loadReflection(userId, reflectionKey)
      .then((saved) => {
        // Don't overwrite anything the learner started typing while this loaded.
        if (active && saved.text && pendingRef.current === null) {
          setText(saved.text);
          setStatus(saved.source);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
      void flush();
    };
    // Load once per reflection slide.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onChange(value: string) {
    setText(value);
    setStatus('saving');
    pendingRef.current = value;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => void flush(), 600);
  }

  return (
    <View>
      <Text style={styles.reflectionPrompt}>{prompt}</Text>
      <TextInput
        accessibilityLabel={prompt}
        maxLength={BIRTH_READINESS_REFLECTION_MAX_LENGTH}
        multiline
        onBlur={() => void flush()}
        onChangeText={onChange}
        placeholder="Type your answer"
        placeholderTextColor={colors.muted}
        style={styles.reflectionInput}
        textAlignVertical="top"
        value={text}
      />
      <Text accessibilityLiveRegion="polite" style={[styles.savedNote, status === 'error' && styles.savedNoteError]}>
        {status === 'saving'
          ? 'Saving…'
          : status === 'saved'
            ? 'Saved to your private Birth Readiness Brief'
            : status === 'saved-on-device'
              ? 'Saved on this device. It will show in your Birth Readiness Brief here.'
              : status === 'error'
                ? 'Couldn’t save your answer. Copy your notes somewhere safe.'
                : ' '}
      </Text>
    </View>
  );
}

/** The slide's picture: drawn in code, commissioned artwork, or a placeholder until artwork exists. */
function SlideVisual({ lessonId, slide }: { lessonId: string; slide: Slide }) {
  if (!slide.visual) return null;
  const drawn = drawnVisualFor(lessonId, slide.id);
  if (drawn) return drawn;
  const artwork = artworkFor(lessonId, slide.id);
  if (artwork) {
    // A fixed 16:10 frame: on the web an image sized by aspect ratio alone grows taller than the picture.
    return (
      <View style={styles.artworkFrame}>
        <Image
          accessibilityLabel={slide.visual.description}
          resizeMode="contain"
          source={artwork}
          style={styles.artwork}
        />
      </View>
    );
  }
  return (
    <View accessibilityLabel={slide.visual.description} style={styles.visualPlaceholder}>
      <Text style={styles.bold}>Artwork to come</Text>
      <Text style={styles.visualText}>{slide.visual.description}</Text>
    </View>
  );
}

function Bullets({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <View style={styles.points}>
      {items.map((item, k) => (
        <View key={k} style={styles.point}>
          <View style={styles.pointDot} />
          <Text style={styles.pointText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function SourceList({ sources }: { sources: Source[] }) {
  if (!sources.length) return null;
  return (
    <View style={styles.sources}>
      <Text style={styles.sourcesLabel}>Sources</Text>
      {sources.map((s) => (
        <Text
          accessibilityRole="link"
          key={s.id}
          onPress={() => void Linking.openURL(s.url)}
          style={styles.sourceLink}
        >
          {s.organization}: {s.title}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  safeAreaSafety: { backgroundColor: colors.alertSoft },
  agenda: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8, gap: 8 },
  agendaTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  homeButton: { paddingVertical: 4 },
  lessonsButton: { paddingVertical: 4 },
  homeButtonText: { color: colors.lagoon, fontSize: 16, fontWeight: '700' },
  agendaTitle: { flex: 1, color: colors.ink, fontSize: 16, fontWeight: '700' },
  askButton: {
    borderWidth: 1.5,
    borderColor: colors.lagoon,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  askButtonText: { color: colors.lagoon, fontSize: 15, fontWeight: '800' },
  segments: { flexDirection: 'row', gap: 3 },
  segment: { flex: 1, height: 5, borderRadius: 3, backgroundColor: colors.line },
  segmentDone: { backgroundColor: colors.lagoon },
  segmentNow: { backgroundColor: colors.marigold },
  stage: { padding: 16, paddingBottom: 24, flexGrow: 1, width: '100%', maxWidth: 760, alignSelf: 'center' },
  slide: { backgroundColor: colors.surface, borderRadius: 20, padding: 20, gap: 14 },
  centered: { alignItems: 'center', justifyContent: 'center', minHeight: 320 },
  centerText: { textAlign: 'center' },
  kicker: { color: colors.lagoon, fontSize: 13, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  titleHeading: { color: colors.ink, fontSize: 32, fontWeight: '800', lineHeight: 38 },
  heading: { color: colors.ink, fontSize: 24, fontWeight: '800', lineHeight: 30 },
  body: { color: colors.ink, fontSize: 17, lineHeight: 25 },
  bold: { fontWeight: '700', color: colors.ink },
  note: { color: colors.muted, fontSize: 14 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.marigoldSoft,
    color: colors.ink,
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  points: { gap: 10 },
  point: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  pointDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.lagoon, marginTop: 9 },
  pointText: { flex: 1, color: colors.ink, fontSize: 17, lineHeight: 25 },
  lessonPick: { gap: 8, paddingBottom: 4 },
  lessonChip: {
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  lessonChipCurrent: { borderColor: colors.lagoon, backgroundColor: colors.lagoonSoft },
  lessonChipText: { color: colors.ink, fontSize: 14 },
  lessonChipTextCurrent: { fontWeight: '700' },
  visualPlaceholder: {
    alignSelf: 'stretch',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.line,
    borderRadius: 14,
    padding: 14,
    gap: 4,
    backgroundColor: colors.bg,
  },
  artworkFrame: { alignSelf: 'stretch', width: '100%', aspectRatio: 16 / 10, borderRadius: 14, overflow: 'hidden' },
  artwork: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  visualText: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  question: { color: colors.ink, fontSize: 21, fontWeight: '700', lineHeight: 28, marginBottom: 12 },
  options: { gap: 10 },
  option: {
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surface,
  },
  optionRight: { borderColor: colors.lagoon, backgroundColor: colors.lagoonSoft },
  optionWrong: { borderColor: colors.alert, backgroundColor: colors.alertSoft },
  optionText: { color: colors.ink, fontSize: 17, lineHeight: 23 },
  explain: { marginTop: 14, backgroundColor: colors.marigoldSoft, borderRadius: 14, padding: 14 },
  safetySlide: { borderWidth: 2, borderColor: colors.alert },
  safetyHeading: { color: colors.alert },
  call911: {
    alignSelf: 'flex-start',
    backgroundColor: colors.alert,
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  call911Text: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  videoFrame: {
    backgroundColor: colors.ink,
    borderRadius: 16,
    padding: 20,
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  videoPlay: { color: colors.captionInk, fontSize: 30 },
  videoTitle: { color: colors.captionInk, fontWeight: '700', fontSize: 15, textAlign: 'center' },
  videoBrief: { color: colors.captionInk, opacity: 0.8, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  table: { borderWidth: 1.5, borderColor: colors.line, borderRadius: 14, overflow: 'hidden' },
  tableAlert: { borderColor: colors.alert },
  tableRow: { flexDirection: 'row' },
  tableRowDivider: { borderTopWidth: 1, borderTopColor: colors.line },
  tableHeadRow: { backgroundColor: colors.lagoonSoft },
  tableHeadRowAlert: { backgroundColor: colors.alertSoft },
  tableCell: { flex: 1, padding: 10, color: colors.ink, fontSize: 15, lineHeight: 21 },
  tableHead: { fontWeight: '800' },
  reflectionPrompt: { color: colors.ink, fontSize: 17, fontWeight: '700', marginBottom: 6 },
  reflectionInput: {
    minHeight: 110,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 14,
    padding: 12,
    fontSize: 17,
    color: colors.ink,
    backgroundColor: colors.bg,
  },
  savedNote: { color: colors.lagoon, fontSize: 14, marginTop: 6 },
  savedNoteError: { color: colors.alert },
  briefButton: {
    marginTop: 6,
    borderWidth: 1.5,
    borderColor: colors.lagoon,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  briefButtonText: { color: colors.lagoon, fontSize: 15, fontWeight: '700' },
  finishButtons: { alignItems: 'center', alignSelf: 'stretch', gap: 10, marginTop: 6 },
  finishPrimary: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: colors.lagoon,
    borderRadius: 999,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  finishPrimaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', textAlign: 'center' },
  finishSecondary: {
    alignItems: 'center',
    alignSelf: 'stretch',
    borderColor: colors.lagoon,
    borderRadius: 999,
    borderWidth: 1.5,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 18,
  },
  finishSecondaryText: { color: colors.lagoon, fontSize: 16, fontWeight: '800' },
  finishLink: { color: colors.lagoon, fontSize: 15, fontWeight: '700', paddingVertical: 6, textDecorationLine: 'underline' },
  watchMore: { alignSelf: 'stretch', borderTopWidth: 1, borderTopColor: colors.line, gap: 8, marginTop: 14, paddingTop: 12 },
  watchRow: { alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 44 },
  watchIcon: { color: colors.lagoon, fontSize: 18, textAlign: 'center', width: 24 },
  watchText: { flex: 1 },
  watchTitle: { color: colors.ink, fontSize: 15, fontWeight: '700', lineHeight: 20 },
  watchSource: { color: colors.muted, fontSize: 13, marginTop: 1 },
  watchAll: { justifyContent: 'center', minHeight: 44 },
  watchNote: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  sources: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 10, gap: 4 },
  sourcesLabel: { color: colors.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  sourceLink: { color: colors.lagoon, fontSize: 13, textDecorationLine: 'underline' },
  result: { color: colors.lagoon, fontSize: 56, fontWeight: '800' },
  caption: { backgroundColor: colors.caption, paddingHorizontal: 18, paddingVertical: 12 },
  captionScroll: { maxHeight: 110 },
  captionText: { color: colors.captionInk, fontSize: 18, lineHeight: 26, textAlign: 'center' },
  captionStatic: { fontSize: 15, lineHeight: 22, textAlign: 'left', opacity: 0.9 },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  control: {
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    minWidth: 52,
    alignItems: 'center',
  },
  controlOff: { backgroundColor: colors.bg },
  controlText: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.lagoon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  nextButton: {
    flex: 1,
    backgroundColor: colors.lagoon,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  nextButtonSafety: { backgroundColor: colors.alert },
  nextButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  disabled: { opacity: 0.4 },
});
