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

export type PreparingForLaborDraftPackageEntry =
  PreparingForLaborPlacementInput & {
    title: string;
    body: string;
    sourceIds: string[];
    mediaIds: [];
  };

export const PREPARING_FOR_LABOR_MANIFEST =
  authoringManifest as PreparingForLaborManifest;

/**
 * The reviewed source dossier translates the manifest's semantic source slots
 * into the exact Source Library record IDs that may be attached to a draft.
 * These IDs are still verified against the live Source Library before any
 * package draft is created.
 */
export const PREPARING_FOR_LABOR_SOURCE_IDS_BY_SLOT: Record<
  string,
  string[]
> = {
  'preparing-labor-education-source': [
    'acog-how-to-tell-when-labor-begins',
    'nichd-stages-of-labor',
  ],
  'preparing-labor-contact-plan-source': [
    'acog-how-to-tell-when-labor-begins',
    'acog-urgent-maternal-warning-signs',
  ],
  'preparing-labor-comfort-support-source': [
    'acog-pain-relief-labor-delivery',
    'acog-limit-intervention-labor-birth',
  ],
  'preparing-labor-arrival-preparation-source': [
    'acog-how-to-tell-when-labor-begins',
    'acog-car-safety',
  ],
  'preparing-labor-safety-escalation-source': [
    'acog-urgent-maternal-warning-signs',
  ],
};

type DraftCopy = {
  title: string;
  body: string;
};

const reusableSafetyCardCopy =
  "This lesson is for education and preparation. It cannot assess symptoms or replace instructions from your own care team. If you think you have an emergency, are in immediate danger, or have severe symptoms, call 911 or your local emergency number. For other concerns, follow your care team's instructions or contact them directly.";

/**
 * Clinician-reviewed draft copy for every approved manifest block. This is
 * deliberately a package of proposed drafts, not publication-ready content:
 * approval, next-review dates, media approval, and learner publication remain
 * separate governed actions.
 */
