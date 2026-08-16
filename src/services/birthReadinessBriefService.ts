import {
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';

import { db } from '../lib/firebase';
import {
  BIRTH_READINESS_BRIEF_COURSE_ID,
  BIRTH_READINESS_BRIEF_ID,
  BIRTH_READINESS_BRIEF_MAX_DISCUSSION_QUESTIONS,
  BIRTH_READINESS_BRIEF_MAX_QUESTION_LENGTH,
  BIRTH_READINESS_BRIEF_SCHEMA_VERSION,
  birthReadinessItemKeys,
  type BirthReadinessBrief,
  type BirthReadinessItems,
} from '../models/birthReadinessBrief';

export type BirthReadinessBriefState =
  | { status: 'unconfigured'; brief: null; error: null }
  | { status: 'unauthenticated'; brief: null; error: null }
  | { status: 'loading'; brief: BirthReadinessBrief | null; error: null }
  | { status: 'ready'; brief: BirthReadinessBrief | null; error: null }
  | { status: 'error'; brief: BirthReadinessBrief | null; error: string };

export type SaveBirthReadinessBriefInput = {
  userId: string | null | undefined;
  readinessItems: BirthReadinessItems;
  discussionQuestions: readonly string[];
};

function readableError(error: unknown): string {
  if (typeof error === 'object' && error && 'message' in error) {
    return String(error.message);
  }

  return 'BabyReady could not load your Birth Readiness Brief.';
}

function normalizeReadinessItems(input: BirthReadinessItems): BirthReadinessItems {
  const keys = Object.keys(input);
  if (
    keys.length !== birthReadinessItemKeys.length ||
    !birthReadinessItemKeys.every((key) =>
      Object.prototype.hasOwnProperty.call(input, key),
    )
  ) {
    throw new Error('Your readiness selections are incomplete. Please try again.');
  }

  const readinessItems = {} as BirthReadinessItems;
  for (const key of birthReadinessItemKeys) {
    if (typeof input[key] !== 'boolean') {
      throw new Error('Each readiness selection must be marked yes or no.');
    }
    readinessItems[key] = input[key];
  }

  return readinessItems;
}

/**
 * Applies the same bounded, trimmed question policy that the Firestore rules
 * enforce. Empty questions are rejected rather than persisted as placeholders.
 */
export function normalizeDiscussionQuestions(
  discussionQuestions: readonly string[],
): string[] {
  if (
    !Array.isArray(discussionQuestions) ||
    discussionQuestions.length > BIRTH_READINESS_BRIEF_MAX_DISCUSSION_QUESTIONS
  ) {
    throw new Error(
      `Add no more than ${BIRTH_READINESS_BRIEF_MAX_DISCUSSION_QUESTIONS} discussion questions.`,
    );
  }

  return discussionQuestions.map((question) => {
    if (typeof question !== 'string') {
      throw new Error('Each discussion question must be text.');
    }

    const trimmed = question.trim();
    if (!trimmed) {
      throw new Error('Remove empty discussion questions before saving.');
    }
    if (trimmed.length > BIRTH_READINESS_BRIEF_MAX_QUESTION_LENGTH) {
      throw new Error(
        `Each discussion question must be ${BIRTH_READINESS_BRIEF_MAX_QUESTION_LENGTH} characters or fewer.`,
      );
    }

    return trimmed;
  });
}

function briefReference(userId: string) {
  const firestore = db;
  return firestore
    ? doc(
        firestore,
        'users',
        userId,
        'birthReadinessBriefs',
        BIRTH_READINESS_BRIEF_ID,
      )
    : null;
}

/**
 * Subscribes only to the deterministic brief for the supplied authenticated
 * learner. As with learner progress, callers without an authenticated user ID
 * receive an explicit unavailable state rather than a local substitute.
 */
export function subscribeToBirthReadinessBrief(
  userId: string | null | undefined,
  onChange: (state: BirthReadinessBriefState) => void,
): Unsubscribe | null {
  if (!db) {
    onChange({ status: 'unconfigured', brief: null, error: null });
    return null;
  }

  if (!userId) {
    onChange({ status: 'unauthenticated', brief: null, error: null });
    return null;
  }

  const reference = briefReference(userId);
  if (!reference) {
    onChange({ status: 'unconfigured', brief: null, error: null });
    return null;
  }

  onChange({ status: 'loading', brief: null, error: null });
  return onSnapshot(
    reference,
    (snapshot) => {
      onChange({
        status: 'ready',
        brief: snapshot.exists()
          ? ({
              ...(snapshot.data() as BirthReadinessBrief),
            } satisfies BirthReadinessBrief)
          : null,
        error: null,
      });
    },
    (error) => {
      onChange({
        status: 'error',
        brief: null,
        error: readableError(error),
      });
    },
  );
}

/**
 * Saves the one Preparing for Labor brief for a learner. On creation both
 * timestamps use Firestore server timestamps; later saves preserve createdAt.
 * The existence check and write run in one transaction, so a concurrent first
 * save retries as an update rather than attempting a second create. Rules
 * require that exact timestamp pattern so clients cannot choose or backdate it.
 */
export async function saveBirthReadinessBrief(
  input: SaveBirthReadinessBriefInput,
): Promise<'saved' | 'unavailable'> {
  const firestore = db;
  if (!firestore || !input.userId) {
    return 'unavailable';
  }

  const readinessItems = normalizeReadinessItems(input.readinessItems);
  const discussionQuestions = normalizeDiscussionQuestions(input.discussionQuestions);
  const reference = doc(
    firestore,
    'users',
    input.userId,
    'birthReadinessBriefs',
    BIRTH_READINESS_BRIEF_ID,
  );

  await runTransaction(firestore, async (transaction) => {
    const existing = await transaction.get(reference);

    transaction.set(
      reference,
      {
        id: BIRTH_READINESS_BRIEF_ID,
        courseId: BIRTH_READINESS_BRIEF_COURSE_ID,
        schemaVersion: BIRTH_READINESS_BRIEF_SCHEMA_VERSION,
        readinessItems,
        discussionQuestions,
        ...(existing.exists() ? {} : { createdAt: serverTimestamp() }),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  });

  return 'saved';
}
