import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { Timestamp } from 'firebase/firestore';

import {
  clinicalMediaAssetKeys,
  getBundledClinicalMediaAsset,
} from '../lib/clinicalMediaAssets';
import type {
  ClinicalMedia,
  ClinicalMediaType,
  ContentPublicationState,
  ContentSource,
} from '../models/course';
import {
  freezeClinicalMedia,
  saveClinicalMediaDraft,
  submitClinicalMediaForClinicalReview,
  subscribeToClinicalMediaLibrary,
  type ClinicalMediaLibraryState,
} from '../services/clinicalMediaService';
import {
  subscribeToContentSourceLibrary,
  type SourceLibraryState,
} from '../services/sourceService';

type AccessState = 'checking' | 'authorized' | 'denied' | 'error';
type MediaAction = 'save' | 'submit' | 'freeze' | null;

type MediaForm = {
  id: string;
  title: string;
  type: ClinicalMediaType;
  assetKey: string;
  altText: string;
  caption: string;
  sourceIds: string[];
  isClinicalClaim: boolean;
  lastReviewedAt: string;
  nextReviewAt: string;
};

type ClinicianMediaLibraryScreenProps = {
  user: User;
  onExit: () => void;
};

const mediaTypes: Array<{ value: ClinicalMediaType; label: string }> = [
  { value: 'figure', label: 'Static figure' },
];

