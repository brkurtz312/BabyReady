import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { User } from 'firebase/auth';

import type { ClinicalContentBlock, ContentSource } from '../models/course';
import {
  submitContentBlockForClinicalReview,
  upsertClinicalContentBlock,
} from '../services/contentGovernanceService';
import {
  subscribeToContentSourceLibrary,
  type SourceLibraryState,
} from '../services/sourceService';

type AccessState = 'checking' | 'authorized' | 'denied' | 'error';
type AuthoringAction = 'save' | 'submit' | null;
type ContentBlockType = ClinicalContentBlock['type'];

type ContentForm = {
  courseId: string;
  moduleId: string;
  lessonId: string;
  id: string;
  type: ContentBlockType;
  body: string;
  isClinicalClaim: boolean;
  sourceIds: string[];
};

type ClinicianContentAuthoringScreenProps = {
  user: User;
  onExit: () => void;
};

const contentTypes: Array<{ value: ContentBlockType; label: string }> = [
  { value: 'text', label: 'Text' },
  { value: 'callout', label: 'Callout' },
  { value: 'checklist', label: 'Checklist' },
  { value: 'question', label: 'Question' },
  { value: 'citation', label: 'Citation' },
  { value: 'emergency_card', label: 'Safety card' },
  { value: 'audio', label: 'Audio' },
  { value: 'video', label: 'Video' },
  { value: 'artifact_prompt', label: 'Prompt' },
];

function emptyContentForm(): ContentForm {
  return {
    courseId: '',
    moduleId: '',
    lessonId: '',
    id: '',
    type: 'text',
    body: '',
    isClinicalClaim: true,
    sourceIds: [],
  };
}

function readableError(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'BabyReady could not complete that clinical content action.';
}

