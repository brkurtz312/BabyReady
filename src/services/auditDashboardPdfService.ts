import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import {
  buildAuditDashboardPdfHtml,
  type AuditDashboardPdfHtmlInput,
} from '../lib/auditDashboardPdfHtml';

export type AuditDashboardPdfExportResult =
  | 'print-dialog-opened'
  | 'share-dialog-opened'
  | 'file-created';

function openBrowserPrintDialog(html: string): Promise<void> {
  const reportWindow = window.open('', '_blank');
  if (!reportWindow) {
    throw new Error(
      'The audit report could not open. Allow pop-ups for BabyReady and try again.',
    );
  }

  return new Promise((resolve) => {
    let didPrint = false;
    const printReport = () => {
      if (didPrint) {
        return;
      }

      didPrint = true;
      reportWindow.focus();
      reportWindow.print();
      resolve();
    };

    reportWindow.addEventListener('load', printReport, { once: true });
    reportWindow.document.open();
    reportWindow.document.write(html);
    reportWindow.document.close();

    if (reportWindow.document.readyState === 'complete') {
      printReport();
    }
  });
}

export async function exportAuditDashboardPdf(
  input: AuditDashboardPdfHtmlInput,
): Promise<AuditDashboardPdfExportResult> {
  if (input.entries.length === 0) {
    throw new Error('Adjust the dashboard filters so at least one audit record is included.');
  }

  const html = buildAuditDashboardPdfHtml(input);

  if (Platform.OS === 'web') {
    await openBrowserPrintDialog(html);
    return 'print-dialog-opened';
  }

  const printResult = await Print.printToFileAsync({ html });
  if (!(await Sharing.isAvailableAsync())) {
    return 'file-created';
  }

  await Sharing.shareAsync(printResult.uri, {
    UTI: 'com.adobe.pdf',
    dialogTitle: 'BabyReady filtered audit-log report',
    mimeType: 'application/pdf',
  });
  return 'share-dialog-opened';
}