const assetLabels: Record<string, string> = {
  'early-pregnancy-care-timeline': 'Early Pregnancy Care Timeline',
  'folic-acid-early-pregnancy': 'Folic Acid in Early Pregnancy',
  'nausea-support-ideas': 'Nausea-Support Ideas',
  'bleeding-during-pregnancy-contact-care':
    'Bleeding During Pregnancy: Contact Your Care Team',
  'urgent-maternal-warning-signs-get-help-now':
    'Urgent Warning Signs: Get Help Now',
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function oneYearFromNow(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().slice(0, 10);
}

function emptyMediaForm(): MediaForm {
  return {
    id: '',
    title: '',
    type: 'figure',
    assetKey: clinicalMediaAssetKeys[0] ?? '',
    altText: '',
    caption: '',
    sourceIds: [],
    isClinicalClaim: true,
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

function formFromMedia(media: ClinicalMedia): MediaForm {
  return {
    id: media.id,
    title: media.title,
    type: media.type,
    assetKey: media.assetKey,
    altText: media.altText,
    caption: media.caption ?? '',
    sourceIds: media.sourceIds ?? [],
    isClinicalClaim: media.isClinicalClaim,
    lastReviewedAt: formatStoredDate(media.lastReviewedAt, today()),
    nextReviewAt: formatStoredDate(media.nextReviewAt, oneYearFromNow()),
  };
}

function formatState(state: ContentPublicationState): string {
  return state.charAt(0).toUpperCase() + state.slice(1);
}

function statusStyle(state: ContentPublicationState) {
  switch (state) {
    case 'published':
      return styles.statusPublished;
    case 'approved':
      return styles.statusApproved;
    case 'submitted':
      return styles.statusSubmitted;
    case 'frozen':
      return styles.statusFrozen;
    default:
      return styles.statusDraft;
  }
}

export function ClinicianMediaLibraryScreen({
  user,
  onExit,
}: ClinicianMediaLibraryScreenProps) {
  const [access, setAccess] = useState<AccessState>('checking');
  const [mediaState, setMediaState] = useState<ClinicalMediaLibraryState>({
    status: 'loading',
    media: [],
    error: null,
  });
  const [sourceState, setSourceState] = useState<SourceLibraryState>({
    status: 'loading',
    sources: [],
    error: null,
  });
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [form, setForm] = useState<MediaForm>(emptyMediaForm);
  const [freezeReason, setFreezeReason] = useState('');
  const [showFreezeForm, setShowFreezeForm] = useState(false);
  const [actionInFlight, setActionInFlight] = useState<MediaAction>(null);
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

    const unsubscribeMedia =
      subscribeToClinicalMediaLibrary(setMediaState) ?? undefined;
    const unsubscribeSources =
      subscribeToContentSourceLibrary(setSourceState) ?? undefined;

    return () => {
      unsubscribeMedia?.();
      unsubscribeSources?.();
    };
  }, [access]);

  const selectedMedia = useMemo(
    () => mediaState.media.find((media) => media.id === selectedMediaId) ?? null,
    [mediaState.media, selectedMediaId],
  );
  const publishedMediaCount = mediaState.media.filter(
    (media) => media.publicationState === 'published',
  ).length;
  const mediaAwaitingReviewCount = mediaState.media.filter(
    (media) => media.publicationState === 'submitted',
  ).length;
  const selectedAsset = getBundledClinicalMediaAsset(form.assetKey);

  useEffect(() => {
    if (
      selectedMediaId &&
      !selectedMedia &&
      mediaState.status === 'ready' &&
      actionInFlight === null
    ) {
      setSelectedMediaId(null);
      setForm(emptyMediaForm());
    }
  }, [actionInFlight, mediaState.status, selectedMedia, selectedMediaId]);

  const updateForm = <Key extends keyof MediaForm>(
    key: Key,
    value: MediaForm[Key],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const selectMedia = (media: ClinicalMedia) => {
    setSelectedMediaId(media.id);
    setForm(formFromMedia(media));
    setFreezeReason('');
    setShowFreezeForm(false);
    setFeedback(null);
  };

  const startNewMedia = () => {
    setSelectedMediaId(null);
    setForm(emptyMediaForm());
    setFreezeReason('');
    setShowFreezeForm(false);
    setFeedback(null);
  };

  const toggleSource = (source: ContentSource) => {
    setForm((current) => ({
      ...current,
      sourceIds: current.sourceIds.includes(source.id)
        ? current.sourceIds.filter((sourceId) => sourceId !== source.id)
        : [...current.sourceIds, source.id],
    }));
  };

  const validatedForm = (): {
    input:
      | {
          id: string;
          title: string;
          type: ClinicalMediaType;
          assetKey: string;
          altText: string;
          caption?: string;
          sourceIds: string[];
          isClinicalClaim: boolean;
          lastReviewedAt?: Date;
          nextReviewAt?: Date;
        }
      | null;
    error: string | null;
  } => {
    const lastReviewedAt = parseDate(form.lastReviewedAt);
    const nextReviewAt = parseDate(form.nextReviewAt);
    if (!form.id.trim() || !form.title.trim() || !form.altText.trim()) {
      return {
        input: null,
        error: 'Media ID, title, and accessible alt text are required.',
      };
    }
    if (!clinicalMediaAssetKeys.includes(form.assetKey)) {
      return {
        input: null,
        error: 'Choose one of the bundled BabyReady figure assets.',
      };
    }
    if (form.isClinicalClaim && (!lastReviewedAt || !nextReviewAt)) {
      return {
        input: null,
        error: 'Use YYYY-MM-DD for the clinical review dates.',
      };
    }

    return {
      input: {
        id: form.id.trim(),
        title: form.title.trim(),
        type: form.type,
        assetKey: form.assetKey,
        altText: form.altText.trim(),
        ...(form.caption.trim() ? { caption: form.caption.trim() } : {}),
        sourceIds: form.sourceIds,
        isClinicalClaim: form.isClinicalClaim,
        ...(lastReviewedAt ? { lastReviewedAt } : {}),
        ...(nextReviewAt ? { nextReviewAt } : {}),
      },
      error: null,
    };
  };

  const runAction = async (
    action: NonNullable<MediaAction>,
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
        error instanceof Error
          ? error.message
          : 'BabyReady could not complete that media action.',
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

    setSelectedMediaId(input.id);
    void runAction(
      'save',
      () => saveClinicalMediaDraft(input),
      selectedMedia?.publicationState === 'published'
        ? 'Media changes saved as a draft. Re-publish after final review.'
        : 'Media record saved as a draft.',
    );
  };

  const submitMedia = () => {
    const { input, error } = validatedForm();
    if (!input) {
      setFeedback(error);
      return;
    }

    Alert.alert(
      'Submit this media for clinical review?',
      'Submission locks this draft for clinical review. Approval and publication happen from the Clinical Review queue.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: () => {
            setSelectedMediaId(input.id);
            void runAction(
              'submit',
              async () => {
                await saveClinicalMediaDraft(input);
                await submitClinicalMediaForClinicalReview(input.id);
              },
              'Media was submitted for clinical review.',
            );
          },
        },
      ],
    );
  };

  const freezeMedia = () => {
    if (!selectedMedia) {
      return;
    }
    if (!freezeReason.trim()) {
      setFeedback('Document why this media record is being frozen.');
      return;
    }

    Alert.alert(
      'Freeze this media?',
      'Published content that relies on this figure should be reviewed before its next release.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Freeze',
          style: 'destructive',
          onPress: () => {
            void runAction(
              'freeze',
              () => freezeClinicalMedia(selectedMedia.id, freezeReason.trim()),
              'Media has been frozen for clinical follow-up.',
            );
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
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
              testID="button-back-to-content-review"
            >
              <Text style={styles.backButtonText}>Back to content review</Text>
            </Pressable>
            <Text style={styles.brand}>BABYREADY / MEDIA</Text>
          </View>

          <Text style={styles.title}>Figure and media library</Text>
          <Text style={styles.subtitle}>
            Govern the reusable visuals that support clinical education before
            they can be attached to learner content.
          </Text>

          {access === 'checking' ? (
            <View style={styles.centeredState}>
              <ActivityIndicator color="#01696F" />
              <Text style={styles.stateText}>Checking media-library access…</Text>
            </View>
          ) : null}

          {access === 'denied' ? (
            <View style={styles.accessCard}>
              <Text style={styles.accessTitle}>Clinical media access is required</Text>
              <Text style={styles.accessText}>
                This account does not have the Firebase `admin` custom claim
                required to review or publish BabyReady media.
              </Text>
            </View>
          ) : null}

          {access === 'error' ? (
            <View style={styles.accessCard}>
              <Text style={styles.accessTitle}>
                We could not verify your media-library role
              </Text>
              <Text style={styles.accessText}>
                Refresh the session after confirming the account has an
                administrator claim.
              </Text>
            </View>
          ) : null}

          {access === 'authorized' ? (
            <>
              <View style={styles.governanceCard}>
                <Text style={styles.governanceLabel}>STATIC MEDIA RELEASE</Text>
                <Text style={styles.governanceTitle}>
                  Bundled figures require a documented clinical release review.
                </Text>
                <Text style={styles.governanceText}>
                  Link published sources, save a draft, submit it for clinical
                  review, then publish the approved media from the review queue
                  before attaching it to learner content.
                </Text>
              </View>

              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>MEDIA LIBRARY</Text>
                <Text style={styles.summaryValue}>{mediaState.media.length}</Text>
                <Text style={styles.summaryText}>
                  {publishedMediaCount} published · {mediaAwaitingReviewCount}{' '}
                  awaiting clinical review
                </Text>
              </View>

              <View style={styles.libraryHeader}>
                <Text style={styles.sectionLabel}>SAVED MEDIA</Text>
                <Pressable
                  accessibilityLabel="Create a new clinical media record"
                  accessibilityRole="button"
                  onPress={startNewMedia}
                  style={styles.newMediaButton}
                  testID="button-new-clinical-media"
                >
                  <Text style={styles.newMediaButtonText}>New media</Text>
                </Pressable>
              </View>

              {mediaState.status === 'loading' ? (
                <View style={styles.centeredState}>
                  <ActivityIndicator color="#01696F" />
                  <Text style={styles.stateText}>Loading media records…</Text>
                </View>
              ) : null}

              {mediaState.status === 'error' ? (
                <View style={styles.accessCard}>
                  <Text style={styles.accessTitle}>
                    The media library could not load
                  </Text>
                  <Text style={styles.accessText}>{mediaState.error}</Text>
                </View>
              ) : null}

              {mediaState.status === 'ready' && mediaState.media.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>Import the initial figures</Text>
                  <Text style={styles.emptyText}>
                    Use the provided production import command to create the
                    three early-pregnancy figure records, then return here to
                    review and publish them.
                  </Text>
                </View>
              ) : null}

              {mediaState.media.length > 0 ? (
                <ScrollView
                  contentContainerStyle={styles.mediaList}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                >
                  {mediaState.media.map((media) => {
                    const isSelected = media.id === selectedMediaId;
                    return (
                      <Pressable
                        key={media.id}
                        accessibilityLabel={`Edit ${media.title}, ${formatState(media.publicationState)}`}
                        accessibilityRole="button"
                        onPress={() => selectMedia(media)}
                        style={[
                          styles.mediaCard,
                          isSelected && styles.mediaCardSelected,
                        ]}
                        testID={`button-edit-media-${media.id}`}
                      >
                        <View
                          style={[
                            styles.statusPill,
                            statusStyle(media.publicationState),
                          ]}
                        >
                          <Text style={styles.statusText}>
                            {formatState(media.publicationState)}
                          </Text>
                        </View>
                        <Text numberOfLines={2} style={styles.mediaCardTitle}>
                          {media.title}
                        </Text>
                        <Text numberOfLines={1} style={styles.mediaCardMeta}>
                          {media.type} · {media.id}
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
                      {selectedMedia ? 'EDIT MEDIA RECORD' : 'NEW MEDIA RECORD'}
                    </Text>
                    <Text style={styles.formTitle}>
                      {selectedMedia ? selectedMedia.title : 'Media details'}
                    </Text>
                  </View>
                  {selectedMedia ? (
                    <View
                      style={[
                        styles.statusPill,
                        statusStyle(selectedMedia.publicationState),
                      ]}
                    >
                      <Text style={styles.statusText}>
                        {formatState(selectedMedia.publicationState)}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {selectedMedia &&
                selectedMedia.publicationState !== 'draft' ? (
                  <View style={styles.draftNotice}>
                    <Text style={styles.draftNoticeText}>
                      Saving changes creates a new draft revision. Submit it
                      again for clinical review before it can be published.
                    </Text>
                  </View>
                ) : null}

                <Text style={styles.fieldLabel}>Stable media ID</Text>
                <TextInput
                  accessibilityLabel="Stable media ID"
                  autoCapitalize="none"
                  editable={!selectedMedia}
                  onChangeText={(value) => updateForm('id', value)}
                  placeholder="early-pregnancy-care-timeline"
                  placeholderTextColor="#8B8881"
                  style={[styles.input, selectedMedia && styles.disabledInput]}
                  value={form.id}
                />
                <Text style={styles.fieldHint}>
                  Lowercase letters, numbers, and hyphens only. IDs stay fixed
                  after the first save.
                </Text>

                <Text style={styles.fieldLabel}>Media title</Text>
                <TextInput
                  accessibilityLabel="Media title"
                  onChangeText={(value) => updateForm('title', value)}
                  placeholder="Family-facing figure title"
                  placeholderTextColor="#8B8881"
                  style={styles.input}
                  value={form.title}
                />

                <Text style={styles.fieldLabel}>Media type in this release</Text>
                <View style={styles.typeOptions}>
                  {mediaTypes.map((type) => {
                    const selected = type.value === form.type;
                    return (
                      <Pressable
                        key={type.value}
                        accessibilityLabel={`Set media type to ${type.label}`}
                        accessibilityRole="button"
                        onPress={() => updateForm('type', type.value)}
                        style={[
                          styles.typeOption,
                          selected && styles.typeOptionSelected,
                        ]}
                        testID={`button-media-type-${type.value}`}
                      >
                        <Text
                          style={[
                            styles.typeOptionText,
                            selected && styles.typeOptionTextSelected,
                          ]}
                        >
                          {type.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.fieldLabel}>Bundled figure asset</Text>
                <Text style={styles.fieldHint}>
                  This release uses reviewable static figures bundled in the
                  iOS app. Audio and video are not yet uploadable. Do not use
                  a figure record to make a clinical claim without the linked
                  sources below.
                </Text>
                <View style={styles.assetOptions}>
                  {clinicalMediaAssetKeys.map((assetKey) => {
                    const selected = assetKey === form.assetKey;
                    const asset = getBundledClinicalMediaAsset(assetKey);
                    return (
                      <Pressable
                        key={assetKey}
                        accessibilityLabel={`Use ${assetLabels[assetKey] ?? assetKey} asset`}
                        accessibilityRole="button"
                        onPress={() => updateForm('assetKey', assetKey)}
                        style={[
                          styles.assetOption,
                          selected && styles.assetOptionSelected,
                        ]}
                        testID={`button-media-asset-${assetKey}`}
                      >
                        {asset ? (
                          <Image
                            accessibilityLabel={`${assetLabels[assetKey] ?? assetKey} thumbnail`}
                            resizeMode="cover"
                            source={asset}
                            style={styles.assetThumbnail}
                          />
                        ) : null}
                        <Text
                          numberOfLines={2}
                          style={[
                            styles.assetOptionText,
                            selected && styles.assetOptionTextSelected,
                          ]}
                        >
                          {assetLabels[assetKey] ?? assetKey}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {selectedAsset ? (
                  <View style={styles.previewCard}>
                    <Text style={styles.previewLabel}>CLINICIAN PREVIEW</Text>
                    <Image
                      accessibilityLabel={`Preview of ${form.title || assetLabels[form.assetKey] || 'selected clinical media'}`}
                      resizeMode="contain"
                      source={selectedAsset}
                      style={styles.previewImage}
                    />
                  </View>
                ) : null}

                <Text style={styles.fieldLabel}>Accessible alt text</Text>
                <TextInput
                  accessibilityLabel="Accessible alt text"
                  multiline
                  onChangeText={(value) => updateForm('altText', value)}
                  placeholder="Describe the learning-relevant information in this figure."
                  placeholderTextColor="#8B8881"
                  style={styles.multilineInput}
                  textAlignVertical="top"
                  value={form.altText}
                />

                <Text style={styles.fieldLabel}>Optional caption</Text>
                <TextInput
                  accessibilityLabel="Optional figure caption"
                  multiline
                  onChangeText={(value) => updateForm('caption', value)}
                  placeholder="Short learner-facing caption"
                  placeholderTextColor="#8B8881"
                  style={styles.multilineInput}
                  textAlignVertical="top"
                  value={form.caption}
                />

                <Pressable
                  accessibilityLabel="Toggle clinical claim"
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: form.isClinicalClaim }}
                  onPress={() =>
                    updateForm('isClinicalClaim', !form.isClinicalClaim)
                  }
                  style={[
                    styles.claimToggle,
                    form.isClinicalClaim && styles.claimToggleSelected,
                  ]}
                  testID="button-toggle-media-clinical-claim"
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
                    <Text style={styles.claimTitle}>This media makes a clinical claim</Text>
                    <Text style={styles.claimText}>
                      Published clinical media requires linked, published
                      sources and current review dates.
                    </Text>
                  </View>
                </Pressable>

                <View style={styles.sourceHeader}>
                  <View>
                    <Text style={styles.sectionLabel}>SOURCE ATTACHMENTS</Text>
                    <Text style={styles.formTitle}>
                      {form.sourceIds.length} linked source
                      {form.sourceIds.length === 1 ? '' : 's'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.sourceHint}>
                  Link the source records that support the figure. Draft sources
                  can be attached while authoring, but every source must be
                  published before this media can be published.
                </Text>

                {sourceState.status === 'loading' ? (
                  <View style={styles.centeredInlineState}>
                    <ActivityIndicator color="#01696F" />
                    <Text style={styles.stateText}>Loading source records…</Text>
                  </View>
                ) : null}

                {sourceState.status === 'error' ? (
                  <View style={styles.sourceEmptyState}>
                    <Text style={styles.sourceEmptyTitle}>
                      Source records could not load
                    </Text>
                    <Text style={styles.sourceEmptyText}>{sourceState.error}</Text>
                  </View>
                ) : null}

                {sourceState.status === 'ready' && sourceState.sources.length === 0 ? (
                  <View style={styles.sourceEmptyState}>
                    <Text style={styles.sourceEmptyTitle}>
                      No source records are available
                    </Text>
                    <Text style={styles.sourceEmptyText}>
                      Create source records before publishing clinical media.
                    </Text>
                  </View>
                ) : null}

                {sourceState.sources.length > 0 ? (
                  <View style={styles.sourceList}>
                    {sourceState.sources.map((source) => {
                      const attached = form.sourceIds.includes(source.id);
                      return (
                        <Pressable
                          key={source.id}
                          accessibilityLabel={`${attached ? 'Remove' : 'Attach'} ${source.title} source`}
                          accessibilityRole="button"
                          onPress={() => toggleSource(source)}
                          style={[
                            styles.sourceRow,
                            attached && styles.sourceRowSelected,
                          ]}
                          testID={`button-media-source-${source.id}`}
                        >
                          <View style={styles.sourceCheckbox}>
                            <Text style={styles.sourceCheckboxText}>
                              {attached ? '✓' : ''}
                            </Text>
                          </View>
                          <View style={styles.sourceCopy}>
                            <Text numberOfLines={2} style={styles.sourceTitle}>
                              {source.title}
                            </Text>
                            <Text
                              numberOfLines={1}
                              style={styles.sourceOrganization}
                            >
                              {source.organization} ·{' '}
                              {formatState(source.publicationState)}
                            </Text>
                          </View>
                          <Text style={styles.sourceAction}>
                            {attached ? 'Linked' : 'Link'}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}

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
                    <Text style={styles.feedbackText} testID="text-media-feedback">
                      {feedback}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.actionStack}>
                  <Pressable
                    accessibilityLabel="Save clinical media record as a draft"
                    accessibilityRole="button"
                    disabled={actionInFlight !== null}
                    onPress={saveDraft}
                    style={[
                      styles.primaryAction,
                      actionInFlight !== null && styles.disabledAction,
                    ]}
                    testID="button-save-media-draft"
                  >
                    <Text style={styles.primaryActionText}>
                      {actionInFlight === 'save' ? 'Saving…' : 'Save draft'}
                    </Text>
                  </Pressable>

                  {!selectedMedia ||
                  selectedMedia.publicationState === 'draft' ? (
                    <Pressable
                      accessibilityLabel="Submit clinical media record for review"
                      accessibilityRole="button"
                      disabled={actionInFlight !== null}
                      onPress={submitMedia}
                      style={[
                        styles.secondaryAction,
                        actionInFlight !== null && styles.disabledAction,
                      ]}
                      testID="button-submit-media"
                    >
                      <Text style={styles.secondaryActionText}>
                        {actionInFlight === 'submit'
                          ? 'Submitting…'
                          : 'Submit for clinical review'}
                      </Text>
                    </Pressable>
                  ) : (
                    <Text style={styles.workflowHint}>
                      {selectedMedia.publicationState === 'submitted'
                        ? 'This figure is in the clinical review queue.'
                        : selectedMedia.publicationState === 'approved'
                          ? 'This figure is approved and ready to publish from the clinical review queue.'
                          : 'Frozen media must be revised as a draft before it can return to review.'}
                    </Text>
                  )}

                  {selectedMedia &&
                  selectedMedia.publicationState !== 'frozen' ? (
                    <>
                      {showFreezeForm ? (
                        <TextInput
                          accessibilityLabel="Reason for freezing media"
                          multiline
                          onChangeText={setFreezeReason}
                          placeholder="Why should this media be paused?"
                          placeholderTextColor="#8B8881"
                          style={styles.freezeInput}
                          textAlignVertical="top"
                          value={freezeReason}
                        />
                      ) : null}
                      <Pressable
                        accessibilityLabel={
                          showFreezeForm
                            ? 'Confirm freeze clinical media'
                            : 'Start freeze clinical media'
                        }
                        accessibilityRole="button"
                        disabled={actionInFlight !== null}
                        onPress={
                          showFreezeForm
                            ? freezeMedia
                            : () => setShowFreezeForm(true)
                        }
                        style={[
                          styles.freezeAction,
                          actionInFlight !== null && styles.disabledAction,
                        ]}
                        testID="button-freeze-media"
                      >
                        <Text style={styles.freezeActionText}>
                          {actionInFlight === 'freeze'
                            ? 'Freezing…'
                            : showFreezeForm
                              ? 'Confirm media freeze'
                              : 'Freeze media'}
                        </Text>
                      </Pressable>
                    </>
                  ) : null}
                </View>
              </View>
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
    fontSize: 29,
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
    paddingVertical: 36,
  },
  centeredInlineState: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 20,
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
  summaryCard: {
    alignItems: 'baseline',
    backgroundColor: '#EAF4F1',
    borderRadius: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    marginTop: 18,
    padding: 18,
  },
  summaryLabel: {
    color: '#0C4E54',
    fontSize: 10,
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
    color: '#0C4E54',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  newMediaButton: {
    alignItems: 'center',
    backgroundColor: '#01696F',
    borderRadius: 9,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 12,
  },
  newMediaButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  emptyState: {
    backgroundColor: '#FBFBF9',
    borderColor: '#D4D1CA',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 16,
    padding: 18,
  },
  emptyTitle: {
    color: '#28251D',
    fontSize: 17,
    fontWeight: '800',
  },
  emptyText: {
    color: '#696761',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
  },
  mediaList: {
    gap: 10,
    paddingBottom: 8,
    paddingTop: 12,
  },
  mediaCard: {
    backgroundColor: '#EFEEE9',
    borderColor: 'transparent',
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 132,
    padding: 13,
    width: 174,
  },
  mediaCardSelected: {
    backgroundColor: '#FFFFFF',
    borderColor: '#01696F',
  },
  mediaCardTitle: {
    color: '#28251D',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 19,
    marginTop: 11,
  },
  mediaCardMeta: {
    color: '#696761',
    fontSize: 12,
    marginTop: 4,
  },
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: 99,
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
  statusSubmitted: {
    backgroundColor: '#E9DFC7',
  },
  statusApproved: {
    backgroundColor: '#D4DFCC',
  },
  statusFrozen: {
    backgroundColor: '#E0CED7',
  },
  formPanel: {
    backgroundColor: '#FBFBF9',
    borderColor: '#D4D1CA',
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 16,
    padding: 18,
  },
  formHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  formTitle: {
    color: '#28251D',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
  },
  draftNotice: {
    backgroundColor: '#FFF4E9',
    borderColor: '#E3B579',
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 16,
    padding: 11,
  },
  draftNoticeText: {
    color: '#693619',
    fontSize: 13,
    lineHeight: 19,
  },
  fieldLabel: {
    color: '#3B3933',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 18,
  },
  fieldHint: {
    color: '#696761',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
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
  disabledInput: {
    backgroundColor: '#EEECE7',
    color: '#696761',
  },
  multilineInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D4D1CA',
    borderRadius: 10,
    borderWidth: 1,
    color: '#28251D',
    fontSize: 15,
    lineHeight: 21,
    marginTop: 7,
    minHeight: 96,
    padding: 12,
  },
  typeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 9,
  },
  typeOption: {
    backgroundColor: '#F7F6F2',
    borderColor: '#D4D1CA',
    borderRadius: 99,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 36,
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
  assetOptions: {
    gap: 10,
    marginTop: 12,
  },
  assetOption: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#D4D1CA',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 74,
    overflow: 'hidden',
    paddingRight: 10,
  },
  assetOptionSelected: {
    backgroundColor: '#EAF4F1',
    borderColor: '#0C4E54',
  },
  assetThumbnail: {
    height: 72,
    marginRight: 10,
    width: 52,
  },
  assetOptionText: {
    color: '#28251D',
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  assetOptionTextSelected: {
    color: '#0C4E54',
  },
  previewCard: {
    backgroundColor: '#F4F2EE',
    borderRadius: 12,
    marginTop: 14,
    overflow: 'hidden',
    padding: 12,
  },
  previewLabel: {
    color: '#0C4E54',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  previewImage: {
    alignSelf: 'center',
    height: 330,
    marginTop: 9,
    width: '100%',
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
    borderColor: '#0C4E54',
    borderRadius: 5,
    borderWidth: 1,
    height: 21,
    justifyContent: 'center',
    width: 21,
  },
  claimIndicatorSelected: {
    backgroundColor: '#01696F',
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
  sourceHint: {
    color: '#696761',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
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
  dateRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateField: {
    flex: 1,
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
  workflowHint: {
    color: '#696761',
    fontSize: 13,
    lineHeight: 19,
    paddingVertical: 6,
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
  freezeInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#A12C7B',
    borderRadius: 10,
    borderWidth: 1,
    color: '#28251D',
    fontSize: 15,
    lineHeight: 21,
    minHeight: 92,
    padding: 12,
  },
  freezeAction: {
    alignItems: 'center',
    borderColor: '#A12C7B',
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  freezeActionText: {
    color: '#A12C7B',
    fontSize: 15,
    fontWeight: '800',
  },
  disabledAction: {
    opacity: 0.55,
  },
});
