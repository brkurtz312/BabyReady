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

import type {
  ClinicalContentBlock,
  ClinicalContentVersion,
  ContentPublicationState,
  ContentSource,
} from '../models/course';
import {
  approveContentBlock,
  freezeContentBlock,
  publishContentBlock,
  submitContentBlockForClinicalReview,
} from '../services/contentGovernanceService';
import {
  loadContentSources,
  subscribeToContentVersionHistory,
  subscribeToClinicalReviewQueue,
  type ContentVersionHistoryState,
  type ReviewQueueState,
} from '../services/clinicalReviewQueueService';

type AccessState = 'checking' | 'authorized' | 'denied' | 'error';

type ClinicianReviewScreenProps = {
  user: User;
  onExit: () => void;
  onOpenSourceLibrary: () => void;
  onOpenContentAuthoring: () => void;
  onEditDraft: (block: ClinicalContentBlock) => void;
};

const queueStates: ContentPublicationState[] = [
  'submitted',
  'approved',
  'draft',
  'frozen',
];

function formatState(state: ContentPublicationState): string {
  return state.charAt(0).toUpperCase() + state.slice(1);
}

function displayScope(block: ClinicalContentBlock): string {
  return `${block.courseId} / ${block.moduleId} / ${block.lessonId}`;
}

function queueBlockKey(block: ClinicalContentBlock): string {
  return `${block.courseId}/${block.moduleId}/${block.lessonId}/${block.id}`;
}

function reviewDateOneYearFromNow(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().slice(0, 10);
}

function parseReviewDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function statusStyle(state: ContentPublicationState) {
  switch (state) {
    case 'published':
      return styles.statusPublished;
    case 'approved':
      return styles.statusApproved;
    case 'frozen':
      return styles.statusFrozen;
    case 'submitted':
      return styles.statusSubmitted;
    default:
      return styles.statusDraft;
  }
}

function formatVersionAction(action: ClinicalContentVersion['action']): string {
  switch (action) {
    case 'draft_saved':
      return 'Draft saved';
    case 'submitted':
      return 'Submitted for review';
    case 'approved':
      return 'Approved for release';
    case 'published':
      return 'Published to learners';
    case 'frozen':
      return 'Frozen for follow-up';
    default:
      return action;
  }
}

function formatVersionDate(value: unknown): string {
  if (value instanceof Timestamp) {
    return value.toDate().toLocaleString();
  }
  if (value instanceof Date) {
    return value.toLocaleString();
  }
  if (
    typeof value === 'object' &&
    value &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  ) {
    const date = value.toDate();
    if (date instanceof Date) {
      return date.toLocaleString();
    }
  }

  return 'Timestamp pending';
}

