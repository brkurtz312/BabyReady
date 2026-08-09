import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { getBundledClinicalMediaAsset } from '../lib/clinicalMediaAssets';
import type {
  ClinicalContentBlock,
  ClinicalMedia,
  ContentSource,
  CourseRecord,
  LearnerCourseLesson,
  LearnerCourseModule,
} from '../models/course';
import {
  loadPublishedLessonAttachments,
  subscribeToPublishedLessonContent,
  type PublishedLessonState,
} from '../services/learnerCourseService';

type SelectedLesson = {
  module: LearnerCourseModule;
  lesson: LearnerCourseLesson;
};

type LearnerCoursePlayerScreenProps = {
  course: CourseRecord;
  onExit: () => void;
};

function lessonsForCourse(course: CourseRecord): SelectedLesson[] {
  return (course.learnerOutline ?? [])
    .slice()
    .sort((left, right) => left.order - right.order)
    .flatMap((module) =>
      module.lessons.map((lesson) => ({
        module,
        lesson,
      })),
    );
}

function lessonKey(selectedLesson: SelectedLesson): string {
  return `${selectedLesson.module.id}/${selectedLesson.lesson.id}`;
}

function titleForBlock(block: ClinicalContentBlock): string | null {
  switch (block.type) {
    case 'callout':
      return 'Keep in mind';
    case 'checklist':
      return 'Try this';
    case 'question':
      return 'Reflect';
    case 'emergency_card':
      return 'Get help now';
    case 'citation':
      return 'More context';
    default:
      return null;
  }
}

function checklistItems(body: string): string[] {
  return body
    .split('\n')
    .map((line) => line.trim().replace(/^[-•*]\s*/, ''))
    .filter(Boolean);
}

