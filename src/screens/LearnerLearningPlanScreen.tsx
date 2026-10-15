import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useLearnerLayout } from '../lib/learnerLayout';
import type {
  CourseProgress,
  CourseRecord,
  LearnerCourseLesson,
  LearnerCourseModule,
} from '../models/course';
import {
  subscribeToPublishedCourses,
  type PublishedCourseCatalogState,
} from '../services/learnerCourseService';
import {
  courseProgressDocumentId,
  subscribeToLearnerProgress,
  upsertCourseLessonProgress,
  type LearnerProgressState,
} from '../services/learnerProgressService';

export type LearningPlanLessonTarget = {
  moduleId: string;
  lessonId: string;
};

type LearningPlanAuthStatus = 'ready' | 'loading' | 'unconfigured' | 'error';

type LearnerLearningPlanScreenProps = {
  authStatus: LearningPlanAuthStatus;
  onExit: () => void;
  onOpenCourse: (
    course: CourseRecord,
    target?: LearningPlanLessonTarget,
  ) => void;
  userId?: string | null;
};

type AvailableLesson = {
  course: CourseRecord;
  module: LearnerCourseModule;
  lesson: LearnerCourseLesson;
};

type TimelinePhase = {
  id: string;
  title: string;
  description: string;
  matches: (course: CourseRecord) => boolean;
};

const timelinePhases: TimelinePhase[] = [
  {
    id: 'early-pregnancy',
    title: 'Early pregnancy',
    description: 'Start with foundational learning and questions for your care team.',
    matches: (course) =>
      /early|first-trimester|first trimester/.test(
        `${course.id} ${course.title}`.toLowerCase(),
      ),
  },
  {
    id: 'second-trimester',
    title: 'Second trimester',
    description: 'Continue building understanding as more lessons are published.',
    matches: (course) =>
      /second-trimester|second trimester/.test(
        `${course.id} ${course.title}`.toLowerCase(),
      ),
  },
  {
    id: 'preparing-for-labor',
    title: 'Preparing for labor',
    description: 'Explore planning and preparation lessons when they are published.',
    matches: (course) =>
      /prepar|birth-plan|birth plan|third-trimester|third trimester/.test(
        `${course.id} ${course.title}`.toLowerCase(),
      ),
  },
  {
    id: 'labor-and-birth',
    title: 'Labor and birth',
    description: 'Learn the childbirth topics your clinical team has reviewed.',
    matches: (course) =>
      /labor|labour|birth/.test(`${course.id} ${course.title}`.toLowerCase()),
  },
  {
    id: 'newborn-care-and-feeding',
    title: 'Newborn care and feeding',
    description: 'Find newborn and feeding education after it is published.',
    matches: (course) =>
      /newborn|feeding|feed|lactation/.test(
        `${course.id} ${course.title}`.toLowerCase(),
      ),
  },
  {
    id: 'recovery-and-postpartum',
    title: 'Recovery and postpartum',
    description: 'Return for recovery and postpartum education as it becomes available.',
    matches: (course) =>
      /postpartum|recovery/.test(`${course.id} ${course.title}`.toLowerCase()),
  },
];

function lessonsForCourses(courses: CourseRecord[]): AvailableLesson[] {
  return courses
    .slice()
    .sort((left, right) => left.title.localeCompare(right.title))
    .flatMap((course) =>
      (course.learnerOutline ?? [])
        .slice()
        .sort((left, right) => left.order - right.order)
        .flatMap((module) =>
          module.lessons.map((lesson) => ({ course, module, lesson })),
        ),
    );
}

function progressKey(lesson: AvailableLesson): string {
  return courseProgressDocumentId(
    lesson.course.id,
    lesson.module.id,
    lesson.lesson.id,
  );
}

function progressByLesson(progress: CourseProgress[]): Map<string, CourseProgress> {
  return new Map(
    progress.map((item) => [
      courseProgressDocumentId(item.courseId, item.moduleId, item.lessonId),
      item,
    ]),
  );
}

