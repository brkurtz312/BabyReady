import type { WordDiffSegment } from './wordDiff';

export type ComparisonAuditVersion = {
  versionNumber: number;
  action: string;
  createdAt: string;
  actorId: string;
  body: string;
  sourceIds: string[];
};

export type ComparisonAuditHtmlInput = {
  blockId: string;
  courseId: string;
  moduleId: string;
  lessonId: string;
  contentType: string;
  isClinicalClaim: boolean;
  baseline: ComparisonAuditVersion;
  comparison: ComparisonAuditVersion;
  wordDiff: WordDiffSegment[];
  addedSourceIds: string[];
  removedSourceIds: string[];
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

function renderSourceList(sourceIds: string[]): string {
  if (sourceIds.length === 0) {
    return '<span class="muted">No source attachments</span>';
  }

  return `<ul>${sourceIds
    .map((sourceId) => `<li>${escapeHtml(sourceId)}</li>`)
    .join('')}</ul>`;
}

function renderSourceChanges(
  label: string,
  sourceIds: string[],
  className: 'added' | 'removed',
): string {
  if (sourceIds.length === 0) {
    return '';
  }

  return `<div class="source-change ${className}">
    <strong>${label}</strong>
    ${renderSourceList(sourceIds)}
  </div>`;
}

function renderWordDiff(wordDiff: WordDiffSegment[]): string {
  const hasChanges = wordDiff.some((segment) => segment.kind !== 'unchanged');
  if (!hasChanges) {
    return '<p class="muted">No word-level changes between these revisions.</p>';
  }

  return `<p class="word-diff">${wordDiff
    .map(
      (segment) =>
        `<span class="diff-${segment.kind}">${escapeHtml(segment.value)}</span>`,
    )
    .join('')}</p>`;
}

function renderSnapshot(version: ComparisonAuditVersion, label: string): string {
  return `<section class="snapshot">
    <div class="snapshot-heading">
      <p class="eyebrow">${label}</p>
      <h3>Version ${version.versionNumber}</h3>
    </div>
    <dl class="snapshot-meta">
      <div><dt>Workflow action</dt><dd>${escapeHtml(version.action)}</dd></div>
      <div><dt>Recorded</dt><dd>${escapeHtml(version.createdAt)}</dd></div>
      <div><dt>Actor ID</dt><dd>${escapeHtml(version.actorId)}</dd></div>
    </dl>
    <h4>Learner-facing copy</h4>
    <p class="body-copy">${escapeHtml(version.body)}</p>
    <h4>Attached source records</h4>
    ${renderSourceList(version.sourceIds)}
  </section>`;
}

export function buildComparisonAuditHtml(
  input: ComparisonAuditHtmlInput,
): string {
  const hasCopyChanges = input.wordDiff.some(
    (segment) => segment.kind !== 'unchanged',
  );
  const sourceChangeSummary = `${input.addedSourceIds.length} added, ${input.removedSourceIds.length} removed`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>BabyReady Clinical Content Comparison Audit</title>
    <style>
      @page { size: A4; margin: 18mm 15mm 18mm; }
      * { box-sizing: border-box; }
      body {
        color: #28251D;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 10.5pt;
        line-height: 1.48;
        margin: 0;
      }
      h1, h2, h3, h4, p { margin-top: 0; }
      h1 { font-size: 23pt; letter-spacing: -0.4pt; line-height: 1.08; margin-bottom: 7pt; }
      h2 { border-bottom: 1px solid #D4D1CA; font-size: 14pt; margin: 23pt 0 10pt; padding-bottom: 5pt; }
      h3 { font-size: 13pt; margin-bottom: 8pt; }
      h4 { font-size: 10.5pt; margin: 13pt 0 4pt; }
      ul { margin: 4pt 0 0; padding-left: 17pt; }
      li { margin-bottom: 2pt; overflow-wrap: anywhere; }
      .header {
        align-items: flex-start;
        border-bottom: 3px solid #01696F;
        display: flex;
        justify-content: space-between;
        margin-bottom: 17pt;
        padding-bottom: 11pt;
      }
      .brand { color: #01696F; font-size: 9pt; font-weight: 700; letter-spacing: 1.2pt; margin-bottom: 5pt; }
      .document-type { color: #696761; font-size: 9pt; margin: 0; text-align: right; }
      .eyebrow { color: #0C4E54; font-size: 8pt; font-weight: 700; letter-spacing: 0.8pt; margin-bottom: 3pt; }
      .subtitle { color: #5D5B55; font-size: 11pt; margin-bottom: 0; }
      .notice {
        background: #F4F2EE;
        border-left: 3px solid #964219;
        color: #3E3C36;
        font-size: 9pt;
        margin: 15pt 0 17pt;
        padding: 9pt 11pt;
      }
      .metadata-grid {
        display: grid;
        gap: 8pt;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .metadata-cell {
        background: #FAF9F6;
        border: 1px solid #D4D1CA;
        padding: 8pt;
      }
      .metadata-label { color: #696761; display: block; font-size: 8pt; font-weight: 700; letter-spacing: 0.5pt; margin-bottom: 2pt; text-transform: uppercase; }
      .metadata-value { font-weight: 700; overflow-wrap: anywhere; }
      .summary { background: #EAF4F1; border: 1px solid #92BFB8; border-radius: 4pt; padding: 11pt; }
      .summary p { margin-bottom: 4pt; }
      .summary p:last-child { margin-bottom: 0; }
      .diff-legend { margin: 0 0 7pt; }
      .legend-chip { border-radius: 8pt; display: inline-block; font-size: 8pt; font-weight: 700; margin-right: 5pt; padding: 2pt 6pt; }
      .legend-removed { background: #FDE7DF; color: #8C3B21; }
      .legend-added { background: #E5F3E8; color: #2E6B3B; }
      .word-diff { background: #FFFFFF; border: 1px solid #C8DDD7; margin-bottom: 0; padding: 10pt; white-space: pre-wrap; }
      .diff-added { background: #D8F0DE; color: #205F31; }
      .diff-removed { background: #FDE7DF; color: #8C3B21; text-decoration: line-through; }
      .snapshots { display: grid; gap: 10pt; grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .snapshot { border: 1px solid #D4D1CA; padding: 10pt; }
      .snapshot-heading { border-bottom: 1px solid #E3E0DA; margin-bottom: 8pt; padding-bottom: 5pt; }
      .snapshot-heading h3 { margin-bottom: 0; }
      .snapshot-meta { margin: 0; }
      .snapshot-meta div { margin-bottom: 6pt; }
      .snapshot-meta dt { color: #696761; font-size: 8pt; font-weight: 700; letter-spacing: 0.4pt; text-transform: uppercase; }
      .snapshot-meta dd { margin: 1pt 0 0; overflow-wrap: anywhere; }
      .body-copy { background: #FAF9F6; margin-bottom: 0; padding: 8pt; white-space: pre-wrap; }
      .source-change { border-radius: 4pt; margin-top: 7pt; padding: 8pt 10pt; }
      .source-change.added { background: #E5F3E8; color: #205F31; }
      .source-change.removed { background: #FDE7DF; color: #8C3B21; }
      .muted { color: #696761; }
      .footer { border-top: 1px solid #D4D1CA; color: #696761; font-size: 8pt; margin-top: 23pt; padding-top: 7pt; }
      @media print {
        .snapshot { break-inside: avoid; }
        h2 { break-after: avoid; }
      }
    </style>
  </head>
  <body>
    <header class="header">
      <div>
        <p class="brand">BABYREADY / CLINICAL GOVERNANCE</p>
        <h1>Content Revision Comparison Audit</h1>
        <p class="subtitle">Version ${input.baseline.versionNumber} compared with version ${input.comparison.versionNumber}</p>
      </div>
      <p class="document-type">INTERNAL CLINICIAN RECORD<br />READ-ONLY EXPORT</p>
    </header>

    <div class="notice">
      This audit summarizes immutable content snapshots for clinical governance.
      It is not patient-specific documentation and does not modify the underlying revision history.
    </div>

    <section>
      <h2>Audit metadata</h2>
      <div class="metadata-grid">
        <div class="metadata-cell"><span class="metadata-label">Content block</span><span class="metadata-value">${escapeHtml(input.blockId)}</span></div>
        <div class="metadata-cell"><span class="metadata-label">Scope</span><span class="metadata-value">${escapeHtml(`${input.courseId} / ${input.moduleId} / ${input.lessonId}`)}</span></div>
        <div class="metadata-cell"><span class="metadata-label">Content type</span><span class="metadata-value">${escapeHtml(input.contentType)}</span></div>
        <div class="metadata-cell"><span class="metadata-label">Clinical claim</span><span class="metadata-value">${input.isClinicalClaim ? 'Yes' : 'No'}</span></div>
        <div class="metadata-cell"><span class="metadata-label">Generated</span><span class="metadata-value">${escapeHtml(input.generatedAt)}</span></div>
        <div class="metadata-cell"><span class="metadata-label">Generated by</span><span class="metadata-value">${escapeHtml(input.generatedBy)}</span></div>
      </div>
    </section>

    <section>
      <h2>Change summary</h2>
      <div class="summary">
        <p><strong>Learner copy:</strong> ${hasCopyChanges ? 'Changed at the word level.' : 'Unchanged.'}</p>
        <p><strong>Source attachments:</strong> ${sourceChangeSummary}.</p>
      </div>
    </section>

    <section>
      <h2>Word-level learner-copy diff</h2>
      ${
        hasCopyChanges
          ? `<p class="diff-legend"><span class="legend-chip legend-removed">Removed</span><span class="legend-chip legend-added">Added</span></p>${renderWordDiff(input.wordDiff)}`
          : renderWordDiff(input.wordDiff)
      }
    </section>

    <section>
      <h2>Evidence attachment changes</h2>
      ${
        input.addedSourceIds.length || input.removedSourceIds.length
          ? `${renderSourceChanges('Added source records', input.addedSourceIds, 'added')}
             ${renderSourceChanges('Removed source records', input.removedSourceIds, 'removed')}`
          : '<p class="muted">No source attachment changes between these revisions.</p>'
      }
    </section>

    <section>
      <h2>Immutable snapshot record</h2>
      <div class="snapshots">
        ${renderSnapshot(input.baseline, 'Baseline snapshot')}
        ${renderSnapshot(input.comparison, 'Comparison snapshot')}
      </div>
    </section>

    <footer class="footer">
      BabyReady clinical content audit · Generated ${escapeHtml(input.generatedAt)} · This export is a point-in-time comparison of immutable revision snapshots.
    </footer>
  </body>
</html>`;
}
