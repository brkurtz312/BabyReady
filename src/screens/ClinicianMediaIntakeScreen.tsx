import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { User } from 'firebase/auth';

import { useClinicianWorkspace } from '../lib/clinicianWorkspace';
import {
  createMediaIntakeCandidate,
  recordMediaIntakeDisposition,
  requestMediaIntakeEvaluation,
  subscribeToMediaIntakeAnalyses,
  subscribeToMediaIntakes,
  type MediaIntake,
  type MediaIntakeAnalysis,
  type MediaIntakeAnalysisState,
  type MediaIntakeLibraryState,
} from '../services/mediaIntakeService';

type AccessState = 'checking' | 'authorized' | 'denied' | 'error';
type IntakeType = 'web_url' | 'video_url';
type Disposition = 'held' | 'rejected' | 'archived';
type ActionInFlight = 'evaluate' | Disposition | null;
type DynamicRecord = Record<string, unknown>;

type IntakeForm = {
  inputType: IntakeType;
  originalUrl: string;
  transcriptUrl: string;
  submitterNote: string;
  suggestedTopic: string;
  attestedNoPatientInformation: boolean;
};

type ClinicianMediaIntakeScreenProps = {
  user: User;
  onExit: () => void;
};

function emptyIntakeForm(): IntakeForm {
  return {
    inputType: 'web_url',
    originalUrl: '',
    transcriptUrl: '',
    submitterNote: '',
    suggestedTopic: '',
    attestedNoPatientInformation: false,
  };
}

function asRecord(value: unknown): DynamicRecord {
  return typeof value === 'object' && value !== null
    ? (value as DynamicRecord)
    : {};
}

function readText(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }
  return '';
}

function readField(record: DynamicRecord, ...keys: string[]): string {
  for (const key of keys) {
    const text = readText(record[key]);
    if (text) {
      return text;
    }
  }
  return '';
}

function getStateStatus(state: unknown): string {
  return readField(asRecord(state), 'status') || 'loading';
}

function getStateError(state: unknown): string {
  return readField(asRecord(state), 'error', 'message');
}

function getIntakes(state: MediaIntakeLibraryState | null): MediaIntake[] {
  const record = asRecord(state);
  const candidates = record.intakes ?? record.items ?? record.mediaIntakes;
  return Array.isArray(candidates) ? (candidates as MediaIntake[]) : [];
}

function getAnalyses(state: MediaIntakeAnalysisState | null): MediaIntakeAnalysis[] {
  const record = asRecord(state);
  const candidates = record.analyses ?? record.items ?? record.mediaIntakeAnalyses;
  if (Array.isArray(candidates)) {
    return candidates as MediaIntakeAnalysis[];
  }

  const analysis = record.analysis;
  return analysis ? [analysis as MediaIntakeAnalysis] : [];
}

function intakeRecord(intake: MediaIntake): DynamicRecord {
  return intake as unknown as DynamicRecord;
}

function analysisRecord(analysis: MediaIntakeAnalysis): DynamicRecord {
  return analysis as unknown as DynamicRecord;
}

function getIntakeId(intake: MediaIntake): string {
  return readField(intakeRecord(intake), 'id');
}

function getIntakeStatus(intake: MediaIntake): string {
  return (
    readField(
      intakeRecord(intake),
      'intakeState',
      'evaluationState',
      'analysisState',
      'status',
      'disposition',
    ) || 'Submitted'
  );
}

function getAnalysisStatus(analysis: MediaIntakeAnalysis): string {
  return (
    readField(analysisRecord(analysis), 'analysisState', 'evaluationState', 'status') ||
    'Available'
  );
}

