import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { User } from 'firebase/auth';

import {
  PREPARING_FOR_LABOR_MANIFEST,
  type PreparingForLaborManifestBlock,
} from '../content/preparingForLaborManifest';
import type {
  ClinicalContentBlock,
  ClinicalMedia,
  ContentPublicationState,
  ContentSource,
} from '../models/course';
import {
  subscribeToClinicalMediaLibrary,
  type ClinicalMediaLibraryState,
} from '../services/clinicalMediaService';
import {
  subscribeToPreparingForLaborCourseBlocks,
  type PreparingForLaborCourseBlocksState,
} from '../services/preparingForLaborCourseReadinessService';
import {
  subscribeToContentSourceLibrary,
  type SourceLibraryState,
} from '../services/sourceService';

type AccessState = 'checking' | 'authorized' | 'denied' | 'error';

type ClinicianCourseReadinessScreenProps = {
  user: User;
  onExit: () => void;
  onEditDraft: (block: ClinicalContentBlock) => void;
  onOpenReview: (block: ClinicalContentBlock) => void;
  onOpenContentAuthoring: () => void;
  onOpenMediaLibrary: () => void;
  onOpenSourceLibrary: () => void;
};

type CardReadiness = {
  block: ClinicalContentBlock | null;
  expected: PreparingForLaborManifestBlock;
  lessonId: string;
  sourceStatus: 'ready' | 'not-required' | 'needs-attention';
  mediaStatus: 'ready' | 'not-attached' | 'needs-attention';
  placementMatches: boolean;
  actionLabel: string;
  actionHint: string;
  requiresAction: boolean;
};

const lessonTitles: Record<string, string> = {
  'understanding-labor': 'Understanding labor',
  'when-to-contact-your-care-team': 'When to contact your care team',
  'comfort-and-support': 'Comfort and support',
  'arriving-prepared': 'Arriving prepared',
};

function formatState(state: ContentPublicationState): string {
  return state.charAt(0).toUpperCase() + state.slice(1);
}

function statusStyle(state: ContentPublicationState | 'missing') {
  switch (state) {
    case 'published':
      return styles.statusPublished;
    case 'approved':
      return styles.statusApproved;
    case 'submitted':
      return styles.statusSubmitted;
    case 'frozen':
      return styles.statusFrozen;
    case 'missing':
      return styles.statusMissing;
    default:
      return styles.statusDraft;
  }
}

function cardKey(lessonId: string, blockId: string): string {
  return `${lessonId}/${blockId}`;
}

function sourceStatusFor(
  block: ClinicalContentBlock,
  sourcesById: Map<string, ContentSource>,
): CardReadiness['sourceStatus'] {
  if (!block.sourceIds.length) {
    return block.isClinicalClaim ? 'needs-attention' : 'not-required';
  }

  return block.sourceIds.every(
    (sourceId) =>
      sourcesById.get(sourceId)?.publicationState === 'published',
  )
    ? 'ready'
    : 'needs-attention';
}

function mediaStatusFor(
  block: ClinicalContentBlock,
  mediaById: Map<string, ClinicalMedia>,
): CardReadiness['mediaStatus'] {
  if (!block.mediaIds.length) {
    return 'not-attached';
  }

  return block.mediaIds.every(
    (mediaId) => mediaById.get(mediaId)?.publicationState === 'published',
  )
    ? 'ready'
    : 'needs-attention';
}

function placementMatches(
  block: ClinicalContentBlock,
  lessonId: string,
  expected: PreparingForLaborManifestBlock,
): boolean {
  return (
    block.courseId === PREPARING_FOR_LABOR_MANIFEST.course.id &&
    block.moduleId === PREPARING_FOR_LABOR_MANIFEST.course.moduleId &&
    block.lessonId === lessonId &&
    block.id === expected.id &&
    block.displayOrder === expected.displayOrder &&
    block.type === expected.type &&
    block.isClinicalClaim === expected.isClinicalClaim
  );
}

