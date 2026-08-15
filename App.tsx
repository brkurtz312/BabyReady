import { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  BabyReadyAuthProvider,
  useBabyReadyAuth,
} from './src/auth/AuthProvider';
import { firebaseIsConfigured } from './src/lib/firebase';
import { getAuditReportIdFromVerificationUrl } from './src/lib/auditReportVerification';
import type { ClinicalContentBlock, CourseRecord } from './src/models/course';
import { ClinicianAuditLogScreen } from './src/screens/ClinicianAuditLogScreen';
import { ClinicianReviewScreen } from './src/screens/ClinicianReviewScreen';
import { ClinicianContentAuthoringScreen } from './src/screens/ClinicianContentAuthoringScreen';
import { ClinicianMediaIntakeScreen } from './src/screens/ClinicianMediaIntakeScreen';
import { ClinicianMediaLibraryScreen } from './src/screens/ClinicianMediaLibraryScreen';
import { ClinicianSourceLibraryScreen } from './src/screens/ClinicianSourceLibraryScreen';
import { LearnerCourseCatalog } from './src/screens/LearnerCourseCatalog';
import { LearnerCoursePlayerScreen } from './src/screens/LearnerCoursePlayerScreen';
import {
  LearnerLearningPlanScreen,
  type LearningPlanLessonTarget,
} from './src/screens/LearnerLearningPlanScreen';
import {
  signInWithEmail,
  signOutFromBabyReady,
} from './src/services/authService';

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
    | 'learning-plan'
    | 'course-player'
    | 'review'
    | 'sources'
    | 'media'
    | 'media-intake'
    | 'author'
    | 'audit-log'
  >('learner');
  const [auditReportIdFromLink, setAuditReportIdFromLink] = useState<
    string | null
  >(null);
  const [draftToEdit, setDraftToEdit] = useState<ClinicalContentBlock | null>(
    null,
  );
  const [selectedCourse, setSelectedCourse] = useState<CourseRecord | null>(
    null,
  );
  const [selectedLessonTarget, setSelectedLessonTarget] =
    useState<LearningPlanLessonTarget | null>(null);
  const [coursePlayerReturnView, setCoursePlayerReturnView] = useState<
    'learner' | 'learning-plan'
  >('learner');
  const [clinicianSignInOpen, setClinicianSignInOpen] = useState(false);
  const [clinicianEmail, setClinicianEmail] = useState('');
  const [clinicianPassword, setClinicianPassword] = useState('');
  const [clinicianSignInError, setClinicianSignInError] = useState<string | null>(null);
  const [clinicianSignInBusy, setClinicianSignInBusy] = useState(false);
  const learnerScrollRef = useRef<ScrollView>(null);

  const revealClinicianSignIn = () => {
    setTimeout(() => {
      learnerScrollRef.current?.scrollToEnd({ animated: true });
    }, 120);
  };

  useEffect(() => {
    const openAuditReportVerification = (url: string | null) => {
      const reportId = getAuditReportIdFromVerificationUrl(url);
      if (!reportId) {
        return;
      }

      setAuditReportIdFromLink(reportId);
      setActiveView('audit-log');
    };

    void Linking.getInitialURL().then(openAuditReportVerification).catch(() => {
      // Opening the app without a deep-link remains the expected path.
    });
    const subscription = Linking.addEventListener('url', ({ url }) => {
      openAuditReportVerification(url);
    });

    return () => subscription.remove();
  }, []);

  const showUrgentGuidance = () => {
    Alert.alert(
      'Need urgent help?',
      'For severe symptoms or immediate danger, call 911 or your local emergency number now. For concerns that are not immediately life-threatening, contact your obstetric triage team or your baby’s pediatric team right away.',
      [{ text: 'I understand' }],
    );
  };

  const handleClinicianSignIn = async () => {
    if (!clinicianEmail.trim() || !clinicianPassword) {
      setClinicianSignInError('Enter the clinician email address and password.');
      return;
    }

    setClinicianSignInBusy(true);
    setClinicianSignInError(null);

    try {
      const user = await signInWithEmail(clinicianEmail.trim(), clinicianPassword);
      const tokenResult = await user.getIdTokenResult(true);
      if (tokenResult.claims.admin !== true) {
        await signOutFromBabyReady();
        throw new Error('The account does not have clinician administrator access.');
      }

      setClinicianPassword('');
      setClinicianSignInOpen(false);
    } catch {
      setClinicianSignInError(
        'BabyReady could not complete clinician sign-in. Check the credentials and clinician administrator access, then try again.',
      );
    } finally {
      setClinicianSignInBusy(false);
    }
  };

  const handleClinicianSignOut = async () => {
    try {
      await signOutFromBabyReady();
      setClinicianEmail('');
      setClinicianPassword('');
      setClinicianSignInError(null);
    } catch {
      Alert.alert(
        'Sign-out needs attention',
        'BabyReady could not sign out. Close and reopen the app before trying again.',
      );
    }
  };

  const handleOpenClinicianReview = async () => {
    if (authState.status !== 'ready') {
      Alert.alert(
        'Sign-in required',
        'Finish Firebase Authentication before opening the clinician review workspace.',
      );
      return;
    }

    try {
      const tokenResult = await authState.user.getIdTokenResult(true);
      if (tokenResult.claims.admin !== true) {
        Alert.alert(
          'Clinician access required',
          'This workspace is available only to clinician administrator accounts.',
        );
        return;
      }

      setActiveView('review');
    } catch {
      Alert.alert(
        'Access check unavailable',
        'BabyReady could not verify clinician administrator access. Please try again.',
      );
    }
  };

  if (activeView === 'sources' && authState.status === 'ready') {
    return (
      <ClinicianSourceLibraryScreen
        onExit={() => setActiveView('review')}
        user={authState.user}
      />
    );
  }

  if (activeView === 'media' && authState.status === 'ready') {
    return (
      <ClinicianMediaLibraryScreen
        onExit={() => setActiveView('review')}
        user={authState.user}
      />
    );
  }

  if (activeView === 'media-intake' && authState.status === 'ready') {
    return (
      <ClinicianMediaIntakeScreen
        onExit={() => setActiveView('review')}
        user={authState.user}
      />
    );
  }

  if (activeView === 'author' && authState.status === 'ready') {
    return (
      <ClinicianContentAuthoringScreen
        initialBlock={draftToEdit}
        onExit={() => {
          setDraftToEdit(null);
          setActiveView('review');
        }}
        user={authState.user}
      />
    );
  }

  if (activeView === 'audit-log' && authState.status === 'ready') {
    return (
      <ClinicianAuditLogScreen
        initialReportId={auditReportIdFromLink}
        onExit={() => {
          setAuditReportIdFromLink(null);
          setActiveView('review');
        }}
        user={authState.user}
      />
    );
  }

  if (activeView === 'review' && authState.status === 'ready') {
    return (
      <ClinicianReviewScreen
        onExit={() => setActiveView('learner')}
        onEditDraft={(block) => {
          setDraftToEdit(block);
          setActiveView('author');
        }}
        onOpenContentAuthoring={() => {
          setDraftToEdit(null);
          setActiveView('author');
        }}
        onOpenAuditLog={() => setActiveView('audit-log')}
        onOpenMediaIntake={() => setActiveView('media-intake')}
        onOpenMediaLibrary={() => setActiveView('media')}
        onOpenSourceLibrary={() => setActiveView('sources')}
        user={authState.user}
      />
    );
  }

  if (activeView === 'course-player' && selectedCourse) {
    return (
      <LearnerCoursePlayerScreen
        course={selectedCourse}
        initialLesson={selectedLessonTarget}
        onExit={() => {
          setSelectedCourse(null);
          setSelectedLessonTarget(null);
          setActiveView(coursePlayerReturnView);
        }}
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
        userId={authState.status === 'ready' ? authState.user.uid : null}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          ref={learnerScrollRef}
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>BABYREADY</Text>
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

        <View style={styles.foundationCard}>
          <Text style={styles.foundationTitle}>Your BabyReady access</Text>
          <Text style={styles.foundationText}>
            {firebaseIsConfigured
              ? authState.status === 'ready'
                ? `Firebase Authentication is ready. You are using a private ${authState.user.isAnonymous ? 'starter' : 'account'} session.`
                : authState.status === 'error'
                  ? 'Firebase is configured. The optional learner session needs attention, but clinician sign-in remains available.'
                  : 'Firebase is configured. You can sign in as a clinician while the optional learner session starts.'
              : 'Add your Firebase values in .env to connect secure course content, user plans, and care-team contacts.'}
          </Text>
          <Text style={styles.foundationMeta}>
            {authState.status === 'error'
              ? authState.error
              : 'Secure local storage, Auth persistence, and published-content access controls are active.'}
          </Text>
          {firebaseIsConfigured &&
          (authState.status !== 'ready' || authState.user.isAnonymous) ? (
            clinicianSignInOpen ? (
              <View style={styles.clinicianSignInCard}>
                <Text style={styles.clinicianSignInTitle}>Clinician sign in</Text>
                <Text style={styles.clinicianSignInText}>
                  Use the clinician administrator account. This direct sign-in does not
                  depend on a learner session.
                </Text>
                <Text style={styles.fieldLabel}>Email address</Text>
                <TextInput
                  accessibilityLabel="Clinician email address"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  editable={!clinicianSignInBusy}
                  keyboardType="email-address"
                  onChangeText={setClinicianEmail}
                  onFocus={revealClinicianSignIn}
                  placeholder="clinician@example.com"
                  placeholderTextColor="#77746D"
                  style={styles.textInput}
                  textContentType="username"
                  value={clinicianEmail}
                />
                <Text style={styles.fieldLabel}>Password</Text>
                <TextInput
                  accessibilityLabel="Clinician password"
                  autoComplete="current-password"
                  editable={!clinicianSignInBusy}
                  onChangeText={setClinicianPassword}
                  onFocus={revealClinicianSignIn}
                  placeholder="Enter password"
                  placeholderTextColor="#77746D"
                  secureTextEntry
                  style={styles.textInput}
                  textContentType="password"
                  value={clinicianPassword}
                />
                {clinicianSignInError ? (
                  <Text accessibilityRole="alert" style={styles.signInError}>
                    {clinicianSignInError}
                  </Text>
                ) : null}
                <View style={styles.clinicianSignInActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Cancel clinician sign in"
                    disabled={clinicianSignInBusy}
                    onPress={() => {
                      setClinicianSignInOpen(false);
                      setClinicianPassword('');
                      setClinicianSignInError(null);
                    }}
                    style={styles.secondaryButton}
                  >
                    <Text style={styles.secondaryButtonText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Sign in to the clinician workspace"
                    disabled={clinicianSignInBusy}
                    onPress={() => void handleClinicianSignIn()}
                    style={[
                      styles.signInButton,
                      clinicianSignInBusy && styles.signInButtonDisabled,
                    ]}
                  >
                    {clinicianSignInBusy ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.signInButtonText}>Sign in</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sign in as a clinician"
                onPress={() => setClinicianSignInOpen(true)}
                style={styles.clinicianSignInLink}
              >
                <Text style={styles.clinicianSignInLinkText}>Clinician sign in</Text>
              </Pressable>
            )
          ) : authState.status === 'ready' ? (
            <View style={styles.clinicianAccountRow}>
              <Text style={styles.clinicianAccountText}>
                Signed in as {authState.user.email ?? 'a clinician account'}.
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sign out of clinician account"
                onPress={() => void handleClinicianSignOut()}
                style={styles.signOutButton}
              >
                <Text style={styles.signOutButtonText}>Sign out</Text>
              </Pressable>
            </View>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open the clinician content review workspace"
            onPress={() => void handleOpenClinicianReview()}
            style={styles.clinicianLink}
          >
            <Text style={styles.clinicianLinkText}>Open clinician content review</Text>
          </Pressable>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F6F2',
  },
  keyboardAvoidingView: {
    flex: 1,
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
  nextCard: {
    backgroundColor: '#01696F',
    borderRadius: 20,
    marginBottom: 28,
    padding: 22,
  },
  eyebrow: {
    color: '#BCE2E7',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  nextTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginTop: 8,
  },
  nextText: {
    color: '#E8F5F3',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  nextMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 14,
  },
  nextMetaText: {
    color: '#CBE6E2',
    fontSize: 13,
    fontWeight: '600',
  },
  dot: {
    color: '#CBE6E2',
    marginHorizontal: 8,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 11,
    marginTop: 18,
    paddingVertical: 13,
  },
  primaryButtonText: {
    color: '#0C4E54',
    fontSize: 15,
    fontWeight: '800',
  },
  sectionHeader: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#28251D',
    fontSize: 20,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: '#696761',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
    maxWidth: 290,
  },
  progress: {
    color: '#01696F',
    fontSize: 13,
    fontWeight: '800',
    paddingBottom: 2,
  },
  moduleList: {
    gap: 11,
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
  clinicianSignInLink: {
    alignSelf: 'flex-start',
    marginTop: 14,
    minHeight: 44,
    justifyContent: 'center',
  },
  clinicianSignInLinkText: {
    color: '#0C4E54',
    fontSize: 14,
    fontWeight: '800',
  },
  clinicianSignInCard: {
    backgroundColor: '#FBFBF9',
    borderColor: '#D4D1CA',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 14,
    padding: 14,
  },
  clinicianSignInTitle: {
    color: '#28251D',
    fontSize: 16,
    fontWeight: '800',
  },
  clinicianSignInText: {
    color: '#55534D',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  fieldLabel: {
    color: '#55534D',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 12,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#B8B4AC',
    borderRadius: 9,
    borderWidth: 1,
    color: '#28251D',
    fontSize: 16,
    marginTop: 5,
    minHeight: 46,
    paddingHorizontal: 12,
  },
  signInError: {
    color: '#8A1F5D',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 10,
  },
  clinicianSignInActions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
    marginTop: 14,
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#8D8981',
    borderRadius: 9,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 88,
    paddingHorizontal: 12,
  },
  secondaryButtonText: {
    color: '#55534D',
    fontSize: 14,
    fontWeight: '800',
  },
  signInButton: {
    alignItems: 'center',
    backgroundColor: '#01696F',
    borderRadius: 9,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 100,
    paddingHorizontal: 14,
  },
  signInButtonDisabled: {
    backgroundColor: '#6F9B98',
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  clinicianAccountRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  clinicianAccountText: {
    color: '#55534D',
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    marginRight: 12,
  },
  signOutButton: {
    minHeight: 44,
    justifyContent: 'center',
  },
  signOutButtonText: {
    color: '#7B1F5C',
    fontSize: 14,
    fontWeight: '800',
  },
  clinicianLink: {
    alignSelf: 'flex-start',
    marginTop: 14,
    minHeight: 44,
    justifyContent: 'center',
  },
  clinicianLinkText: {
    color: '#0C4E54',
    fontSize: 14,
    fontWeight: '800',
  },
});
