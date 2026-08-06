import type { ComparisonAuditExportLog } from '../models/course';

const csvHeaders = [
  'export_id',
  'course_id',
  'module_id',
  'lesson_id',
  'content_block_id',
  'baseline_version_id',
  'baseline_version_number',
  'comparison_version_id',
  'comparison_version_number',
  'export_format',
  'export_route',
  'exported_by',
  'exported_at_iso',
] as const;

function timestampToIso(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (
    typeof value === 'object' &&
    value &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  ) {
    const date = value.toDate();
    if (date instanceof Date) {
      return date.toISOString();
    }
  }

  return '';
}

function spreadsheetSafe(value: string): string {
  return /^[\t\r\n ]*[=+\-@]/.test(value) ? `'${value}` : value;
}

function csvCell(value: string | number): string {
  const normalized = spreadsheetSafe(String(value)).replaceAll('"', '""');
  return `"${normalized}"`;
}

function csvRow(values: Array<string | number>): string {
  return values.map(csvCell).join(',');
}

export function buildAuditExportCsv(
  entries: ComparisonAuditExportLog[],
): string {
  const rows = entries.map((entry) =>
    csvRow([
      entry.id,
      entry.courseId,
      entry.moduleId,
      entry.lessonId,
      entry.contentBlockId,
      entry.baselineVersionId,
      entry.baselineVersionNumber,
      entry.comparisonVersionId,
      entry.comparisonVersionNumber,
      entry.exportFormat,
      entry.exportRoute,
      entry.exportedBy,
      timestampToIso(entry.exportedAt),
    ]),
  );

  return `\uFEFF${csvRow([...csvHeaders])}\r\n${rows.join('\r\n')}\r\n`;
}

export function auditExportCsvFileName(date = new Date()): string {
  return `babyready-audit-export-log-${date.toISOString().slice(0, 10)}.csv`;
}
