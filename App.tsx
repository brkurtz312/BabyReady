import { useState } from 'react';
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
import { firebaseIsConfigured } from './src/lib/firebase';
import type { CourseRecord } from './src/models/course';
import { BirthReadinessBriefScreen } from './src/screens/BirthReadinessBriefScreen';
import { ClassPlayerScreen } from './src/screens/ClassPlayerScreen';
import { LearnerCourseCatalog } from './src/screens/LearnerCourseCatalog';
import { LearnerCoursePlayerScreen } from './src/screens/LearnerCoursePlayerScreen';
import {
  LearnerLearningPlanScreen,
  type LearningPlanLessonTarget,
} from './src/screens/LearnerLearningPlanScreen';

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
    | 'learner'
    | 'class-player'
    | 'learning-plan'
    | 'course-player'
    | 'birth-readiness-brief'
  >('learner');
  const [selectedCourse, setSelectedCourse] = useState<CourseRecord | null>(
    null,
  );
  const [selectedLessonTarget, setSelectedLessonTarget] =
    useState<LearningPlanLessonTarget | null>(null);
  const [coursePlayerReturnView, setCoursePlayerReturnView] = useState<
    'learner' | 'learning-plan'
  >('learner');

  const userId = authState.status === 'ready' ? authState.user.uid : null;

  const showUrgentGuidance = () => {
    Alert.alert(
      'Need urgent help?',
      'For severe symptoms or immediate danger, call 911 or your local emergency number now. For concerns that are not immediately life-threatening, contact your obstetric triage team or your baby’s pediatric team right away.',
      [{ text: 'I understand' }],
    );
  };

  if (activeView === 'class-player') {
    return (
      <ClassPlayerScreen
        onExit={() => setActiveView('learner')}
        onOpenBrief={() => setActiveView('birth-readiness-brief')}
        userId={userId}
      />
    );
  }

  if (activeView === 'course-player' && selectedCourse) {
    return (
      <LearnerCoursePlayerScreen
        authStatus={authState.status}
        course={selectedCourse}
        initialLesson={selectedLessonTarget}
        onOpenBirthReadinessBrief={(lesson) => {
          setSelectedLessonTarget(lesson);
          setActiveView('birth-readiness-brief');
        }}
        onExit={() => {
          setSelectedCourse(null);
          setSelectedLessonTarget(null);
          setActiveView(coursePlayerReturnView);
        }}
        userId={userId}
      />
    );
  }

  if (activeView === 'birth-readiness-brief') {
    return (
      <BirthReadinessBriefScreen
        authStatus={authState.status}
        onExit={() =>
          setActiveView(selectedCourse ? 'course-player' : 'learner')
        }
        userId={userId}
      />
    );
  }

  if (activeView === 'learning-plan') {
    return (
      <LearnerLearningPlanScreen
        authStatus={authState.status}
        onExit={() => setActiveView('learner')}
        onOpenCourse={(course, target) => {
          setSelectedCourse(course);
          setSelectedLessonTarget(target ?? null);
          setCoursePlayerReturnView('learning-plan');
          setActiveView('course-player');
        }}
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

        <View style={styles.learningPlanCard}>
          <View style={styles.learningPlanCopy}>
            <Text style={styles.learningPlanEyebrow}>CLASS · MODULE 2</Text>
            <Text style={styles.learningPlanTitle}>Labor Basics and When to Call</Text>
            <Text style={styles.learningPlanText}>
              Six short narrated lessons, about 71 minutes in all, with check-ins
              and a review quiz after each lesson.
            </Text>
          </View>
          <Pressable
            accessibilityHint="Opens the narrated Labor Basics class."
            accessibilityLabel="Start the Labor Basics class"
            accessibilityRole="button"
            onPress={() => setActiveView('class-player')}
            style={styles.learningPlanButton}
            testID="button-open-labor-basics-class"
          >
            <Text style={styles.learningPlanButtonText}>Start class</Text>
          </Pressable>
        </View>

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

        <View style={styles.learningPlanCard}>
          <View style={styles.learningPlanCopy}>
            <Text style={styles.learningPlanEyebrow}>YOUR PATH</Text>
            <Text style={styles.learningPlanTitle}>Pregnancy learning plan</Text>
            <Text style={styles.learningPlanText}>
              See the full childbirth education path, continue published lessons,
              and save your completion progress.
            </Text>
          </View>
          <Pressable
            accessibilityHint="Opens your learning checklist and education timeline."
            accessibilityLabel="Open your pregnancy learning plan"
            accessibilityRole="button"
            onPress={() => setActiveView('learning-plan')}
            style={styles.learningPlanButton}
            testID="button-open-pregnancy-learning-plan"
          >
            <Text style={styles.learningPlanButtonText}>Open plan</Text>
          </Pressable>
        </View>

        <LearnerCourseCatalog
          onOpenCourse={(course) => {
            setSelectedCourse(course);
            setSelectedLessonTarget(null);
            setCoursePlayerReturnView('learner');
            setActiveView('course-player');
          }}
        />

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
  foundationMeta: {
    color: '#77746D',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 9,
  },
});
