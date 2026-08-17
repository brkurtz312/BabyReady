const courseId = 'preparing-for-labor';
const moduleId = 'labor-readiness';

/**
 * These records were created under misspelled paths or IDs before the
 * manifest-backed authoring guardrail existed. They are intentionally scoped
 * by their complete Firestore paths so a correct draft can never match.
 *
 * Deleting a parent content-block document does not delete its nested
 * contentVersions subcollection. That preserves the frozen history as audit
 * evidence while removing the stale parent document from active authoring
 * reads and collection-group audits.
 */
export const preparingForLaborTypoArtifacts = [
  {
    lessonId: 'when-to-conact-your-care-team',
    blockId: 'contact-care-team-save-details',
  },
  {
    lessonId: 'when-to-contact-your-care-team',
    blockId: 'contact-care-team-insteuctions-vary',
  },
  {
    lessonId: 'when-to-contact-your-care-team',
    blockId: 'contact-care-team-instruction-vary',
  },
  {
    lessonId: 'comfort-and-support',
    blockId: 'comfort-aupport-emergency-help',
  },
].map((artifact) => ({
  ...artifact,
  path: `courses/${courseId}/modules/${moduleId}/lessons/${artifact.lessonId}/contentBlocks/${artifact.blockId}`,
}));

