const courseId = 'preparing-for-labor';
const moduleId = 'labor-readiness';
const lessonId = 'arriving-prepared';

export const preparingForLaborReadinessReconciliationTargets = {
  correct: {
    label: 'Correct manifest placement',
    blockId: 'arriving-prepared-readiness-topics',
    path: `courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/contentBlocks/arriving-prepared-readiness-topics`,
  },
  typo: {
    label: 'Malformed typo placement',
    blockId: 'arrriving-prepared-readiness-topics',
    path: `courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/contentBlocks/arrriving-prepared-readiness-topics`,
  },
};