export function ClinicianReviewScreen({
  user,
  onExit,
  onOpenSourceLibrary,
  onOpenContentAuthoring,
  onEditDraft,
}: ClinicianReviewScreenProps) {
  const [access, setAccess] = useState<AccessState>('checking');
  const [queueState, setQueueState] = useState<ReviewQueueState>({
    status: 'loading',
    blocks: [],
    error: null,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sources, setSources] = useState<ContentSource[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [versionHistory, setVersionHistory] = useState<ContentVersionHistoryState>({
    status: 'loading',
    versions: [],
    error: null,
  });
  const [baselineVersionId, setBaselineVersionId] = useState<string | null>(null);
  const [comparisonVersionId, setComparisonVersionId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [nextReviewDate, setNextReviewDate] = useState(reviewDateOneYearFromNow);
  const [freezeReason, setFreezeReason] = useState('');
  const [showFreezeForm, setShowFreezeForm] = useState(false);
  const [actionInFlight, setActionInFlight] = useState<
    'submit' | 'approve' | 'publish' | 'freeze' | null
  >(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

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

    return subscribeToClinicalReviewQueue(setQueueState) ?? undefined;
  }, [access]);

  const orderedBlocks = useMemo(
    () =>
      queueStates.flatMap((state) =>
        queueState.blocks.filter((block) => block.publicationState === state),
      ),
    [queueState.blocks],
  );

  const selectedBlock = useMemo(
    () =>
      orderedBlocks.find((block) => queueBlockKey(block) === selectedId) ??
      orderedBlocks[0] ??
      null,
    [orderedBlocks, selectedId],
  );

  useEffect(() => {
    if (!selectedBlock) {
      setSelectedId(null);
      return;
    }

    if (!orderedBlocks.some((block) => queueBlockKey(block) === selectedId)) {
      setSelectedId(queueBlockKey(selectedBlock));
    }
  }, [orderedBlocks, selectedBlock, selectedId]);

  useEffect(() => {
    let active = true;

    if (!selectedBlock) {
      setSources([]);
      return undefined;
    }

    setSourcesLoading(true);
    loadContentSources(selectedBlock.sourceIds)
      .then((loadedSources) => {
        if (active) {
          setSources(loadedSources);
        }
      })
      .catch(() => {
        if (active) {
          setSources([]);
        }
      })
      .finally(() => {
        if (active) {
          setSourcesLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedBlock]);

  useEffect(() => {
    const versions = versionHistory.versions;
    if (versions.length < 2) {
      setBaselineVersionId(null);
      setComparisonVersionId(null);
      return;
    }

    const versionIds = new Set(versions.map((version) => version.id));
    const nextBaselineVersionId =
      baselineVersionId && versionIds.has(baselineVersionId)
        ? baselineVersionId
        : versions[versions.length - 1].id;
    const nextComparisonVersionId =
      comparisonVersionId &&
      versionIds.has(comparisonVersionId) &&
      comparisonVersionId !== nextBaselineVersionId
        ? comparisonVersionId
        : versions.find((version) => version.id !== nextBaselineVersionId)?.id ?? null;

    if (baselineVersionId !== nextBaselineVersionId) {
      setBaselineVersionId(nextBaselineVersionId);
    }
    if (comparisonVersionId !== nextComparisonVersionId) {
      setComparisonVersionId(nextComparisonVersionId);
    }
  }, [baselineVersionId, comparisonVersionId, versionHistory.versions]);

  useEffect(() => {
    if (!selectedBlock) {
      setVersionHistory({ status: 'ready', versions: [], error: null });
      return undefined;
    }

    return (
      subscribeToContentVersionHistory(selectedBlock, setVersionHistory) ??
      undefined
    );
  }, [selectedBlock]);

  useEffect(() => {
    setReviewNotes('');
    setFreezeReason('');
    setShowFreezeForm(false);
    setActionFeedback(null);
  }, [selectedBlock?.id]);

  const baselineVersion = useMemo(
    () =>
      versionHistory.versions.find(
        (version) => version.id === baselineVersionId,
      ) ?? null,
    [baselineVersionId, versionHistory.versions],
  );
  const comparisonVersion = useMemo(
    () =>
      versionHistory.versions.find(
        (version) => version.id === comparisonVersionId,
      ) ?? null,
    [comparisonVersionId, versionHistory.versions],
  );
  const sourceComparison = useMemo(() => {
    if (!baselineVersion || !comparisonVersion) {
      return null;
    }

    const baselineSources = new Set(baselineVersion.snapshot.sourceIds);
    const comparisonSources = new Set(comparisonVersion.snapshot.sourceIds);

    return {
      added: comparisonVersion.snapshot.sourceIds.filter(
        (sourceId) => !baselineSources.has(sourceId),
      ),
      removed: baselineVersion.snapshot.sourceIds.filter(
        (sourceId) => !comparisonSources.has(sourceId),
      ),
    };
  }, [baselineVersion, comparisonVersion]);

  const selectBaselineVersion = (versionId: string) => {
    setBaselineVersionId(versionId);
    if (comparisonVersionId === versionId) {
      const alternative = versionHistory.versions.find(
        (version) => version.id !== versionId,
      );
      setComparisonVersionId(alternative?.id ?? null);
    }
  };

  const selectComparisonVersion = (versionId: string) => {
    setComparisonVersionId(versionId);
    if (baselineVersionId === versionId) {
      const alternative = versionHistory.versions.find(
        (version) => version.id !== versionId,
      );
      setBaselineVersionId(alternative?.id ?? null);
    }
  };

  const runAction = async (
    action: NonNullable<typeof actionInFlight>,
    callback: () => Promise<void>,
    successMessage: string,
  ) => {
    setActionInFlight(action);
    setActionFeedback(null);

    try {
      await callback();
      setActionFeedback(successMessage);
    } catch (error) {
      setActionFeedback(
        error instanceof Error
          ? error.message
          : 'BabyReady could not complete that content action.',
      );
    } finally {
      setActionInFlight(null);
    }
  };

  const approveSelectedBlock = () => {
    if (!selectedBlock) {
      return;
    }

    const parsedNextReviewDate = parseReviewDate(nextReviewDate);
    if (!reviewNotes.trim()) {
      setActionFeedback('Add clinical review notes before approval.');
      return;
    }
    if (!parsedNextReviewDate) {
      setActionFeedback('Use YYYY-MM-DD for the next clinical review date.');
      return;
    }
    if (!selectedBlock.sourceIds.length) {
      setActionFeedback('Clinical claims need at least one linked source before approval.');
      return;
    }
    if (sources.length !== selectedBlock.sourceIds.length) {
      setActionFeedback('Every linked source record must exist before approval.');
      return;
    }
    if (sources.some((source) => source.publicationState !== 'published')) {
      setActionFeedback('Publish every linked source record before approving this block.');
      return;
    }

    void runAction(
      'approve',
      () =>
        approveContentBlock(
          selectedBlock.courseId,
          selectedBlock.moduleId,
          selectedBlock.lessonId,
          selectedBlock.id,
          reviewNotes.trim(),
          parsedNextReviewDate,
        ),
      'Clinical review recorded. This block is approved and ready to publish.',
    );
  };

  const confirmPublish = () => {
    if (!selectedBlock) {
      return;
    }

    Alert.alert(
      'Publish this content?',
      'Publishing makes this course content available to learners. A later concern should be handled by freezing the block.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Publish',
          onPress: () => {
            void runAction(
              'publish',
              () =>
                publishContentBlock(
                  selectedBlock.courseId,
                  selectedBlock.moduleId,
                  selectedBlock.lessonId,
                  selectedBlock.id,
                ),
              'Content is now published for learners.',
            );
          },
        },
      ],
    );
  };

  const freezeSelectedBlock = () => {
    if (!selectedBlock) {
      return;
    }

    if (!freezeReason.trim()) {
      setActionFeedback('Document why the content is being frozen.');
      return;
    }

    Alert.alert('Freeze this content?', 'The block will no longer be publishable until reviewed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Freeze',
        style: 'destructive',
        onPress: () => {
          void runAction(
            'freeze',
            () =>
              freezeContentBlock(
                selectedBlock.courseId,
                selectedBlock.moduleId,
                selectedBlock.lessonId,
                selectedBlock.id,
                freezeReason.trim(),
              ),
            'Content has been frozen and removed from the release workflow.',
          );
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Return to the learner home screen"
            hitSlop={8}
            onPress={onExit}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>Back to learner view</Text>
          </Pressable>
          <Text style={styles.brand}>BABYREADY / CLINICAL</Text>
        </View>

        <Text style={styles.title}>Clinical review</Text>
        <Text style={styles.subtitle}>
          Review source-grounded learning content before it reaches families.
        </Text>
        <View style={styles.workspaceActions}>
          <Pressable
            accessibilityLabel="Open clinician content authoring"
            accessibilityRole="button"
            onPress={onOpenContentAuthoring}
            style={styles.authorContentButton}
            testID="button-open-content-authoring"
          >
            <Text style={styles.authorContentButtonText}>Author content</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Open clinician source library"
            accessibilityRole="button"
            onPress={onOpenSourceLibrary}
            style={styles.sourceLibraryButton}
            testID="button-open-source-library"
          >
            <Text style={styles.sourceLibraryButtonText}>
              Manage source library
            </Text>
          </Pressable>
        </View>

        {access === 'checking' ? (
          <View style={styles.centeredState}>
            <ActivityIndicator color="#01696F" />
            <Text style={styles.stateText}>Checking clinical review access…</Text>
          </View>
        ) : null}

        {access === 'denied' ? (
          <View style={styles.accessCard}>
            <Text style={styles.accessTitle}>Clinical reviewer access is required</Text>
            <Text style={styles.accessText}>
              This account is signed in but does not have the Firebase `admin` custom claim.
              Ask a trusted server-side Admin SDK workflow to assign the claim, then sign in again.
            </Text>
          </View>
        ) : null}

        {access === 'error' ? (
          <View style={styles.accessCard}>
            <Text style={styles.accessTitle}>We could not verify your review role</Text>
            <Text style={styles.accessText}>
              Refresh the session after confirming the account has an administrator claim.
            </Text>
          </View>
        ) : null}

        {access === 'authorized' ? (
          <>
            <View style={styles.queueSummary}>
              <Text style={styles.queueSummaryLabel}>REVIEW QUEUE</Text>
              <Text style={styles.queueSummaryValue}>{orderedBlocks.length}</Text>
              <Text style={styles.queueSummaryText}>
                submitted, approved, draft, or frozen content blocks
              </Text>
            </View>

            {queueState.status === 'loading' ? (
              <View style={styles.centeredState}>
                <ActivityIndicator color="#01696F" />
                <Text style={styles.stateText}>Loading clinical content…</Text>
              </View>
            ) : null}

            {queueState.status === 'error' ? (
              <View style={styles.accessCard}>
                <Text style={styles.accessTitle}>The review queue could not load</Text>
                <Text style={styles.accessText}>{queueState.error}</Text>
              </View>
            ) : null}

            {queueState.status === 'ready' && orderedBlocks.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No content is awaiting review</Text>
                <Text style={styles.emptyText}>
                  Submitted clinical blocks will appear here with their source records and
                  approval controls.
                </Text>
              </View>
            ) : null}

            {orderedBlocks.length > 0 ? (
              <>
                <Text style={styles.sectionLabel}>CONTENT QUEUE</Text>
                <ScrollView
                  contentContainerStyle={styles.queueList}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                >
                  {orderedBlocks.map((block) => {
                    const isSelected = selectedBlock
                      ? queueBlockKey(block) === queueBlockKey(selectedBlock)
                      : false;
                    return (
                      <Pressable
                        key={queueBlockKey(block)}
                        accessibilityRole="button"
                        accessibilityLabel={`Review ${block.id}, ${formatState(block.publicationState)}`}
                        onPress={() => setSelectedId(queueBlockKey(block))}
                        style={[styles.queueCard, isSelected && styles.queueCardSelected]}
                      >
                        <View style={[styles.statusPill, statusStyle(block.publicationState)]}>
                          <Text style={styles.statusText}>{formatState(block.publicationState)}</Text>
                        </View>
                        <Text numberOfLines={2} style={styles.queueCardTitle}>
                          {block.id}
                        </Text>
                        <Text numberOfLines={1} style={styles.queueCardScope}>
                          {block.moduleId}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {selectedBlock ? (
                  <View style={styles.reviewPanel}>
                    <View style={styles.reviewPanelHeader}>
                      <View style={styles.reviewPanelHeaderCopy}>
                        <Text style={styles.sectionLabel}>SELECTED CONTENT</Text>
                        <Text style={styles.blockTitle}>{selectedBlock.id}</Text>
                        <Text style={styles.blockScope}>{displayScope(selectedBlock)}</Text>
                      </View>
                      <View
                        style={[
                          styles.statusPill,
                          styles.reviewPanelStatus,
                          statusStyle(selectedBlock.publicationState),
                        ]}
                      >
                        <Text style={styles.statusText}>
                          {formatState(selectedBlock.publicationState)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.metadataGrid}>
                      <View style={styles.metadataCell}>
                        <Text style={styles.metadataLabel}>CONTENT TYPE</Text>
                        <Text style={styles.metadataValue}>{selectedBlock.type}</Text>
                      </View>
                      <View style={styles.metadataCell}>
                        <Text style={styles.metadataLabel}>CLINICAL CLAIM</Text>
                        <Text style={styles.metadataValue}>
                          {selectedBlock.isClinicalClaim ? 'Yes' : 'No'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.contentPreview}>
                      <Text style={styles.sectionLabel}>LEARNER-FACING COPY</Text>
                      <Text style={styles.contentPreviewText}>{selectedBlock.body}</Text>
                    </View>

                    <View style={styles.historySection}>
                      <View style={styles.historyHeader}>
                        <View>
                          <Text style={styles.sectionLabel}>VERSION HISTORY</Text>
                          <Text style={styles.historyTitle}>
                            {selectedBlock.versionCount ?? versionHistory.versions.length} recorded versions
                          </Text>
                        </View>
                      </View>

                      {versionHistory.status === 'loading' ? (
                        <View style={styles.historyLoading}>
                          <ActivityIndicator color="#01696F" />
                          <Text style={styles.historyLoadingText}>
                            Loading version history…
                          </Text>
                        </View>
                      ) : null}

                      {versionHistory.status === 'error' ? (
                        <Text style={styles.historyError}>
                          {versionHistory.error}
                        </Text>
                      ) : null}

                      {versionHistory.status === 'ready' &&
                      versionHistory.versions.length === 0 ? (
                        <Text style={styles.historyEmpty}>
                          No saved versions yet. The next draft save or workflow
                          action will create an immutable snapshot.
                        </Text>
                      ) : null}

                      {baselineVersion && comparisonVersion && sourceComparison ? (
                        <View style={styles.comparisonPanel}>
                          <Text style={styles.comparisonEyebrow}>
                            VERSION COMPARISON
                          </Text>
                          <Text style={styles.comparisonTitle}>
                            v{baselineVersion.versionNumber} compared with v
                            {comparisonVersion.versionNumber}
                          </Text>
                          <Text style={styles.comparisonSummary}>
                            Learner copy{' '}
                            {baselineVersion.snapshot.body ===
                            comparisonVersion.snapshot.body
                              ? 'is unchanged'
                              : 'changed'}
                            . {sourceComparison.added.length} source
                            {sourceComparison.added.length === 1 ? '' : 's'} added
                            {' · '}
                            {sourceComparison.removed.length} removed.
                          </Text>

                          <View style={styles.comparisonColumns}>
                            <View style={styles.comparisonColumn}>
                              <Text style={styles.comparisonColumnLabel}>
                                BASELINE · V{baselineVersion.versionNumber}
                              </Text>
                              <Text style={styles.comparisonAction}>
                                {formatVersionAction(baselineVersion.action)}
                              </Text>
                              <Text style={styles.comparisonBody}>
                                {baselineVersion.snapshot.body}
                              </Text>
                              <Text style={styles.comparisonSources}>
                                Sources: {baselineVersion.snapshot.sourceIds.join(', ') || 'None'}
                              </Text>
                            </View>
                            <View style={styles.comparisonColumn}>
                              <Text style={styles.comparisonColumnLabel}>
                                COMPARE · V{comparisonVersion.versionNumber}
                              </Text>
                              <Text style={styles.comparisonAction}>
                                {formatVersionAction(comparisonVersion.action)}
                              </Text>
                              <Text style={styles.comparisonBody}>
                                {comparisonVersion.snapshot.body}
                              </Text>
                              <Text style={styles.comparisonSources}>
                                Sources: {comparisonVersion.snapshot.sourceIds.join(', ') || 'None'}
                              </Text>
                            </View>
                          </View>

                          {sourceComparison.added.length > 0 ||
                          sourceComparison.removed.length > 0 ? (
                            <View style={styles.sourceChanges}>
                              {sourceComparison.added.length > 0 ? (
                                <Text style={styles.sourceAdded}>
                                  Added: {sourceComparison.added.join(', ')}
                                </Text>
                              ) : null}
                              {sourceComparison.removed.length > 0 ? (
                                <Text style={styles.sourceRemoved}>
                                  Removed: {sourceComparison.removed.join(', ')}
                                </Text>
                              ) : null}
                            </View>
                          ) : null}
                        </View>
                      ) : null}

                      {versionHistory.versions.map((version) => (
                        <View key={version.id} style={styles.versionRow}>
                          <View style={styles.versionNumber}>
                            <Text style={styles.versionNumberText}>
                              v{version.versionNumber}
                            </Text>
                          </View>
                          <View style={styles.versionCopy}>
                            <Text style={styles.versionAction}>
                              {formatVersionAction(version.action)}
                            </Text>
                            <Text style={styles.versionMetadata}>
                              {formatVersionDate(version.createdAt)} · {version.actorId}
                            </Text>
                            <Text style={styles.versionSnapshot}>
                              {formatState(version.snapshot.publicationState)} ·{' '}
                              {version.snapshot.sourceIds.length} source
                              {version.snapshot.sourceIds.length === 1 ? '' : 's'}
                            </Text>
                            {version.note ? (
                              <Text style={styles.versionNote}>{version.note}</Text>
                            ) : null}
                            <View style={styles.versionSelectionActions}>
                              <Pressable
                                accessibilityLabel={`Set version ${version.versionNumber} as comparison baseline`}
                                accessibilityRole="button"
                                disabled={version.id === baselineVersionId}
                                onPress={() => selectBaselineVersion(version.id)}
                                style={[
                                  styles.versionSelectionButton,
                                  version.id === baselineVersionId &&
                                    styles.versionSelectionButtonSelected,
                                ]}
                                testID={`button-set-baseline-${version.versionNumber}`}
                              >
                                <Text
                                  style={[
                                    styles.versionSelectionButtonText,
                                    version.id === baselineVersionId &&
                                      styles.versionSelectionButtonTextSelected,
                                  ]}
                                >
                                  {version.id === baselineVersionId
                                    ? 'Baseline'
                                    : 'Set baseline'}
                                </Text>
                              </Pressable>
                              <Pressable
                                accessibilityLabel={`Set version ${version.versionNumber} as comparison revision`}
                                accessibilityRole="button"
                                disabled={version.id === comparisonVersionId}
                                onPress={() => selectComparisonVersion(version.id)}
                                style={[
                                  styles.versionSelectionButton,
                                  version.id === comparisonVersionId &&
                                    styles.versionSelectionButtonSelected,
                                ]}
                                testID={`button-set-comparison-${version.versionNumber}`}
                              >
                                <Text
                                  style={[
                                    styles.versionSelectionButtonText,
                                    version.id === comparisonVersionId &&
                                      styles.versionSelectionButtonTextSelected,
                                  ]}
                                >
                                  {version.id === comparisonVersionId
                                    ? 'Comparing'
                                    : 'Compare'}
                                </Text>
                              </Pressable>
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>

                    <View style={styles.evidenceSection}>
                      <Text style={styles.evidenceTitle}>Evidence and review controls</Text>
                      <Text style={styles.evidenceText}>
                        Published clinical claims require at least one source, a named reviewer,
                        and a future review date.
                      </Text>

                      <View style={styles.sourceList}>
                        {sourcesLoading ? (
                          <ActivityIndicator color="#01696F" />
                        ) : sources.length > 0 ? (
                          sources.map((source) => (
                            <View key={source.id} style={styles.sourceRow}>
                              <Text style={styles.sourceOrganization}>{source.organization}</Text>
                              <Text style={styles.sourceTitle}>{source.title}</Text>
                              <Text style={styles.sourceStatus}>
                                {formatState(source.publicationState)} source
                              </Text>
                              <Text numberOfLines={1} style={styles.sourceUrl}>
                                {source.url}
                              </Text>
                            </View>
                          ))
                        ) : (
                          <Text style={styles.missingSourceText}>
                            {selectedBlock.sourceIds.length
                              ? `Source records not found: ${selectedBlock.sourceIds.join(', ')}`
                              : 'No linked source records. Add sources before approving a clinical claim.'}
                          </Text>
                        )}
                      </View>

                      <Text style={styles.fieldLabel}>Clinical review notes</Text>
                      <TextInput
                        accessibilityLabel="Clinical review notes"
                        multiline
                        onChangeText={setReviewNotes}
                        placeholder="Record scope reviewed, evidence considerations, and edits requested."
                        placeholderTextColor="#8B8881"
                        style={styles.notesInput}
                        textAlignVertical="top"
                        value={reviewNotes}
                      />

                      <Text style={styles.fieldLabel}>Next clinical review date</Text>
                      <TextInput
                        accessibilityLabel="Next clinical review date in YYYY-MM-DD format"
                        autoCapitalize="none"
                        keyboardType="numbers-and-punctuation"
                        onChangeText={setNextReviewDate}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor="#8B8881"
                        style={styles.dateInput}
                        value={nextReviewDate}
                      />
                    </View>

                    {actionFeedback ? (
                      <View style={styles.feedback}>
                        <Text style={styles.feedbackText}>{actionFeedback}</Text>
                      </View>
                    ) : null}

                    <View style={styles.actionStack}>
                      {selectedBlock.publicationState === 'draft' ? (
                        <>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Edit selected draft"
                            disabled={actionInFlight !== null}
                            onPress={() => onEditDraft(selectedBlock)}
                            style={[
                              styles.primaryAction,
                              actionInFlight !== null && styles.disabledAction,
                            ]}
                            testID="button-edit-selected-draft"
                          >
                            <Text style={styles.primaryActionText}>Edit draft</Text>
                          </Pressable>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Submit selected content for clinical review"
                            disabled={actionInFlight !== null}
                            onPress={() =>
                              void runAction(
                                'submit',
                                () =>
                                  submitContentBlockForClinicalReview(
                                    selectedBlock.courseId,
                                    selectedBlock.moduleId,
                                    selectedBlock.lessonId,
                                    selectedBlock.id,
                                  ),
                                'Content was submitted for clinical review.',
                              )
                            }
                            style={[
                              styles.secondaryAction,
                              actionInFlight !== null && styles.disabledAction,
                            ]}
                            testID="button-submit-selected-content"
                          >
                            <Text style={styles.secondaryActionText}>
                              {actionInFlight === 'submit'
                                ? 'Submitting…'
                                : 'Submit for clinical review'}
                            </Text>
                          </Pressable>
                        </>
                      ) : null}

                      {selectedBlock.publicationState === 'submitted' ? (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Approve selected content for release"
                          disabled={actionInFlight !== null}
                          onPress={approveSelectedBlock}
                          style={[
                            styles.primaryAction,
                            actionInFlight !== null && styles.disabledAction,
                          ]}
                        >
                          <Text style={styles.primaryActionText}>
                            {actionInFlight === 'approve'
                              ? 'Recording review…'
                              : 'Approve for release'}
                          </Text>
                        </Pressable>
                      ) : null}

                      {selectedBlock.publicationState === 'approved' ? (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Publish selected content for learners"
                          disabled={actionInFlight !== null}
                          onPress={confirmPublish}
                          style={[
                            styles.primaryAction,
                            actionInFlight !== null && styles.disabledAction,
                          ]}
                        >
                          <Text style={styles.primaryActionText}>
                            {actionInFlight === 'publish' ? 'Publishing…' : 'Publish to learners'}
                          </Text>
                        </Pressable>
                      ) : null}

                      {selectedBlock.publicationState !== 'frozen' ? (
                        <>
                          {showFreezeForm ? (
                            <TextInput
                              accessibilityLabel="Reason for freezing content"
                              multiline
                              onChangeText={setFreezeReason}
                              placeholder="Why should this content be paused?"
                              placeholderTextColor="#8B8881"
                              style={styles.freezeInput}
                              textAlignVertical="top"
                              value={freezeReason}
                            />
                          ) : null}
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={
                              showFreezeForm
                                ? 'Confirm freeze selected content'
                                : 'Start freeze selected content'
                            }
                            disabled={actionInFlight !== null}
                            onPress={
                              showFreezeForm
                                ? freezeSelectedBlock
                                : () => setShowFreezeForm(true)
                            }
                            style={[
                              styles.secondaryAction,
                              actionInFlight !== null && styles.disabledAction,
                            ]}
                          >
                            <Text style={styles.secondaryActionText}>
                              {actionInFlight === 'freeze'
                                ? 'Freezing…'
                                : showFreezeForm
                                  ? 'Confirm content freeze'
                                  : 'Freeze content'}
                            </Text>
                          </Pressable>
                        </>
                      ) : null}
                    </View>
                  </View>
                ) : null}
              </>
            ) : null}
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
    minHeight: 44,
    justifyContent: 'center',
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
  workspaceActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  authorContentButton: {
    backgroundColor: '#01696F',
    borderRadius: 9,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 12,
  },
  authorContentButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  sourceLibraryButton: {
    borderColor: '#0C4E54',
    borderRadius: 9,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 12,
  },
  sourceLibraryButtonText: {
    color: '#0C4E54',
    fontSize: 14,
    fontWeight: '700',
  },
  centeredState: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 56,
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
  queueSummary: {
    alignItems: 'baseline',
    backgroundColor: '#E3F0ED',
    borderRadius: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    marginTop: 28,
    padding: 18,
  },
  queueSummaryLabel: {
    color: '#0C4E54',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  queueSummaryValue: {
    color: '#0C4E54',
    fontSize: 28,
    fontWeight: '800',
  },
  queueSummaryText: {
    color: '#285A57',
    fontSize: 13,
  },
  emptyState: {
    alignItems: 'flex-start',
    backgroundColor: '#FBFBF9',
    borderRadius: 16,
    marginTop: 20,
    padding: 24,
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
  sectionLabel: {
    color: '#6E6B64',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  queueList: {
    gap: 10,
    paddingBottom: 8,
    paddingTop: 10,
  },
  queueCard: {
    backgroundColor: '#EFEEE9',
    borderColor: 'transparent',
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 130,
    padding: 13,
    width: 170,
  },
  queueCardSelected: {
    backgroundColor: '#FFFFFF',
    borderColor: '#01696F',
  },
  queueCardTitle: {
    color: '#28251D',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 11,
  },
  queueCardScope: {
    color: '#696761',
    fontSize: 12,
    marginTop: 4,
  },
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  reviewPanelStatus: {
    marginLeft: 12,
  },
  statusText: {
    color: '#28251D',
    fontSize: 11,
    fontWeight: '800',
  },
  statusDraft: {
    backgroundColor: '#E8E5DD',
  },
  statusSubmitted: {
    backgroundColor: '#E9DFC7',
  },
  statusApproved: {
    backgroundColor: '#D4DFCC',
  },
  statusPublished: {
    backgroundColor: '#CBE6E2',
  },
  statusFrozen: {
    backgroundColor: '#E0CED7',
  },
  reviewPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginTop: 18,
    padding: 18,
  },
  reviewPanelHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reviewPanelHeaderCopy: {
    flex: 1,
  },
  blockTitle: {
    color: '#28251D',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginTop: 6,
  },
  blockScope: {
    color: '#696761',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  metadataGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  metadataCell: {
    backgroundColor: '#F4F2EE',
    borderRadius: 10,
    flex: 1,
    padding: 11,
  },
  metadataLabel: {
    color: '#77746D',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  metadataValue: {
    color: '#28251D',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  contentPreview: {
    borderTopColor: '#E3E0DA',
    borderTopWidth: 1,
    marginTop: 20,
    paddingTop: 18,
  },
  contentPreviewText: {
    color: '#3E3C36',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 8,
  },
  historySection: {
    borderTopColor: '#E3E0DA',
    borderTopWidth: 1,
    marginTop: 20,
    paddingTop: 18,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  historyTitle: {
    color: '#28251D',
    fontSize: 17,
    fontWeight: '800',
    marginTop: 4,
  },
  historyLoading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
    marginTop: 14,
  },
  historyLoadingText: {
    color: '#696761',
    fontSize: 13,
  },
  historyError: {
    color: '#713417',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 12,
  },
  historyEmpty: {
    color: '#696761',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 12,
  },
  comparisonPanel: {
    backgroundColor: '#EAF4F1',
    borderColor: '#92BFB8',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 14,
    padding: 13,
  },
  comparisonEyebrow: {
    color: '#0C4E54',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  comparisonTitle: {
    color: '#28251D',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
  },
  comparisonSummary: {
    color: '#365553',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  comparisonColumns: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  comparisonColumn: {
    backgroundColor: '#FFFFFF',
    borderColor: '#C8DDD7',
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    padding: 10,
  },
  comparisonColumnLabel: {
    color: '#0C4E54',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  comparisonAction: {
    color: '#28251D',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
  },
  comparisonBody: {
    color: '#3E3C36',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 7,
  },
  comparisonSources: {
    color: '#696761',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 8,
  },
  sourceChanges: {
    gap: 3,
    marginTop: 10,
  },
  sourceAdded: {
    color: '#2E6B3B',
    fontSize: 12,
    lineHeight: 17,
  },
  sourceRemoved: {
    color: '#8C3B21',
    fontSize: 12,
    lineHeight: 17,
  },
  versionRow: {
    alignItems: 'flex-start',
    borderTopColor: '#E3E0DA',
    borderTopWidth: 1,
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
  },
  versionNumber: {
    alignItems: 'center',
    backgroundColor: '#E3F0ED',
    borderRadius: 99,
    justifyContent: 'center',
    minHeight: 28,
    minWidth: 38,
  },
  versionNumberText: {
    color: '#0C4E54',
    fontSize: 11,
    fontWeight: '800',
  },
  versionCopy: {
    flex: 1,
    marginLeft: 10,
  },
  versionAction: {
    color: '#28251D',
    fontSize: 14,
    fontWeight: '800',
  },
  versionMetadata: {
    color: '#696761',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  versionSnapshot: {
    color: '#0C4E54',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  versionNote: {
    color: '#3E3C36',
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 18,
    marginTop: 4,
  },
  versionSelectionActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 9,
  },
  versionSelectionButton: {
    borderColor: '#92BFB8',
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: 9,
  },
  versionSelectionButtonSelected: {
    backgroundColor: '#0C4E54',
    borderColor: '#0C4E54',
  },
  versionSelectionButtonText: {
    color: '#0C4E54',
    fontSize: 11,
    fontWeight: '800',
  },
  versionSelectionButtonTextSelected: {
    color: '#FFFFFF',
  },
  evidenceSection: {
    borderTopColor: '#E3E0DA',
    borderTopWidth: 1,
    marginTop: 20,
    paddingTop: 18,
  },
  evidenceTitle: {
    color: '#28251D',
    fontSize: 18,
    fontWeight: '800',
  },
  evidenceText: {
    color: '#696761',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 5,
  },
  sourceList: {
    gap: 8,
    marginTop: 14,
  },
  sourceRow: {
    backgroundColor: '#F4F2EE',
    borderRadius: 10,
    padding: 12,
  },
  sourceOrganization: {
    color: '#0C4E54',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  sourceTitle: {
    color: '#28251D',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 3,
  },
  sourceStatus: {
    color: '#437A22',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
  },
  sourceUrl: {
    color: '#696761',
    fontSize: 12,
    marginTop: 3,
  },
  missingSourceText: {
    color: '#964219',
    fontSize: 13,
    lineHeight: 19,
  },
  fieldLabel: {
    color: '#3E3C36',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 18,
  },
  notesInput: {
    backgroundColor: '#FBFBF9',
    borderColor: '#C8C5BD',
    borderRadius: 10,
    borderWidth: 1,
    color: '#28251D',
    fontSize: 15,
    lineHeight: 21,
    marginTop: 7,
    minHeight: 114,
    padding: 12,
  },
  dateInput: {
    backgroundColor: '#FBFBF9',
    borderColor: '#C8C5BD',
    borderRadius: 10,
    borderWidth: 1,
    color: '#28251D',
    fontSize: 15,
    marginTop: 7,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  feedback: {
    backgroundColor: '#E3F0ED',
    borderRadius: 10,
    marginTop: 16,
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
    borderColor: '#964219',
    borderRadius: 11,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  secondaryActionText: {
    color: '#713417',
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
  disabledAction: {
    opacity: 0.5,
  },
});
