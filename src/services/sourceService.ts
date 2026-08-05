import { doc, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';

import { requireAuth, requireFirestore } from '../lib/firebase';
import type { ContentPublicationState, ContentSource } from '../models/course';

export type UpsertContentSourceInput = {
  id: string;
  organization: string;
  title: string;
  url: string;
  lastReviewedAt: Date;
  nextReviewAt: Date;
  publicationState?: ContentPublicationState;
};

async function requireAdminClaim(): Promise<void> {
  const user = requireAuth().currentUser;
  if (!user) {
    throw new Error('Sign in with an administrator account to manage source records.');
  }

  const token = await user.getIdTokenResult();
  if (token.claims.admin !== true) {
    throw new Error('Source records require the Firebase admin custom claim.');
  }
}

export async function upsertContentSource(
  input: UpsertContentSourceInput,
): Promise<void> {
  await requireAdminClaim();

  await setDoc(
    doc(requireFirestore(), 'sources', input.id),
    {
      id: input.id,
      organization: input.organization,
      title: input.title,
      url: input.url,
      lastReviewedAt: Timestamp.fromDate(input.lastReviewedAt),
      nextReviewAt: Timestamp.fromDate(input.nextReviewAt),
      publicationState: input.publicationState ?? 'draft',
      updatedAt: serverTimestamp(),
    } satisfies ContentSource,
    { merge: true },
  );
}