export function ClinicianContentAuthoringScreen({
  user,
  onExit,
}: ClinicianContentAuthoringScreenProps) {
  const [access, setAccess] = useState<AccessState>('checking');
  const [sourceLibrary, setSourceLibrary] = useState<SourceLibraryState>({
    status: 'loading',
    sources: [],
    error: null,
  });
  const [form, setForm] = useState<ContentForm>(emptyContentForm);
  const [actionInFlight, setActionInFlight] = useState<AuthoringAction>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    user
      .getIdTokenResult()
      .then((token) => {
        if (active) {
          setAccess(token.claims.admin === true ? 'authorized' : 'denied');
        }
      })
      .catch(() => {
        if (active) {
          setAccess('error');
        }
      });

    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (access !== 'authorized') {
      return undefined;
    }

    return subscribeToContentSourceLibrary(setSourceLibrary) ?? undefined;
  }, [access]);

  const publishedSources = useMemo(
    () =>
      sourceLibrary.sources.filter(
        (source) => source.publicationState === 'published',
      ),
    [sourceLibrary.sources],
  );

  useEffect(() => {
    setForm((current) => {
      const availableSourceIds = new Set(
        publishedSources.map((source) => source.id),
      );
      const sourceIds = current.sourceIds.filter((sourceId) =>
        availableSourceIds.has(sourceId),
      );

      return sourceIds.length === current.sourceIds.length
        ? current
        : { ...current, sourceIds };
    });
  }, [publishedSources]);

  const updateForm = <Key extends keyof ContentForm>(
    key: Key,
    value: ContentForm[Key],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const toggleSource = (source: ContentSource) => {
    setForm((current) => ({
      ...current,
      sourceIds: current.sourceIds.includes(source.id)
        ? current.sourceIds.filter((sourceId) => sourceId !== source.id)
        : [...current.sourceIds, source.id],
    }));
  };

  const validateForm = (
    requireClinicalSources: boolean,
  ): { input: ContentForm | null; error: string | null } => {
    const normalized: ContentForm = {
      ...form,
      courseId: form.courseId.trim(),
      moduleId: form.moduleId.trim(),
      lessonId: form.lessonId.trim(),
      id: form.id.trim(),
      body: form.body.trim(),
    };
    const stableId = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

    if (
      !stableId.test(normalized.courseId) ||
      !stableId.test(normalized.moduleId) ||
      !stableId.test(normalized.lessonId) ||
      !stableId.test(normalized.id)
    ) {
      return {
        input: null,
        error:
          'Use lowercase letters, numbers, and single hyphens for all content IDs.',
      };
    }
    if (!normalized.body) {
      return {
        input: null,
        error: 'Add learner-facing content before saving this block.',
      };
    }
    if (
      requireClinicalSources &&
      normalized.isClinicalClaim &&
      normalized.sourceIds.length === 0
    ) {
      return {
        input: null,
        error:
          'Attach at least one published source for a clinical claim before submitting.',
      };
    }

    return { input: normalized, error: null };
  };

  const saveDraft = async (input: ContentForm) => {
    await upsertClinicalContentBlock({
      ...input,
      publicationState: 'draft',
    });
  };

  const runAction = async (
    action: NonNullable<AuthoringAction>,
    callback: () => Promise<void>,
    successMessage: string,
  ) => {
    setActionInFlight(action);
    setFeedback(null);

    try {
      await callback();
      setFeedback(successMessage);
    } catch (error) {
      setFeedback(readableError(error));
    } finally {
      setActionInFlight(null);
    }
  };

  const handleSaveDraft = () => {
    const { input, error } = validateForm(false);
    if (!input) {
      setFeedback(error);
      return;
    }

    void runAction(
      'save',
      () => saveDraft(input),
      'Draft saved. You can continue editing or submit it for clinical review.',
    );
  };

  const handleSubmitForReview = () => {
    const { input, error } = validateForm(true);
    if (!input) {
      setFeedback(error);
      return;
    }

    Alert.alert(
      'Submit for clinical review?',
      'Submission checks every attached source again before it enters the review queue.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: () => {
            void runAction(
              'submit',
              async () => {
                await saveDraft(input);
                await submitContentBlockForClinicalReview(
                  input.courseId,
                  input.moduleId,
                  input.lessonId,
                  input.id,
                );
              },
              'Content is submitted and ready for clinician review.',
            );
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Return to clinical content review"
            accessibilityRole="button"
            hitSlop={8}
            onPress={onExit}
            style={styles.backButton}
            testID="button-return-to-clinical-review"
          >
            <Text style={styles.backButtonText}>Back to content review</Text>
          </Pressable>
          <Text style={styles.brand}>BABYREADY / AUTHOR</Text>
        </View>

        <Text style={styles.title}>Author clinical content</Text>
        <Text style={styles.subtitle}>
          Create structured learner content, attach published evidence, and send
          the block to clinical review.
        </Text>

        {access === 'checking' ? (
          <View style={styles.centeredState}>
            <ActivityIndicator color="#01696F" />
            <Text style={styles.stateText}>Checking authoring access…</Text>
          </View>
        ) : null}

        {access === 'denied' ? (
          <View style={styles.accessCard}>
            <Text style={styles.accessTitle}>Clinical author access is required</Text>
            <Text style={styles.accessText}>
              This account does not have the Firebase `admin` custom claim
              required to create clinical content.
            </Text>
          </View>
        ) : null}

        {access === 'error' ? (
          <View style={styles.accessCard}>
            <Text style={styles.accessTitle}>We could not verify your author role</Text>
            <Text style={styles.accessText}>
              Refresh the session after confirming the account has an
              administrator claim.
            </Text>
          </View>
        ) : null}

        {access === 'authorized' ? (
          <>
            <View style={styles.governanceCard}>
              <Text style={styles.governanceLabel}>CLINICAL GOVERNANCE</Text>
              <Text style={styles.governanceTitle}>
                Clinical claims need published evidence
              </Text>
              <Text style={styles.governanceText}>
                Source attachments are checked when you submit and again when a
                reviewer approves the block.
              </Text>
            </View>

            <View style={styles.formPanel}>
              <Text style={styles.sectionLabel}>CONTENT SCOPE</Text>
              <Text style={styles.formTitle}>Placement in the course</Text>
              <Text style={styles.formHint}>
                Use stable IDs so a draft can be revised without breaking its
                review history.
              </Text>

              <Text style={styles.fieldLabel}>Course ID</Text>
              <TextInput
                accessibilityLabel="Course ID"
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={(value) => updateForm('courseId', value)}
                placeholder="virtual-childbirth"
                placeholderTextColor="#8B8881"
                style={styles.input}
                testID="input-course-id"
                value={form.courseId}
              />

              <View style={styles.idRow}>
                <View style={styles.idField}>
                  <Text style={styles.fieldLabel}>Module ID</Text>
                  <TextInput
                    accessibilityLabel="Module ID"
                    autoCapitalize="none"
                    autoCorrect={false}
                    onChangeText={(value) => updateForm('moduleId', value)}
                    placeholder="labor-and-birth"
                    placeholderTextColor="#8B8881"
                    style={styles.input}
                    testID="input-module-id"
                    value={form.moduleId}
                  />
                </View>
                <View style={styles.idField}>
                  <Text style={styles.fieldLabel}>Lesson ID</Text>
                  <TextInput
                    accessibilityLabel="Lesson ID"
                    autoCapitalize="none"
                    autoCorrect={false}
                    onChangeText={(value) => updateForm('lessonId', value)}
                    placeholder="early-labor"
                    placeholderTextColor="#8B8881"
                    style={styles.input}
                    testID="input-lesson-id"
                    value={form.lessonId}
                  />
                </View>
              </View>

              <Text style={styles.fieldLabel}>Content block ID</Text>
              <TextInput
                accessibilityLabel="Content block ID"
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={(value) => updateForm('id', value)}
                placeholder="when-to-call-your-team"
                placeholderTextColor="#8B8881"
                style={styles.input}
                testID="input-content-block-id"
                value={form.id}
              />

              <Text style={[styles.sectionLabel, styles.formatLabel]}>
                LEARNER FORMAT
              </Text>
              <View style={styles.typeOptions}>
                {contentTypes.map((contentType) => {
                  const isSelected = contentType.value === form.type;
                  return (
                    <Pressable
                      key={contentType.value}
                      accessibilityLabel={`Set content format to ${contentType.label}`}
                      accessibilityRole="button"
                      onPress={() => updateForm('type', contentType.value)}
                      style={[
                        styles.typeOption,
                        isSelected && styles.typeOptionSelected,
                      ]}
                      testID={`button-content-type-${contentType.value}`}
                    >
                      <Text
                        style={[
                          styles.typeOptionText,
                          isSelected && styles.typeOptionTextSelected,
                        ]}
                      >
                        {contentType.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>Learner-facing content</Text>
              <TextInput
                accessibilityLabel="Learner-facing clinical content"
                multiline
                onChangeText={(value) => updateForm('body', value)}
                placeholder="Write the learner-facing guidance, explanation, or prompt."
                placeholderTextColor="#8B8881"
                style={styles.bodyInput}
                testID="input-content-body"
                textAlignVertical="top"
                value={form.body}
              />

              <Pressable
                accessibilityLabel="Toggle clinical claim"
                accessibilityRole="switch"
                accessibilityState={{ checked: form.isClinicalClaim }}
                onPress={() =>
                  updateForm('isClinicalClaim', !form.isClinicalClaim)
                }
                style={[
                  styles.claimToggle,
                  form.isClinicalClaim && styles.claimToggleSelected,
                ]}
                testID="switch-clinical-claim"
              >
                <View
                  style={[
                    styles.claimIndicator,
                    form.isClinicalClaim && styles.claimIndicatorSelected,
                  ]}
                >
                  <Text style={styles.claimIndicatorText}>
                    {form.isClinicalClaim ? '✓' : ''}
                  </Text>
                </View>
                <View style={styles.claimCopy}>
                  <Text style={styles.claimTitle}>This is a clinical claim</Text>
                  <Text style={styles.claimText}>
                    {form.isClinicalClaim
                      ? 'Published sources are required before review submission.'
                      : 'Sources are optional for non-clinical learning content.'}
                  </Text>
                </View>
              </Pressable>

              <View style={styles.sourceHeader}>
                <View>
                  <Text style={styles.sectionLabel}>SOURCE ATTACHMENTS</Text>
                  <Text style={styles.formTitle}>Published source records</Text>
                </View>
                <View style={styles.sourceCount}>
                  <Text style={styles.sourceCountText}>
                    {form.sourceIds.length} selected
                  </Text>
                </View>
              </View>

              {sourceLibrary.status === 'loading' ? (
                <View style={styles.centeredState}>
                  <ActivityIndicator color="#01696F" />
                  <Text style={styles.stateText}>Loading published sources…</Text>
                </View>
              ) : null}

              {sourceLibrary.status === 'error' ? (
                <View style={styles.sourceEmptyState}>
                  <Text style={styles.sourceEmptyTitle}>
                    Published sources could not load
                  </Text>
                  <Text style={styles.sourceEmptyText}>
                    {sourceLibrary.error}
                  </Text>
                </View>
              ) : null}

              {sourceLibrary.status === 'ready' &&
              publishedSources.length === 0 ? (
                <View style={styles.sourceEmptyState}>
                  <Text style={styles.sourceEmptyTitle}>
                    No published sources are available
                  </Text>
                  <Text style={styles.sourceEmptyText}>
                    Create and publish a source record from the source library
                    before submitting a clinical claim.
                  </Text>
                </View>
              ) : null}

              {publishedSources.length > 0 ? (
                <View style={styles.sourceList}>
                  {publishedSources.map((source) => {
                    const isAttached = form.sourceIds.includes(source.id);
                    return (
                      <Pressable
                        key={source.id}
                        accessibilityLabel={`${isAttached ? 'Remove' : 'Attach'} ${source.title} source`}
                        accessibilityRole="button"
                        onPress={() => toggleSource(source)}
                        style={[
                          styles.sourceRow,
                          isAttached && styles.sourceRowSelected,
                        ]}
                        testID={`button-source-attachment-${source.id}`}
                      >
                        <View style={styles.sourceCheckbox}>
                          <Text style={styles.sourceCheckboxText}>
                            {isAttached ? '✓' : ''}
                          </Text>
                        </View>
                        <View style={styles.sourceCopy}>
                          <Text numberOfLines={2} style={styles.sourceTitle}>
                            {source.title}
                          </Text>
                          <Text numberOfLines={1} style={styles.sourceOrganization}>
                            {source.organization} · {source.id}
                          </Text>
                        </View>
                        <Text style={styles.sourceAction}>
                          {isAttached ? 'Attached' : 'Attach'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}

              {feedback ? (
                <View style={styles.feedback}>
                  <Text style={styles.feedbackText} testID="text-authoring-feedback">
                    {feedback}
                  </Text>
                </View>
              ) : null}

              <View style={styles.actionStack}>
                <Pressable
                  accessibilityLabel="Save clinical content draft"
                  accessibilityRole="button"
                  disabled={actionInFlight !== null}
                  onPress={handleSaveDraft}
                  style={[
                    styles.primaryAction,
                    actionInFlight !== null && styles.disabledAction,
                  ]}
                  testID="button-save-content-draft"
                >
                  <Text style={styles.primaryActionText}>
                    {actionInFlight === 'save' ? 'Saving…' : 'Save draft'}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityLabel="Submit clinical content for review"
                  accessibilityRole="button"
                  disabled={actionInFlight !== null}
                  onPress={handleSubmitForReview}
                  style={[
                    styles.secondaryAction,
                    actionInFlight !== null && styles.disabledAction,
                  ]}
                  testID="button-submit-content-review"
                >
                  <Text style={styles.secondaryActionText}>
                    {actionInFlight === 'submit'
                      ? 'Submitting…'
                      : 'Submit for clinical review'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </>
        ) : null}
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
    paddingBottom: 40,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    justifyContent: 'center',
    minHeight: 44,
  },
  backButtonText: {
    color: '#0C4E54',
    fontSize: 14,
    fontWeight: '800',
  },
  brand: {
    color: '#01696F',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    color: '#28251D',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  subtitle: {
    color: '#696761',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6,
    maxWidth: 365,
  },
  centeredState: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 32,
  },
  stateText: {
    color: '#696761',
    fontSize: 14,
  },
  accessCard: {
    backgroundColor: '#FBFBF9',
    borderColor: '#D4D1CA',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 28,
    padding: 20,
  },
  accessTitle: {
    color: '#28251D',
    fontSize: 17,
    fontWeight: '800',
  },
  accessText: {
    color: '#696761',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  governanceCard: {
    backgroundColor: '#E3F0ED',
    borderColor: '#92BFB8',
    borderLeftColor: '#01696F',
    borderLeftWidth: 4,
    borderRadius: 15,
    borderWidth: 1,
    marginTop: 24,
    padding: 18,
  },
  governanceLabel: {
    color: '#0C4E54',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  governanceTitle: {
    color: '#28251D',
    fontSize: 17,
    fontWeight: '800',
    marginTop: 5,
  },
  governanceText: {
    color: '#365553',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5,
  },
  formPanel: {
    backgroundColor: '#FBFBF9',
    borderColor: '#D4D1CA',
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 18,
    padding: 18,
  },
  sectionLabel: {
    color: '#0C4E54',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  formTitle: {
    color: '#28251D',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
  },
  formHint: {
    color: '#696761',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
  fieldLabel: {
    color: '#3B3933',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 18,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D4D1CA',
    borderRadius: 10,
    borderWidth: 1,
    color: '#28251D',
    fontSize: 15,
    marginTop: 7,
    minHeight: 46,
    paddingHorizontal: 12,
  },
  idRow: {
    flexDirection: 'row',
    gap: 10,
  },
  idField: {
    flex: 1,
  },
  formatLabel: {
    marginTop: 22,
  },
  typeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  typeOption: {
    backgroundColor: '#F7F6F2',
    borderColor: '#D4D1CA',
    borderRadius: 99,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 11,
  },
  typeOptionSelected: {
    backgroundColor: '#E3F0ED',
    borderColor: '#0C4E54',
  },
  typeOptionText: {
    color: '#5C5A54',
    fontSize: 12,
    fontWeight: '700',
  },
  typeOptionTextSelected: {
    color: '#0C4E54',
  },
  bodyInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D4D1CA',
    borderRadius: 10,
    borderWidth: 1,
    color: '#28251D',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 7,
    minHeight: 148,
    padding: 12,
  },
  claimToggle: {
    alignItems: 'center',
    backgroundColor: '#F7F6F2',
    borderColor: '#D4D1CA',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 18,
    padding: 12,
  },
  claimToggleSelected: {
    backgroundColor: '#E3F0ED',
    borderColor: '#92BFB8',
  },
  claimIndicator: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#7A7974',
    borderRadius: 5,
    borderWidth: 1,
    height: 21,
    justifyContent: 'center',
    width: 21,
  },
  claimIndicatorSelected: {
    backgroundColor: '#01696F',
    borderColor: '#01696F',
  },
  claimIndicatorText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  claimCopy: {
    flex: 1,
    marginLeft: 10,
  },
  claimTitle: {
    color: '#28251D',
    fontSize: 14,
    fontWeight: '800',
  },
  claimText: {
    color: '#696761',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  sourceHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  sourceCount: {
    backgroundColor: '#E3F0ED',
    borderRadius: 99,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  sourceCountText: {
    color: '#0C4E54',
    fontSize: 11,
    fontWeight: '800',
  },
  sourceList: {
    gap: 10,
    marginTop: 12,
  },
  sourceRow: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#D4D1CA',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 68,
    padding: 11,
  },
  sourceRowSelected: {
    backgroundColor: '#EAF4F1',
    borderColor: '#0C4E54',
  },
  sourceCheckbox: {
    alignItems: 'center',
    borderColor: '#0C4E54',
    borderRadius: 5,
    borderWidth: 1,
    height: 21,
    justifyContent: 'center',
    width: 21,
  },
  sourceCheckboxText: {
    color: '#0C4E54',
    fontSize: 13,
    fontWeight: '900',
  },
  sourceCopy: {
    flex: 1,
    marginHorizontal: 10,
  },
  sourceTitle: {
    color: '#28251D',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  sourceOrganization: {
    color: '#696761',
    fontSize: 12,
    marginTop: 2,
  },
  sourceAction: {
    color: '#0C4E54',
    fontSize: 12,
    fontWeight: '800',
  },
  sourceEmptyState: {
    backgroundColor: '#F7F6F2',
    borderColor: '#D4D1CA',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
    padding: 14,
  },
  sourceEmptyTitle: {
    color: '#28251D',
    fontSize: 14,
    fontWeight: '800',
  },
  sourceEmptyText: {
    color: '#696761',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  feedback: {
    backgroundColor: '#FFF4E9',
    borderColor: '#E3B579',
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 18,
    padding: 11,
  },
  feedbackText: {
    color: '#693619',
    fontSize: 13,
    lineHeight: 19,
  },
  actionStack: {
    gap: 10,
    marginTop: 20,
  },
  primaryAction: {
    alignItems: 'center',
    backgroundColor: '#01696F',
    borderRadius: 10,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryAction: {
    alignItems: 'center',
    borderColor: '#0C4E54',
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  secondaryActionText: {
    color: '#0C4E54',
    fontSize: 15,
    fontWeight: '800',
  },
  disabledAction: {
    opacity: 0.55,
  },
});
