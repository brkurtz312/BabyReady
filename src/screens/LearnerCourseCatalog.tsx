import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { CourseRecord } from '../models/course';
import {
  subscribeToPublishedCourses,
  type PublishedCourseCatalogState,
} from '../services/learnerCourseService';
import { useLearnerLayout } from '../lib/learnerLayout';

type LearnerCourseCatalogProps = {
  onOpenCourse: (course: CourseRecord) => void;
};

function lessonCount(course: CourseRecord): number {
  return course.learnerOutline?.reduce(
    (count, module) => count + module.lessons.length,
    0,
  ) ?? 0;
}

export function LearnerCourseCatalog({
  onOpenCourse,
}: LearnerCourseCatalogProps) {
  const { isTabletLayout } = useLearnerLayout();
  const [catalog, setCatalog] = useState<PublishedCourseCatalogState>({
    status: 'loading',
    courses: [],
    error: null,
  });

  useEffect(
    () => subscribeToPublishedCourses(setCatalog) ?? undefined,
    [],
  );

  const availableCourses = useMemo(
    () =>
      catalog.courses.filter(
        (course) => (course.learnerOutline?.length ?? 0) > 0,
      ),
    [catalog.courses],
  );
  const coursesAwaitingOutline = catalog.courses.length - availableCourses.length;
  const useCourseGrid = isTabletLayout && availableCourses.length > 1;

  return (
    <View style={[styles.container, isTabletLayout && styles.tabletContainer]}>
      <View style={styles.headingRow}>
        <View>
          <Text style={styles.sectionTitle}>Your learning library</Text>
          <Text style={styles.sectionSubtitle}>
            Clinician-reviewed lessons are available here when published.
          </Text>
        </View>
        {availableCourses.length > 0 ? (
          <Text style={styles.count}>{availableCourses.length} available</Text>
        ) : null}
      </View>

      {catalog.status === 'loading' ? (
        <View style={styles.statusCard}>
          <ActivityIndicator color="#01696F" />
          <Text style={styles.statusText}>Loading your published courses…</Text>
        </View>
      ) : null}

      {catalog.status === 'unconfigured' ? (
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Learning library is not connected</Text>
          <Text style={styles.statusText}>
            Add the BabyReady Firebase configuration before loading published
            courses.
          </Text>
        </View>
      ) : null}

      {catalog.status === 'error' ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Courses are temporarily unavailable</Text>
          <Text style={styles.errorText}>
            Check your connection and try again. {catalog.error}
          </Text>
        </View>
      ) : null}

      {catalog.status === 'ready' && availableCourses.length === 0 ? (
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Your first course is being prepared</Text>
          <Text style={styles.statusText}>
            Published courses will appear here as soon as their learner lesson
            navigation is ready.
          </Text>
        </View>
      ) : null}

      <View
        style={[
          styles.courseList,
          isTabletLayout && styles.tabletCourseList,
          useCourseGrid && styles.tabletCourseGrid,
          isTabletLayout && !useCourseGrid && styles.tabletSingleCourseList,
        ]}
      >
        {availableCourses.map((course, index) => {
          const count = lessonCount(course);
          const firstLesson = course.learnerOutline
            ?.slice()
            .sort((left, right) => left.order - right.order)[0]
            ?.lessons[0];

          return (
            <Pressable
              accessibilityLabel={`Open ${course.title}`}
              accessibilityRole="button"
              key={course.id}
              onPress={() => onOpenCourse(course)}
              style={({ pressed }) => [
                styles.courseCard,
                index === 0 && styles.primaryCourseCard,
                useCourseGrid && styles.tabletCourseCard,
                pressed && styles.courseCardPressed,
              ]}
              testID={`button-open-course-${course.id}`}
            >
              <View style={styles.courseTopRow}>
                <Text style={index === 0 ? styles.primaryEyebrow : styles.eyebrow}>
                  {index === 0 ? 'AVAILABLE NOW' : 'PUBLISHED COURSE'}
                </Text>
                <Text style={index === 0 ? styles.primaryArrow : styles.arrow}>›</Text>
              </View>
              <Text style={index === 0 ? styles.primaryTitle : styles.courseTitle}>
                {course.title}
              </Text>
              <Text
                style={index === 0 ? styles.primarySummary : styles.courseSummary}
              >
                {course.summary}
              </Text>
              <View style={styles.metaRow}>
                <Text style={index === 0 ? styles.primaryMeta : styles.meta}>
                  {count} {count === 1 ? 'lesson' : 'lessons'}
                </Text>
                {firstLesson?.estimatedMinutes ? (
                  <>
                    <Text style={index === 0 ? styles.primaryMeta : styles.meta}>•</Text>
                    <Text style={index === 0 ? styles.primaryMeta : styles.meta}>
                      {firstLesson.estimatedMinutes} min to begin
                    </Text>
                  </>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      {catalog.status === 'ready' && coursesAwaitingOutline > 0 ? (
        <Text style={styles.preparationNote}>
          {coursesAwaitingOutline} published {coursesAwaitingOutline === 1 ? 'course is' : 'courses are'} being prepared for learner navigation.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 28,
  },
  tabletContainer: {
    alignSelf: 'center',
    maxWidth: 960,
    width: '100%',
  },
  headingRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#28251D',
    fontSize: 20,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: '#696761',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
    maxWidth: 290,
  },
  count: {
    color: '#01696F',
    fontSize: 12,
    fontWeight: '800',
    paddingBottom: 2,
  },
  courseList: {
    gap: 11,
  },
  tabletCourseList: {
    width: '100%',
  },
  tabletCourseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tabletSingleCourseList: {
    maxWidth: 560,
  },
  courseCard: {
    backgroundColor: '#FBFBF9',
    borderColor: '#D4D1CA',
    borderRadius: 16,
    borderWidth: 1,
    padding: 17,
  },
  tabletCourseCard: {
    flexBasis: '48%',
    flexGrow: 1,
  },
  primaryCourseCard: {
    backgroundColor: '#01696F',
    borderColor: '#01696F',
  },
  courseCardPressed: {
    opacity: 0.82,
  },
  courseTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: '#01696F',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  primaryEyebrow: {
    color: '#BCE2E7',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  arrow: {
    color: '#01696F',
    fontSize: 26,
    fontWeight: '500',
    lineHeight: 26,
  },
  primaryArrow: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '500',
    lineHeight: 26,
  },
  courseTitle: {
    color: '#28251D',
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.25,
    marginTop: 7,
  },
  primaryTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginTop: 7,
  },
  courseSummary: {
    color: '#605D56',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  primarySummary: {
    color: '#E8F5F3',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 13,
  },
  meta: {
    color: '#696761',
    fontSize: 12,
    fontWeight: '700',
  },
  primaryMeta: {
    color: '#CBE6E2',
    fontSize: 12,
    fontWeight: '700',
  },
  statusCard: {
    alignItems: 'center',
    backgroundColor: '#FBFBF9',
    borderColor: '#D4D1CA',
    borderRadius: 14,
    borderWidth: 1,
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
  preparationNote: {
    color: '#77746D',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 10,
  },
});
