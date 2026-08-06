import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

import {
  getAuditDashboardReportPageCount,
} from '../lib/auditDashboardPdfHtml';
import { requireAuth, requireFirestore } from '../lib/firebase';
import type {
  AuditReportFilterSnapshot,
  AuditReportManifest,
  ComparisonAuditExportDashboardEntry,
  ComparisonAuditExportRoute,
} from '../models/course';

type RecordAuditReportManifestInput = {
  reportId: string;
  exportRoute: ComparisonAuditExportRoute;
  filterSnapshot: AuditReportFilterSnapshot;
  entries: ComparisonAuditExportDashboardEntry[];
};

function readableManifestError(error: unknown): string {
  if (typeof error === 'object' && error && 'message' in error) {
    return String(error.message);
  }

  return 'BabyReady could not load the audit report manifest.';
}

async function requireAdminClaim(): Promise<string> {
  const auth = requireAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error(
      'Sign in with a clinician or administrator account to verify an audit report.',
    );
  }

  const token = await user.getIdTokenResult();
  if (token.claims.admin !== true) {
    throw new Error(
      'Audit report manifests require the Firebase admin custom claim.',
    );
  }

  return user.uid;
}

function auditReportManifestReference(
  reportId: string,
  firestore = requireFirestore(),
) {
  return doc(firestore, 'auditReportManifests', reportId);
}

export function normalizeAuditReportId(reportId: string): string {
  return reportId.trim().toUpperCase();
}

export async function recordAuditReportManifest(
  input: RecordAuditReportManifestInput,
): Promise<AuditReportManifest> {
  const reportId = normalizeAuditReportId(input.reportId);
  if (!reportId) {
    throw new Error('A report ID is required to create an audit manifest.');
  }
  if (input.entries.length === 0) {
    throw new Error(
      'An audit report manifest requires at least one immutable audit record.',
    );
  }

  const exportedBy = await requireAdminClaim();
  const reference = auditReportManifestReference(reportId);
  const auditRecordIds = input.entries.map((entry) => entry.id);
  const auditRecordPaths = input.entries.map((entry) => entry.documentPath);
  const pageCount = getAuditDashboardReportPageCount(input.entries.length);

  const manifest = {
    id: reportId,
    reportId,
    exportFormat: 'pdf' as const,
    exportRoute: input.exportRoute,
    exportedBy,
    exportedAt: serverTimestamp(),
    filterSnapshot: input.filterSnapshot,
    recordCount: input.entries.length,
    pageCount,
    auditRecordIds,
    auditRecordPaths,
  } satisfies AuditReportManifest;

  await setDoc(reference, manifest);

  return manifest;
}

export async function lookupAuditReportManifest(
  reportIdInput: string,
): Promise<AuditReportManifest | null> {
  const reportId = normalizeAuditReportId(reportIdInput);
  if (!reportId) {
    throw new Error('Enter the report ID shown in the audit PDF footer.');
  }

  await requireAdminClaim();
  try {
    const snapshot = await getDoc(auditReportManifestReference(reportId));

    return snapshot.exists()
      ? ({
          ...(snapshot.data() as AuditReportManifest),
          id: snapshot.id,
        } satisfies AuditReportManifest)
      : null;
  } catch (error) {
    throw new Error(readableManifestError(error));
  }
}
