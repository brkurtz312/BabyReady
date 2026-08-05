import type { CourseModule } from '../models/course';

export const courseModules: CourseModule[] = [
  {
    id: 'preparing-for-birth',
    order: 1,
    title: 'Preparing for Birth',
    summary: 'Clarify your values, support team, logistics, and questions for care visits.',
    estimatedMinutes: 25,
    recommendedWeeks: '20–28',
  },
  {
    id: 'labor-basics',
    order: 2,
    title: 'Labor Basics and When to Call',
    summary: 'Learn the big picture of labor and save your own team’s instructions.',
    estimatedMinutes: 30,
    recommendedWeeks: '24–32',
  },
  {
    id: 'comfort-and-support',
    order: 3,
    title: 'Comfort, Movement, and Support Skills',
    summary: 'Practice breathing, movement, comfort, and support-person techniques.',
    estimatedMinutes: 30,
    recommendedWeeks: '28–36',
  },
  {
    id: 'flexible-decisions',
    order: 4,
    title: 'Interventions and Flexible Decisions',
    summary: 'Prepare balanced questions for monitoring, pain relief, induction, and plan changes.',
    estimatedMinutes: 30,
    recommendedWeeks: '28–36',
  },
  {
    id: 'feeding-and-newborn-care',
    order: 5,
    title: 'Feeding and Newborn Care',
    summary: 'Build a flexible feeding plan and prepare for safe sleep and newborn support.',
    estimatedMinutes: 30,
    recommendedWeeks: '30–38',
  },
  {
    id: 'postpartum-and-red-flags',
    order: 6,
    title: 'Postpartum Recovery, Mood, and Red Flags',
    summary: 'Plan recovery support, visits, and when to seek help for parent or baby.',
    estimatedMinutes: 30,
    recommendedWeeks: '32–40',
  },
];

export function recommendedModule(gestationalWeek: number): CourseModule {
  const windows = courseModules.map((module) => {
    const [start] = module.recommendedWeeks.split('–').map(Number);
    return { module, start };
  });
  const current = windows.filter(({ start }) => start <= gestationalWeek).at(-1);

  return current?.module ?? courseModules[0];
}
