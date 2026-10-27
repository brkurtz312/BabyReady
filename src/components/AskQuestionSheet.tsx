import { useEffect, useRef, useState } from 'react';
import * as Speech from 'expo-speech';
import {
  AVAudioSessionCategory,
  AVAudioSessionCategoryOptions,
  AVAudioSessionMode,
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ASK_FOLLOW_UP as FOLLOW_UP, ASK_GREETING_TYPED, ASK_GREETING_WITH_MIC } from '../content/askLines';
import { ASK_SUGGESTIONS } from '../content/askSuggestions';
import { MAX_QUESTION_LENGTH, SAFETY_MESSAGES, type AskSafetyRoute } from '../lib/askSafety';
import { NARRATION_RATE, pickNarrationVoice, splitSentences } from '../lib/narration';
import { answerAudioSources } from '../lib/answerAudio';
import { findClip, playClip, playSequence, stopClip } from '../lib/narrator';
import { askLessonQuestion, type ConversationTurn } from '../services/askLessonQuestionService';

const colors = {
  bg: '#EEF3F6',
  surface: '#FFFFFF',
  ink: '#1D2940',
  muted: '#5A6680',
  line: '#D5DEE6',
  lagoon: '#23716C',
  lagoonSoft: '#DCEDEA',
  alert: '#B3262F',
  alertSoft: '#FBE6E7',
  backdrop: 'rgba(29, 41, 64, 0.45)',
};


type Turn =
  | { id: number; role: 'learner'; text: string }
  | { id: number; role: 'instructor'; kind: 'greeting' | 'note'; text: string }
  | { id: number; role: 'instructor'; kind: 'answer'; text: string; from: string | null }
  | { id: number; role: 'instructor'; kind: 'safety'; route: Exclude<AskSafetyRoute, 'ok'> };

/** A turn before it gets an id (Omit spread over each kind of turn). */
type NewTurn = Turn extends infer T ? (T extends Turn ? Omit<T, 'id'> : never) : never;

type AskQuestionSheetProps = {
  visible: boolean;
  lessonId: string;
  lessonTitle: string;
  /** Follows the class's Voice/Muted switch. */
  voiceOn: boolean;
  onClose: () => void;
};

function recognitionAvailable(): boolean {
  try {
    return ExpoSpeechRecognitionModule.isRecognitionAvailable();
  } catch {
    return false;
  }
}

/**
 * A spoken conversation with the class instructor about the current lesson.
 * The instructor's voice is the same device voice that narrates the class.
 * The learner can ask out loud (microphone) or type. Questions about urgent
 * symptoms get a fixed safety message and never reach the AI.
 */
