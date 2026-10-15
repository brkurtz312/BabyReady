import { useEffect, useRef, useState } from 'react';
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

import { ASK_SUGGESTIONS } from '../content/askSuggestions';
import { MAX_QUESTION_LENGTH, SAFETY_MESSAGES } from '../lib/askSafety';
import { askLessonQuestion, type AskResult } from '../services/askLessonQuestionService';

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

type AskQuestionSheetProps = {
  visible: boolean;
  lessonId: string;
  onClose: () => void;
};

/**
 * "Ask a question" panel for the class player. Answers come only from the
 * current lesson; urgent questions get a fixed safety message instead.
 */
export function AskQuestionSheet({ visible, lessonId, onClose }: AskQuestionSheetProps) {
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AskResult | null>(null);
  const requestRef = useRef(0);

  // A new lesson starts with a clean panel.
  useEffect(() => {
    requestRef.current += 1;
    setQuestion('');
    setResult(null);
    setBusy(false);
  }, [lessonId]);

  async function ask(text: string) {
    const trimmed = text.trim();
    if (!trimmed) {
      setResult({ kind: 'error', message: 'Type a question first, or tap one of the examples.' });
      return;
    }
    const request = ++requestRef.current;
    setBusy(true);
    setResult(null);
    const answer = await askLessonQuestion(lessonId, trimmed);
    if (request !== requestRef.current) return;
    setResult(answer);
    setBusy(false);
  }

  function close() {
    requestRef.current += 1;
    setBusy(false);
    onClose();
  }

  const suggestions = ASK_SUGGESTIONS[lessonId] ?? [];

  return (
    <Modal animationType="slide" onRequestClose={close} transparent visible={visible}>
      <Pressable accessibilityLabel="Close questions" onPress={close} style={styles.backdrop} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetWrap}>
        <View accessibilityViewIsModal style={styles.sheet}>
          <ScrollView contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">
            <Text accessibilityRole="header" style={styles.title}>
              Ask a question
            </Text>
            <Text style={styles.note}>
              Answers come only from this lesson. For anything about your own symptoms or care, contact your
              care team.
            </Text>

            {suggestions.length ? (
              <View style={styles.chips}>
                {suggestions.map((s) => (
                  <Pressable
                    accessibilityRole="button"
                    disabled={busy}
                    key={s}
                    onPress={() => {
                      setQuestion(s);
                      void ask(s);
                    }}
                    style={styles.chip}
                  >
                    <Text style={styles.chipText}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <TextInput
              accessibilityLabel="Your question about this lesson"
              editable={!busy}
              maxLength={MAX_QUESTION_LENGTH}
              multiline
              onChangeText={setQuestion}
              placeholder="Type your question about this lesson"
              placeholderTextColor={colors.muted}
              style={styles.input}
              textAlignVertical="top"
              value={question}
            />

            <View style={styles.row}>
              <Pressable accessibilityRole="button" onPress={close} style={styles.secondary}>
                <Text style={styles.secondaryText}>Close</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: busy, busy }}
                disabled={busy}
                onPress={() => void ask(question)}
                style={[styles.primary, busy && styles.disabled]}
              >
                {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Ask</Text>}
              </Pressable>
            </View>

            <View accessibilityLiveRegion="polite">
              {result ? <AskResultView result={result} /> : null}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function AskResultView({ result }: { result: AskResult }) {
  if (result.kind === 'safety') {
    const message = SAFETY_MESSAGES[result.route];
    return (
      <View accessibilityRole="alert" style={styles.urgent}>
        <Text style={styles.urgentTitle}>{message.title}</Text>
        <Text style={styles.body}>{message.body}</Text>
        <View style={styles.row}>
          {result.route === 'crisis' ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void Linking.openURL('tel:988')}
              style={styles.callButton}
            >
              <Text style={styles.callText}>Call 988</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={() => void Linking.openURL('tel:911')}
            style={styles.callButton}
          >
            <Text style={styles.callText}>Call 911</Text>
          </Pressable>
        </View>
      </View>
    );
  }
  if (result.kind === 'error') {
    return <Text style={[styles.answer, styles.muted]}>{result.message}</Text>;
  }
  return (
    <View style={styles.answerBox}>
      <Text style={styles.answer}>{result.answer}</Text>
      {result.from ? <Text style={styles.from}>From: {result.from}</Text> : null}
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
    maxHeight: '85%',
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
  },
  sheetContent: { padding: 20, gap: 12 },
  title: { color: colors.ink, fontSize: 22, fontWeight: '800' },
  note: { color: colors.muted, fontSize: 14, lineHeight: 20 },
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
  input: {
    minHeight: 80,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 14,
    padding: 12,
    fontSize: 17,
    color: colors.ink,
    backgroundColor: colors.bg,
  },
  row: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' },
  secondary: {
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  secondaryText: { color: colors.ink, fontWeight: '700', fontSize: 15 },
  primary: {
    backgroundColor: colors.lagoon,
    borderRadius: 12,
    paddingHorizontal: 22,
    paddingVertical: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  primaryText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  disabled: { opacity: 0.5 },
  urgent: {
    backgroundColor: colors.alertSoft,
    borderColor: colors.alert,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  urgentTitle: { color: colors.alert, fontSize: 16, fontWeight: '800' },
  body: { color: colors.ink, fontSize: 15, lineHeight: 22 },
  callButton: { backgroundColor: colors.alert, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 9 },
  callText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  answerBox: { backgroundColor: colors.lagoonSoft, borderRadius: 14, padding: 14, gap: 6 },
  answer: { color: colors.ink, fontSize: 16, lineHeight: 23 },
  muted: { color: colors.muted },
  from: { color: colors.lagoon, fontSize: 13, fontWeight: '700' },
});
