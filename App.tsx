import { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  BabyReadyAuthProvider,
  useBabyReadyAuth,
} from './src/auth/AuthProvider';
import { DeleteDataSheet } from './src/components/DeleteDataSheet';
import { courses, type Course } from './src/content/lessons';
import { firebaseIsConfigured } from './src/lib/firebase';
import {
  EMPTY_PROGRESS,
  nextLessonIndex,
  withLessonCompleted,
  withLessonOpened,
  type LearnerProgress,
} from './src/models/learnerProgress';
import { BirthReadinessBriefScreen } from './src/screens/BirthReadinessBriefScreen';
import { ClassPlayerScreen } from './src/screens/ClassPlayerScreen';
import { loadProgress, saveProgress } from './src/services/learnerProgressService';

export default function App() {
  return (
    <BabyReadyAuthProvider>
      <BabyReadyApp />
    </BabyReadyAuthProvider>
  );
}

function BabyReadyApp() {
  const authState = useBabyReadyAuth();
  const [activeView, setActiveView] = useState<
    'learner' | 'class-player' | 'birth-readiness-brief'
  >('learner');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [startLessonIndex, setStartLessonIndex] = useState(0);
  /** Bumped on every open, so reopening the same module starts the player fresh. */
  const [openCount, setOpenCount] = useState(0);
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  const [progress, setProgress] = useState<LearnerProgress>(EMPTY_PROGRESS);
  const [deleteSheetOpen, setDeleteSheetOpen] = useState(false);

  const userId = authState.status === 'ready' ? authState.user.uid : null;

  useEffect(() => {
    let active = true;
    void loadProgress(userId).then((loaded) => active && setProgress(loaded));
    return () => {
      active = false;
    };
  }, [userId]);

  const updateProgress = useCallback(
    (change: (current: LearnerProgress) => LearnerProgress) => {
      setProgress((current) => {
        const next = change(current);
        if (next !== current) void saveProgress(userId, next);
        return next;
      });
    },
    [userId],
  );

  const openCourse = (course: Course, lessonIndex: number) => {
    setSelectedCourse(course);
    setStartLessonIndex(lessonIndex);
    setOpenCount((n) => n + 1);
    setActiveView('class-player');
  };

  const lastCourse = progress.lastLesson
    ? courses.find((c) => c.courseId === progress.lastLesson?.courseId)
    : undefined;
  const lastLessonIndex = lastCourse
    ? lastCourse.lessons.findIndex((l) => l.lessonId === progress.lastLesson?.lessonId)
    : -1;
  // If that lesson is finished, point to the next one in its module instead.
  const lastFinished =
    lastCourse !== undefined &&
    lastLessonIndex >= 0 &&
    progress.completedLessonIds.includes(lastCourse.lessons[lastLessonIndex].lessonId);
  const continueIndex =
    lastFinished && lastCourse && lastLessonIndex + 1 < lastCourse.lessons.length ? lastLessonIndex + 1 : lastLessonIndex;
  const continueLesson = lastCourse && continueIndex >= 0 ? lastCourse.lessons[continueIndex] : undefined;

  const showUrgentGuidance = () => {
    Alert.alert(
      'Need urgent help?',
      'For severe symptoms or immediate danger, call 911 or your local emergency number now. For concerns that are not immediately life-threatening, contact your obstetric triage team or your baby’s pediatric team right away.',
      [{ text: 'I understand' }],
    );
  };

  if (activeView === 'class-player' && selectedCourse) {
    return (
      <ClassPlayerScreen
        // Each open starts the player fresh at the chosen lesson.
        key={`${selectedCourse.courseId}:${openCount}`}
        completedLessonIds={progress.completedLessonIds}
        course={selectedCourse}
        initialLessonIndex={startLessonIndex}
        onExit={() => setActiveView('learner')}
        onLessonCompleted={(lessonId) => updateProgress((p) => withLessonCompleted(p, lessonId))}
        onLessonOpened={(courseId, lessonId) =>
          updateProgress((p) => withLessonOpened(p, courseId, lessonId, Date.now()))
        }
        onOpenBrief={() => setActiveView('birth-readiness-brief')}
        userId={userId}
      />
    );
  }

  if (activeView === 'birth-readiness-brief') {
    return (
      <BirthReadinessBriefScreen
        authStatus={authState.status}
        onExit={() => setActiveView('learner')}
        userId={userId}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>BABYREADY VIRTUAL EDUCATOR</Text>
            <Text style={styles.title}>Prepare for birth, your way.</Text>
          </View>
        </View>

        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Education for preparation</Text>
          <Text style={styles.noticeText}>
            Your obstetric, midwifery, pediatric, and lactation teams guide your
            personal care and urgent decisions.
          </Text>
        </View>

        {lastCourse && continueLesson ? (
          <View style={styles.continueCard}>
            <Text style={styles.learningPlanEyebrow}>
              {continueIndex !== lastLessonIndex ? 'UP NEXT' : 'CONTINUE WHERE YOU LEFT OFF'}
            </Text>
            <Text style={styles.learningPlanTitle}>{continueLesson.title}</Text>
            <Text style={styles.learningPlanText}>{lastCourse.title}</Text>
            <Pressable
              accessibilityHint={`Opens ${continueLesson.title}.`}
              accessibilityLabel={`Continue with ${continueLesson.title}`}
              accessibilityRole="button"
              onPress={() => openCourse(lastCourse, continueIndex)}
              style={styles.learningPlanButton}
              testID="button-continue-lesson"
            >
              <Text style={styles.learningPlanButtonText}>Continue</Text>
            </Pressable>
          </View>
        ) : null}

        {courses.map((course) => {
          const lessonIds = course.lessons.map((l) => l.lessonId);
          const doneCount = lessonIds.filter((id) => progress.completedLessonIds.includes(id)).length;
          const allDone = doneCount === lessonIds.length;
          const buttonLabel = doneCount === 0 ? 'Start class' : allDone ? 'Review class' : 'Continue class';
          const expanded = expandedCourseId === course.courseId;
          return (
            <View key={course.courseId} style={styles.learningPlanCard}>
              <View style={styles.learningPlanCopy}>
                <Text style={styles.learningPlanEyebrow}>{course.label}</Text>
                <Text style={styles.learningPlanTitle}>{course.title}</Text>
                <Text style={styles.learningPlanText}>{course.description}</Text>
                {doneCount > 0 ? (
                  <Text style={styles.progressText}>
                    {doneCount} of {lessonIds.length} lessons done
                  </Text>
                ) : null}
              </View>
              <View style={styles.cardButtons}>
                <Pressable
                  accessibilityHint={`Opens the narrated ${course.title} class.`}
                  accessibilityLabel={`${buttonLabel}: ${course.title}`}
                  accessibilityRole="button"
                  onPress={() => openCourse(course, nextLessonIndex(lessonIds, progress.completedLessonIds))}
                  style={styles.learningPlanButton}
                  testID={`button-open-class-${course.courseId}`}
                >
                  <Text style={styles.learningPlanButtonText}>{buttonLabel}</Text>
                </Pressable>
                <Pressable
                  accessibilityLabel={`${expanded ? 'Hide' : 'Show'} the ${lessonIds.length} lessons in ${course.title}`}
                  accessibilityRole="button"
                  accessibilityState={{ expanded }}
                  onPress={() => setExpandedCourseId(expanded ? null : course.courseId)}
                  style={styles.lessonsToggle}
                  testID={`button-toggle-lessons-${course.courseId}`}
                >
                  <Text style={styles.lessonsToggleText}>
                    {expanded ? 'Hide lessons' : `Lessons (${lessonIds.length})`}
                  </Text>
                </Pressable>
              </View>
              {expanded ? (
                <View style={styles.lessonList}>
                  {course.lessons.map((lesson, k) => {
                    const finished = progress.completedLessonIds.includes(lesson.lessonId);
                    return (
                      <Pressable
                        accessibilityHint="Opens this lesson."
                        accessibilityLabel={`Lesson ${lesson.order}, ${lesson.title}, about ${lesson.estimatedMinutes} minutes${finished ? ', finished' : ''}`}
                        accessibilityRole="button"
                        key={lesson.lessonId}
                        onPress={() => openCourse(course, k)}
                        style={styles.lessonRow}
                        testID={`button-open-lesson-${lesson.lessonId}`}
                      >
                        <Text style={styles.lessonNumber}>{lesson.order}</Text>
                        <View style={styles.lessonRowText}>
                          <Text style={styles.lessonTitle}>{lesson.title}</Text>
                          <Text style={styles.lessonMeta}>About {lesson.estimatedMinutes} minutes</Text>
                        </View>
                        {finished ? (
                          <Text accessibilityElementsHidden importantForAccessibility="no" style={styles.lessonCheck}>
                            ✓
                          </Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>
          );
        })}

        <View style={styles.learningPlanCard}>
          <View style={styles.learningPlanCopy}>
            <Text style={styles.learningPlanEyebrow}>YOUR BRIEF</Text>
            <Text style={styles.learningPlanTitle}>Birth Readiness Brief</Text>
            <Text style={styles.learningPlanText}>
              Your answers from class, readiness checklist, and questions for
              your care team, in one private place.
            </Text>
          </View>
          <Pressable
            accessibilityHint="Opens your private Birth Readiness Brief."
            accessibilityLabel="Open your Birth Readiness Brief"
            accessibilityRole="button"
            onPress={() => setActiveView('birth-readiness-brief')}
            style={styles.learningPlanButton}
            testID="button-open-birth-readiness-brief"
          >
            <Text style={styles.learningPlanButtonText}>Open brief</Text>
          </Pressable>
        </View>

        <View style={styles.safetyCard}>
          <Text style={styles.safetyTitle}>Need urgent help?</Text>
          <Text style={styles.safetyText}>
            BabyReady will always place urgent parent and newborn safety guidance
            ahead of lesson or AI content.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View urgent help guidance"
            onPress={showUrgentGuidance}
            style={styles.safetyButton}
          >
            <Text style={styles.safetyButtonText}>View urgent-help guidance</Text>
          </Pressable>
        </View>

        <View style={styles.foundationCard}>
          <Text style={styles.foundationTitle}>Your data</Text>
          <Text style={styles.foundationText}>
            Delete your lesson progress, Birth Readiness Brief, and class answers from this device
            and your private BabyReady account at any time.
          </Text>
          <Pressable
            accessibilityHint="Asks you to confirm before anything is deleted."
            accessibilityRole="button"
            onPress={() => setDeleteSheetOpen(true)}
            style={styles.deleteDataButton}
            testID="button-delete-my-data"
          >
            <Text style={styles.deleteDataButtonText}>Delete my data</Text>
          </Pressable>
        </View>

        {!firebaseIsConfigured || authState.status === 'error' ? (
          <View accessibilityRole="alert" style={styles.foundationCard}>
            <Text style={styles.foundationTitle}>Saving is not connected</Text>
            <Text style={styles.foundationText}>
              {firebaseIsConfigured
                ? 'BabyReady could not start your private session, so your progress is saved on this device only for now.'
                : 'Add your Firebase values in .env to save progress and your Birth Readiness Brief privately.'}
            </Text>
            {authState.status === 'error' ? (
              <Text style={styles.foundationMeta}>{authState.error}</Text>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
      <DeleteDataSheet
        onClose={() => setDeleteSheetOpen(false)}
        onDeleted={() => {
          setProgress(EMPTY_PROGRESS);
          setExpandedCourseId(null);
        }}
        userId={userId}
        visible={deleteSheetOpen}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F6F2',
  },
  content: {
    alignSelf: 'center',
    maxWidth: 960,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  brand: {
    color: '#01696F',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
  title: {
    color: '#28251D',
    fontSize: 29,
    fontWeight: '700',
    letterSpacing: -0.6,
    marginTop: 4,
  },
  notice: {
    backgroundColor: '#FBFBF9',
    borderColor: '#D4D1CA',
    borderLeftColor: '#01696F',
    borderLeftWidth: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    padding: 15,
  },
  noticeTitle: {
    color: '#28251D',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  noticeText: {
    color: '#55534D',
    fontSize: 14,
    lineHeight: 20,
  },
  learningPlanCard: {
    backgroundColor: '#EAF4F2',
    borderColor: '#92BFB8',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 6,
    padding: 17,
  },
  learningPlanCopy: {
    maxWidth: 620,
  },
  learningPlanEyebrow: {
    color: '#0C4E54',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  learningPlanTitle: {
    color: '#28251D',
    fontSize: 19,
    fontWeight: '800',
    marginTop: 4,
  },
  learningPlanText: {
    color: '#365553',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  learningPlanButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#01696F',
    borderRadius: 10,
    justifyContent: 'center',
    marginTop: 14,
    minHeight: 44,
    paddingHorizontal: 15,
  },
  learningPlanButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  continueCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#01696F',
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 14,
    padding: 17,
  },
  progressText: {
    color: '#0C4E54',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 8,
  },
  cardButtons: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  lessonsToggle: {
    alignItems: 'center',
    borderColor: '#01696F',
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: 'center',
    marginTop: 14,
    minHeight: 44,
    paddingHorizontal: 14,
  },
  lessonsToggleText: {
    color: '#01696F',
    fontSize: 14,
    fontWeight: '800',
  },
  lessonList: {
    gap: 8,
    marginTop: 14,
  },
  lessonRow: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#92BFB8',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  lessonNumber: {
    color: '#01696F',
    fontSize: 17,
    fontWeight: '800',
    minWidth: 20,
    textAlign: 'center',
  },
  lessonRowText: {
    flex: 1,
  },
  lessonTitle: {
    color: '#28251D',
    fontSize: 15,
    fontWeight: '700',
  },
  lessonMeta: {
    color: '#55534D',
    fontSize: 13,
    marginTop: 2,
  },
  lessonCheck: {
    color: '#01696F',
    fontSize: 19,
    fontWeight: '800',
  },
  safetyCard: {
    backgroundColor: '#FFF5F8',
    borderColor: '#A12C7B',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 28,
    padding: 18,
  },
  safetyTitle: {
    color: '#7B1F5C',
    fontSize: 18,
    fontWeight: '800',
  },
  safetyText: {
    color: '#592546',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5,
  },
  safetyButton: {
    alignSelf: 'flex-start',
    borderColor: '#A12C7B',
    borderRadius: 9,
    borderWidth: 1,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  safetyButtonText: {
    color: '#7B1F5C',
    fontSize: 13,
    fontWeight: '800',
  },
  foundationCard: {
    backgroundColor: '#EFEEE9',
    borderRadius: 14,
    marginTop: 18,
    padding: 16,
  },
  foundationTitle: {
    color: '#28251D',
    fontSize: 15,
    fontWeight: '800',
  },
  foundationText: {
    color: '#55534D',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  deleteDataButton: {
    alignSelf: 'flex-start',
    borderColor: '#A1262C',
    borderRadius: 9,
    borderWidth: 1,
    marginTop: 12,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  deleteDataButtonText: {
    color: '#A1262C',
    fontSize: 13,
    fontWeight: '800',
  },
  foundationMeta: {
    color: '#77746D',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 9,
  },
});