export function AskQuestionSheet({ visible, lessonId, lessonTitle, voiceOn, onClose }: AskQuestionSheetProps) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState('');
  const [micError, setMicError] = useState<string | null>(null);
  const [micAvailable] = useState(recognitionAvailable);

  const nextId = useRef(1);
  const voiceIdRef = useRef<string | undefined>(undefined);
  /** Bumped whenever speech or a request is cancelled, so late callbacks are ignored. */
  const runRef = useRef(0);
  /** The learner last asked out loud, so the mic reopens after each answer. */
  const voiceModeRef = useRef(false);
  const finalTranscriptRef = useRef('');
  const scrollRef = useRef<ScrollView>(null);
  const turnsRef = useRef<Turn[]>([]);
  turnsRef.current = turns;

  useEffect(() => {
    void pickNarrationVoice().then((id) => {
      voiceIdRef.current = id;
    });
  }, []);

  function addTurn(turn: NewTurn) {
    const withId = { ...turn, id: nextId.current++ } as Turn;
    setTurns((current) => [...current, withId]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  }

  function stopSpeaking() {
    runRef.current += 1;
    stopClip();
    void Speech.stop();
  }

  /**
   * Speaks text in the narrator's voice: a recorded clip for fixed lines (greeting,
   * follow-up, safety messages), or `audio`, the server's spoken answer. Falls back
   * to the phone's voice, one sentence at a time, when neither fits.
   */
  function speak(text: string, onDone?: () => void, audio?: string[]) {
    const run = ++runRef.current;
    if (!voiceOn) {
      onDone?.();
      return;
    }
    const sentences = splitSentences(text);
    const finished = () => run === runRef.current && onDone?.();
    const clip = findClip(text);
    if (clip && clip.starts.length === sentences.length) {
      void Speech.stop().catch(() => undefined);
      playClip(clip, 0, { onDone: finished, onError: () => speakWithDevice(run, sentences, onDone) });
      return;
    }
    const sources = audio && audio.length === sentences.length ? answerAudioSources(audio) : null;
    if (sources) {
      void Speech.stop().catch(() => undefined);
      playSequence(sources, { onDone: finished, onError: () => speakWithDevice(run, sentences, onDone) });
      return;
    }
    speakWithDevice(run, sentences, onDone);
  }

  function speakWithDevice(run: number, sentences: string[], onDone?: () => void) {
    if (run !== runRef.current) return;
    const say = (n: number) => {
      if (run !== runRef.current) return;
      if (n >= sentences.length) {
        onDone?.();
        return;
      }
      Speech.speak(sentences[n], {
        rate: NARRATION_RATE,
        voice: voiceIdRef.current,
        onDone: () => say(n + 1),
        onError: () => {
          if (run === runRef.current) onDone?.();
        },
      });
    };
    void Speech.stop()
      .catch(() => undefined)
      .finally(() => say(0));
  }

  // Greet the learner each time the panel opens on a new lesson.
  useEffect(() => {
    if (!visible) return;
    if (turnsRef.current.length === 0) {
      const greeting = micAvailable ? ASK_GREETING_WITH_MIC : ASK_GREETING_TYPED;
      addTurn({ role: 'instructor', kind: 'greeting', text: greeting });
      speak(greeting);
    }
    return () => {
      stopSpeaking();
    };
    // Runs when the panel opens; the greeting depends only on the lesson.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // A different lesson starts a fresh conversation.
  useEffect(() => {
    runRef.current += 1;
    setTurns([]);
    setDraft('');
    setBusy(false);
    voiceModeRef.current = false;
  }, [lessonId]);

  function historyForServer(): ConversationTurn[] {
    return turnsRef.current.flatMap((t): ConversationTurn[] => {
      if (t.role === 'learner') return [{ role: 'learner', text: t.text }];
      if (t.kind === 'answer') return [{ role: 'instructor', text: t.text }];
      return [];
    });
  }

  async function ask(text: string, viaVoice: boolean) {
    const question = text.trim();
    if (!question || busy) return;
    voiceModeRef.current = viaVoice;
    stopSpeaking();
    const history = historyForServer();
    addTurn({ role: 'learner', text: question });
    setDraft('');
    setBusy(true);
    const run = runRef.current;
    const result = await askLessonQuestion(lessonId, question, history);
    if (run !== runRef.current) return;
    setBusy(false);

    if (result.kind === 'safety') {
      // Safety messages are fixed text, spoken in the same voice. The mic stays
      // closed so the learner can call right away.
      voiceModeRef.current = false;
      addTurn({ role: 'instructor', kind: 'safety', route: result.route });
      const message = SAFETY_MESSAGES[result.route];
      speak(`${message.title} ${message.body}`);
      return;
    }
    if (result.kind === 'error') {
      addTurn({ role: 'instructor', kind: 'note', text: result.message });
      speak(result.message);
      return;
    }
    addTurn({ role: 'instructor', kind: 'answer', text: result.answer, from: result.from });
    speak(
      result.answer,
      () =>
        speak(FOLLOW_UP, () => {
          if (voiceModeRef.current) void startListening();
        }),
      result.speech,
    );
  }

  async function startListening() {
    if (!micAvailable || busy) return;
    stopSpeaking();
    setMicError(null);
    try {
      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted) {
        setMicError('BabyReady needs microphone permission to hear your question. You can type it instead.');
        return;
      }
      finalTranscriptRef.current = '';
      setHeard('');
      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        continuous: false,
        addsPunctuation: true,
        iosCategory: {
          category: AVAudioSessionCategory.playAndRecord,
          categoryOptions: [
            AVAudioSessionCategoryOptions.defaultToSpeaker,
            AVAudioSessionCategoryOptions.allowBluetooth,
          ],
        },
      });
    } catch {
      setMicError('The microphone isn’t available right now. You can type your question instead.');
    }
  }

  /**
   * Listening puts the iPhone's audio in a recording mode that makes spoken
   * output very quiet, and it stays that way afterward. Switch back to normal
   * playback so the instructor and the lesson narration can be heard again.
   */
  function restorePlaybackAudio() {
    if (Platform.OS !== 'ios') return;
    try {
      ExpoSpeechRecognitionModule.setCategoryIOS({
        category: AVAudioSessionCategory.playback,
        categoryOptions: [],
        mode: AVAudioSessionMode.spokenAudio,
      });
      ExpoSpeechRecognitionModule.setAudioSessionActiveIOS(true);
    } catch {
      // Leave the audio as it is rather than interrupt the lesson.
    }
  }

  function stopListening() {
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      setListening(false);
    }
  }

  useSpeechRecognitionEvent('start', () => setListening(true));
  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results[0]?.transcript ?? '';
    setHeard(transcript);
    if (event.isFinal) finalTranscriptRef.current = transcript;
  });
  useSpeechRecognitionEvent('end', () => {
    setListening(false);
    restorePlaybackAudio();
    const spoken = finalTranscriptRef.current.trim();
    finalTranscriptRef.current = '';
    setHeard('');
    if (spoken && visible) void ask(spoken, true);
  });
  useSpeechRecognitionEvent('error', (event) => {
    setListening(false);
    restorePlaybackAudio();
    setHeard('');
    if (event.error === 'aborted') return;
    voiceModeRef.current = false;
    if (event.error === 'no-speech' || event.error === 'speech-timeout') {
      setMicError('I didn’t catch that. Tap the microphone to try again, or type your question.');
    } else if (event.error === 'not-allowed') {
      setMicError('BabyReady needs microphone permission to hear your question. You can type it instead.');
    } else {
      setMicError('The microphone isn’t available right now. You can type your question instead.');
    }
  });

  function close() {
    stopSpeaking();
    voiceModeRef.current = false;
    try {
      ExpoSpeechRecognitionModule.abort();
    } catch {
      // Nothing was listening.
    }
    restorePlaybackAudio();
    setBusy(false);
    onClose();
  }

  const suggestions = ASK_SUGGESTIONS[lessonId] ?? [];
  const showSuggestions = !turns.some((t) => t.role === 'learner');

  return (
    <Modal animationType="slide" onRequestClose={close} transparent visible={visible}>
      <Pressable accessibilityLabel="Close questions" onPress={close} style={styles.backdrop} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetWrap}>
        <View accessibilityViewIsModal style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text accessibilityRole="header" style={styles.title}>
                Ask your instructor
              </Text>
              <Text numberOfLines={1} style={styles.lessonName}>
                {lessonTitle}
              </Text>
            </View>
            <Pressable accessibilityRole="button" hitSlop={8} onPress={close} style={styles.secondary}>
              <Text style={styles.secondaryText}>Close</Text>
            </Pressable>
          </View>
          <Text style={styles.note}>
            Answers come only from this lesson. For anything about your own symptoms or care, contact your care team.
          </Text>

          <ScrollView ref={scrollRef} contentContainerStyle={styles.turns} keyboardShouldPersistTaps="handled">
            {turns.map((turn) => (
              <TurnView key={turn.id} turn={turn} />
            ))}
            {busy ? (
              <View style={[styles.bubble, styles.instructorBubble, styles.thinking]}>
                <ActivityIndicator color={colors.lagoon} />
                <Text style={styles.muted}>Thinking…</Text>
              </View>
            ) : null}
            {listening ? (
              <View accessibilityLiveRegion="polite" style={[styles.bubble, styles.learnerBubble]}>
                <Text style={styles.listeningLabel}>Listening…</Text>
                {heard ? <Text style={styles.bubbleText}>{heard}</Text> : null}
              </View>
            ) : null}
            {showSuggestions && !busy && !listening ? (
              <View style={styles.chips}>
                {suggestions.map((s) => (
                  <Pressable accessibilityRole="button" key={s} onPress={() => void ask(s, false)} style={styles.chip}>
                    <Text style={styles.chipText}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </ScrollView>

          {micError ? (
            <Text accessibilityLiveRegion="polite" style={styles.micError}>
              {micError}
            </Text>
          ) : null}

          <View style={styles.inputRow}>
            {micAvailable ? (
              <Pressable
                accessibilityHint={listening ? 'Stops listening and sends what you said.' : 'Ask your question out loud.'}
                accessibilityLabel={listening ? 'Stop listening' : 'Ask out loud'}
                accessibilityRole="button"
                accessibilityState={{ disabled: busy }}
                disabled={busy}
                onPress={() => (listening ? stopListening() : void startListening())}
                style={[styles.micButton, listening && styles.micButtonOn, busy && styles.disabled]}
              >
                <Text style={styles.micText}>{listening ? '■' : '🎤'}</Text>
              </Pressable>
            ) : null}
            <TextInput
              accessibilityLabel="Type your question about this lesson"
              editable={!busy && !listening}
              maxLength={MAX_QUESTION_LENGTH}
              multiline
              onChangeText={setDraft}
              placeholder="Type your question"
              placeholderTextColor={colors.muted}
              style={styles.input}
              textAlignVertical="top"
              value={draft}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: busy || !draft.trim() }}
              disabled={busy || !draft.trim()}
              onPress={() => void ask(draft, false)}
              style={[styles.primary, (busy || !draft.trim()) && styles.disabled]}
            >
              <Text style={styles.primaryText}>Ask</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function TurnView({ turn }: { turn: Turn }) {
  if (turn.role === 'learner') {
    return (
      <View style={[styles.bubble, styles.learnerBubble]}>
        <Text style={styles.bubbleText}>{turn.text}</Text>
      </View>
    );
  }
  if (turn.kind === 'safety') {
    const message = SAFETY_MESSAGES[turn.route];
    return (
      <View accessibilityRole="alert" style={[styles.bubble, styles.urgent]}>
        <Text style={styles.urgentTitle}>{message.title}</Text>
        <Text style={styles.bubbleText}>{message.body}</Text>
        <View style={styles.callRow}>
          {turn.route === 'crisis' ? (
            <Pressable accessibilityRole="button" onPress={() => void Linking.openURL('tel:988')} style={styles.callButton}>
              <Text style={styles.callText}>Call 988</Text>
            </Pressable>
          ) : null}
          <Pressable accessibilityRole="button" onPress={() => void Linking.openURL('tel:911')} style={styles.callButton}>
            <Text style={styles.callText}>Call 911</Text>
          </Pressable>
        </View>
      </View>
    );
  }
  return (
    <View style={[styles.bubble, styles.instructorBubble]}>
      <Text style={styles.speaker}>Instructor</Text>
      <Text style={styles.bubbleText}>{turn.text}</Text>
      {turn.kind === 'answer' ? (
        <>
          {turn.from ? <Text style={styles.from}>From: {turn.from}</Text> : null}
          <Text style={styles.followUp}>{FOLLOW_UP}</Text>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.backdrop },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    height: '85%',
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 8,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerText: { flexShrink: 1, gap: 2, marginRight: 12 },
  title: { color: colors.ink, fontSize: 22, fontWeight: '800' },
  lessonName: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  note: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  turns: { gap: 10, paddingVertical: 8 },
  bubble: { borderRadius: 16, padding: 12, maxWidth: '88%', gap: 4 },
  instructorBubble: { backgroundColor: colors.lagoonSoft, alignSelf: 'flex-start' },
  learnerBubble: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line, alignSelf: 'flex-end' },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  speaker: { color: colors.lagoon, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  bubbleText: { color: colors.ink, fontSize: 16, lineHeight: 23 },
  from: { color: colors.lagoon, fontSize: 13, fontWeight: '700' },
  followUp: { color: colors.muted, fontSize: 14, fontStyle: 'italic' },
  listeningLabel: { color: colors.lagoon, fontSize: 13, fontWeight: '800' },
  muted: { color: colors.muted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: colors.bg,
  },
  chipText: { color: colors.ink, fontSize: 14 },
  micError: { color: colors.alert, fontSize: 14, lineHeight: 20 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  micButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.lagoonSoft,
    borderWidth: 1.5,
    borderColor: colors.lagoon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButtonOn: { backgroundColor: colors.alertSoft, borderColor: colors.alert },
  micText: { fontSize: 20, color: colors.ink },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 110,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.bg,
  },
  secondary: {
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  secondaryText: { color: colors.ink, fontWeight: '700', fontSize: 15 },
  primary: {
    backgroundColor: colors.lagoon,
    borderRadius: 12,
    paddingHorizontal: 18,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  disabled: { opacity: 0.5 },
  urgent: {
    backgroundColor: colors.alertSoft,
    borderColor: colors.alert,
    borderWidth: 1.5,
    alignSelf: 'stretch',
    maxWidth: '100%',
  },
  urgentTitle: { color: colors.alert, fontSize: 16, fontWeight: '800' },
  callRow: { flexDirection: 'row', gap: 10, marginTop: 6, flexWrap: 'wrap' },
  callButton: { backgroundColor: colors.alert, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 9 },
  callText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
});
