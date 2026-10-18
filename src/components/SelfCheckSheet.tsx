import { useState } from 'react';
import { Linking, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  ANXIETY_MESSAGE,
  BAND_MESSAGES,
  CRISIS_MESSAGE,
  EPDS_CITATION,
  EPDS_INTRO,
  EPDS_QUESTIONS,
  needsCrisisHelp,
  scoreEpds,
  type EpdsResult,
} from '../lib/epds';

/**
 * The EPDS self-check, opened from lesson 6.4. One question at a time; any answer
 * but "Never" on the self-harm question goes straight to crisis help. Answers are
 * never saved or sent anywhere: closing the sheet clears them.
 */

const colors = {
  bg: '#EEF3F6',
  surface: '#FFFFFF',
  ink: '#1D2940',
  muted: '#5A6680',
  line: '#D5DEE6',
  lagoon: '#23716C',
  lagoonSoft: '#DCEDEA',
  marigoldSoft: '#FBF0D6',
  alert: '#B3262F',
  alertSoft: '#FBE6E7',
};

type Step = 'intro' | 'question' | 'crisis' | 'result';

const blankAnswers = (): (number | null)[] => EPDS_QUESTIONS.map(() => null);

export function SelfCheckSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [step, setStep] = useState<Step>('intro');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState(blankAnswers);

  const question = EPDS_QUESTIONS[index];
  const picked = answers[index];
  const isLast = index === EPDS_QUESTIONS.length - 1;

  function reset() {
    setStep('intro');
    setIndex(0);
    setAnswers(blankAnswers());
  }

  function close() {
    reset();
    onClose();
  }

  function pick(score: number) {
    const next = answers.slice();
    next[index] = score;
    setAnswers(next);
    if (needsCrisisHelp(question.number, score)) setStep('crisis');
  }

  function goNext() {
    if (isLast) setStep('result');
    else setIndex(index + 1);
  }

  function goBack() {
    if (index === 0) setStep('intro');
    else setIndex(index - 1);
  }

  const complete = answers.every((a) => a !== null);
  const result = complete ? scoreEpds(answers as number[]) : null;

  return (
    <Modal animationType="slide" onRequestClose={close} visible={visible}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            Check in with yourself
          </Text>
          <Pressable accessibilityRole="button" hitSlop={8} onPress={close} style={styles.secondary}>
            <Text style={styles.secondaryText}>Close</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {step === 'intro' ? (
            <View style={styles.card}>
              <Text style={styles.kicker}>Edinburgh Postnatal Depression Scale</Text>
              <Text style={styles.body}>
                Ten short questions that care teams use to check for depression and anxiety during pregnancy and after
                birth. It takes about five minutes.
              </Text>
              <Text style={styles.body}>
                This is a screening, not a diagnosis; only your care team can diagnose depression. Your answers stay on
                this screen: they aren’t saved or sent anywhere.
              </Text>
              <Text style={[styles.body, styles.strong]}>{EPDS_INTRO}</Text>
              <Pressable accessibilityRole="button" onPress={() => setStep('question')} style={styles.primary}>
                <Text style={styles.primaryText}>Start</Text>
              </Pressable>
              <Text style={styles.note}>
                If you’re thinking about harming yourself or your baby right now, call or text 988, or call 911.
              </Text>
            </View>
          ) : null}

          {step === 'question' ? (
            <View style={styles.card}>
              <Text style={styles.kicker}>
                Question {question.number} of {EPDS_QUESTIONS.length} · in the past 7 days
              </Text>
              <Text style={styles.question}>{question.text}</Text>
              <View accessibilityRole="radiogroup" style={styles.options}>
                {question.options.map((option) => {
                  const selected = picked === option.score;
                  return (
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      key={option.label}
                      onPress={() => pick(option.score)}
                      style={[styles.option, selected && styles.optionPicked]}
                    >
                      <Text style={styles.optionText}>{option.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.navRow}>
                <Pressable accessibilityRole="button" onPress={goBack} style={styles.secondary}>
                  <Text style={styles.secondaryText}>Back</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: picked === null }}
                  disabled={picked === null}
                  onPress={goNext}
                  style={[styles.primary, styles.navPrimary, picked === null && styles.disabled]}
                >
                  <Text style={styles.primaryText}>{isLast ? 'See my result' : 'Next'}</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {step === 'crisis' ? (
            <View style={styles.stack}>
              <CrisisCard />
              <Pressable accessibilityRole="button" onPress={goNext} style={styles.secondary}>
                <Text style={styles.secondaryText}>{isLast ? 'Continue to my result' : 'Continue the questions'}</Text>
              </Pressable>
            </View>
          ) : null}

          {step === 'result' && result ? <ResultView onRetake={reset} result={result} /> : null}

          <Text style={styles.citation}>{EPDS_CITATION}</Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function CrisisCard() {
  return (
    <View accessibilityRole="alert" style={[styles.card, styles.crisisCard]}>
      <Text style={styles.crisisTitle}>{CRISIS_MESSAGE.title}</Text>
      <Text style={styles.body}>{CRISIS_MESSAGE.body}</Text>
      <View style={styles.callRow}>
        <CallButton label="Call 988" url="tel:988" />
        <CallButton label="Text 988" url="sms:988" />
        <CallButton label="Call 1-833-TLC-MAMA" url="tel:18338526262" />
        <CallButton label="Call 911" url="tel:911" />
      </View>
    </View>
  );
}

function CallButton({ label, url }: { label: string; url: string }) {
  return (
    <Pressable accessibilityRole="button" onPress={() => void Linking.openURL(url)} style={styles.callButton}>
      <Text style={styles.callText}>{label}</Text>
    </Pressable>
  );
}

function ResultView({ result, onRetake }: { result: EpdsResult; onRetake: () => void }) {
  const message = BAND_MESSAGES[result.band];
  return (
    <View style={styles.stack}>
      {result.selfHarm ? <CrisisCard /> : null}
      <View style={[styles.card, result.band !== 'low' && styles.resultConcern]}>
        <Text style={styles.kicker}>Your score: {result.total} of 30</Text>
        <Text style={styles.question}>{message.title}</Text>
        <Text style={styles.body}>{message.body}</Text>
        {result.anxietyFlag ? <Text style={[styles.body, styles.strong]}>{ANXIETY_MESSAGE}</Text> : null}
        <Text style={styles.note}>
          This is a screening, not a diagnosis. Share your score with your care team, and take this check again after
          your baby arrives, or any time your feelings change.
        </Text>
        <Pressable accessibilityRole="button" onPress={onRetake} style={styles.secondary}>
          <Text style={styles.secondaryText}>Start over</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  header: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  content: { alignSelf: 'center', gap: 14, maxWidth: 640, padding: 16, width: '100%' },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    padding: 18,
  },
  kicker: { color: colors.lagoon, fontSize: 12, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  body: { color: colors.ink, fontSize: 16, lineHeight: 23 },
  strong: { fontWeight: '700' },
  note: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  question: { color: colors.ink, fontSize: 20, fontWeight: '800', lineHeight: 27 },
  options: { gap: 10 },
  option: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 12,
    borderWidth: 1.5,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  optionPicked: { backgroundColor: colors.lagoonSoft, borderColor: colors.lagoon },
  optionText: { color: colors.ink, fontSize: 16, lineHeight: 22 },
  navRow: { alignItems: 'center', flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  primary: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.lagoon,
    borderRadius: 10,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 18,
  },
  navPrimary: { alignSelf: 'auto' },
  primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  secondary: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderColor: colors.lagoon,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 14,
  },
  secondaryText: { color: colors.lagoon, fontSize: 15, fontWeight: '800' },
  disabled: { opacity: 0.4 },
  stack: { gap: 14 },
  crisisCard: { backgroundColor: colors.alertSoft, borderColor: colors.alert, borderWidth: 2 },
  crisisTitle: { color: colors.alert, fontSize: 20, fontWeight: '800' },
  callRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  callButton: {
    alignItems: 'center',
    backgroundColor: colors.alert,
    borderRadius: 10,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 14,
  },
  callText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  resultConcern: { backgroundColor: colors.marigoldSoft },
  citation: { color: colors.muted, fontSize: 12, lineHeight: 17, textAlign: 'center' },
});
