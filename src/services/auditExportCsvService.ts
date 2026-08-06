import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import {
  auditExportCsvFileName,
  buildAuditExportCsv,
} from '../lib/auditExportCsv';
import type { ComparisonAuditExportLog } from '../models/course';

export type AuditExportCsvResult =
  | 'browser-download-started'
  | 'share-dialog-opened'
  | 'file-created';

export async function exportAuditLogCsv(
  entries: ComparisonAuditExportLog[],
): Promise<AuditExportCsvResult> {
  if (entries.length === 0) {
    throw new Error('Adjust the dashboard filters so at least one audit record is included.');
  }

  const csv = buildAuditExportCsv(entries);
  const fileName = auditExportCsvFileName();

  if (Platform.OS === 'web') {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.download = fileName;
    anchor.href = url;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    return 'browser-download-started';
  }

  const directory = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!directory) {
    throw new Error('BabyReady could not access device storage for the CSV export.');
  }

  const uri = `${directory}${fileName}`;
  await FileSystem.writeAsStringAsync(uri, csv, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (!(await Sharing.isAvailableAsync())) {
    return 'file-created';
  }

  await Sharing.shareAsync(uri, {
    UTI: 'public.comma-separated-values-text',
    dialogTitle: 'BabyReady filtered audit export',
    mimeType: 'text/csv',
  });
  return 'share-dialog-opened';
}