function displayStatus(status: string): string {
  return status
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusStyle(status: string) {
  const normalized = status.toLowerCase();
  if (
    normalized.includes('reject') ||
    normalized.includes('flag') ||
    normalized.includes('error')
  ) {
    return styles.statusAlert;
  }
  if (
    normalized.includes('ready') ||
    normalized.includes('complete') ||
    normalized.includes('evaluat') ||
    normalized.includes('held')
  ) {
    return styles.statusReady;
  }
  if (normalized.includes('archive')) {
    return styles.statusMuted;
  }
  return styles.statusPending;
}

function formatDate(value: unknown): string {
  if (value instanceof Date) {
    return value.toLocaleString();
  }

  const record = asRecord(value);
  const seconds = record.seconds;
  if (typeof seconds === 'number') {
    return new Date(seconds * 1000).toLocaleString();
  }
  if (typeof record.toDate === 'function') {
    const date = record.toDate();
    if (date instanceof Date) {
      return date.toLocaleString();
    }
  }

  const text = readText(value);
  if (!text) {
    return 'Not recorded';
  }
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? text : date.toLocaleString();
}

function valueList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string' || typeof item === 'number') {
          return String(item);
        }
        const record = asRecord(item);
        return readField(record, 'text', 'label', 'title', 'recommendation', 'value', 'url');
      })
      .filter(Boolean);
  }

  const text = readText(value);
  return text ? [text] : [];
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function readableError(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function StatusPill({ status, testID }: { status: string; testID?: string }) {
  return (
    <View style={[styles.statusPill, statusStyle(status)]} testID={testID}>
      <Text style={styles.statusText}>{displayStatus(status)}</Text>
    </View>
  );
}

function DetailRow({ label, value, testID }: { label: string; value: string; testID?: string }) {
  return (
    <View style={styles.detailRow} testID={testID}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text selectable style={styles.detailValue}>
        {value || 'Not provided'}
      </Text>
    </View>
  );
}

function FindingsList({
  label,
  values,
  testID,
}: {
  label: string;
  values: string[];
  testID: string;
}) {
  if (values.length === 0) {
    return null;
  }

  return (
    <View style={styles.findingsBlock} testID={testID}>
      <Text style={styles.findingsLabel}>{label}</Text>
      {values.map((value, index) => (
        <Text key={`${label}-${index}`} style={styles.findingsText}>
          {value}
        </Text>
      ))}
    </View>
  );
}

export function ClinicianMediaIntakeScreen({
  user,
  onExit,
}: ClinicianMediaIntakeScreenProps) {
  const isWorkspace = useClinicianWorkspace();
  const [access, setAccess] = useState<AccessState>('checking');
  const [libraryState, setLibraryState] = useState<MediaIntakeLibraryState | null>(null);
  const [analysisState, setAnalysisState] = useState<MediaIntakeAnalysisState | null>(null);
  const [selectedIntakeId, setSelectedIntakeId] = useState<string | null>(null);
  const [form, setForm] = useState<IntakeForm>(emptyIntakeForm);
  const [disposition, setDisposition] = useState<Disposition | null>(null);
  const [decisionNote, setDecisionNote] = useState('');
  const [actionInFlight, setActionInFlight] = useState<ActionInFlight>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const intakes = useMemo(() => getIntakes(libraryState), [libraryState]);
  const selectedIntake = useMemo(
    () => intakes.find((intake) => getIntakeId(intake) === selectedIntakeId) ?? null,
    [intakes, selectedIntakeId],
  );
  const analyses = useMemo(() => getAnalyses(analysisState), [analysisState]);
  const selectedAnalysis = useMemo(() => {
    if (!selectedIntakeId) {
      return null;
    }
    return (
      analyses.find((analysis) => {
        const record = analysisRecord(analysis);
        return (
          readField(record, 'intakeId', 'mediaIntakeId', 'candidateId') === selectedIntakeId
        );
      }) ??
      (analyses.length === 1 ? analyses[0] : null)
    );
  }, [analyses, selectedIntakeId]);

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

    return subscribeToMediaIntakes(setLibraryState) ?? undefined;
  }, [access]);

  useEffect(() => {
    if (access !== 'authorized' || !selectedIntakeId) {
      setAnalysisState(null);
      return undefined;
    }

    return subscribeToMediaIntakeAnalyses(selectedIntakeId, setAnalysisState) ?? undefined;
  }, [access, selectedIntakeId]);

  useEffect(() => {
    if (
      !selectedIntakeId &&
      intakes.length > 0 &&
      getStateStatus(libraryState) === 'ready'
    ) {
      setSelectedIntakeId(getIntakeId(intakes[0]));
    }
  }, [intakes, libraryState, selectedIntakeId]);

  useEffect(() => {
    if (
      selectedIntakeId &&
      !selectedIntake &&
      getStateStatus(libraryState) === 'ready' &&
      actionInFlight === null
    ) {
      setSelectedIntakeId(intakes[0] ? getIntakeId(intakes[0]) : null);
    }
  }, [actionInFlight, intakes, libraryState, selectedIntake, selectedIntakeId]);

  const selectIntake = (intake: MediaIntake) => {
    setSelectedIntakeId(getIntakeId(intake));
    setDisposition(null);
    setDecisionNote('');
    setFeedback(null);
  };

  const setInputType = (inputType: IntakeType) => {
    setForm((current) => ({
      ...current,
      inputType,
      transcriptUrl: inputType === 'video_url' ? current.transcriptUrl : '',
    }));
  };

  const updateForm = <Key extends keyof IntakeForm>(key: Key, value: IntakeForm[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const evaluateCandidate = async () => {
    const originalUrl = form.originalUrl.trim();
    const transcriptUrl = form.transcriptUrl.trim();

    if (!isHttpsUrl(originalUrl)) {
      setFeedback('Enter a complete HTTPS original URL before requesting an evaluation.');
      return;
    }
    if (form.inputType === 'video_url' && transcriptUrl && !isHttpsUrl(transcriptUrl)) {
      setFeedback('The transcript or captions URL must be a complete HTTPS URL.');
      return;
    }
    if (!form.attestedNoPatientInformation) {
      setFeedback(
        'Confirm that this submission contains no patient information before requesting an evaluation.',
      );
      return;
    }

    setActionInFlight('evaluate');
    setFeedback(null);
    try {
      const intakeId = await createMediaIntakeCandidate({
        inputType: form.inputType,
        originalUrl,
        ...(form.inputType === 'video_url' && transcriptUrl ? { transcriptUrl } : {}),
        ...(form.submitterNote.trim() ? { submitterNote: form.submitterNote.trim() } : {}),
        ...(form.suggestedTopic.trim() ? { suggestedTopic: form.suggestedTopic.trim() } : {}),
        attestedNoPatientInformation: true,
      });
      setSelectedIntakeId(intakeId);
      setForm(emptyIntakeForm());
      await requestMediaIntakeEvaluation(intakeId);
      setFeedback(
        'Candidate added to the intake queue and sent for evaluation. AI output is decision support only and cannot publish content.',
      );
    } catch (error) {
      setFeedback(readableError(error, 'BabyReady could not create and evaluate this candidate.'));
    } finally {
      setActionInFlight(null);
    }
  };

  const startDisposition = (nextDisposition: Disposition) => {
    setDisposition(nextDisposition);
    setDecisionNote('');
    setFeedback(null);
  };

  const saveDisposition = async () => {
    if (!selectedIntake || !disposition) {
      return;
    }
    if (!decisionNote.trim()) {
      setFeedback(
        disposition === 'rejected'
          ? 'A rationale is required before rejecting this candidate.'
          : 'Add a decision note before recording this disposition.',
      );
      return;
    }

    setActionInFlight(disposition);
    setFeedback(null);
    try {
      await recordMediaIntakeDisposition(
        getIntakeId(selectedIntake),
        disposition,
        decisionNote.trim(),
      );
      setFeedback(`Candidate marked ${displayStatus(disposition).toLowerCase()}.`);
      setDisposition(null);
      setDecisionNote('');
    } catch (error) {
      setFeedback(readableError(error, 'BabyReady could not record this intake disposition.'));
    } finally {
      setActionInFlight(null);
    }
  };

  const libraryStatus = getStateStatus(libraryState);
  const analysisStatus = getStateStatus(analysisState);
  const selectedRecord = selectedIntake ? intakeRecord(selectedIntake) : null;
  const selectedAnalysisRecord = selectedAnalysis ? analysisRecord(selectedAnalysis) : null;
  const originalUrl = selectedRecord ? readField(selectedRecord, 'originalUrl', 'url') : '';
  const inputType = selectedRecord ? readField(selectedRecord, 'inputType', 'type') : '';
  const historyEntries = selectedRecord
    ? valueList(selectedRecord.history ?? selectedRecord.dispositionHistory ?? selectedRecord.decisions)
    : [];

  return (
    <SafeAreaView style={styles.safeArea} testID="clinician-media-intake-screen">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={styles.content}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Pressable
              accessibilityLabel="Return to clinical content review"
              accessibilityRole="button"
              hitSlop={8}
              onPress={onExit}
              style={styles.backButton}
              testID="media-intake-exit"
            >
              <Text style={styles.backButtonText}>Back to content review</Text>
            </Pressable>
            <Text style={styles.brand}>BABYREADY / MEDIA INTAKE</Text>
          </View>

          <Text style={styles.title}>Media intake</Text>
          <Text style={styles.subtitle}>
            Submit public web and video candidates for clinical consideration. AI evaluation is
            decision support only: it cannot publish content or replace clinician judgment.
          </Text>

          {access === 'checking' ? (
            <View style={styles.centeredState} testID="media-intake-access-checking">
              <ActivityIndicator color="#01696F" />
              <Text style={styles.stateText}>Checking media-intake access…</Text>
            </View>
          ) : null}

          {access === 'denied' ? (
            <View style={styles.accessCard} testID="media-intake-access-denied">
              <Text style={styles.accessTitle}>Clinical media intake access is required</Text>
              <Text style={styles.accessText}>
                This account does not have the Firebase `admin` custom claim required to submit
                candidates or review the intake queue.
              </Text>
            </View>
          ) : null}

          {access === 'error' ? (
            <View style={styles.accessCard} testID="media-intake-access-error">
              <Text style={styles.accessTitle}>We could not verify your media-intake role</Text>
              <Text style={styles.accessText}>
                Refresh the session after confirming that this account has an administrator claim.
              </Text>
            </View>
          ) : null}

          {access === 'authorized' ? (
            <>
              <View style={styles.safetyNotice} testID="media-intake-decision-support-notice">
                <Text style={styles.safetyNoticeTitle}>Clinician decision support</Text>
                <Text style={styles.safetyNoticeText}>
                  Evaluation may help organize a candidate, surface evidence, and suggest
                  placement. It does not approve, publish, or convert content into a learner
                  draft.
                </Text>
              </View>

              <View style={styles.intakeForm} testID="media-intake-form">
                <Text style={styles.sectionLabel}>NEW CANDIDATE</Text>
                <Text style={styles.formTitle}>Submit public media for evaluation</Text>

                <Text style={styles.fieldLabel}>Candidate type</Text>
                <View style={styles.segmentedControl}>
                  <Pressable
                    accessibilityLabel="Choose web URL candidate"
                    accessibilityRole="button"
                    accessibilityState={{ selected: form.inputType === 'web_url' }}
                    onPress={() => setInputType('web_url')}
                    style={[
                      styles.segmentButton,
                      form.inputType === 'web_url' && styles.segmentButtonSelected,
                    ]}
                    testID="media-intake-input-type-web"
                  >
                    <Text
                      style={[
                        styles.segmentButtonText,
                        form.inputType === 'web_url' && styles.segmentButtonTextSelected,
                      ]}
                    >
                      Web URL
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityLabel="Choose video URL candidate"
                    accessibilityRole="button"
                    accessibilityState={{ selected: form.inputType === 'video_url' }}
                    onPress={() => setInputType('video_url')}
                    style={[
                      styles.segmentButton,
                      form.inputType === 'video_url' && styles.segmentButtonSelected,
                    ]}
                    testID="media-intake-input-type-video"
                  >
                    <Text
                      style={[
                        styles.segmentButtonText,
                        form.inputType === 'video_url' && styles.segmentButtonTextSelected,
                      ]}
                    >
                      Video URL
                    </Text>
                  </Pressable>
                </View>

                <Text style={styles.fieldLabel}>Original public HTTPS URL</Text>
                <TextInput
                  accessibilityLabel="Original public HTTPS URL"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  onChangeText={(value) => updateForm('originalUrl', value)}
                  placeholder="https://"
                  placeholderTextColor="#8B8881"
                  style={styles.input}
                  testID="media-intake-original-url"
                  value={form.originalUrl}
                />

                {form.inputType === 'video_url' ? (
                  <>
                    <Text style={styles.fieldLabel}>Transcript or captions HTTPS URL (optional)</Text>
                    <TextInput
                      accessibilityLabel="Transcript or captions HTTPS URL, optional"
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="url"
                      onChangeText={(value) => updateForm('transcriptUrl', value)}
                      placeholder="https://"
                      placeholderTextColor="#8B8881"
                      style={styles.input}
                      testID="media-intake-transcript-url"
                      value={form.transcriptUrl}
                    />
                  </>
                ) : null}

                <Text style={styles.fieldLabel}>Clinician note (optional)</Text>
                <TextInput
                  accessibilityLabel="Clinician note, optional"
                  multiline
                  onChangeText={(value) => updateForm('submitterNote', value)}
                  placeholder="Why is this candidate worth clinical consideration?"
                  placeholderTextColor="#8B8881"
                  style={styles.multilineInput}
                  testID="media-intake-submitter-note"
                  textAlignVertical="top"
                  value={form.submitterNote}
                />

                <Text style={styles.fieldLabel}>Suggested topic (optional)</Text>
                <TextInput
                  accessibilityLabel="Suggested topic, optional"
                  onChangeText={(value) => updateForm('suggestedTopic', value)}
                  placeholder="For example, early pregnancy nutrition"
                  placeholderTextColor="#8B8881"
                  style={styles.input}
                  testID="media-intake-suggested-topic"
                  value={form.suggestedTopic}
                />

                <Pressable
                  accessibilityLabel="Attest that this candidate contains no patient information"
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: form.attestedNoPatientInformation }}
                  onPress={() =>
                    updateForm(
                      'attestedNoPatientInformation',
                      !form.attestedNoPatientInformation,
                    )
                  }
                  style={styles.attestation}
                  testID="media-intake-no-phi-attestation"
                >
                  <View
                    style={[
                      styles.checkbox,
                      form.attestedNoPatientInformation && styles.checkboxChecked,
                    ]}
                  >
                    {form.attestedNoPatientInformation ? (
                      <Text style={styles.checkboxMark}>✓</Text>
                    ) : null}
                  </View>
                  <Text style={styles.attestationText}>
                    I attest that this submission contains no patient information or patient-linked
                    data.
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityLabel="Evaluate media candidate"
                  accessibilityRole="button"
                  disabled={actionInFlight !== null}
                  onPress={() => void evaluateCandidate()}
                  style={[
                    styles.primaryAction,
                    actionInFlight !== null && styles.disabledAction,
                  ]}
                  testID="media-intake-evaluate"
                >
                  <Text style={styles.primaryActionText}>
                    {actionInFlight === 'evaluate' ? 'Requesting evaluation…' : 'Evaluate candidate'}
                  </Text>
                </Pressable>
              </View>

              {feedback ? (
                <View style={styles.feedback} testID="media-intake-feedback">
                  <Text style={styles.feedbackText}>{feedback}</Text>
                </View>
              ) : null}

              {libraryStatus === 'unconfigured' ? (
                <View style={styles.accessCard} testID="media-intake-unconfigured">
                  <Text style={styles.accessTitle}>Media intake is not configured</Text>
                  <Text style={styles.accessText}>
                    Connect the configured data service before candidates can be stored or
                    evaluated.
                  </Text>
                </View>
              ) : null}

              {libraryStatus === 'loading' ? (
                <View style={styles.centeredState} testID="media-intake-queue-loading">
                  <ActivityIndicator color="#01696F" />
                  <Text style={styles.stateText}>Loading the media intake queue…</Text>
                </View>
              ) : null}

              {libraryStatus === 'error' ? (
                <View style={styles.accessCard} testID="media-intake-queue-error">
                  <Text style={styles.accessTitle}>The media intake queue could not load</Text>
                  <Text style={styles.accessText}>
                    {getStateError(libraryState) || 'Try refreshing after checking your connection.'}
                  </Text>
                </View>
              ) : null}

              {libraryStatus === 'ready' ? (
                <View style={isWorkspace ? styles.workspace : undefined}>
                  <View style={isWorkspace ? styles.queueRail : undefined}>
                    <View style={styles.queueHeader}>
                      <View>
                        <Text style={styles.sectionLabel}>INTAKE QUEUE</Text>
                        <Text style={styles.queueCount} testID="media-intake-queue-count">
                          {intakes.length} {intakes.length === 1 ? 'candidate' : 'candidates'}
                        </Text>
                      </View>
                    </View>

                    {intakes.length === 0 ? (
                      <View style={styles.emptyState} testID="media-intake-queue-empty">
                        <Text style={styles.emptyTitle}>No candidates yet</Text>
                        <Text style={styles.emptyText}>
                          Submit a public web page or video above to create the first intake
                          candidate. Evaluation will not publish it.
                        </Text>
                      </View>
                    ) : (
                      <ScrollView
                        contentContainerStyle={[
                          styles.queueList,
                          isWorkspace && styles.queueListWorkspace,
                        ]}
                        horizontal={!isWorkspace}
                        scrollEnabled={!isWorkspace}
                        showsHorizontalScrollIndicator={false}
                      >
                        {intakes.map((intake) => {
                          const record = intakeRecord(intake);
                          const id = getIntakeId(intake);
                          const isSelected = id === selectedIntakeId;
                          const status = getIntakeStatus(intake);
                          return (
                            <Pressable
                              key={id}
                              accessibilityLabel={`Open media intake candidate ${readField(record, 'suggestedTopic', 'originalUrl') || id}, ${displayStatus(status)}`}
                              accessibilityRole="button"
                              accessibilityState={{ selected: isSelected }}
                              onPress={() => selectIntake(intake)}
                              style={[
                                styles.queueCard,
                                isWorkspace && styles.queueCardWorkspace,
                                isSelected && styles.queueCardSelected,
                              ]}
                              testID={`media-intake-queue-${id}`}
                            >
                              <StatusPill status={status} testID={`media-intake-status-${id}`} />
                              <Text numberOfLines={2} style={styles.queueCardTitle}>
                                {readField(record, 'suggestedTopic') || 'Untitled media candidate'}
                              </Text>
                              <Text numberOfLines={2} style={styles.queueCardUrl}>
                                {readField(record, 'originalUrl', 'url')}
                              </Text>
                              <Text style={styles.queueCardMeta}>
                                {displayStatus(readField(record, 'inputType', 'type') || 'web URL')}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    )}
                  </View>

                  <View style={[styles.detailPanel, isWorkspace && styles.detailPane]}>
                    {selectedIntake && selectedRecord ? (
                      <>
                        <View style={styles.detailHeader}>
                          <View style={styles.detailHeaderText}>
                            <Text style={styles.sectionLabel}>CANDIDATE DETAILS</Text>
                            <Text style={styles.detailTitle} numberOfLines={2}>
                              {readField(selectedRecord, 'suggestedTopic') || 'Media candidate'}
                            </Text>
                          </View>
                          <StatusPill
                            status={getIntakeStatus(selectedIntake)}
                            testID={`media-intake-detail-status-${getIntakeId(selectedIntake)}`}
                          />
                        </View>

                        <View
                          style={styles.detailSection}
                          testID={`media-intake-detail-${getIntakeId(selectedIntake)}`}
                        >
                          <Text style={styles.detailSectionTitle}>Original metadata and input</Text>
                          <DetailRow
                            label="Candidate type"
                            value={displayStatus(inputType || 'Web URL')}
                            testID="media-intake-detail-input-type"
                          />
                          <DetailRow
                            label="Original URL"
                            value={originalUrl}
                            testID="media-intake-detail-original-url"
                          />
                          <DetailRow
                            label="Transcript or captions"
                            value={readField(selectedRecord, 'transcriptUrl', 'captionsUrl')}
                            testID="media-intake-detail-transcript-url"
                          />
                          <DetailRow
                            label="Submitted"
                            value={formatDate(selectedRecord.createdAt ?? selectedRecord.submittedAt)}
                            testID="media-intake-detail-submitted-at"
                          />
                          <DetailRow
                            label="Clinician note"
                            value={readField(selectedRecord, 'submitterNote', 'note')}
                            testID="media-intake-detail-note"
                          />
                        </View>

                        <View style={styles.detailSection} testID="media-intake-assessment">
                          <Text style={styles.detailSectionTitle}>Assessment</Text>
                          {analysisStatus === 'loading' ? (
                            <View style={styles.inlineLoading} testID="media-intake-analysis-loading">
                              <ActivityIndicator color="#01696F" />
                              <Text style={styles.inlineLoadingText}>Loading evaluation…</Text>
                            </View>
                          ) : null}
                          {analysisStatus === 'error' ? (
                            <Text style={styles.guidanceText} testID="media-intake-analysis-error">
                              {getStateError(analysisState) ||
                                'The evaluation could not be loaded. The original candidate remains available for clinician review.'}
                            </Text>
                          ) : null}
                          {analysisStatus === 'unconfigured' ? (
                            <Text style={styles.guidanceText} testID="media-intake-analysis-unconfigured">
                              Evaluation storage is not configured. Review the original source
                              directly and do not treat this candidate as assessed.
                            </Text>
                          ) : null}
                          {analysisStatus === 'ready' && !selectedAnalysis ? (
                            <Text style={styles.guidanceText} testID="media-intake-no-analysis">
                              No evaluation is available yet. This candidate may still be queued,
                              processing, or awaiting a clinical decision. Review the original URL
                              directly; no AI assessment should be inferred.
                            </Text>
                          ) : null}
                          {selectedAnalysis && selectedAnalysisRecord ? (
                            <View testID="media-intake-active-analysis">
                              <View style={styles.analysisStatusRow}>
                                <Text style={styles.analysisStatusLabel}>EVALUATION STATUS</Text>
                                <StatusPill
                                  status={getAnalysisStatus(selectedAnalysis)}
                                  testID="media-intake-analysis-status"
                                />
                              </View>
                              <Text style={styles.analysisSummary}>
                                {readField(
                                  selectedAnalysisRecord,
                                  'summary',
                                  'assessmentSummary',
                                  'overview',
                                ) || 'No summary was provided with this evaluation.'}
                              </Text>
                              <FindingsList
                                label="Recommendations"
                                testID="media-intake-analysis-recommendations"
                                values={valueList(
                                  selectedAnalysisRecord.recommendations ??
                                    selectedAnalysisRecord.recommendation,
                                )}
                              />
                              <FindingsList
                                label="Flags"
                                testID="media-intake-analysis-flags"
                                values={valueList(
                                  selectedAnalysisRecord.flags ?? selectedAnalysisRecord.riskFlags,
                                )}
                              />
                              <FindingsList
                                label="Evidence"
                                testID="media-intake-analysis-evidence"
                                values={valueList(
                                  selectedAnalysisRecord.evidence ??
                                    selectedAnalysisRecord.evidenceReferences,
                                )}
                              />
                            </View>
                          ) : null}
                        </View>

                        <View
                          style={styles.detailSection}
                          testID="media-intake-placement-recommendations"
                        >
                          <Text style={styles.detailSectionTitle}>Placement recommendations</Text>
                          {selectedAnalysisRecord ? (
                            <FindingsList
                              label="Suggested placement"
                              testID="media-intake-placement-list"
                              values={valueList(
                                selectedAnalysisRecord.placementRecommendations ??
                                  selectedAnalysisRecord.suggestedPlacement ??
                                  selectedAnalysisRecord.placements,
                              )}
                            />
                          ) : null}
                          {!selectedAnalysisRecord ||
                          valueList(
                            selectedAnalysisRecord.placementRecommendations ??
                              selectedAnalysisRecord.suggestedPlacement ??
                              selectedAnalysisRecord.placements,
                          ).length === 0 ? (
                            <Text style={styles.guidanceText}>
                              No placement recommendation is available. A clinician must decide
                              whether this candidate is relevant before it can enter any separate
                              editorial workflow.
                            </Text>
                          ) : null}
                        </View>

                        <View style={styles.detailSection} testID="media-intake-history">
                          <Text style={styles.detailSectionTitle}>History and disposition</Text>
                          {historyEntries.length > 0 ? (
                            historyEntries.map((entry, index) => (
                              <Text key={`history-${index}`} style={styles.historyText}>
                                {entry}
                              </Text>
                            ))
                          ) : (
                            <Text style={styles.guidanceText}>
                              No disposition history is recorded. Holding, rejecting, or archiving
                              a candidate records a clinician decision; none of these actions
                              publish content.
                            </Text>
                          )}

                          {disposition ? (
                            <View style={styles.dispositionEditor}>
                              <Text style={styles.dispositionTitle}>
                                {displayStatus(disposition)} this candidate
                              </Text>
                              <TextInput
                                accessibilityLabel={`Decision note for ${disposition} disposition`}
                                multiline
                                onChangeText={setDecisionNote}
                                placeholder={
                                  disposition === 'rejected'
                                    ? 'Required rationale for rejecting this candidate'
                                    : 'Decision note'
                                }
                                placeholderTextColor="#8B8881"
                                style={styles.multilineInput}
                                testID={`media-intake-disposition-note-${disposition}`}
                                textAlignVertical="top"
                                value={decisionNote}
                              />
                              <View style={styles.dispositionActions}>
                                <Pressable
                                  accessibilityLabel={`Cancel ${disposition} disposition`}
                                  accessibilityRole="button"
                                  disabled={actionInFlight !== null}
                                  onPress={() => {
                                    setDisposition(null);
                                    setDecisionNote('');
                                  }}
                                  style={styles.cancelAction}
                                  testID="media-intake-disposition-cancel"
                                >
                                  <Text style={styles.cancelActionText}>Cancel</Text>
                                </Pressable>
                                <Pressable
                                  accessibilityLabel={`Confirm ${disposition} disposition`}
                                  accessibilityRole="button"
                                  disabled={actionInFlight !== null}
                                  onPress={() => void saveDisposition()}
                                  style={[
                                    disposition === 'rejected'
                                      ? styles.destructiveAction
                                      : styles.secondaryAction,
                                    actionInFlight !== null && styles.disabledAction,
                                  ]}
                                  testID={`media-intake-disposition-confirm-${disposition}`}
                                >
                                  <Text
                                    style={
                                      disposition === 'rejected'
                                        ? styles.destructiveActionText
                                        : styles.secondaryActionText
                                    }
                                  >
                                    {actionInFlight === disposition
                                      ? 'Saving…'
                                      : `Confirm ${displayStatus(disposition)}`}
                                  </Text>
                                </Pressable>
                              </View>
                            </View>
                          ) : (
                            <View style={styles.dispositionButtons}>
                              <Pressable
                                accessibilityLabel="Hold this media intake candidate"
                                accessibilityRole="button"
                                disabled={actionInFlight !== null}
                                onPress={() => startDisposition('held')}
                                style={[
                                  styles.secondaryAction,
                                  actionInFlight !== null && styles.disabledAction,
                                ]}
                                testID="media-intake-disposition-hold"
                              >
                                <Text style={styles.secondaryActionText}>Hold</Text>
                              </Pressable>
                              <Pressable
                                accessibilityLabel="Reject this media intake candidate"
                                accessibilityRole="button"
                                disabled={actionInFlight !== null}
                                onPress={() => startDisposition('rejected')}
                                style={[
                                  styles.destructiveAction,
                                  actionInFlight !== null && styles.disabledAction,
                                ]}
                                testID="media-intake-disposition-reject"
                              >
                                <Text style={styles.destructiveActionText}>Reject</Text>
                              </Pressable>
                              <Pressable
                                accessibilityLabel="Archive this media intake candidate"
                                accessibilityRole="button"
                                disabled={actionInFlight !== null}
                                onPress={() => startDisposition('archived')}
                                style={[
                                  styles.secondaryAction,
                                  actionInFlight !== null && styles.disabledAction,
                                ]}
                                testID="media-intake-disposition-archive"
                              >
                                <Text style={styles.secondaryActionText}>Archive</Text>
                              </Pressable>
                            </View>
                          )}
                        </View>
                      </>
                    ) : (
                      <View style={styles.emptyDetail} testID="media-intake-no-selection">
                        <Text style={styles.emptyTitle}>Choose an intake candidate</Text>
                        <Text style={styles.emptyText}>
                          Select a queue card to review its original media, available evaluation,
                          and disposition history.
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ) : null}
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#F7F6F2',
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  content: {
    paddingBottom: 96,
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
    maxWidth: 600,
  },
  centeredState: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 48,
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
    marginTop: 24,
    padding: 20,
  },
  accessTitle: {
    color: '#28251D',
    fontSize: 17,
    fontWeight: '800',
  },
  accessText: {
    color: '#5D5B55',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
  },
  safetyNotice: {
    backgroundColor: '#E3F0ED',
    borderRadius: 16,
    marginTop: 24,
    padding: 18,
  },
  safetyNoticeTitle: {
    color: '#0C4E54',
    fontSize: 14,
    fontWeight: '800',
  },
  safetyNoticeText: {
    color: '#285A57',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  intakeForm: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginTop: 18,
    padding: 18,
  },
  sectionLabel: {
    color: '#6E6B64',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  formTitle: {
    color: '#28251D',
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginTop: 5,
  },
  fieldLabel: {
    color: '#3E3C36',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 17,
  },
  segmentedControl: {
    backgroundColor: '#EFEEE9',
    borderRadius: 11,
    flexDirection: 'row',
    gap: 5,
    marginTop: 7,
    padding: 5,
  },
  segmentButton: {
    alignItems: 'center',
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 8,
  },
  segmentButtonSelected: {
    backgroundColor: '#FFFFFF',
  },
  segmentButtonText: {
    color: '#696761',
    fontSize: 14,
    fontWeight: '800',
  },
  segmentButtonTextSelected: {
    color: '#0C4E54',
  },
  input: {
    backgroundColor: '#FBFBF9',
    borderColor: '#C8C5BD',
    borderRadius: 10,
    borderWidth: 1,
    color: '#28251D',
    fontSize: 15,
    marginTop: 7,
    minHeight: 46,
    paddingHorizontal: 12,
  },
  multilineInput: {
    backgroundColor: '#FBFBF9',
    borderColor: '#C8C5BD',
    borderRadius: 10,
    borderWidth: 1,
    color: '#28251D',
    fontSize: 15,
    lineHeight: 21,
    marginTop: 7,
    minHeight: 92,
    padding: 12,
  },
  attestation: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
    paddingVertical: 4,
  },
  checkbox: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#77746D',
    borderRadius: 4,
    borderWidth: 1.5,
    height: 22,
    justifyContent: 'center',
    marginTop: 1,
    width: 22,
  },
  checkboxChecked: {
    backgroundColor: '#01696F',
    borderColor: '#01696F',
  },
  checkboxMark: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 18,
  },
  attestationText: {
    color: '#3E3C36',
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  primaryAction: {
    alignItems: 'center',
    backgroundColor: '#01696F',
    borderRadius: 10,
    justifyContent: 'center',
    marginTop: 20,
    minHeight: 48,
    paddingHorizontal: 16,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  feedback: {
    backgroundColor: '#E9DFC7',
    borderRadius: 12,
    marginTop: 16,
    padding: 13,
  },
  feedbackText: {
    color: '#684F16',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  workspace: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 16,
    marginTop: 24,
  },
  queueRail: {
    flex: 31,
    flexShrink: 1,
  },
  detailPane: {
    flex: 69,
    marginTop: 0,
  },
  queueHeader: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  queueCount: {
    color: '#28251D',
    fontSize: 17,
    fontWeight: '800',
    marginTop: 4,
  },
  queueList: {
    gap: 10,
    paddingBottom: 8,
    paddingTop: 12,
  },
  queueListWorkspace: {
    paddingBottom: 0,
  },
  queueCard: {
    backgroundColor: '#EFEEE9',
    borderColor: 'transparent',
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 144,
    padding: 13,
    width: 208,
  },
  queueCardWorkspace: {
    minHeight: 116,
    width: '100%',
  },
  queueCardSelected: {
    backgroundColor: '#FFFFFF',
    borderColor: '#01696F',
  },
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    color: '#28251D',
    fontSize: 11,
    fontWeight: '800',
  },
  statusPending: {
    backgroundColor: '#E8E5DD',
  },
  statusReady: {
    backgroundColor: '#CBE6E2',
  },
  statusAlert: {
    backgroundColor: '#E0CED7',
  },
  statusMuted: {
    backgroundColor: '#DCE1E1',
  },
  queueCardTitle: {
    color: '#28251D',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 10,
  },
  queueCardUrl: {
    color: '#696761',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  queueCardMeta: {
    color: '#6E6B64',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 8,
  },
  emptyState: {
    backgroundColor: '#FBFBF9',
    borderRadius: 16,
    marginTop: 16,
    padding: 22,
  },
  emptyDetail: {
    padding: 22,
  },
  emptyTitle: {
    color: '#28251D',
    fontSize: 18,
    fontWeight: '800',
  },
  emptyText: {
    color: '#696761',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
  },
  detailPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginTop: 18,
    padding: 18,
  },
  detailHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  detailHeaderText: {
    flex: 1,
  },
  detailTitle: {
    color: '#28251D',
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginTop: 5,
  },
  detailSection: {
    borderTopColor: '#E2E0DA',
    borderTopWidth: 1,
    marginTop: 20,
    paddingTop: 18,
  },
  detailSectionTitle: {
    color: '#28251D',
    fontSize: 16,
    fontWeight: '800',
  },
  detailRow: {
    marginTop: 13,
  },
  detailLabel: {
    color: '#6E6B64',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  detailValue: {
    color: '#3E3C36',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 3,
  },
  inlineLoading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  inlineLoadingText: {
    color: '#696761',
    fontSize: 14,
  },
  guidanceText: {
    color: '#5D5B55',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
  },
  analysisStatusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 13,
  },
  analysisStatusLabel: {
    color: '#6E6B64',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  analysisSummary: {
    color: '#3E3C36',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 12,
  },
  findingsBlock: {
    marginTop: 15,
  },
  findingsLabel: {
    color: '#6E6B64',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  findingsText: {
    color: '#3E3C36',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 5,
    paddingLeft: 11,
  },
  historyText: {
    color: '#3E3C36',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 9,
  },
  dispositionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    marginTop: 16,
  },
  dispositionEditor: {
    backgroundColor: '#F7F6F2',
    borderRadius: 12,
    marginTop: 16,
    padding: 13,
  },
  dispositionTitle: {
    color: '#28251D',
    fontSize: 15,
    fontWeight: '800',
  },
  dispositionActions: {
    flexDirection: 'row',
    gap: 9,
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  secondaryAction: {
    alignItems: 'center',
    borderColor: '#0C4E54',
    borderRadius: 9,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 13,
  },
  secondaryActionText: {
    color: '#0C4E54',
    fontSize: 13,
    fontWeight: '800',
  },
  destructiveAction: {
    alignItems: 'center',
    backgroundColor: '#A12C7B',
    borderRadius: 9,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 13,
  },
  destructiveActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  cancelAction: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 11,
  },
  cancelActionText: {
    color: '#696761',
    fontSize: 13,
    fontWeight: '800',
  },
  disabledAction: {
    opacity: 0.5,
  },
});
