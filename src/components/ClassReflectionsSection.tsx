import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { courses as allCourses, type Course } from '../content/lessons';
import {
  subscribeToReflections,
  type ReflectionsState,
} from '../services/birthReadinessReflectionService';

type ClassReflectionsSectionProps = {
  userId: string | null;
  courses?: Course[];
  /** Hears the reflections shown, so the brief can print them too. */
  onRowsChange?: (rows: ReflectionRow[]) => void;
};

export type ReflectionRow = {
  key: string;
  lessonTitle: string;
  prompt: string;
  text: string;
  order: number;
};

/**
 * Read-only list of the learner's reflection answers from the class player,
 * shown in their Birth Readiness Brief. Answers are edited in the lesson.
 */
export function ClassReflectionsSection({
  userId,
  courses = allCourses,
  onRowsChange,
}: ClassReflectionsSectionProps) {
  const [state, setState] = useState<ReflectionsState>({
    status: 'loading',
    reflections: [],
    error: null,
  });

  useEffect(() => subscribeToReflections(userId, setState), [userId]);

  const rows = useMemo(() => {
    const result: ReflectionRow[] = [];
    for (const reflection of state.reflections) {
      const course = courses.find((c) => c.lessons.some((l) => l.lessonId === reflection.lessonId));
      const courseIndex = course ? courses.indexOf(course) : -1;
      const lesson = course?.lessons.find((l) => l.lessonId === reflection.lessonId);
      const slideIndex = lesson?.slides.findIndex((s) => s.id === reflection.slideId) ?? -1;
      const slide = lesson && slideIndex >= 0 ? lesson.slides[slideIndex] : null;
      // Skip answers whose lesson or slide no longer exists in the course content.
      if (!lesson || !slide || slide.type !== 'reflection' || !reflection.text.trim()) continue;
      result.push({
        key: `${reflection.lessonId}:${reflection.slideId}`,
        lessonTitle: `${course!.title} · Lesson ${lesson.order}: ${lesson.title}`,
        prompt: slide.prompt,
        text: reflection.text,
        order: courseIndex * 1_000_000 + lesson.order * 1000 + slideIndex,
      });
    }
    return result.sort((a, b) => a.order - b.order);
  }, [courses, state.reflections]);

  useEffect(() => onRowsChange?.(rows), [onRowsChange, rows]);

  return (
    <View testID="birth-readiness-brief-class-reflections">
      <View style={styles.sectionHeader}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          Your answers from class
        </Text>
        <Text style={styles.sectionText}>
          These save automatically as you answer the reflection questions in
          class. To change one, replay that lesson.
          {state.status === 'ready' && state.source === 'device'
            ? ' Right now they are saved on this device only.'
            : ''}
        </Text>
      </View>

      {state.status === 'loading' ? (
        <View style={styles.card}>
          <ActivityIndicator color="#01696F" />
        </View>
      ) : null}

      {state.status === 'error' ? (
        <View accessibilityRole="alert" style={styles.card}>
          <Text style={styles.errorText}>{state.error} Check your connection and try again.</Text>
        </View>
      ) : null}

      {state.status === 'ready' && rows.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.emptyText}>
            Nothing yet. When a lesson asks you to reflect, your answer will
            show up here.
          </Text>
        </View>
      ) : null}

      {rows.map((row) => (
        <View key={row.key} style={styles.card}>
          <Text style={styles.lessonTitle}>{row.lessonTitle}</Text>
          <Text style={styles.prompt}>{row.prompt}</Text>
          <Text style={styles.answer}>{row.text}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
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
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D4D1CA',
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
    marginTop: 12,
    padding: 16,
  },
  lessonTitle: {
    color: '#01696F',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  prompt: {
    color: '#28251D',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  answer: {
    color: '#28251D',
    fontSize: 15,
    lineHeight: 22,
  },
  emptyText: {
    color: '#605D56',
    fontSize: 14,
    lineHeight: 20,
  },
  errorText: {
    color: '#A12C3B',
    fontSize: 14,
    lineHeight: 20,
  },
});
