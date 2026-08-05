import { StatusBar } from 'expo-status-bar';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ModuleCard } from './src/components/ModuleCard';
import {
  BabyReadyAuthProvider,
  useBabyReadyAuth,
} from './src/auth/AuthProvider';
import { courseModules, recommendedModule } from './src/data/course';
import { firebaseIsConfigured } from './src/lib/firebase';

const currentPregnancyWeek = 25;

export default function App() {
  return (
    <BabyReadyAuthProvider>
      <BabyReadyApp />
    </BabyReadyAuthProvider>
  );
}

function BabyReadyApp() {
  const recommended = recommendedModule(currentPregnancyWeek);
  const authState = useBabyReadyAuth();

  const showUrgentGuidance = () => {
    Alert.alert(
      'Need urgent help?',
      'For severe symptoms or immediate danger, call 911 or your local emergency number now. For concerns that are not immediately life-threatening, contact your obstetric triage team or your baby’s pediatric team right away.',
      [{ text: 'I understand' }],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>BABYREADY</Text>
            <Text style={styles.title}>Prepare for birth, your way.</Text>
          </View>
          <View style={styles.weekPill}>
            <Text style={styles.weekLabel}>WEEK</Text>
            <Text style={styles.weekValue}>{currentPregnancyWeek}</Text>
          </View>
        </View>

        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Education for preparation</Text>
          <Text style={styles.noticeText}>
            Your obstetric, midwifery, pediatric, and lactation teams guide your
            personal care and urgent decisions.
          </Text>
        </View>

        <View style={styles.nextCard}>
          <Text style={styles.eyebrow}>RECOMMENDED NEXT</Text>
          <Text style={styles.nextTitle}>{recommended.title}</Text>
          <Text style={styles.nextText}>{recommended.summary}</Text>
          <View style={styles.nextMeta}>
            <Text style={styles.nextMetaText}>{recommended.estimatedMinutes} minutes</Text>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.nextMetaText}>Week {recommended.recommendedWeeks}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Start ${recommended.title}`}
            onPress={() =>
              Alert.alert(
                'Course player scaffold',
                'Lesson delivery, progress tracking, and clinician-reviewed content will be connected in Sprint 2.',
              )
            }
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Start module</Text>
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Your birth roadmap</Text>
            <Text style={styles.sectionSubtitle}>
              Six clinician-reviewed modules, released when they are most useful.
            </Text>
          </View>
          <Text style={styles.progress}>0 / 6</Text>
        </View>

        <View style={styles.moduleList}>
          {courseModules.map((module) => (
            <ModuleCard
              key={module.id}
              module={module}
              isRecommended={module.id === recommended.id}
            />
          ))}
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
          <Text style={styles.foundationTitle}>Sprint 1 foundation</Text>
          <Text style={styles.foundationText}>
            {firebaseIsConfigured
              ? authState.status === 'ready'
                ? `Firebase Authentication is ready. You are using a private ${authState.user.isAnonymous ? 'starter' : 'account'} session.`
                : authState.status === 'error'
                  ? 'Firebase is configured, but sign-in needs attention. Confirm that Anonymous Authentication is enabled in Firebase.'
                  : 'Firebase is configured. Establishing a private BabyReady session…'
              : 'Add your Firebase values in .env to connect secure course content, user plans, and care-team contacts.'}
          </Text>
          <Text style={styles.foundationMeta}>
            {authState.status === 'error'
              ? authState.error
              : 'Secure local storage, Auth persistence, and Firestore rules are included in this scaffold.'}
          </Text>
        </View>
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
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
  weekPill: {
    alignItems: 'center',
    backgroundColor: '#E3F0ED',
    borderColor: '#92BFB8',
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 58,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  weekLabel: {
    color: '#0C4E54',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  weekValue: {
    color: '#0C4E54',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 24,
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
});
