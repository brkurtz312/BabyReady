import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import {
  buildComparisonAuditHtml,
  type ComparisonAuditHtmlInput,
} from '../lib/comparisonAuditHtml';

export type ComparisonAuditPdfExportResult =
  | 'print-dialog-opened'
  | 'share-dialog-opened'
  | 'file-created';

export async function exportComparisonAuditPdf(
  input: ComparisonAuditHtmlInput,
): Promise<ComparisonAuditPdfExportResult> {
  const html = buildComparisonAuditHtml(input);

  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return 'print-dialog-opened';
  }

  const printResult = await Print.printToFileAsync({ html });
  const sharingAvailable = await Sharing.isAvailableAsync();
  if (!sharingAvailable) {
    return 'file-created';
  }

  await Sharing.shareAsync(printResult.uri, {
    UTI: 'com.adobe.pdf',
    dialogTitle: `BabyReady audit: v${input.baseline.versionNumber} to v${input.comparison.versionNumber}`,
    mimeType: 'application/pdf',
  });

  return 'share-dialog-opened';
}