const PREPARING_FOR_LABOR_DRAFT_COPY_BY_BLOCK_ID: Record<string, DraftCopy> = {
  'understanding-labor-purpose': {
    title: 'Preparing for labor',
    body: 'Labor can look and feel different from one person to another, and the same person may have a different experience in a future pregnancy. This lesson can help you prepare questions and a communication plan, but it cannot determine whether labor has begun for you.',
  },
  'understanding-labor-changes-over-time': {
    title: 'Notice changes and use your plan',
    body: '**Notice change, then use your plan.** If you notice changes that concern you, use the instructions your own obstetric practice or birth setting has given you. Individual guidance can differ based on your pregnancy and planned place of birth.',
  },
  'understanding-labor-personal-instructions': {
    title: 'Have your contact instructions ready',
    body: 'Before labor begins, ask your care team what information they want you to have ready if you need to call. Consider writing down the best daytime and after-hours contact numbers and the place they want you to contact first.',
  },
  'understanding-labor-care-team-question': {
    title: 'Questions for your care team',
    body: 'What changes or questions would you like to discuss with your care team before labor begins?',
  },
  'understanding-labor-sources': {
    title: 'Reviewed sources',
    body: 'This lesson will display clinician-reviewed sources when it is published.',
  },
  'understanding-labor-emergency-help': {
    title: 'When to get emergency help',
    body: reusableSafetyCardCopy,
  },
  'contact-care-team-instructions-vary': {
    title: 'Your instructions are personal',
    body: 'Your obstetric practice, birth setting, health history, and pregnancy plan help determine the instructions that are right for you. Confirm your own plan before you need it rather than relying on a general rule from an app or class.',
  },
  'contact-care-team-confirm-plan': {
    title: 'Confirm your contact plan',
    body: 'Confirm the number or portal your practice wants you to use during office hours.\nConfirm the after-hours, labor-and-delivery, or triage contact process.\nConfirm the destination or location your team wants you to use if they ask you to come in.\nDiscuss how your support person can help you make a call or arrange transportation.',
  },
  'contact-care-team-save-details': {
    title: 'Save your contact details',
    body: 'Keep your contact details and questions where you can find them. You can add questions to your private Birth Readiness Brief in the final lesson.',
  },
  'contact-care-team-education-boundary': {
    title: 'Education cannot replace your plan',
    body: '**Your plan is personal.** This course cannot decide when you should call or where you should go. Follow the instructions from your own care team when you have a concern.',
  },
  'contact-care-team-sources': {
    title: 'Reviewed sources',
    body: 'This lesson will display clinician-reviewed sources when it is published.',
  },
  'contact-care-team-emergency-help': {
    title: 'When to get emergency help',
    body: reusableSafetyCardCopy,
  },
  'comfort-support-preferences-context': {
    title: 'Your comfort and support preferences',
    body: 'Comfort and support preferences are personal. You may want to discuss what helps you feel informed, respected, and supported, while staying open to changes that your care team recommends for your situation.',
  },
  'comfort-support-categories': {
    title: 'Topics to discuss',
    body: '**Topics to discuss, not a prescription.** You may want to ask about communication preferences, movement or position choices, rest, hydration or food policies, your environment, support people, and available pain-relief options. What is appropriate can vary by setting and clinical circumstances.',
  },
  'comfort-support-discussion-topics': {
    title: 'Comfort and support topics',
    body: 'How I prefer information and consent conversations to happen\nWho I want with me for support, if available and allowed\nComfort items or environmental preferences I may want to ask about\nQuestions about movement, rest, hydration, food, or pain-relief options\nWhat my support person can do to help me communicate',
  },
  'comfort-support-reflection-question': {
    title: 'What helps you feel supported?',
    body: 'What helps you feel supported, informed, and able to participate in decisions?',
  },
  'comfort-support-save-preferences': {
    title: 'Save preferences to discuss',
    body: 'You may want to bring these questions or preferences to a future conversation with your care team or support person.',
  },
  'comfort-support-sources': {
    title: 'Reviewed sources',
    body: 'This lesson will display clinician-reviewed sources when it is published.',
  },
  'comfort-support-emergency-help': {
    title: 'When to get emergency help',
    body: reusableSafetyCardCopy,
  },
  'arriving-prepared-course-summary': {
    title: 'Arriving prepared',
    body: 'Preparing for labor can include practical logistics as well as questions about communication and support. A written list can help you remember what you want to discuss, but your care team remains the best source for instructions that apply to you.',
  },
  'arriving-prepared-readiness-topics': {
    title: 'Readiness topics',
    body: 'Care-team and after-hours contact details\nTransportation and support-person plan\nQuestions about the admitting location, identification, paperwork, visitor policies, and available services\nQuestions about what to bring or prepare for your birth setting\nPlan for an appropriate car seat before bringing a baby home',
  },
  'arriving-prepared-open-brief': {
    title: 'Open your Birth Readiness Brief',
    body: 'Open your private Birth Readiness Brief to save discussion questions and mark the preparation topics you have already considered. This brief is for you; it is not automatically shared with your care team.',
  },
  'arriving-prepared-brief-privacy': {
    title: 'Your brief stays private',
    body: '**Your brief stays private.** BabyReady does not automatically send, route, or place your Birth Readiness Brief into your clinical record. Bring it to a conversation only if you choose to do so.',
  },
  'arriving-prepared-sources': {
    title: 'Reviewed sources',
    body: 'This lesson will display clinician-reviewed sources when it is published.',
  },
  'arriving-prepared-emergency-help': {
    title: 'When to get emergency help',
    body: reusableSafetyCardCopy,
  },
};

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

function sourceIdsForPreparingForLaborManifestBlock(
  block: PreparingForLaborManifestBlock,
): string[] {
  return [
    ...new Set(
      block.sourceSlotIds.flatMap((sourceSlotId) => {
        const sourceIds = PREPARING_FOR_LABOR_SOURCE_IDS_BY_SLOT[sourceSlotId];
        if (!sourceIds) {
          throw new Error(
            `Preparing for Labor source slot "${sourceSlotId}" does not have a reviewed source-library mapping.`,
          );
        }

        return sourceIds;
      }),
    ),
  ];
}

/**
 * Returns every manifest block as a complete, governed draft payload. This
 * helper never reads or writes Firestore; the service layer checks the live
 * Source Library and creates only blocks that do not already exist.
 */
export function getPreparingForLaborDraftPackageEntries(): PreparingForLaborDraftPackageEntry[] {
  return PREPARING_FOR_LABOR_MANIFEST.lessons.flatMap((lesson) =>
    lesson.blocks.map((block) => {
      const placement = getPreparingForLaborManifestPlacement(
        lesson.lessonId,
        block.id,
      );
      const copy = PREPARING_FOR_LABOR_DRAFT_COPY_BY_BLOCK_ID[block.id];

      if (!placement || !copy) {
        throw new Error(
          `Preparing for Labor draft package is missing reviewed copy for "${lesson.lessonId}/${block.id}".`,
        );
      }

      return {
        ...placement,
        title: copy.title,
        body: copy.body,
        sourceIds: sourceIdsForPreparingForLaborManifestBlock(block),
        mediaIds: [],
      };
    }),
  );
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
