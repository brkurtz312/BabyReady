import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useLearnerLayout } from '../lib/learnerLayout';
import {
  BIRTH_READINESS_BRIEF_MAX_DISCUSSION_QUESTIONS,
  BIRTH_READINESS_BRIEF_MAX_QUESTION_LENGTH,
  emptyBirthReadinessItems,
  type BirthReadinessItemKey,
  type BirthReadinessItems,
} from '../models/birthReadinessBrief';
import {
  saveBirthReadinessBrief,
  subscribeToBirthReadinessBrief,
  type BirthReadinessBriefState,
} from '../services/birthReadinessBriefService';

export type BirthReadinessBriefAuthStatus =
  'ready' | 'loading' | 'unconfigured' | 'error';

type BirthReadinessBriefScreenProps = {
  authStatus: BirthReadinessBriefAuthStatus;
  onExit: () => void;
  userId: string | null;
};

type ReadinessPrompt = {
  key: BirthReadinessItemKey;
  label: string;
};

const readinessPrompts: ReadinessPrompt[] = [
  {
    key: 'careTeamContactConfirmed',
    label: 'I have my care team’s contact information.',
  },
  {
    key: 'afterHoursPlanConfirmed',
    label: 'I know the after-hours contact plan to discuss with my care team.',
  },
  {
    key: 'arrivalLocationConfirmed',
    label:
      'I have confirmed the arrival location to discuss with my care team.',
  },
  {
    key: 'transportationPlanDiscussed',
    label: 'I have a transportation plan to discuss with my care team.',
  },
  {
    key: 'supportPersonPlanDiscussed',
    label: 'I have a support person plan to discuss with my care team.',
  },
  {
    key: 'questionsPrepared',
    label: 'I have prepared questions for my care team.',
  },
];

function accessMessage(authStatus: BirthReadinessBriefAuthStatus): string {
  if (authStatus === 'loading') {
    return 'Setting up your private Birth Readiness Brief…';
  }
  if (authStatus === 'unconfigured') {
    return 'Your private Birth Readiness Brief is not connected yet. Add the BabyReady Firebase configuration to save it.';
  }
  if (authStatus === 'error') {
    return 'Your private Birth Readiness Brief is temporarily unavailable. Please try again when your session is ready.';
  }
  return 'Sign in to save your private Birth Readiness Brief.';
}

function localValidationError(questions: readonly string[]): string | null {
  if (questions.length > BIRTH_READINESS_BRIEF_MAX_DISCUSSION_QUESTIONS) {
    return `Add no more than ${BIRTH_READINESS_BRIEF_MAX_DISCUSSION_QUESTIONS} discussion questions.`;
  }

  for (const question of questions) {
    if (!question.trim()) {
      return 'Remove empty discussion questions before saving.';
    }
    if (question.trim().length > BIRTH_READINESS_BRIEF_MAX_QUESTION_LENGTH) {
      return `Each discussion question must be ${BIRTH_READINESS_BRIEF_MAX_QUESTION_LENGTH} characters or fewer.`;
    }
  }

  return null;
}

