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
import { Timestamp } from 'firebase/firestore';

import type { ContentPublicationState, ContentSource } from '../models/course';
import {
  freezeContentSource,
  publishContentSource,
  saveContentSourceDraft,
  subscribeToContentSourceLibrary,
  type SourceLibraryState,
} from '../services/sourceService';

type AccessState = 'checking' | 'authorized' | 'denied' | 'error';
type SourceAction = 'save' | 'publish' | 'freeze' | null;

type SourceForm = {
  id: string;
  organization: string;
  title: string;
  url: string;
  lastReviewedAt: string;
  nextReviewAt: string;
};

type ClinicianSourceLibraryScreenProps = {
  user: User;
  onExit: () => void;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function oneYearFromNow(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().slice(0, 10);
}

function emptySourceForm(): SourceForm {
  return {
    id: '',
    organization: '',
    title: '',
    url: '',
    lastReviewedAt: today(),
    nextReviewAt: oneYearFromNow(),
  };
}

function parseDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatStoredDate(value: unknown, fallback: string): string {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString().slice(0, 10);
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (
    typeof value === 'object' &&
    value &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  ) {
    const date = value.toDate();
    if (date instanceof Date) {
      return date.toISOString().slice(0, 10);
    }
  }

  return fallback;
}

function formFromSource(source: ContentSource): SourceForm {
  return {
    id: source.id,
    organization: source.organization,
    title: source.title,
    url: source.url,
    lastReviewedAt: formatStoredDate(source.lastReviewedAt, today()),
    nextReviewAt: formatStoredDate(source.nextReviewAt, oneYearFromNow()),
  };
}

function formatState(state: ContentPublicationState): string {
  return state.charAt(0).toUpperCase() + state.slice(1);
}

function statusStyle(state: ContentPublicationState) {
  switch (state) {
    case 'published':
      return styles.statusPublished;
    case 'frozen':
      return styles.statusFrozen;
    default:
      return styles.statusDraft;
  }
}

export function ClinicianSourceLibraryScreen({
  user,
  onExit,
}: ClinicianSourceLibraryScreenProps) {
  const [access, setAccess] = useState<AccessState>('checking');
  const [libraryState, setLibraryState] = useState<SourceLibraryState>({
    status: 'loading',
    sources: [],
    error: null,
  });
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [form, setForm] = useState<SourceForm>(emptySourceForm);
  const [freezeReason, setFreezeReason] = useState('');
  const [showFreezeForm, setShowFreezeForm] = useState(false);
  const [actionInFlight, setActionInFlight] = useState<SourceAction>(null);
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

    return subscribeToContentSourceLibrary(setLibraryState) ?? undefined;
  }, [access]);

  const selectedSource = useMemo(
    () => libraryState.sources.find((source) => source.id === selectedSourceId) ?? null,
    [libraryState.sources, selectedSourceId],
  );
  const publishedSources = libraryState.sources.filter(
    (source) => source.publicationState === 'published',
  );

  useEffect(() => {
    if (
      selectedSourceId &&
      !selectedSource &&
      libraryState.status === 'ready' &&
      actionInFlight === null
    ) {
      setSelectedSourceId(null);
      setForm(emptySourceForm());
    }
  }, [
    actionInFlight,
    libraryState.status,
    selectedSource,
    selectedSourceId,
  ]);

  const updateForm = <Key extends keyof SourceForm>(key: Key, value: SourceForm[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const selectSource = (source: ContentSource) => {
    setSelectedSourceId(source.id);
    setForm(formFromSource(source));
    setFreezeReason('');
    setShowFreezeForm(false);
    setFeedback(null);
  };

  const startNewSource = () => {
    setSelectedSourceId(null);
    setForm(emptySourceForm());
    setFreezeReason('');
    setShowFreezeForm(false);
    setFeedback(null);
  };

  const validatedForm = (): {
    input:
      | {
          id: string;
          organization: string;
          title: string;
          url: string;
          lastReviewedAt: Date;
          nextReviewAt: Date;
        }
      | null;
    error: string | null;
  } => {
    const lastReviewedAt = parseDate(form.lastReviewedAt);
    const nextReviewAt = parseDate(form.nextReviewAt);
    if (!form.id.trim() || !form.organization.trim() || !form.title.trim() || !form.url.trim()) {
      return { input: null, error: 'Source ID, organization, title, and URL are required.' };
    }
    if (!lastReviewedAt || !nextReviewAt) {
      return { input: null, error: 'Use YYYY-MM-DD for both source review dates.' };
    }

    return {
      input: {
        id: form.id.trim(),
        organization: form.organization.trim(),
        title: form.title.trim(),
        url: form.url.trim(),
        lastReviewedAt,
        nextReviewAt,
      },
      error: null,
    };
  };

  const runAction = async (
    action: NonNullable<SourceAction>,
    callback: () => Promise<void>,
    successMessage: string,
  ) => {
    setActionInFlight(action);
    setFeedback(null);

    try {
      await callback();
      setFeedback(successMessage);
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : 'BabyReady could not complete that source action.',
      );
    } finally {
      setActionInFlight(null);
    }
  };

  const saveDraft = () => {
    const { input, error } = validatedForm();
    if (!input) {
      setFeedback(error);
      return;
    }

    void runAction(
      'save',
      () => saveContentSourceDraft(input),
      selectedSource?.publicationState === 'published'
        ? 'Source changes saved as a draft. Re-publish after final review.'
        : 'Source record saved as a draft.',
    );
    setSelectedSourceId(input.id);
  };

  const publishSource = () => {
    const { input, error } = validatedForm();
    if (!input) {
      setFeedback(error);
      return;
    }

    Alert.alert(
      'Publish this source?',
      'Published sources can support clinical content approvals and learner-facing citations.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Publish',
          onPress: () => {
            void runAction(
              'publish',
              async () => {
                await saveContentSourceDraft(input);
                await publishContentSource(input.id);
              },
              'Source is published and available for clinical content approval.',
            );
            setSelectedSourceId(input.id);
          },
        },
      ],
    );
  };

  const freezeSource = () => {
    if (!selectedSource) {
      return;
    }
    if (!freezeReason.trim()) {
      setFeedback('Document why this source is being frozen.');
      return;
    }

    Alert.alert(
      'Freeze this source?',
      'Content that relies on this source should be reviewed before any future publication.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Freeze',
          style: 'destructive',
          onPress: () => {
            void runAction(
              'freeze',
              () => freezeContentSource(selectedSource.id, freezeReason.trim()),
              'Source has been frozen for clinical follow-up.',
            );
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Return to clinical content review"
            hitSlop={8}
            onPress={onExit}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>Back to content review</Text>
          </Pressable>
          <Text style={styles.brand}>BABYREADY / SOURCES</Text>
        </View>

        <Text style={styles.title}>Source library</Text>
        <Text style={styles.subtitle}>
          Author and publish the source records that clinicians use to support learning content.
        </Text>

        {access === 'checking' ? (
          <View style={styles.centeredState}>
            <ActivityIndicator color="#01696F" />
            <Text style={styles.stateText}>Checking source-library access…</Text>
          </View>
        ) : null}

        {access === 'denied' ? (
          <View style={styles.accessCard}>
            <Text style={styles.accessTitle}>Clinical source access is required</Text>
            <Text style={styles.accessText}>
              This account does not have the Firebase `admin` custom claim required to read or
              publish source records.
            </Text>
          </View>
        ) : null}

        {access === 'error' ? (
          <View style={styles.accessCard}>
            <Text style={styles.accessTitle}>We could not verify your source-library role</Text>
            <Text style={styles.accessText}>
              Refresh the session after confirming the account has an administrator claim.
            </Text>
          </View>
        ) : null}

        {access === 'authorized' ? (
          <>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>SOURCE LIBRARY</Text>
              <Text style={styles.summaryValue}>{libraryState.sources.length}</Text>
              <Text style={styles.summaryText}>
                {publishedSources.length} published and ready for clinical review
              </Text>
            </View>

            <View style={styles.libraryHeader}>
              <Text style={styles.sectionLabel}>SAVED SOURCES</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Create a new source record"
                onPress={startNewSource}
                style={styles.newSourceButton}
              >
                <Text style={styles.newSourceButtonText}>New source</Text>
              </Pressable>
            </View>

            {libraryState.status === 'loading' ? (
              <View style={styles.centeredState}>
                <ActivityIndicator color="#01696F" />
                <Text style={styles.stateText}>Loading source records…</Text>
              </View>
            ) : null}

            {libraryState.status === 'error' ? (
              <View style={styles.accessCard}>
                <Text style={styles.accessTitle}>The source library could not load</Text>
                <Text style={styles.accessText}>{libraryState.error}</Text>
              </View>
            ) : null}

            {libraryState.status === 'ready' && libraryState.sources.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Create the first source record</Text>
                <Text style={styles.emptyText}>
                  Published sources are required before a clinical content claim can be approved.
                </Text>
              </View>
            ) : null}

            {libraryState.sources.length > 0 ? (
              <ScrollView
                contentContainerStyle={styles.sourceList}
                horizontal
                showsHorizontalScrollIndicator={false}
              >
                {libraryState.sources.map((source) => {
                  const isSelected = source.id === selectedSourceId;
                  return (
                    <Pressable
                      key={source.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Edit ${source.title}, ${formatState(source.publicationState)}`}
                      onPress={() => selectSource(source)}
                      style={[styles.sourceCard, isSelected && styles.sourceCardSelected]}
                    >
                      <View style={[styles.statusPill, statusStyle(source.publicationState)]}>
                        <Text style={styles.statusText}>{formatState(source.publicationState)}</Text>
                      </View>
                      <Text numberOfLines={2} style={styles.sourceCardTitle}>
                        {source.title}
                      </Text>
                      <Text numberOfLines={1} style={styles.sourceCardOrganization}>
                        {source.organization}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : null}

            <View style={styles.formPanel}>
              <View style={styles.formHeader}>
                <View>
                  <Text style={styles.sectionLabel}>
                    {selectedSource ? 'EDIT SOURCE RECORD' : 'NEW SOURCE RECORD'}
                  </Text>
                  <Text style={styles.formTitle}>
                    {selectedSource ? selectedSource.title : 'Source details'}
                  </Text>
                </View>
                {selectedSource ? (
                  <View style={[styles.statusPill, statusStyle(selectedSource.publicationState)]}>
                    <Text style={styles.statusText}>
                      {formatState(selectedSource.publicationState)}
                    </Text>
                  </View>
                ) : null}
              </View>

              {selectedSource?.publicationState === 'published' ? (
                <View style={styles.draftNotice}>
                  <Text style={styles.draftNoticeText}>
                    Saving changes creates a draft. Re-publish the source once review is complete.
                  </Text>
                </View>
              ) : null}

              <Text style={styles.fieldLabel}>Stable source ID</Text>
              <TextInput
                accessibilityLabel="Stable source ID"
                autoCapitalize="none"
                editable={!selectedSource}
                onChangeText={(value) => updateForm('id', value)}
                placeholder="example-acog-labor-guidance"
                placeholderTextColor="#8B8881"
                style={[styles.input, selectedSource && styles.disabledInput]}
                value={form.id}
              />
              <Text style={styles.fieldHint}>
                Lowercase letters, numbers, and hyphens only. IDs stay fixed after the first save.
              </Text>

              <Text style={styles.fieldLabel}>Organization</Text>
              <TextInput
                accessibilityLabel="Source organization"
                onChangeText={(value) => updateForm('organization', value)}
                placeholder="Organization name"
                placeholderTextColor="#8B8881"
                style={styles.input}
                value={form.organization}
              />

              <Text style={styles.fieldLabel}>Source title</Text>
              <TextInput
                accessibilityLabel="Source title"
                onChangeText={(value) => updateForm('title', value)}
                placeholder="Guideline, recommendation, or resource title"
                placeholderTextColor="#8B8881"
                style={styles.input}
                value={form.title}
              />

              <Text style={styles.fieldLabel}>Canonical public URL</Text>
              <TextInput
                accessibilityLabel="Canonical public source URL"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                onChangeText={(value) => updateForm('url', value)}
                placeholder="https://"
                placeholderTextColor="#8B8881"
                style={styles.input}
                value={form.url}
              />

              <View style={styles.dateRow}>
                <View style={styles.dateField}>
                  <Text style={styles.fieldLabel}>Last reviewed</Text>
                  <TextInput
                    accessibilityLabel="Last reviewed date in YYYY-MM-DD format"
                    keyboardType="numbers-and-punctuation"
                    onChangeText={(value) => updateForm('lastReviewedAt', value)}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#8B8881"
                    style={styles.input}
                    value={form.lastReviewedAt}
                  />
                </View>
                <View style={styles.dateField}>
                  <Text style={styles.fieldLabel}>Next review</Text>
                  <TextInput
                    accessibilityLabel="Next review date in YYYY-MM-DD format"
                    keyboardType="numbers-and-punctuation"
                    onChangeText={(value) => updateForm('nextReviewAt', value)}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#8B8881"
                    style={styles.input}
                    value={form.nextReviewAt}
                  />
                </View>
              </View>

              {feedback ? (
                <View style={styles.feedback}>
                  <Text style={styles.feedbackText}>{feedback}</Text>
                </View>
              ) : null}

              <View style={styles.actionStack}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Save source record as a draft"
                  disabled={actionInFlight !== null}
                  onPress={saveDraft}
                  style={[
                    styles.primaryAction,
                    actionInFlight !== null && styles.disabledAction,
                  ]}
                >
                  <Text style={styles.primaryActionText}>
                    {actionInFlight === 'save' ? 'Saving…' : 'Save draft'}
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Publish source record"
                  disabled={actionInFlight !== null}
                  onPress={publishSource}
                  style={[
                    styles.secondaryAction,
                    actionInFlight !== null && styles.disabledAction,
                  ]}
                >
                  <Text style={styles.secondaryActionText}>
                    {actionInFlight === 'publish' ? 'Publishing…' : 'Publish source'}
                  </Text>
                </Pressable>

                {selectedSource && selectedSource.publicationState !== 'frozen' ? (
                  <>
                    {showFreezeForm ? (
                      <TextInput
                        accessibilityLabel="Reason for freezing source"
                        multiline
                        onChangeText={setFreezeReason}
                        placeholder="Why should this source be paused?"
                        placeholderTextColor="#8B8881"
                        style={styles.freezeInput}
                        textAlignVertical="top"
                        value={freezeReason}
                      />
                    ) : null}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        showFreezeForm ? 'Confirm source freeze' : 'Start source freeze'
                      }
                      disabled={actionInFlight !== null}
                      onPress={showFreezeForm ? freezeSource : () => setShowFreezeForm(true)}
                      style={[
                        styles.freezeAction,
                        actionInFlight !== null && styles.disabledAction,
                      ]}
                    >
                      <Text style={styles.freezeActionText}>
                        {actionInFlight === 'freeze'
                          ? 'Freezing…'
                          : showFreezeForm
                            ? 'Confirm source freeze'
                            : 'Freeze source'}
                      </Text>
                    </Pressable>
                  </>
                ) : null}
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
    maxWidth: 360,
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
    marginTop: 28,
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
  summaryCard: {
    alignItems: 'baseline',
    backgroundColor: '#E3F0ED',
    borderRadius: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    marginTop: 28,
    padding: 18,
  },
  summaryLabel: {
    color: '#0C4E54',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  summaryValue: {
    color: '#0C4E54',
    fontSize: 28,
    fontWeight: '800',
  },
  summaryText: {
    color: '#285A57',
    fontSize: 13,
  },
  libraryHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  sectionLabel: {
    color: '#6E6B64',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  newSourceButton: {
    alignItems: 'center',
    borderColor: '#0C4E54',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 11,
  },
  newSourceButtonText: {
    color: '#0C4E54',
    fontSize: 13,
    fontWeight: '800',
  },
  emptyState: {
    backgroundColor: '#FBFBF9',
    borderRadius: 16,
    marginTop: 16,
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
  sourceList: {
    gap: 10,
    paddingBottom: 8,
    paddingTop: 12,
  },
  sourceCard: {
    backgroundColor: '#EFEEE9',
    borderColor: 'transparent',
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 132,
    padding: 13,
    width: 180,
  },
  sourceCardSelected: {
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
  statusDraft: {
    backgroundColor: '#E8E5DD',
  },
  statusPublished: {
    backgroundColor: '#CBE6E2',
  },
  statusFrozen: {
    backgroundColor: '#E0CED7',
  },
  sourceCardTitle: {
    color: '#28251D',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 11,
  },
  sourceCardOrganization: {
    color: '#696761',
    fontSize: 12,
    marginTop: 4,
  },
  formPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginTop: 18,
    padding: 18,
  },
  formHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  formTitle: {
    color: '#28251D',
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginTop: 5,
    maxWidth: 245,
  },
  draftNotice: {
    backgroundColor: '#E9DFC7',
    borderRadius: 10,
    marginTop: 16,
    padding: 11,
  },
  draftNoticeText: {
    color: '#684F16',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
  },
  fieldLabel: {
    color: '#3E3C36',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 17,
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
  disabledInput: {
    backgroundColor: '#EFEEE9',
    color: '#77746D',
  },
  fieldHint: {
    color: '#77746D',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 5,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateField: {
    flex: 1,
  },
  feedback: {
    backgroundColor: '#E3F0ED',
    borderRadius: 10,
    marginTop: 18,
    padding: 12,
  },
  feedbackText: {
    color: '#0C4E54',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
  },
  actionStack: {
    gap: 10,
    marginTop: 20,
  },
  primaryAction: {
    alignItems: 'center',
    backgroundColor: '#01696F',
    borderRadius: 11,
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
    borderRadius: 11,
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
  freezeInput: {
    backgroundColor: '#FFF8F5',
    borderColor: '#C89D8A',
    borderRadius: 10,
    borderWidth: 1,
    color: '#28251D',
    fontSize: 15,
    lineHeight: 21,
    minHeight: 82,
    padding: 12,
  },
  freezeAction: {
    alignItems: 'center',
    borderColor: '#964219',
    borderRadius: 11,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  freezeActionText: {
    color: '#713417',
    fontSize: 15,
    fontWeight: '800',
  },
  disabledAction: {
    opacity: 0.5,
  },
});