function actionFor(
  block: ClinicalContentBlock | null,
  sources: CardReadiness['sourceStatus'],
  media: CardReadiness['mediaStatus'],
  matchesPlacement: boolean,
): Pick<CardReadiness, 'actionLabel' | 'actionHint' | 'requiresAction'> {
  if (!block) {
    return {
      actionLabel: 'Create missing governed draft',
      actionHint:
        'This manifest card is missing. Use the governed package generator; do not create a replacement with a manually entered ID.',
      requiresAction: true,
    };
  }
  if (!matchesPlacement) {
    return {
      actionLabel: 'Review manifest placement',
      actionHint:
        'This record does not match its immutable manifest placement and cannot move forward until corrected.',
      requiresAction: true,
    };
  }
  if (sources === 'needs-attention') {
    return {
      actionLabel: 'Resolve source release',
      actionHint:
        'Every linked source must be published before this card can be reviewed or released.',
      requiresAction: true,
    };
  }
  if (media === 'needs-attention') {
    return {
      actionLabel: 'Resolve media release',
      actionHint:
        'Every attached figure or video must be published before this card can be reviewed or released.',
      requiresAction: true,
    };
  }

  switch (block.publicationState) {
    case 'draft':
      return {
        actionLabel: 'Edit and submit',
        actionHint: 'Confirm the learner copy, then submit this card for clinical review.',
        requiresAction: true,
      };
    case 'submitted':
      return {
        actionLabel: 'Open clinical review',
        actionHint:
          'Record review notes and the next review date before clinical approval.',
        requiresAction: true,
      };
    case 'approved':
      return {
        actionLabel: 'Open release control',
        actionHint:
          'Clinical approval is recorded. The final learner-publication decision remains separate.',
        requiresAction: true,
      };
    case 'published':
      return {
        actionLabel: 'Published to learners',
        actionHint: 'This card is currently available in learner mode.',
        requiresAction: false,
      };
    case 'frozen':
      return {
        actionLabel: 'Revise frozen draft',
        actionHint:
          'Frozen content must be revised into a new draft before it can return to clinical review.',
        requiresAction: true,
      };
  }
}

function sourceLabel(status: CardReadiness['sourceStatus']): string {
  switch (status) {
    case 'ready':
      return 'Sources published';
    case 'not-required':
      return 'No source required';
    default:
      return 'Source action required';
  }
}

function mediaLabel(status: CardReadiness['mediaStatus']): string {
  switch (status) {
    case 'ready':
      return 'Media published';
    case 'not-attached':
      return 'No media attached';
    default:
      return 'Media action required';
  }
}