export function BirthReadinessBriefScreen({
  authStatus,
  onExit,
  userId,
}: BirthReadinessBriefScreenProps) {
  const { isTabletLayout } = useLearnerLayout();
  const [briefState, setBriefState] = useState<BirthReadinessBriefState>({
    status: userId ? 'loading' : 'unauthenticated',
    brief: null,
    error: null,
  });
  const [readinessItems, setReadinessItems] = useState<BirthReadinessItems>(
    emptyBirthReadinessItems,
  );
  const [discussionQuestions, setDiscussionQuestions] = useState<string[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setReadinessItems(emptyBirthReadinessItems());
    setDiscussionQuestions([]);
    setSaveError(null);
    setSaveSuccess(false);

    if (authStatus !== 'ready' || !userId) {
      setBriefState({ status: 'unauthenticated', brief: null, error: null });
      return undefined;
    }

    return subscribeToBirthReadinessBrief(userId, setBriefState) ?? undefined;
  }, [authStatus, userId]);

  useEffect(() => {
    if (briefState.status !== 'ready') {
      return;
    }

    setReadinessItems(
      briefState.brief?.readinessItems ?? emptyBirthReadinessItems(),
    );
    setDiscussionQuestions(briefState.brief?.discussionQuestions ?? []);
  }, [briefState]);

  const validationError = useMemo(
    () => localValidationError(discussionQuestions),
    [discussionQuestions],
  );
  const canSave =
    authStatus === 'ready' &&
    Boolean(userId) &&
    briefState.status === 'ready' &&
    !validationError &&
    !isSaving;

  const updateReadinessItem = (key: BirthReadinessItemKey) => {
    setSaveError(null);
    setSaveSuccess(false);
    setReadinessItems((current) => ({ ...current, [key]: !current[key] }));
  };

  const updateQuestion = (index: number, value: string) => {
    setSaveError(null);
    setSaveSuccess(false);
    setDiscussionQuestions((current) =>
      current.map((question, questionIndex) =>
        questionIndex === index ? value : question,
      ),
    );
  };

  const addQuestion = () => {
    setSaveError(null);
    setSaveSuccess(false);
    if (
      discussionQuestions.length >=
      BIRTH_READINESS_BRIEF_MAX_DISCUSSION_QUESTIONS
    ) {
      return;
    }
    setDiscussionQuestions((current) => [...current, '']);
  };

  const removeQuestion = (index: number) => {
    setSaveError(null);
    setSaveSuccess(false);
    setDiscussionQuestions((current) =>
      current.filter((_, questionIndex) => questionIndex !== index),
    );
  };

  const saveBrief = () => {
    if (validationError) {
      setSaveError(validationError);
      setSaveSuccess(false);
      return;
    }
    if (!userId || authStatus !== 'ready' || briefState.status !== 'ready') {
      setSaveError(
        'Your private Birth Readiness Brief is not available to save yet.',
      );
      setSaveSuccess(false);
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    void saveBirthReadinessBrief({
      userId,
      readinessItems,
      discussionQuestions,
    })
      .then((result) => {
        if (result === 'unavailable') {
          setSaveError(
            'Your private Birth Readiness Brief is unavailable and was not saved.',
          );
          return;
        }
        setSaveSuccess(true);
      })
      .catch((error: unknown) => {
        setSaveError(
          error instanceof Error
            ? error.message
            : 'Your Birth Readiness Brief could not be saved. Check your connection and try again.',
        );
      })
      .finally(() => setIsSaving(false));
  };

  const readUnavailable =
    authStatus !== 'ready' ||
    !userId ||
    briefState.status === 'unconfigured' ||
    briefState.status === 'unauthenticated';
  const isLoading = authStatus === 'loading' || briefState.status === 'loading';
  const canEdit =
    authStatus === 'ready' &&
    Boolean(userId) &&
    briefState.status === 'ready' &&
    !isSaving;
  const controlsDisabled = !canEdit;

  return (
    <SafeAreaView style={styles.safeArea} testID="birth-readiness-brief-screen">
      <ScrollView
        contentContainerStyle={[
          styles.content,
          isTabletLayout && styles.tabletContent,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          accessibilityLabel="Return to Arriving Prepared"
          accessibilityRole="button"
          onPress={onExit}
          style={styles.backButton}
          testID="button-exit-birth-readiness-brief"
        >
          <Text style={styles.backButtonText}>‹ Arriving Prepared</Text>
        </Pressable>

        <Text style={styles.brand}>BABYREADY</Text>
        <Text accessibilityRole="header" style={styles.title}>
          Birth Readiness Brief
        </Text>
        <Text style={styles.subtitle}>
          A short preparation guide for your own conversation with your care
          team.
        </Text>

        <View
          accessibilityLabel="Privacy and education notice"
          style={styles.privacyCard}
          testID="birth-readiness-brief-privacy-notice"
        >
          <Text style={styles.privacyTitle}>Private to you</Text>
          <Text style={styles.privacyText}>
            This brief is private to you and is not automatically shared with
            your care team. It is an educational preparation tool, not medical
            advice or a substitute for your care team.
          </Text>
        </View>

        {isLoading ? (
          <View
            accessibilityLabel="Loading your private Birth Readiness Brief"
            accessibilityRole="alert"
            style={styles.statusCard}
            testID="birth-readiness-brief-loading"
          >
            <ActivityIndicator color="#01696F" />
            <Text style={styles.statusText}>Loading your private brief…</Text>
          </View>
        ) : null}

        {readUnavailable ? (
          <View
            accessibilityLabel="Private Birth Readiness Brief unavailable"
            accessibilityRole="alert"
            style={styles.accessCard}
            testID="birth-readiness-brief-access-status"
          >
            <Text style={styles.accessTitle}>Private brief unavailable</Text>
            <Text style={styles.accessText}>{accessMessage(authStatus)}</Text>
          </View>
        ) : null}

        {briefState.status === 'error' ? (
          <View
            accessibilityLabel="Birth Readiness Brief could not be loaded"
            accessibilityRole="alert"
            style={styles.errorCard}
            testID="birth-readiness-brief-read-error"
          >
            <Text style={styles.errorTitle}>
              Your brief could not be loaded
            </Text>
            <Text style={styles.errorText}>
              Check your connection and try again. {briefState.error}
            </Text>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            Readiness prompts
          </Text>
          <Text style={styles.sectionText}>
            Check each item when it is ready for your own care-team
            conversation.
          </Text>
        </View>

        <View style={styles.readinessList}>
          {readinessPrompts.map((prompt) => {
            const checked = readinessItems[prompt.key];
            return (
              <Pressable
                accessibilityHint={
                  controlsDisabled
                    ? 'Saving is unavailable until your private brief is ready.'
                    : 'Marks this preparation item complete in your private brief.'
                }
                accessibilityLabel={`${checked ? 'Mark incomplete' : 'Mark complete'}: ${prompt.label}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked, disabled: controlsDisabled }}
                disabled={controlsDisabled}
                key={prompt.key}
                onPress={() => updateReadinessItem(prompt.key)}
                style={[
                  styles.readinessItem,
                  checked && styles.readinessItemChecked,
                  controlsDisabled && styles.controlDisabled,
                ]}
                testID={`checkbox-birth-readiness-${prompt.key}`}
              >
                <View
                  style={[styles.checkbox, checked && styles.checkboxChecked]}
                >
                  {checked ? <Text style={styles.checkmark}>✓</Text> : null}
                </View>
                <Text
                  style={[
                    styles.readinessLabel,
                    checked && styles.readinessLabelChecked,
                  ]}
                >
                  {prompt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.questionsHeader}>
          <View style={styles.questionsHeaderCopy}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              Questions to discuss
            </Text>
            <Text style={styles.sectionText}>
              Add up to {BIRTH_READINESS_BRIEF_MAX_DISCUSSION_QUESTIONS}{' '}
              questions for a future conversation with your care team.
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Add a discussion question"
            accessibilityRole="button"
            accessibilityState={{
              disabled:
                controlsDisabled ||
                discussionQuestions.length >=
                  BIRTH_READINESS_BRIEF_MAX_DISCUSSION_QUESTIONS,
            }}
            disabled={
              controlsDisabled ||
              discussionQuestions.length >=
                BIRTH_READINESS_BRIEF_MAX_DISCUSSION_QUESTIONS
            }
            onPress={addQuestion}
            style={[
              styles.addQuestionButton,
              (controlsDisabled ||
                discussionQuestions.length >=
                  BIRTH_READINESS_BRIEF_MAX_DISCUSSION_QUESTIONS) &&
                styles.controlDisabled,
            ]}
            testID="button-add-birth-readiness-question"
          >
            <Text style={styles.addQuestionButtonText}>Add question</Text>
          </Pressable>
        </View>

        <Text
          accessibilityLabel={`${discussionQuestions.length} of ${BIRTH_READINESS_BRIEF_MAX_DISCUSSION_QUESTIONS} discussion questions used`}
          style={styles.questionCount}
          testID="birth-readiness-brief-question-count"
        >
          {discussionQuestions.length} of{' '}
          {BIRTH_READINESS_BRIEF_MAX_DISCUSSION_QUESTIONS} questions
        </Text>

        {discussionQuestions.map((question, index) => (
          <View
            key={`discussion-question-${index}`}
            style={styles.questionCard}
            testID={`birth-readiness-brief-question-${index}`}
          >
            <View style={styles.questionCardHeader}>
              <Text style={styles.questionLabel}>Question {index + 1}</Text>
              <Pressable
                accessibilityLabel={`Remove discussion question ${index + 1}`}
                accessibilityRole="button"
                accessibilityState={{ disabled: controlsDisabled }}
                disabled={controlsDisabled}
                onPress={() => removeQuestion(index)}
                style={[
                  styles.removeQuestionButton,
                  controlsDisabled && styles.controlDisabled,
                ]}
                testID={`button-remove-birth-readiness-question-${index}`}
              >
                <Text style={styles.removeQuestionButtonText}>Remove</Text>
              </Pressable>
            </View>
            <TextInput
              accessibilityLabel={`Discussion question ${index + 1}`}
              editable={!controlsDisabled}
              maxLength={BIRTH_READINESS_BRIEF_MAX_QUESTION_LENGTH}
              multiline
              onChangeText={(value) => updateQuestion(index, value)}
              placeholder="Write a question to discuss with your care team"
              placeholderTextColor="#7A7974"
              style={[
                styles.questionInput,
                controlsDisabled && styles.inputDisabled,
              ]}
              testID={`input-birth-readiness-question-${index}`}
              value={question}
            />
            <Text
              accessibilityLabel={`${question.length} of ${BIRTH_READINESS_BRIEF_MAX_QUESTION_LENGTH} characters`}
              style={styles.characterCount}
              testID={`birth-readiness-brief-question-character-count-${index}`}
            >
              {question.length}/{BIRTH_READINESS_BRIEF_MAX_QUESTION_LENGTH}
            </Text>
          </View>
        ))}

        {validationError ? (
          <Text
            accessibilityLabel={`Discussion question validation: ${validationError}`}
            accessibilityRole="alert"
            style={styles.validationError}
            testID="birth-readiness-brief-validation-error"
          >
            {validationError}
          </Text>
        ) : null}

        {saveError ? (
          <Text
            accessibilityLabel={`Birth Readiness Brief save error: ${saveError}`}
            accessibilityRole="alert"
            style={styles.saveError}
            testID="birth-readiness-brief-save-error"
          >
            {saveError}
          </Text>
        ) : null}

        {saveSuccess ? (
          <Text
            accessibilityLabel="Your Birth Readiness Brief was saved privately"
            accessibilityRole="alert"
            style={styles.saveSuccess}
            testID="birth-readiness-brief-save-success"
          >
            Your Birth Readiness Brief was saved privately.
          </Text>
        ) : null}

        <Pressable
          accessibilityHint={
            canSave
              ? 'Saves this private educational preparation brief.'
              : validationError
                ? validationError
                : 'Saving is unavailable until your private brief is ready.'
          }
          accessibilityLabel="Save your private Birth Readiness Brief"
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSave, busy: isSaving }}
          disabled={!canSave}
          onPress={saveBrief}
          style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
          testID="button-save-birth-readiness-brief"
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save private brief</Text>
          )}
        </Pressable>
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
    maxWidth: 860,
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
  privacyCard: {
    backgroundColor: '#EAF4F2',
    borderColor: '#92BFB8',
    borderLeftColor: '#01696F',
    borderLeftWidth: 4,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 20,
    padding: 16,
  },
  privacyTitle: {
    color: '#0C4E54',
    fontSize: 15,
    fontWeight: '800',
  },
  privacyText: {
    color: '#365553',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  statusCard: {
    alignItems: 'center',
    backgroundColor: '#FBFBF9',
    borderColor: '#D4D1CA',
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    marginTop: 18,
    padding: 18,
  },
  statusText: {
    color: '#605D56',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  accessCard: {
    backgroundColor: '#FBFBF9',
    borderColor: '#D4D1CA',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 18,
    padding: 16,
  },
  accessTitle: {
    color: '#28251D',
    fontSize: 15,
    fontWeight: '800',
  },
  accessText: {
    color: '#605D56',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  errorCard: {
    backgroundColor: '#FFF5F8',
    borderColor: '#A12C7B',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 18,
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
  sectionHeader: {
    marginTop: 28,
  },
  sectionTitle: {
    color: '#28251D',
    fontSize: 20,
    fontWeight: '800',
  },
  sectionText: {
    color: '#605D56',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
    maxWidth: 620,
  },
  readinessList: {
    gap: 10,
    marginTop: 14,
  },
  readinessItem: {
    alignItems: 'center',
    backgroundColor: '#FBFBF9',
    borderColor: '#D4D1CA',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 62,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  readinessItemChecked: {
    backgroundColor: '#F0F6F4',
    borderColor: '#92BFB8',
  },
  checkbox: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#696761',
    borderRadius: 11,
    borderWidth: 2,
    height: 23,
    justifyContent: 'center',
    marginRight: 12,
    width: 23,
  },
  checkboxChecked: {
    backgroundColor: '#01696F',
    borderColor: '#01696F',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 18,
  },
  readinessLabel: {
    color: '#28251D',
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  readinessLabelChecked: {
    color: '#0C4E54',
  },
  questionsHeader: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'space-between',
    marginTop: 30,
  },
  questionsHeaderCopy: {
    flex: 1,
  },
  addQuestionButton: {
    alignItems: 'center',
    backgroundColor: '#E3F0ED',
    borderColor: '#63A7A1',
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 13,
  },
  addQuestionButtonText: {
    color: '#0C4E54',
    fontSize: 14,
    fontWeight: '800',
  },
  questionCount: {
    color: '#696761',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 9,
  },
  questionCard: {
    backgroundColor: '#FBFBF9',
    borderColor: '#D4D1CA',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 10,
    padding: 13,
  },
  questionCardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  questionLabel: {
    color: '#28251D',
    fontSize: 14,
    fontWeight: '800',
  },
  removeQuestionButton: {
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 4,
  },
  removeQuestionButtonText: {
    color: '#7B1F5C',
    fontSize: 13,
    fontWeight: '800',
  },
  questionInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#B8B5AD',
    borderRadius: 10,
    borderWidth: 1,
    color: '#28251D',
    fontSize: 15,
    lineHeight: 21,
    minHeight: 92,
    padding: 11,
    textAlignVertical: 'top',
  },
  inputDisabled: {
    backgroundColor: '#EFEEE9',
    color: '#77746D',
  },
  characterCount: {
    color: '#77746D',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'right',
  },
  validationError: {
    color: '#7B1F5C',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 12,
  },
  saveError: {
    color: '#7B1F5C',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 12,
  },
  saveSuccess: {
    color: '#437A22',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 12,
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: '#01696F',
    borderRadius: 11,
    justifyContent: 'center',
    marginTop: 20,
    minHeight: 48,
    paddingHorizontal: 18,
  },
  saveButtonDisabled: {
    backgroundColor: '#A6A49E',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  controlDisabled: {
    opacity: 0.58,
  },
});
