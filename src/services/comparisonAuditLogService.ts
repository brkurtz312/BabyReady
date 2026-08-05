import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore';

import { db, requireAuth, requireFirestore } from '../lib/firebase';
import type {
  ClinicalContentBlock,
  ComparisonAuditExportLog,
  ComparisonAuditExportRoute,
} from '../models/course';

export type ComparisonAuditExportLogState =
  | { status: 'unconfigured'; entries: []; error: null }
  | { status: 'loading'; entries: ComparisonAuditExportLog[]; error: null }
  | { status: 'ready'; entries: ComparisonAuditExportLog[]; error: null }
  | { status: 'error'; entries: ComparisonAuditExportLog[]; error: string };

type RecordComparisonAuditExportInput = {
  block: ClinicalContentBlock;
  baselineVersionId: string;
  baselineVersionNumber: number;
  comparisonVersionId: string;
  comparisonVersionNumber: number;
  exportRoute: ComparisonAuditExportRoute;
};

function readableAuditLogError(error: unknown): string {
  if (typeof error === 'object' && error && 'message' in error) {
    return String(error.message);
  }

  return 'BabyReady could not load the audit export log.';
}

async function requireAdminClaim(): Promise<string> {
  const auth = requireAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Sign in with a clinician or administrator account to export an audit PDF.');
  }

  const token = await user.getIdTokenResult();
  if (token.claims.admin !== true) {
    throw new Error('Audit PDF exports require the Firebase admin custom claim.');
  }

  return user.uid;
}

function auditExportCollection(
  block: ClinicalContentBlock,
  firestore = requireFirestore(),
) {
  return collection(
    firestore,
    'courses',
    block.courseId,
    'modules',
    block.moduleId,
    'lessons',
    block.lessonId,
    'contentBlocks',
    block.id,
    'comparisonAuditExports',
  );
}

export async function recordComparisonAuditExport(
  input: RecordComparisonAuditExportInput,
): Promise<void> {
  if (input.baselineVersionId === input.comparisonVersionId) {
    throw new Error('Choose two distinct revisions before exporting a comparison audit.');
  }

  const exportedBy = await requireAdminClaim();
  const reference = doc(auditExportCollection(input.block));

  await setDoc(reference, {
    id: reference.id,
    courseId: input.block.courseId,
    moduleId: input.block.moduleId,
    lessonId: input.block.lessonId,
    contentBlockId: input.block.id,
    baselineVersionId: input.baselineVersionId,
    baselineVersionNumber: input.baselineVersionNumber,
    comparisonVersionId: input.comparisonVersionId,
    comparisonVersionNumber: input.comparisonVersionNumber,
    exportFormat: 'pdf',
    exportRoute: input.exportRoute,
    exportedBy,
    exportedAt: serverTimestamp(),
  } satisfies ComparisonAuditExportLog);
}

export function subscribeToComparisonAuditExportLog(
  block: ClinicalContentBlock,
  onChange: (state: ComparisonAuditExportLogState) => void,
): Unsubscribe | null {
  const firestore = db;
  if (!firestore) {
    onChange({ status: 'unconfigured', entries: [], error: null });
    return null;
  }

  onChange({ status: 'loading', entries: [], error: null });
  return onSnapshot(
    query(
      auditExportCollection(block, firestore),
      orderBy('exportedAt', 'desc'),
      limit(10),
    ),
    (snapshot) => {
      onChange({
        status: 'ready',
        entries: snapshot.docs.map((entry) => ({
          ...(entry.data() as ComparisonAuditExportLog),
          id: entry.id,
        })),
        error: null,
      });
    },
    (error) => {
      onChange({
        status: 'error',
        entries: [],
        error: readableAuditLogError(error),
      });
    },
  );
}