export function ClinicianCourseReadinessScreen({
  user,
  onExit,
  onEditDraft,
  onOpenReview,
  onOpenContentAuthoring,
  onOpenMediaLibrary,
  onOpenSourceLibrary,
}: ClinicianCourseReadinessScreenProps) {
  const [access, setAccess] = useState<AccessState>('checking');
  const [blocksState, setBlocksState] =
    useState<PreparingForLaborCourseBlocksState>({
      status: 'loading',
      blocks: [],
      error: null,
    });
  const [sourcesState, setSourcesState] = useState<SourceLibraryState>({
    status: 'loading',
    sources: [],
    error: null,
  });
  const [mediaState, setMediaState] = useState<ClinicalMediaLibraryState>({
    status: 'loading',
    media: [],
    error: null,
  });

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

    const unsubscribeBlocks =
      subscribeToPreparingForLaborCourseBlocks(setBlocksState) ?? undefined;
    const unsubscribeSources =
      subscribeToContentSourceLibrary(setSourcesState) ?? undefined;
    const unsubscribeMedia =
      subscribeToClinicalMediaLibrary(setMediaState) ?? undefined;

    return () => {
      unsubscribeBlocks?.();
      unsubscribeSources?.();
      unsubscribeMedia?.();
    };
  }, [access]);

  const readiness = useMemo(() => {
    const blocksByKey = new Map(
      blocksState.blocks.map((block) => [
        cardKey(block.lessonId, block.id),
        block,
      ]),
    );
    const sourcesById = new Map(
      sourcesState.sources.map((source) => [source.id, source]),
    );
    const mediaById = new Map(
      mediaState.media.map((media) => [media.id, media]),
    );

    return PREPARING_FOR_LABOR_MANIFEST.lessons.flatMap((lesson) =>
      lesson.blocks.map((expected) => {
        const block = blocksByKey.get(cardKey(lesson.lessonId, expected.id)) ?? null;
        const sources = block
          ? sourceStatusFor(block, sourcesById)
          : 'needs-attention';
        const media = block ? mediaStatusFor(block, mediaById) : 'not-attached';
        const matchesPlacement = block
          ? placementMatches(block, lesson.lessonId, expected)
          : false;

        return {
          block,
          expected,
          lessonId: lesson.lessonId,
          sourceStatus: sources,
          mediaStatus: media,
          placementMatches: matchesPlacement,
          ...actionFor(block, sources, media, matchesPlacement),
        } satisfies CardReadiness;
      }),
    );
  }, [blocksState.blocks, mediaState.media, sourcesState.sources]);

  const metrics = useMemo(
    () => ({
      published: readiness.filter(
        (item) => item.block?.publicationState === 'published',
      ).length,
      approved: readiness.filter(
        (item) => item.block?.publicationState === 'approved',
      ).length,
      review: readiness.filter(
        (item) => item.block?.publicationState === 'submitted',
      ).length,
      action: readiness.filter((item) => item.requiresAction).length,
    }),
    [readiness],
  );

  const loading =
    blocksState.status === 'loading' ||
    sourcesState.status === 'loading' ||
    mediaState.status === 'loading';
  const errors = [blocksState.error, sourcesState.error, mediaState.error].filter(
    (error): error is string => Boolean(error),
  );

  const openCardAction = (item: CardReadiness) => {
    if (!item.block) {
      onOpenContentAuthoring();
      return;
    }
    if (!item.placementMatches) {
      onOpenContentAuthoring();
      return;
    }
    if (item.sourceStatus === 'needs-attention') {
      onOpenSourceLibrary();
      return;
    }
    if (item.mediaStatus === 'needs-attention') {
      onOpenMediaLibrary();
      return;
    }
    if (
      item.block.publicationState === 'draft' ||
      item.block.publicationState === 'frozen'
    ) {
      onEditDraft(item.block);
      return;
    }
    if (
      item.block.publicationState === 'submitted' ||
      item.block.publicationState === 'approved'
    ) {
      onOpenReview(item.block);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Return to clinical review"
            accessibilityRole="button"
            hitSlop={8}
            onPress={onExit}
            style={styles.backButton}
            testID="button-back-to-clinical-review"
          >
            <Text style={styles.backButtonText}>Back to clinical review</Text>
          </Pressable>
          <Text style={styles.brand}>BABYREADY / READINESS</Text>
        </View>

        <Text style={styles.title}>Preparing for Labor</Text>
        <Text style={styles.subtitle}>
          A mobile course checklist for the 25 governed learner cards. It shows
          what needs attention but never approves or publishes a card
          automatically.
        </Text>

        {access === 'checking' ? (
          <View style={styles.centeredState}>
            <ActivityIndicator color="#01696F" />
            <Text style={styles.stateText}>Checking clinician access…</Text>
          </View>
        ) : null}

        {access === 'denied' ? (
          <View style={styles.accessCard}>
            <Text style={styles.accessTitle}>Clinical reviewer access is required</Text>
            <Text style={styles.accessText}>
              This account does not have the Firebase administrator claim required
              to view course readiness.
            </Text>
          </View>
        ) : null}

        {access === 'error' ? (
          <View style={styles.accessCard}>
            <Text style={styles.accessTitle}>We could not verify your role</Text>
            <Text style={styles.accessText}>
              Refresh your session after confirming clinician administrator access.
            </Text>
          </View>
        ) : null}

        {access === 'authorized' ? (
          <>
            <View style={styles.metricsCard}>
              <Text style={styles.metricsLabel}>COURSE RELEASE STATUS</Text>
              <Text style={styles.metricsValue}>
                {metrics.published} of {readiness.length} published
              </Text>
              <Text style={styles.metricsText}>
                Publish remains an explicit decision after clinical approval.
              </Text>
              <View style={styles.metricsGrid}>
                <View style={styles.metric}>
                  <Text style={styles.metricNumber}>{metrics.review}</Text>
                  <Text style={styles.metricLabel}>in review</Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricNumber}>{metrics.approved}</Text>
                  <Text style={styles.metricLabel}>approved</Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricNumber}>{metrics.action}</Text>
                  <Text style={styles.metricLabel}>need action</Text>
                </View>
              </View>
            </View>

            <View style={styles.shortcutRow}>
              <Pressable
                accessibilityLabel="Open source library"
                accessibilityRole="button"
                onPress={onOpenSourceLibrary}
                style={styles.shortcutButton}
                testID="button-readiness-open-source-library"
              >
                <Text style={styles.shortcutButtonText}>Sources</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Open figures and media library"
                accessibilityRole="button"
                onPress={onOpenMediaLibrary}
                style={styles.shortcutButton}
                testID="button-readiness-open-media-library"
              >
                <Text style={styles.shortcutButtonText}>Media</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Open content authoring"
                accessibilityRole="button"
                onPress={onOpenContentAuthoring}
                style={styles.shortcutButton}
                testID="button-readiness-open-authoring"
              >
                <Text style={styles.shortcutButtonText}>Author</Text>
              </Pressable>
            </View>

            {loading ? (
              <View style={styles.centeredState}>
                <ActivityIndicator color="#01696F" />
                <Text style={styles.stateText}>Loading live course records…</Text>
              </View>
            ) : null}

            {errors.length ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorTitle}>Some readiness details could not load</Text>
                <Text style={styles.errorText}>{errors.join('\n')}</Text>
              </View>
            ) : null}

            {PREPARING_FOR_LABOR_MANIFEST.lessons.map((lesson) => {
              const lessonCards = readiness.filter(
                (item) => item.lessonId === lesson.lessonId,
              );
              const lessonPublished = lessonCards.filter(
                (item) => item.block?.publicationState === 'published',
              ).length;

              return (
                <View key={lesson.lessonId} style={styles.lessonSection}>
                  <View style={styles.lessonHeader}>
                    <View style={styles.lessonHeaderCopy}>
                      <Text style={styles.lessonLabel}>LESSON</Text>
                      <Text style={styles.lessonTitle}>
                        {lessonTitles[lesson.lessonId] ?? lesson.lessonId}
                      </Text>
                    </View>
                    <Text style={styles.lessonProgress}>
                      {lessonPublished}/{lessonCards.length} live
                    </Text>
                  </View>

                  {lessonCards.map((item) => {
                    const state = item.block?.publicationState ?? 'missing';
                    return (
                      <View
                        key={item.expected.id}
                        style={[
                          styles.card,
                          item.requiresAction && styles.cardNeedsAction,
                        ]}
                      >
                        <View style={styles.cardHeader}>
                          <View style={styles.cardHeading}>
                            <Text style={styles.cardOrder}>
                              CARD {item.expected.displayOrder}
                            </Text>
                            <Text style={styles.cardTitle}>
                              {item.block?.title ?? item.expected.id}
                            </Text>
                            <Text style={styles.cardMeta}>
                              {item.expected.type.replace('_', ' ')}
                              {item.expected.isClinicalClaim ? ' · clinical claim' : ''}
                            </Text>
                          </View>
                          <View style={[styles.statusPill, statusStyle(state)]}>
                            <Text style={styles.statusText}>
                              {state === 'missing' ? 'Missing' : formatState(state)}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.readinessDetails}>
                          <Text
                            style={[
                              styles.readinessDetail,
                              item.sourceStatus === 'needs-attention' &&
                                styles.readinessDetailAlert,
                            ]}
                          >
                            {sourceLabel(item.sourceStatus)}
                          </Text>
                          <Text
                            style={[
                              styles.readinessDetail,
                              item.mediaStatus === 'needs-attention' &&
                                styles.readinessDetailAlert,
                            ]}
                          >
                            {mediaLabel(item.mediaStatus)}
                          </Text>
                          {!item.placementMatches && item.block ? (
                            <Text style={styles.readinessDetailAlert}>
                              Manifest placement needs correction
                            </Text>
                          ) : null}
                        </View>

                        <Text style={styles.actionHint}>{item.actionHint}</Text>

                        {item.requiresAction ? (
                          <Pressable
                            accessibilityLabel={`${item.actionLabel}: ${item.block?.title ?? item.expected.id}`}
                            accessibilityRole="button"
                            onPress={() => openCardAction(item)}
                            style={styles.actionButton}
                            testID={`button-readiness-action-${item.expected.id}`}
                          >
                            <Text style={styles.actionButtonText}>
                              {item.actionLabel}
                            </Text>
                          </Pressable>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              );
            })}
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
    paddingBottom: 42,
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
    maxWidth: 390,
  },
  centeredState: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 30,
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
    color: '#696761',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  metricsCard: {
    backgroundColor: '#E3F0ED',
    borderColor: '#92BFB8',
    borderLeftColor: '#01696F',
    borderLeftWidth: 4,
    borderRadius: 15,
    borderWidth: 1,
    marginTop: 22,
    padding: 18,
  },
  metricsLabel: {
    color: '#0C4E54',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  metricsValue: {
    color: '#28251D',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 5,
  },
  metricsText: {
    color: '#365553',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 15,
  },
  metric: {
    backgroundColor: '#F8FCFA',
    borderColor: '#C0DCD7',
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    padding: 9,
  },
  metricNumber: {
    color: '#0C4E54',
    fontSize: 18,
    fontWeight: '900',
  },
  metricLabel: {
    color: '#365553',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
  },
  shortcutRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  shortcutButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#C8DDD7',
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 8,
  },
  shortcutButtonText: {
    color: '#0C4E54',
    fontSize: 12,
    fontWeight: '800',
  },
  errorCard: {
    backgroundColor: '#FFF0E8',
    borderColor: '#DBA37C',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 18,
    padding: 13,
  },
  errorTitle: {
    color: '#713417',
    fontSize: 14,
    fontWeight: '800',
  },
  errorText: {
    color: '#713417',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  lessonSection: {
    marginTop: 28,
  },
  lessonHeader: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  lessonHeaderCopy: {
    flex: 1,
    paddingRight: 10,
  },
  lessonLabel: {
    color: '#01696F',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  lessonTitle: {
    color: '#28251D',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
  },
  lessonProgress: {
    color: '#696761',
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DCD9D3',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 10,
    padding: 14,
  },
  cardNeedsAction: {
    borderLeftColor: '#964219',
    borderLeftWidth: 3,
  },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  cardHeading: {
    flex: 1,
    minWidth: 0,
  },
  cardOrder: {
    color: '#696761',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  cardTitle: {
    color: '#28251D',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 3,
  },
  cardMeta: {
    color: '#696761',
    fontSize: 12,
    marginTop: 3,
    textTransform: 'capitalize',
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  statusDraft: {
    backgroundColor: '#E8E5DD',
  },
  statusSubmitted: {
    backgroundColor: '#E8EFF8',
  },
  statusApproved: {
    backgroundColor: '#E4F2E6',
  },
  statusPublished: {
    backgroundColor: '#D9EEE2',
  },
  statusFrozen: {
    backgroundColor: '#F6E4EA',
  },
  statusMissing: {
    backgroundColor: '#FFF0E8',
  },
  statusText: {
    color: '#28251D',
    fontSize: 11,
    fontWeight: '800',
  },
  readinessDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 12,
  },
  readinessDetail: {
    backgroundColor: '#F1F5F3',
    borderRadius: 999,
    color: '#365553',
    fontSize: 11,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  readinessDetailAlert: {
    backgroundColor: '#FFF0E8',
    color: '#713417',
  },
  actionHint: {
    color: '#4D4B45',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: '#0C4E54',
    borderRadius: 9,
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