function SourceLinks({
  sourceIds,
  sourcesById,
}: {
  sourceIds: string[];
  sourcesById: Map<string, ContentSource>;
}) {
  const sources = sourceIds
    .map((sourceId) => sourcesById.get(sourceId))
    .filter((source): source is ContentSource => Boolean(source));

  if (sources.length === 0) {
    return null;
  }

  const openSource = async (source: ContentSource) => {
    try {
      const supported = await Linking.canOpenURL(source.url);
      if (!supported) {
        throw new Error('Unsupported source URL');
      }
      await Linking.openURL(source.url);
    } catch {
      Alert.alert(
        'Source link unavailable',
        'BabyReady could not open this source on your device.',
      );
    }
  };

  return (
    <View style={styles.sources}>
      <Text style={styles.sourcesLabel}>Clinical source{sources.length === 1 ? '' : 's'}</Text>
      {sources.map((source) => (
        <Pressable
          accessibilityLabel={`Open source: ${source.organization}, ${source.title}`}
          accessibilityRole="link"
          key={source.id}
          onPress={() => void openSource(source)}
          style={styles.sourceLink}
          testID={`link-source-${source.id}`}
        >
          <Text style={styles.sourceLinkText}>
            {source.organization}: {source.title} ↗
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function MediaFigure({ media }: { media: ClinicalMedia }) {
  const [failed, setFailed] = useState(false);
  const imageSource = getBundledClinicalMediaAsset(media.assetKey);

  if (!imageSource || failed) {
    return (
      <View style={styles.mediaFallback}>
        <Text style={styles.mediaFallbackTitle}>{media.title}</Text>
        <Text style={styles.mediaFallbackText}>{media.altText}</Text>
      </View>
    );
  }

  return (
    <View style={styles.figureCard}>
      <Image
        accessibilityLabel={media.altText}
        onError={() => setFailed(true)}
        resizeMode="contain"
        source={imageSource}
        style={styles.figureImage}
      />
      <Text style={styles.figureTitle}>{media.title}</Text>
      {media.caption ? <Text style={styles.figureCaption}>{media.caption}</Text> : null}
    </View>
  );
}

function LessonBlock({
  block,
  mediaById,
  sourcesById,
}: {
  block: ClinicalContentBlock;
  mediaById: Map<string, ClinicalMedia>;
  sourcesById: Map<string, ContentSource>;
}) {
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const items = block.type === 'checklist' ? checklistItems(block.body) : [];
  const title = titleForBlock(block);
  const media = (block.mediaIds ?? [])
    .map((mediaId) => mediaById.get(mediaId))
    .filter((item): item is ClinicalMedia => Boolean(item));

  return (
    <View
      style={[
        styles.block,
        block.type === 'callout' && styles.calloutBlock,
        block.type === 'emergency_card' && styles.emergencyBlock,
      ]}
    >
      {title ? (
        <Text
          style={[
            styles.blockTitle,
            block.type === 'emergency_card' && styles.emergencyBlockTitle,
          ]}
        >
          {title}
        </Text>
      ) : null}

      {items.length > 0 ? (
        <View style={styles.checklist}>
          {items.map((item, index) => {
            const itemKey = `${block.id}-${index}`;
            const complete = checkedItems.includes(itemKey);
            return (
              <Pressable
                accessibilityLabel={`${complete ? 'Mark incomplete' : 'Mark complete'}: ${item}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: complete }}
                key={itemKey}
                onPress={() =>
                  setCheckedItems((current) =>
                    complete
                      ? current.filter((checked) => checked !== itemKey)
                      : [...current, itemKey],
                  )
                }
                style={styles.checklistItem}
                testID={`button-checklist-${itemKey}`}
              >
                <View style={[styles.checkbox, complete && styles.checkboxChecked]}>
                  {complete ? <Text style={styles.checkmark}>✓</Text> : null}
                </View>
                <Text style={[styles.checklistText, complete && styles.checklistTextComplete]}>
                  {item}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Text
          style={[
            styles.blockText,
            block.type === 'emergency_card' && styles.emergencyBlockText,
          ]}
        >
          {block.body}
        </Text>
      )}

      {media.map((item) => (
        <MediaFigure key={item.id} media={item} />
      ))}
      <SourceLinks sourceIds={block.sourceIds ?? []} sourcesById={sourcesById} />
    </View>
  );
}

export function LearnerCoursePlayerScreen({
  course,
  onExit,
}: LearnerCoursePlayerScreenProps) {
  const allLessons = useMemo(() => lessonsForCourse(course), [course]);
  const [selectedLessonKey, setSelectedLessonKey] = useState(
    allLessons[0] ? lessonKey(allLessons[0]) : '',
  );
  const selectedLesson =
    allLessons.find((lesson) => lessonKey(lesson) === selectedLessonKey) ??
    allLessons[0] ??
    null;
  const [lessonState, setLessonState] = useState<PublishedLessonState>({
    status: 'loading',
    blocks: [],
    error: null,
  });
  const [attachments, setAttachments] = useState<{
    media: ClinicalMedia[];
    sources: ContentSource[];
  }>({ media: [], sources: [] });
  const [attachmentsError, setAttachmentsError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedLesson) {
      setLessonState({ status: 'ready', blocks: [], error: null });
      return undefined;
    }

    setAttachments({ media: [], sources: [] });
    setAttachmentsError(null);
    return subscribeToPublishedLessonContent(
      course.id,
      selectedLesson.module.id,
      selectedLesson.lesson.id,
      setLessonState,
    ) ?? undefined;
  }, [course.id, selectedLesson]);

  useEffect(() => {
    if (lessonState.status !== 'ready') {
      return undefined;
    }

    let active = true;
    void loadPublishedLessonAttachments(lessonState.blocks)
      .then((nextAttachments) => {
        if (active) {
          setAttachments(nextAttachments);
        }
      })
      .catch(() => {
        if (active) {
          setAttachmentsError(
            'Some linked learning resources could not be loaded right now.',
          );
        }
      });

    return () => {
      active = false;
    };
  }, [lessonState.blocks, lessonState.status]);

  const mediaById = useMemo(
    () => new Map(attachments.media.map((media) => [media.id, media])),
    [attachments.media],
  );
  const sourcesById = useMemo(
    () => new Map(attachments.sources.map((source) => [source.id, source])),
    [attachments.sources],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          accessibilityLabel="Return to your learning library"
          accessibilityRole="button"
          onPress={onExit}
          style={styles.backButton}
          testID="button-return-to-learning-library"
        >
          <Text style={styles.backButtonText}>‹ Learning library</Text>
        </Pressable>

        <Text style={styles.brand}>BABYREADY</Text>
        <Text style={styles.courseTitle}>{course.title}</Text>
        <Text style={styles.courseSummary}>{course.summary}</Text>

        {!selectedLesson ? (
          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>This course is being prepared</Text>
            <Text style={styles.statusText}>
              Learner lesson navigation has not been added to this course yet.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.lessonNavigation}>
              <Text style={styles.navigationLabel}>COURSE LESSONS</Text>
              {allLessons.map((item, index) => {
                const selected = lessonKey(item) === lessonKey(selectedLesson);
                return (
                  <Pressable
                    accessibilityLabel={`Open lesson ${index + 1}: ${item.lesson.title}`}
                    accessibilityRole="button"
                    key={lessonKey(item)}
                    onPress={() => setSelectedLessonKey(lessonKey(item))}
                    style={[
                      styles.lessonButton,
                      selected && styles.lessonButtonSelected,
                    ]}
                    testID={`button-open-lesson-${item.module.id}-${item.lesson.id}`}
                  >
                    <Text
                      style={[
                        styles.lessonNumber,
                        selected && styles.lessonNumberSelected,
                      ]}
                    >
                      {index + 1}
                    </Text>
                    <View style={styles.lessonButtonContent}>
                      <Text
                        style={[
                          styles.lessonModule,
                          selected && styles.lessonModuleSelected,
                        ]}
                      >
                        {item.module.title}
                      </Text>
                      <Text
                        style={[
                          styles.lessonButtonTitle,
                          selected && styles.lessonButtonTitleSelected,
                        ]}
                      >
                        {item.lesson.title}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.lessonHeader}>
              <Text style={styles.eyebrow}>{selectedLesson.module.title}</Text>
              <Text style={styles.lessonTitle}>{selectedLesson.lesson.title}</Text>
              {selectedLesson.lesson.summary ? (
                <Text style={styles.lessonSummary}>{selectedLesson.lesson.summary}</Text>
              ) : null}
              {selectedLesson.lesson.estimatedMinutes ? (
                <Text style={styles.lessonMeta}>
                  About {selectedLesson.lesson.estimatedMinutes} minutes
                </Text>
              ) : null}
            </View>

            {lessonState.status === 'loading' ? (
              <View style={styles.statusCard}>
                <ActivityIndicator color="#01696F" />
                <Text style={styles.statusText}>Loading clinically reviewed lesson…</Text>
              </View>
            ) : null}

            {lessonState.status === 'unconfigured' ? (
              <View style={styles.statusCard}>
                <Text style={styles.statusTitle}>Lesson content is not connected</Text>
                <Text style={styles.statusText}>
                  Add the BabyReady Firebase configuration to load published lessons.
                </Text>
              </View>
            ) : null}

            {lessonState.status === 'error' ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorTitle}>This lesson is temporarily unavailable</Text>
                <Text style={styles.errorText}>
                  Check your connection and try again. {lessonState.error}
                </Text>
              </View>
            ) : null}

            {lessonState.status === 'ready' && lessonState.blocks.length === 0 ? (
              <View style={styles.statusCard}>
                <Text style={styles.statusTitle}>This lesson is being prepared</Text>
                <Text style={styles.statusText}>
                  Learner content will appear here after it has completed clinical review and publication.
                </Text>
              </View>
            ) : null}

            <View style={styles.blockList}>
              {lessonState.blocks.map((block) => (
                <LessonBlock
                  block={block}
                  key={block.id}
                  mediaById={mediaById}
                  sourcesById={sourcesById}
                />
              ))}
            </View>

            {attachmentsError ? (
              <Text accessibilityRole="alert" style={styles.attachmentWarning}>
                {attachmentsError}
              </Text>
            ) : null}
          </>
        )}

        <View style={styles.safetyCard}>
          <Text style={styles.safetyTitle}>For education, not urgent care</Text>
          <Text style={styles.safetyText}>
            Contact your obstetric team for personal medical advice. For severe symptoms or immediate danger, call 911 or your local emergency number.
          </Text>
        </View>
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
    paddingBottom: 36,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  backButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
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
    marginTop: 10,
  },
  courseTitle: {
    color: '#28251D',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
    marginTop: 5,
  },
  courseSummary: {
    color: '#55534D',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 7,
  },
  lessonNavigation: {
    gap: 8,
    marginTop: 25,
  },
  navigationLabel: {
    color: '#77746D',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  lessonButton: {
    alignItems: 'center',
    backgroundColor: '#FBFBF9',
    borderColor: '#D4D1CA',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 61,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  lessonButtonSelected: {
    backgroundColor: '#E3F0ED',
    borderColor: '#63A7A1',
    borderWidth: 1.5,
  },
  lessonNumber: {
    alignItems: 'center',
    backgroundColor: '#EFEEE9',
    borderRadius: 12,
    color: '#59564E',
    fontSize: 13,
    fontWeight: '800',
    height: 27,
    lineHeight: 27,
    textAlign: 'center',
    width: 27,
  },
  lessonNumberSelected: {
    backgroundColor: '#01696F',
    color: '#FFFFFF',
  },
  lessonButtonContent: {
    flex: 1,
    marginLeft: 10,
  },
  lessonModule: {
    color: '#77746D',
    fontSize: 11,
    fontWeight: '700',
  },
  lessonModuleSelected: {
    color: '#0C4E54',
  },
  lessonButtonTitle: {
    color: '#28251D',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 1,
  },
  lessonButtonTitleSelected: {
    color: '#0C4E54',
  },
  lessonHeader: {
    marginTop: 27,
  },
  eyebrow: {
    color: '#01696F',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  lessonTitle: {
    color: '#28251D',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginTop: 6,
  },
  lessonSummary: {
    color: '#55534D',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 7,
  },
  lessonMeta: {
    color: '#01696F',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 11,
  },
  statusCard: {
    alignItems: 'center',
    backgroundColor: '#FBFBF9',
    borderColor: '#D4D1CA',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 20,
    padding: 18,
  },
  statusTitle: {
    color: '#28251D',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  statusText: {
    color: '#605D56',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    textAlign: 'center',
  },
  errorCard: {
    backgroundColor: '#FFF5F8',
    borderColor: '#A12C7B',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 20,
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
  blockList: {
    gap: 14,
    marginTop: 20,
  },
  block: {
    backgroundColor: '#FBFBF9',
    borderColor: '#D4D1CA',
    borderRadius: 15,
    borderWidth: 1,
    padding: 17,
  },
  calloutBlock: {
    backgroundColor: '#EAF4F2',
    borderColor: '#92BFB8',
  },
  emergencyBlock: {
    backgroundColor: '#FFF5F8',
    borderColor: '#A12C7B',
  },
  blockTitle: {
    color: '#0C4E54',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 7,
  },
  emergencyBlockTitle: {
    color: '#7B1F5C',
  },
  blockText: {
    color: '#38352E',
    fontSize: 16,
    lineHeight: 24,
  },
  emergencyBlockText: {
    color: '#592546',
  },
  checklist: {
    gap: 11,
  },
  checklistItem: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  checkbox: {
    alignItems: 'center',
    borderColor: '#77746D',
    borderRadius: 5,
    borderWidth: 1.5,
    height: 21,
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 1,
    width: 21,
  },
  checkboxChecked: {
    backgroundColor: '#01696F',
    borderColor: '#01696F',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 16,
  },
  checklistText: {
    color: '#38352E',
    flex: 1,
    fontSize: 16,
    lineHeight: 23,
  },
  checklistTextComplete: {
    color: '#696761',
    textDecorationLine: 'line-through',
  },
  figureCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DCD9D2',
    borderRadius: 11,
    borderWidth: 1,
    marginTop: 15,
    overflow: 'hidden',
    paddingBottom: 13,
  },
  figureImage: {
    backgroundColor: '#FFFFFF',
    height: 240,
    width: '100%',
  },
  figureTitle: {
    color: '#28251D',
    fontSize: 14,
    fontWeight: '800',
    marginHorizontal: 13,
    marginTop: 12,
  },
  figureCaption: {
    color: '#605D56',
    fontSize: 13,
    lineHeight: 18,
    marginHorizontal: 13,
    marginTop: 4,
  },
  mediaFallback: {
    backgroundColor: '#EFEEE9',
    borderColor: '#D4D1CA',
    borderRadius: 11,
    borderWidth: 1,
    marginTop: 15,
    padding: 14,
  },
  mediaFallbackTitle: {
    color: '#28251D',
    fontSize: 14,
    fontWeight: '800',
  },
  mediaFallbackText: {
    color: '#55534D',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  sources: {
    borderTopColor: '#E0DDD6',
    borderTopWidth: 1,
    marginTop: 15,
    paddingTop: 12,
  },
  sourcesLabel: {
    color: '#77746D',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.55,
    textTransform: 'uppercase',
  },
  sourceLink: {
    alignSelf: 'flex-start',
    marginTop: 7,
    minHeight: 30,
  },
  sourceLinkText: {
    color: '#01696F',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
    textDecorationLine: 'underline',
  },
  attachmentWarning: {
    color: '#964219',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 12,
  },
  safetyCard: {
    backgroundColor: '#FFF5F8',
    borderColor: '#A12C7B',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 28,
    padding: 17,
  },
  safetyTitle: {
    color: '#7B1F5C',
    fontSize: 16,
    fontWeight: '800',
  },
  safetyText: {
    color: '#592546',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5,
  },
});
