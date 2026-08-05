import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';

import { db, requireAuth, requireFirestore } from '../lib/firebase';
import type { ContentSource } from '../models/course';

export type SaveContentSourceInput = {
  id: string;
  organization: string;
  title: string;
  url: string;
  lastReviewedAt: Date;
  nextReviewAt: Date;
};

export type SourceLibraryState =
  | { status: 'unconfigured'; sources: []; error: null }
  | { status: 'loading'; sources: ContentSource[]; error: null }
  | { status: 'ready'; sources: ContentSource[]; error: null }
  | { status: 'error'; sources: ContentSource[]; error: string };

async function requireAdminClaim(): Promise<string> {
  const user = requireAuth().currentUser;
  if (!user) {
    throw new Error('Sign in with an administrator account to manage source records.');
  }

  const token = await user.getIdTokenResult();
  if (token.claims.admin !== true) {
    throw new Error('Source records require the Firebase admin custom claim.');
  }

  return user.uid;
}

function readableSourceError(error: unknown): string {
  if (typeof error === 'object' && error && 'message' in error) {
    return String(error.message);
  }

  return 'BabyReady could not load the source library.';
}

function dateValue(value: unknown): Date | null {
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (value instanceof Date) {
    return value;
  }
  if (
    typeof value === 'object' &&
    value &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  ) {
    const date = value.toDate();
    return date instanceof Date ? date : null;
  }

  return null;
}

function validateSourceInput(input: SaveContentSourceInput): void {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.id)) {
    throw new Error('Use lowercase letters, numbers, and single hyphens for the source ID.');
  }
  if (!input.organization.trim() || !input.title.trim()) {
    throw new Error('Organization and title are required.');
  }
  try {
    const url = new URL(input.url);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      throw new Error();
    }
  } catch {
    throw new Error('Use a complete http or https source URL.');
  }
  if (input.nextReviewAt.getTime() <= input.lastReviewedAt.getTime()) {
    throw new Error('The next review date must be later than the last reviewed date.');
  }
}

export function subscribeToContentSourceLibrary(
  onChange: (state: SourceLibraryState) => void,
): Unsubscribe | null {
  if (!db) {
    onChange({ status: 'unconfigured', sources: [], error: null });
    return null;
  }

  onChange({ status: 'loading', sources: [], error: null });

  return onSnapshot(
    query(collection(db, 'sources'), orderBy('updatedAt', 'desc'), limit(100)),
    (snapshot) => {
      onChange({
        status: 'ready',
        sources: snapshot.docs.map((source) => ({
          ...(source.data() as ContentSource),
          id: source.id,
        })),
        error: null,
      });
    },
    (error) => {
      onChange({ status: 'error', sources: [], error: readableSourceError(error) });
    },
  );
}

export async function saveContentSourceDraft(
  input: SaveContentSourceInput,
): Promise<void> {
  await requireAdminClaim();
  validateSourceInput(input);

  await setDoc(
    doc(requireFirestore(), 'sources', input.id),
    {
      id: input.id,
      organization: input.organization,
      title: input.title,
      url: input.url,
      lastReviewedAt: Timestamp.fromDate(input.lastReviewedAt),
      nextReviewAt: Timestamp.fromDate(input.nextReviewAt),
      publicationState: 'draft',
      updatedAt: serverTimestamp(),
    } satisfies ContentSource,
    { merge: true },
  );
}

export async function publishContentSource(sourceId: string): Promise<void> {
  await requireAdminClaim();

  const firestore = requireFirestore();
  const reference = doc(firestore, 'sources', sourceId);
  const snapshot = await getDoc(reference);
  if (!snapshot.exists()) {
    throw new Error('Save the source record before publishing it.');
  }

  const source = snapshot.data() as Partial<ContentSource>;
  const lastReviewedAt = dateValue(source.lastReviewedAt);
  const nextReviewAt = dateValue(source.nextReviewAt);
  if (
    !source.organization?.trim() ||
    !source.title?.trim() ||
    !source.url ||
    !lastReviewedAt ||
    !nextReviewAt
  ) {
    throw new Error('The source record is incomplete. Add all fields before publishing.');
  }

  validateSourceInput({
    id: sourceId,
    organization: source.organization,
    title: source.title,
    url: source.url,
    lastReviewedAt,
    nextReviewAt,
  });
  if (nextReviewAt.getTime() <= Date.now()) {
    throw new Error('Set a future next-review date before publishing this source.');
  }

  await setDoc(
    reference,
    {
      publicationState: 'published',
      publishedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function freezeContentSource(
  sourceId: string,
  freezeReason: string,
): Promise<void> {
  const adminId = await requireAdminClaim();
  if (!freezeReason.trim()) {
    throw new Error('Document why this source is being frozen.');
  }

  await setDoc(
    doc(requireFirestore(), 'sources', sourceId),
    {
      publicationState: 'frozen',
      frozenAt: serverTimestamp(),
      frozenBy: adminId,
      freezeReason: freezeReason.trim(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
