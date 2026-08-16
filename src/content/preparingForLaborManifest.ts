import authoringManifest from '../../docs/content/preparing-for-labor-authoring-manifest.v1.json';

export type PreparingForLaborContentType =
  | 'text'
  | 'callout'
  | 'checklist'
  | 'question'
  | 'audio'
  | 'video'
  | 'figure'
  | 'citation'
  | 'emergency_card'
  | 'artifact_prompt';

export type PreparingForLaborManifestBlock = {
  id: string;
  displayOrder: number;
  type: PreparingForLaborContentType;
  isClinicalClaim: boolean;
  sourceSlotIds: string[];
};

export type PreparingForLaborManifestLesson = {
  lessonId: string;
  blocks: PreparingForLaborManifestBlock[];
};

type PreparingForLaborManifest = {
  course: {
    id: string;
    moduleId: string;
  };
  lessons: PreparingForLaborManifestLesson[];
};

export type PreparingForLaborPlacementInput = {
  courseId: string;
  moduleId: string;
  lessonId: string;
  id: string;
  displayOrder: number;
  type: PreparingForLaborContentType;
  isClinicalClaim: boolean;
};

export const PREPARING_FOR_LABOR_MANIFEST =
  authoringManifest as PreparingForLaborManifest;

export function isPreparingForLaborCourse(courseId: string): boolean {
  return courseId === PREPARING_FOR_LABOR_MANIFEST.course.id;
}

export function findPreparingForLaborManifestBlock(
  moduleId: string,
  lessonId: string,
  contentBlockId: string,
): PreparingForLaborManifestBlock | undefined {
  if (moduleId !== PREPARING_FOR_LABOR_MANIFEST.course.moduleId) {
    return undefined;
  }

  return PREPARING_FOR_LABOR_MANIFEST.lessons
    .find((lesson) => lesson.lessonId === lessonId)
    ?.blocks.find((block) => block.id === contentBlockId);
}

export function findPreparingForLaborManifestLesson(
  lessonId: string,
): PreparingForLaborManifestLesson | undefined {
  return PREPARING_FOR_LABOR_MANIFEST.lessons.find(
    (lesson) => lesson.lessonId === lessonId,
  );
}

/**
 * Returns the complete immutable placement for a reviewed authoring-plan
 * block. Authoring UIs should use this rather than asking an author to
 * manually enter its course/module path, learner order, type, or claim flag.
 */
export function getPreparingForLaborManifestPlacement(
  lessonId: string,
  contentBlockId: string,
): PreparingForLaborPlacementInput | undefined {
  const block = findPreparingForLaborManifestBlock(
    PREPARING_FOR_LABOR_MANIFEST.course.moduleId,
    lessonId,
    contentBlockId,
  );

  return block
    ? {
        courseId: PREPARING_FOR_LABOR_MANIFEST.course.id,
        moduleId: PREPARING_FOR_LABOR_MANIFEST.course.moduleId,
        lessonId,
        id: block.id,
        displayOrder: block.displayOrder,
        type: block.type,
        isClinicalClaim: block.isClinicalClaim,
      }
    : undefined;
}

/**
 * Preparing for Labor is intentionally authored against a fixed, reviewed
 * structure. This rejects accidental paths, IDs, order numbers, block types,
 * and clinical-claim flags before a governed block is written or advanced.
 */
export function assertPreparingForLaborManifestPlacement(
  input: PreparingForLaborPlacementInput,
): void {
  if (!isPreparingForLaborCourse(input.courseId)) {
    return;
  }

  const expectedModuleId = PREPARING_FOR_LABOR_MANIFEST.course.moduleId;
  if (input.moduleId !== expectedModuleId) {
    throw new Error(
      `Preparing for Labor uses module ID "${expectedModuleId}". Update the module ID before continuing.`,
    );
  }

  const lesson = PREPARING_FOR_LABOR_MANIFEST.lessons.find(
    (candidate) => candidate.lessonId === input.lessonId,
  );
  if (!lesson) {
    throw new Error(
      `Lesson ID "${input.lessonId}" is not in the Preparing for Labor authoring manifest. Check the lesson ID for a typo or update the reviewed manifest first.`,
    );
  }

  const expected = lesson.blocks.find((block) => block.id === input.id);
  if (!expected) {
    throw new Error(
      `Content block ID "${input.id}" is not approved for "${input.lessonId}". Check the block ID for a typo or update the reviewed manifest first.`,
    );
  }

  const mismatches: string[] = [];
  if (input.displayOrder !== expected.displayOrder) {
    mismatches.push(`display order ${expected.displayOrder}`);
  }
  if (input.type !== expected.type) {
    mismatches.push(`type "${expected.type}"`);
  }
  if (input.isClinicalClaim !== expected.isClinicalClaim) {
    mismatches.push(
      `isClinicalClaim ${expected.isClinicalClaim ? 'true' : 'false'}`,
    );
  }

  if (mismatches.length) {
    throw new Error(
      `The Preparing for Labor manifest requires ${input.id} to use ${mismatches.join(', ')}. Correct the block configuration before continuing.`,
    );
  }
}
