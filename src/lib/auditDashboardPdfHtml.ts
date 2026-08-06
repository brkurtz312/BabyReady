import type {
  ComparisonAuditExportLog,
  ComparisonAuditExportRoute,
} from '../models/course';

export type AuditDashboardPdfFilter = {
  label: string;
  value: string;
};

export type AuditDashboardPdfHtmlInput = {
  entries: ComparisonAuditExportLog[];
  filters: AuditDashboardPdfFilter[];
  generatedAt: string;
  generatedBy: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

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

  return 'Timestamp pending';
}

function formatExportRoute(route: ComparisonAuditExportRoute): string {
  switch (route) {
    case 'web_print':
      return 'Browser print';
    case 'native_share':
      return 'System share sheet';
    case 'file_created':
      return 'PDF file created';
    default:
      return route;
  }
}

function renderFilters(filters: AuditDashboardPdfFilter[]): string {
  return filters
    .map(
      (filter) => `<div class="filter">
        <span class="filter-label">${escapeHtml(filter.label)}</span>
        <span class="filter-value">${escapeHtml(filter.value)}</span>
      </div>`,
    )
    .join('');
}

function renderRows(entries: ComparisonAuditExportLog[]): string {
  return entries
    .map(
      (entry) => `<tr>
        <td>
          <strong>${escapeHtml(entry.contentBlockId)}</strong>
          <span>${escapeHtml(`${entry.courseId} / ${entry.moduleId} / ${entry.lessonId}`)}</span>
        </td>
        <td>
          <strong>v${entry.baselineVersionNumber} to v${entry.comparisonVersionNumber}</strong>
          <span>${escapeHtml(`${entry.baselineVersionId} → ${entry.comparisonVersionId}`)}</span>
        </td>
        <td>
          <strong>${escapeHtml(formatExportRoute(entry.exportRoute))}</strong>
          <span>${escapeHtml(entry.exportFormat.toUpperCase())}</span>
        </td>
        <td>${escapeHtml(entry.exportedBy)}</td>
        <td>${escapeHtml(timestampToIso(entry.exportedAt))}</td>
        <td class="id">${escapeHtml(entry.id)}</td>
      </tr>`,
    )
    .join('');
}

export function buildAuditDashboardPdfHtml(
  input: AuditDashboardPdfHtmlInput,
): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>BabyReady Filtered Audit Export Log</title>
    <style>
      @page { size: A4 landscape; margin: 15mm 13mm 15mm; }
      * { box-sizing: border-box; }
      body {
        color: #28251D;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 9.5pt;
        line-height: 1.42;
        margin: 0;
      }
      h1, h2, p { margin-top: 0; }
      h1 { font-size: 22pt; letter-spacing: -0.4pt; line-height: 1.08; margin-bottom: 7pt; }
      h2 { border-bottom: 1px solid #D4D1CA; font-size: 12pt; margin: 20pt 0 8pt; padding-bottom: 5pt; }
      .header {
        align-items: flex-start;
        border-bottom: 3px solid #01696F;
        display: flex;
        justify-content: space-between;
        margin-bottom: 15pt;
        padding-bottom: 10pt;
      }
      .brand { color: #01696F; font-size: 9pt; font-weight: 700; letter-spacing: 1.2pt; margin-bottom: 5pt; }
      .subtitle { color: #5D5B55; font-size: 10.5pt; margin-bottom: 0; }
      .document-type { color: #696761; font-size: 8.5pt; margin: 0; text-align: right; }
      .notice {
        background: #F4F2EE;
        border-left: 3px solid #964219;
        color: #3E3C36;
        font-size: 8.8pt;
        margin: 14pt 0 16pt;
        padding: 9pt 11pt;
      }
      .summary-grid {
        display: grid;
        gap: 8pt;
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
      .summary-cell, .filter {
        background: #FAF9F6;
        border: 1px solid #D4D1CA;
        padding: 8pt;
      }
      .summary-label, .filter-label {
        color: #696761;
        display: block;
        font-size: 7.8pt;
        font-weight: 700;
        letter-spacing: 0.5pt;
        margin-bottom: 2pt;
        text-transform: uppercase;
      }
      .summary-value, .filter-value { font-weight: 700; overflow-wrap: anywhere; }
      .filters {
        display: grid;
        gap: 7pt;
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
      table { border-collapse: collapse; table-layout: fixed; width: 100%; }
      col.scope { width: 22%; }
      col.revisions { width: 18%; }
      col.route { width: 15%; }
      col.clinician { width: 15%; }
      col.time { width: 19%; }
      col.id { width: 11%; }
      th {
        background: #01696F;
        color: #FFFFFF;
        font-size: 7.8pt;
        letter-spacing: 0.3pt;
        padding: 7pt;
        text-align: left;
        text-transform: uppercase;
      }
      td {
        border-bottom: 1px solid #D4D1CA;
        overflow-wrap: anywhere;
        padding: 7pt;
        vertical-align: top;
      }
      tbody tr:nth-child(even) { background: #FAF9F6; }
      td strong, td span { display: block; }
      td span { color: #696761; font-size: 8pt; margin-top: 2pt; }
      td.id { color: #5D5B55; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 7.5pt; }
      .footer {
        border-top: 1px solid #D4D1CA;
        color: #696761;
        font-size: 8pt;
        margin-top: 20pt;
        padding-top: 7pt;
      }
      @media print {
        thead { display: table-header-group; }
        tr { break-inside: avoid; }
        h2 { break-after: avoid; }
      }
    </style>
  </head>
  <body>
    <header class="header">
      <div>
        <p class="brand">BABYREADY / CLINICAL GOVERNANCE</p>
        <h1>Filtered Audit Export Log</h1>
        <p class="subtitle">Point-in-time record of the currently filtered clinical comparison-audit exports.</p>
      </div>
      <p class="document-type">INTERNAL CLINICIAN RECORD<br />READ-ONLY DASHBOARD EXPORT</p>
    </header>

    <div class="notice">
      This report reflects the dashboard filter state when it was generated.
      It does not modify, create, or replace the underlying immutable audit records.
    </div>

    <section>
      <h2>Report summary</h2>
      <div class="summary-grid">
        <div class="summary-cell"><span class="summary-label">Matching records</span><span class="summary-value">${input.entries.length}</span></div>
        <div class="summary-cell"><span class="summary-label">Generated</span><span class="summary-value">${escapeHtml(input.generatedAt)}</span></div>
        <div class="summary-cell"><span class="summary-label">Generated by</span><span class="summary-value">${escapeHtml(input.generatedBy)}</span></div>
      </div>
    </section>

    <section>
      <h2>Applied dashboard filters</h2>
      <div class="filters">${renderFilters(input.filters)}</div>
    </section>

    <section>
      <h2>Matching audit records</h2>
      <table>
        <colgroup>
          <col class="scope" />
          <col class="revisions" />
          <col class="route" />
          <col class="clinician" />
          <col class="time" />
          <col class="id" />
        </colgroup>
        <thead>
          <tr>
            <th>Content scope</th>
            <th>Compared revisions</th>
            <th>Original PDF route</th>
            <th>Exported by</th>
            <th>Recorded at (UTC)</th>
            <th>Audit ID</th>
          </tr>
        </thead>
        <tbody>${renderRows(input.entries)}</tbody>
      </table>
    </section>

    <footer class="footer">
      BabyReady clinical audit-log dashboard · Generated ${escapeHtml(input.generatedAt)} · This export contains ${input.entries.length} matching immutable audit record${input.entries.length === 1 ? '' : 's'}.
    </footer>
  </body>
</html>`;
}
