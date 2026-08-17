const courseId = 'preparing-for-labor';
const moduleId = 'labor-readiness';
const lessonId = 'arriving-prepared';

export const readinessReconciliationConfirmation =
  'RECONCILE_PREPARING_FOR_LABOR_READINESS_BLOCKS';

export const preparingForLaborReadinessReconciliationTargets = {
  correct: {
    label: 'Correct manifest placement',
    blockId: 'arriving-prepared-readiness-topics',
    expected: {
      displayOrder: 2,
      type: 'checklist',
      isClinicalClaim: true,
      publicationState: 'frozen',
    },
    path: `courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/contentBlocks/arriving-prepared-readiness-topics`,
  },
  typo: {
    label: 'Malformed typo placement',
    blockId: 'arrriving-prepared-readiness-topics',
    expected: {
      publicationState: 'draft',
    },
    path: `courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/contentBlocks/arrriving-prepared-readiness-topics`,
  },
};

function normalizedArray(value) {
  return Array.isArray(value) ? [...value].map(String).sort() : [];
}

function governedProjection(record) {
  return {
    title: typeof record.title === 'string' ? record.title : '',
    body: typeof record.body === 'string' ? record.body : '',
    displayOrder: record.displayOrder ?? null,
    type: record.type ?? null,
    isClinicalClaim: record.isClinicalClaim === true,
    sourceIds: normalizedArray(record.sourceIds),
    mediaIds: normalizedArray(record.mediaIds),
  };
}

export function readinessReconciliationPreflight(correctData, typoData) {
  const { correct, typo } = preparingForLaborReadinessReconciliationTargets;
  const errors = [];

  if (!correctData) {
    errors.push(`Missing required canonical document: ${correct.path}.`);
  }
  if (!typoData) {
    errors.push(`Missing required malformed document: ${typo.path}.`);
  }
  if (errors.length) {
    return { eligible: false, errors };
  }

  const correctProjection = governedProjection(correctData);
  const typoProjection = governedProjection(typoData);

  if (correctData.publicationState !== correct.expected.publicationState) {
    errors.push(
      `Canonical document must be ${correct.expected.publicationState}; found ${String(correctData.publicationState)}.`,
    );
  }
  if (typoData.publicationState !== typo.expected.publicationState) {
    errors.push(
      `Malformed document must be ${typo.expected.publicationState}; found ${String(typoData.publicationState)}.`,
    );
  }
  for (const [field, expected] of Object.entries(correct.expected)) {
    if (field === 'publicationState') {
      continue;
    }
    if (correctProjection[field] !== expected) {
      errors.push(
        `Canonical document ${field} must be ${JSON.stringify(expected)}; found ${JSON.stringify(correctProjection[field])}.`,
      );
    }
  }
  if (JSON.stringify(correctProjection) !== JSON.stringify(typoProjection)) {
    errors.push(
      'Canonical and malformed documents do not have an identical governed content projection.',
    );
  }

  return {
    eligible: errors.length === 0,
    errors,
    correctProjection,
    typoProjection,
  };
}