function lessonTime(lesson: LearnerCourseLesson): string {
  return lesson.estimatedMinutes ? `${lesson.estimatedMinutes} min` : 'Self-paced';
}

function learnerAccessMessage(authStatus: LearningPlanAuthStatus): string {
  if (authStatus === 'loading') {
    return 'Setting up your private learning plan…';
  }
  if (authStatus === 'unconfigured') {
    return 'Your learning plan is not connected yet. Add the BabyReady Firebase configuration to save lesson progress.';
  }
  if (authStatus === 'error') {
    return 'Your private learning plan is temporarily unavailable. Please try again when your session is ready.';
  }
  return 'Sign in to save lesson completion in your private learning plan.';
}

export function LearnerLearningPlanScreen({
  authStatus,
  onExit,
  onOpenCourse,
  userId,
}: LearnerLearningPlanScreenProps) {
  const { isTabletLayout } = useLearnerLayout();
  const [catalog, setCatalog] = useState<PublishedCourseCatalogState>({
    status: 'loading',
    courses: [],
    error: null,
  });
  const [progressState, setProgressState] = useState<LearnerProgressState>({
    status: userId ? 'loading' : 'unauthenticated',
    progress: [],
    error: null,
  });
  const [pendingCompletion, setPendingCompletion] = useState<Record<string, boolean>>(
    {},
  );
  const [progressError, setProgressError] = useState<string | null>(null);

  useEffect(
    () => subscribeToPublishedCourses(setCatalog) ?? undefined,
    [],
  );

  useEffect(
    () => subscribeToLearnerProgress(userId, setProgressState) ?? undefined,
    [userId],
  );

  const availableCourses = useMemo(
    () =>
      catalog.courses.filter(
        (course) => (course.learnerOutline?.length ?? 0) > 0,
      ),
    [catalog.courses],
  );
  const availableLessons = useMemo(
    () => lessonsForCourses(availableCourses),
    [availableCourses],
  );
  const storedProgress = useMemo(
    () => progressByLesson(progressState.progress),
    [progressState.progress],
  );
  const completionFor = (lesson: AvailableLesson): boolean => {
    const key = progressKey(lesson);
    if (key in pendingCompletion) {
      return pendingCompletion[key];
    }
    return storedProgress.get(key)?.state === 'completed';
  };
  const completedCount = availableLessons.filter(completionFor).length;
  const progressPercent =
    availableLessons.length > 0
      ? Math.round((completedCount / availableLessons.length) * 100)
      : 0;
  const nextLesson = availableLessons.find((lesson) => !completionFor(lesson));
  const allLessonsComplete =
    availableLessons.length > 0 && completedCount === availableLessons.length;
  const canUpdateProgress =
    Boolean(userId) && progressState.status !== 'unconfigured';

  const toggleLesson = (lesson: AvailableLesson) => {
    if (!canUpdateProgress || !userId) {
      return;
    }

    const key = progressKey(lesson);
    const nextComplete = !completionFor(lesson);
    setProgressError(null);
    setPendingCompletion((current) => ({ ...current, [key]: nextComplete }));

    void upsertCourseLessonProgress({
      userId,
      courseId: lesson.course.id,
      moduleId: lesson.module.id,
      lessonId: lesson.lesson.id,
      state: nextComplete ? 'completed' : 'not_started',
    })
      .then((result) => {
        if (result === 'unavailable') {
          setProgressError(
            'Progress could not be saved because your private plan is unavailable.',
          );
        }
        setPendingCompletion((current) => {
          const { [key]: _discarded, ...remaining } = current;
          return remaining;
        });
      })
      .catch(() => {
        setPendingCompletion((current) => {
          const { [key]: _discarded, ...remaining } = current;
          return remaining;
        });
        setProgressError(
          'Progress could not be saved. Check your connection and try again.',
        );
      });
  };

  const openLesson = (lesson: AvailableLesson) => {
    onOpenCourse(lesson.course, {
      moduleId: lesson.module.id,
      lessonId: lesson.lesson.id,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          isTabletLayout && styles.tabletContent,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          accessibilityLabel="Return to the learner home screen"
          accessibilityRole="button"
          onPress={onExit}
          style={styles.backButton}
          testID="button-return-to-learner-home"
        >
          <Text style={styles.backButtonText}>‹ Home</Text>
        </Pressable>

        <Text style={styles.brand}>BABYREADY VIRTUAL EDUCATOR</Text>
        <Text accessibilityRole="header" style={styles.title}>
          Pregnancy learning plan
        </Text>
        <Text style={styles.subtitle}>
          A learning map for childbirth education, built from clinician-reviewed
          lessons as they are published.
        </Text>

        {authStatus !== 'ready' || !userId ? (
          <View accessibilityRole="alert" style={styles.accessCard}>
            {authStatus === 'loading' ? (
              <ActivityIndicator color="#01696F" />
            ) : null}
            <Text style={styles.accessTitle}>Private progress unavailable</Text>
            <Text style={styles.accessText}>{learnerAccessMessage(authStatus)}</Text>
          </View>
        ) : null}

        <View
          accessibilityLabel={`${completedCount} of ${availableLessons.length} available lessons complete`}
          style={styles.progressCard}
        >
          <View style={styles.progressHeading}>
            <View>
              <Text style={styles.progressEyebrow}>YOUR PROGRESS</Text>
              <Text style={styles.progressCount}>
                {completedCount} of {availableLessons.length} lessons complete
              </Text>
            </View>
            <Text style={styles.progressPercent}>{progressPercent}%</Text>
          </View>
          <View
            accessibilityRole="progressbar"
            accessibilityValue={{
              min: 0,
              max: availableLessons.length || 1,
              now: completedCount,
              text: `${completedCount} of ${availableLessons.length} lessons complete`,
            }}
            style={styles.progressTrack}
          >
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
        </View>

        {catalog.status === 'loading' ? (
          <View style={styles.statusCard}>
            <ActivityIndicator color="#01696F" />
            <Text style={styles.statusText}>Loading published learning…</Text>
          </View>
        ) : null}

        {catalog.status === 'unconfigured' ? (
          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>Learning plan is not connected</Text>
            <Text style={styles.statusText}>
              Add the BabyReady Firebase configuration to load published lessons.
            </Text>
          </View>
        ) : null}

        {catalog.status === 'error' ? (
          <View accessibilityRole="alert" style={styles.errorCard}>
            <Text style={styles.errorTitle}>Published lessons are unavailable</Text>
            <Text style={styles.errorText}>
              Check your connection and try again. {catalog.error}
            </Text>
          </View>
        ) : null}

        {progressState.status === 'error' || progressError ? (
          <Text accessibilityRole="alert" style={styles.progressError}>
            {progressError ?? progressState.error}
          </Text>
        ) : null}

        {catalog.status === 'ready' && nextLesson ? (
          <View style={styles.nextCard}>
            <Text style={styles.nextEyebrow}>NEXT STEP</Text>
            <Text style={styles.nextTitle}>{nextLesson.lesson.title}</Text>
            <Text style={styles.nextCourse}>{nextLesson.course.title}</Text>
            <Text style={styles.nextMeta}>
              {nextLesson.module.title} · {lessonTime(nextLesson.lesson)}
            </Text>
            <Pressable
              accessibilityHint="Opens this clinician-reviewed course at your next incomplete lesson."
              accessibilityLabel={`Begin ${nextLesson.lesson.title} in ${nextLesson.course.title}`}
              accessibilityRole="button"
              onPress={() => openLesson(nextLesson)}
              style={styles.nextButton}
              testID={`button-begin-next-lesson-${nextLesson.course.id}-${nextLesson.module.id}-${nextLesson.lesson.id}`}
            >
              <Text style={styles.nextButtonText}>Begin lesson</Text>
            </Pressable>
          </View>
        ) : null}

        {catalog.status === 'ready' && allLessonsComplete ? (
          <View style={styles.completeCard}>
            <Text style={styles.completeTitle}>Available lessons completed</Text>
            <Text style={styles.completeText}>
              You can revisit any published lesson below. More of the learning
              path will appear when it is clinically reviewed and published.
            </Text>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <View>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              Available now
            </Text>
            <Text style={styles.sectionSubtitle}>
              Check a lesson when you finish it. Completion is saved to your
              private BabyReady plan.
            </Text>
          </View>
        </View>

        {catalog.status === 'ready' && availableLessons.length === 0 ? (
          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>Your first lesson is being prepared</Text>
            <Text style={styles.statusText}>
              This learning map will become actionable as clinician-reviewed
              lessons are published.
            </Text>
          </View>
        ) : null}

        <View style={styles.lessonList}>
          {availableLessons.map((availableLesson) => {
            const complete = completionFor(availableLesson);
            const isSaving = progressKey(availableLesson) in pendingCompletion;
            return (
              <View
                key={progressKey(availableLesson)}
                style={[styles.lessonRow, complete && styles.lessonRowComplete]}
              >
                <Pressable
                  accessibilityHint={
                    canUpdateProgress
                      ? 'Saves completion to your private learning plan.'
                      : learnerAccessMessage(authStatus)
                  }
                  accessibilityLabel={`${complete ? 'Mark incomplete' : 'Mark complete'}: ${availableLesson.lesson.title}`}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: complete, disabled: !canUpdateProgress }}
                  disabled={!canUpdateProgress || isSaving}
                  onPress={() => toggleLesson(availableLesson)}
                  style={styles.checkboxButton}
                  testID={`checkbox-course-progress-${availableLesson.course.id}-${availableLesson.module.id}-${availableLesson.lesson.id}`}
                >
                  <View style={[styles.checkbox, complete && styles.checkboxComplete]}>
                    <Text style={styles.checkmark}>{complete ? '✓' : ''}</Text>
                  </View>
                </Pressable>
                <Pressable
                  accessibilityHint="Opens this published course."
                  accessibilityLabel={`Open ${availableLesson.lesson.title} in ${availableLesson.course.title}`}
                  accessibilityRole="button"
                  onPress={() => openLesson(availableLesson)}
                  style={styles.lessonContent}
                  testID={`button-open-plan-lesson-${availableLesson.course.id}-${availableLesson.module.id}-${availableLesson.lesson.id}`}
                >
                  <Text style={styles.lessonCourse}>{availableLesson.course.title}</Text>
                  <Text style={[styles.lessonTitle, complete && styles.lessonTitleComplete]}>
                    {availableLesson.lesson.title}
                  </Text>
                  <Text style={styles.lessonMeta}>
                    {availableLesson.module.title} · {lessonTime(availableLesson.lesson)}
                    {complete ? ' · Completed' : ''}
                  </Text>
                </Pressable>
                <Text accessibilityElementsHidden style={styles.openChevron}>›</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.timelineHeader}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            Full education path
          </Text>
          <Text style={styles.sectionSubtitle}>
            This is a learning map, not a medical schedule or personal care plan.
          </Text>
        </View>

        <View style={[styles.timeline, isTabletLayout && styles.tabletTimeline]}>
          {timelinePhases.map((phase, index) => {
            const phaseCourses = availableCourses.filter(phase.matches);
            const hasPublishedContent = phaseCourses.length > 0;
            return (
              <View
                key={phase.id}
                style={[
                  styles.phaseCard,
                  hasPublishedContent && styles.phaseCardAvailable,
                  isTabletLayout && styles.tabletPhaseCard,
                ]}
              >
                <Text style={styles.phaseNumber}>{index + 1}</Text>
                <View style={styles.phaseContent}>
                  <Text style={styles.phaseTitle}>{phase.title}</Text>
                  <Text style={styles.phaseDescription}>{phase.description}</Text>
                  {hasPublishedContent ? (
                    <>
                      <Text style={styles.availableLabel}>AVAILABLE NOW</Text>
                      {phaseCourses.map((course) => (
                        <Pressable
                          accessibilityLabel={`Continue ${course.title}`}
                          accessibilityRole="button"
                          key={course.id}
                          onPress={() => onOpenCourse(course)}
                          style={styles.phaseCourseButton}
                          testID={`button-continue-course-${course.id}`}
                        >
                          <Text style={styles.phaseCourseButtonText}>
                            Continue {course.title}
                          </Text>
                        </Pressable>
                      ))}
                    </>
                  ) : (
                    <Text style={styles.comingSoonLabel}>COMING SOON</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.educationNote}>
          <Text style={styles.educationNoteTitle}>Education, not personal care</Text>
          <Text style={styles.educationNoteText}>
            Your obstetric, midwifery, pediatric, and lactation teams guide your
            personal care and urgent decisions.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#F7F6F2',
    flex: 1,
  },
  content: {
    alignSelf: 'center',
    maxWidth: 960,
    paddingBottom: 40,
    paddingHorizontal: 20,
    paddingTop: 10,
    width: '100%',
  },
  tabletContent: {
    paddingHorizontal: 32,
  },
  backButton: {
    alignSelf: 'flex-start',
    justifyContent: 'center',
    minHeight: 44,
  },
  backButtonText: {
    color: '#0C4E54',
    fontSize: 15,
    fontWeight: '800',
  },
  brand: {
    color: '#01696F',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: 8,
  },
  title: {
    color: '#28251D',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.7,
    marginTop: 5,
  },
  subtitle: {
    color: '#55534D',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 7,
    maxWidth: 640,
  },
  accessCard: {
    alignItems: 'center',
    backgroundColor: '#FBFBF9',
    borderColor: '#D4D1CA',
    borderRadius: 14,
    borderWidth: 1,
    gap: 5,
    marginTop: 20,
    padding: 16,
  },
  accessTitle: {
    color: '#28251D',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  accessText: {
    color: '#605D56',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  progressCard: {
    backgroundColor: '#EAF4F2',
    borderColor: '#92BFB8',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 20,
    padding: 18,
  },
  progressHeading: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressEyebrow: {
    color: '#0C4E54',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  progressCount: {
    color: '#28251D',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
  },
  progressPercent: {
    color: '#0C4E54',
    fontSize: 18,
    fontWeight: '800',
  },
  progressTrack: {
    backgroundColor: '#C6DCD7',
    borderRadius: 5,
    height: 10,
    marginTop: 14,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    backgroundColor: '#01696F',
    borderRadius: 5,
    height: '100%',
  },
  statusCard: {
    alignItems: 'center',
    backgroundColor: '#FBFBF9',
    borderColor: '#D4D1CA',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 20,
    padding: 18,
  },
  statusTitle: {
    color: '#28251D',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  statusText: {
    color: '#605D56',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5,
    textAlign: 'center',
  },
  errorCard: {
    backgroundColor: '#FFF5F8',
    borderColor: '#A12C7B',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 20,
    padding: 16,
  },
  errorTitle: {
    color: '#7B1F5C',
    fontSize: 15,
    fontWeight: '800',
  },
  errorText: {
    color: '#592546',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  progressError: {
    color: '#7B1F5C',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
  },
  nextCard: {
    backgroundColor: '#01696F',
    borderRadius: 18,
    marginTop: 24,
    padding: 20,
  },
  nextEyebrow: {
    color: '#BCE2E7',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  nextTitle: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginTop: 7,
  },
  nextCourse: {
    color: '#E8F5F3',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 5,
  },
  nextMeta: {
    color: '#CBE6E2',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 10,
  },
  nextButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginTop: 17,
    minHeight: 46,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  nextButtonText: {
    color: '#0C4E54',
    fontSize: 15,
    fontWeight: '800',
  },
  completeCard: {
    backgroundColor: '#EAF4F2',
    borderColor: '#92BFB8',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 24,
    padding: 17,
  },
  completeTitle: {
    color: '#0C4E54',
    fontSize: 17,
    fontWeight: '800',
  },
  completeText: {
    color: '#365553',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5,
  },
  sectionHeader: {
    marginTop: 30,
  },
  sectionTitle: {
    color: '#28251D',
    fontSize: 21,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: '#696761',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
    maxWidth: 620,
  },
  lessonList: {
    gap: 10,
    marginTop: 15,
  },
  lessonRow: {
    alignItems: 'center',
    backgroundColor: '#FBFBF9',
    borderColor: '#D4D1CA',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 86,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  lessonRowComplete: {
    backgroundColor: '#F0F6F4',
    borderColor: '#92BFB8',
  },
  checkboxButton: {
    borderRadius: 22,
    justifyContent: 'center',
    minHeight: 48,
    paddingRight: 9,
  },
  checkbox: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#696761',
    borderRadius: 11,
    borderWidth: 2,
    height: 23,
    justifyContent: 'center',
    width: 23,
  },
  checkboxComplete: {
    backgroundColor: '#01696F',
    borderColor: '#01696F',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 18,
  },
  lessonContent: {
    flex: 1,
    paddingVertical: 2,
  },
  lessonCourse: {
    color: '#01696F',
    fontSize: 11,
    fontWeight: '800',
  },
  lessonTitle: {
    color: '#28251D',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  lessonTitleComplete: {
    textDecorationLine: 'line-through',
  },
  lessonMeta: {
    color: '#696761',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
    marginTop: 4,
  },
  openChevron: {
    color: '#0C4E54',
    fontSize: 26,
    marginLeft: 8,
  },
  timelineHeader: {
    marginTop: 32,
  },
  timeline: {
    gap: 10,
    marginTop: 15,
  },
  tabletTimeline: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  phaseCard: {
    alignItems: 'flex-start',
    backgroundColor: '#EFEEE9',
    borderColor: '#D4D1CA',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 114,
    padding: 14,
  },
  tabletPhaseCard: {
    flexBasis: '48%',
    flexGrow: 1,
  },
  phaseCardAvailable: {
    backgroundColor: '#F0F6F4',
    borderColor: '#92BFB8',
  },
  phaseNumber: {
    alignItems: 'center',
    backgroundColor: '#DCD9D2',
    borderRadius: 12,
    color: '#59564E',
    fontSize: 13,
    fontWeight: '800',
    height: 26,
    lineHeight: 26,
    marginRight: 11,
    textAlign: 'center',
    width: 26,
  },
  phaseContent: {
    flex: 1,
  },
  phaseTitle: {
    color: '#28251D',
    fontSize: 16,
    fontWeight: '800',
  },
  phaseDescription: {
    color: '#605D56',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
  },
  availableLabel: {
    color: '#01696F',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 10,
  },
  comingSoonLabel: {
    color: '#59564E',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 10,
  },
  phaseCourseButton: {
    alignSelf: 'flex-start',
    borderBottomColor: '#0C4E54',
    borderBottomWidth: 1,
    marginTop: 5,
    paddingVertical: 3,
  },
  phaseCourseButtonText: {
    color: '#0C4E54',
    fontSize: 13,
    fontWeight: '800',
  },
  educationNote: {
    backgroundColor: '#FBFBF9',
    borderColor: '#D4D1CA',
    borderLeftColor: '#01696F',
    borderLeftWidth: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 28,
    padding: 15,
  },
  educationNoteTitle: {
    color: '#28251D',
    fontSize: 14,
    fontWeight: '800',
  },
  educationNoteText: {
    color: '#55534D',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
});
