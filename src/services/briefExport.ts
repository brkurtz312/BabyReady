import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

/**
 * Prints the Birth Readiness Brief, or saves it as a PDF, through the phone's own
 * print and share sheets. Nothing is uploaded: the PDF is made on the device.
 */

/** Opens the print sheet. On the web, a print window with just the brief. */
export async function printBrief(html: string): Promise<void> {
  if (Platform.OS === 'web') {
    const win = window.open('', '_blank');
    if (!win) throw new Error('Allow pop-ups for this site to print your brief.');
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
    return;
  }
  await Print.printAsync({ html });
}

/**
 * Makes a PDF and opens the share sheet, where the learner can save it to Files,
 * email it, or send it to their care team. On the web the print window offers
 * "Save as PDF" instead.
 */
export async function saveBriefAsPdf(html: string): Promise<void> {
  if (Platform.OS === 'web') {
    await printBrief(html);
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  if (!(await Sharing.isAvailableAsync())) {
    await Print.printAsync({ uri });
    return;
  }
  await Sharing.shareAsync(uri, { UTI: 'com.adobe.pdf', mimeType: 'application/pdf', dialogTitle: 'Save your Birth Readiness Brief' });
}
