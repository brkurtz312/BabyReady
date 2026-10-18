import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Lesson } from '../models/lesson';

/**
 * The lessons in the current module, opened from the class player's "Lessons"
 * button, so a learner can switch lessons without going back home.
 */

const colors = {
  surface: '#FFFFFF',
  ink: '#1D2940',
  muted: '#5A6680',
  line: '#D5DEE6',
  lagoon: '#23716C',
  lagoonSoft: '#DCEDEA',
};

type LessonListSheetProps = {
  visible: boolean;
  courseTitle: string;
  lessons: Lesson[];
  currentLessonId: string;
  completedLessonIds: string[];
  onPick: (index: number) => void;
  onClose: () => void;
};

export function LessonListSheet({
  visible,
  courseTitle,
  lessons,
  currentLessonId,
  completedLessonIds,
  onPick,
  onClose,
}: LessonListSheetProps) {
  const done = new Set(completedLessonIds);
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <Pressable accessibilityLabel="Close the lesson list" onPress={onClose} style={styles.backdrop} />
      <View accessibilityViewIsModal style={styles.sheet}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.kicker}>Lessons</Text>
            <Text accessibilityRole="header" style={styles.title}>
              {courseTitle}
            </Text>
          </View>
          <Pressable accessibilityRole="button" hitSlop={8} onPress={onClose} style={styles.close}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.list}>
          {lessons.map((lesson, k) => {
            const current = lesson.lessonId === currentLessonId;
            const finished = done.has(lesson.lessonId);
            return (
              <Pressable
                accessibilityHint={current ? 'This is the lesson you’re in.' : 'Opens this lesson.'}
                accessibilityLabel={`Lesson ${lesson.order}, ${lesson.title}, about ${lesson.estimatedMinutes} minutes${finished ? ', finished' : ''}`}
                accessibilityRole="button"
                accessibilityState={{ selected: current }}
                key={lesson.lessonId}
                onPress={() => onPick(k)}
                style={[styles.row, current && styles.rowCurrent]}
                testID={`button-pick-lesson-${lesson.lessonId}`}
              >
                <Text style={styles.number}>{lesson.order}</Text>
                <View style={styles.rowText}>
                  <Text style={[styles.lessonTitle, current && styles.lessonTitleCurrent]}>{lesson.title}</Text>
                  <Text style={styles.meta}>
                    About {lesson.estimatedMinutes} minutes{current ? ' · You’re here' : ''}
                  </Text>
                </View>
                {finished ? (
                  <Text accessibilityElementsHidden importantForAccessibility="no" style={styles.check}>
                    ✓
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(29, 41, 64, 0.35)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  headerText: { flex: 1 },
  kicker: { color: colors.lagoon, fontSize: 12, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  title: { color: colors.ink, fontSize: 18, fontWeight: '800', marginTop: 2 },
  close: {
    borderColor: colors.lagoon,
    borderRadius: 999,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  closeText: { color: colors.lagoon, fontSize: 15, fontWeight: '800' },
  list: { gap: 8, padding: 16 },
  row: {
    alignItems: 'center',
    borderColor: colors.line,
    borderRadius: 12,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  rowCurrent: { backgroundColor: colors.lagoonSoft, borderColor: colors.lagoon },
  number: { color: colors.lagoon, fontSize: 18, fontWeight: '800', minWidth: 22, textAlign: 'center' },
  rowText: { flex: 1 },
  lessonTitle: { color: colors.ink, fontSize: 16, lineHeight: 21 },
  lessonTitleCurrent: { fontWeight: '800' },
  meta: { color: colors.muted, fontSize: 13, marginTop: 2 },
  check: { color: colors.lagoon, fontSize: 20, fontWeight: '800' },
});
