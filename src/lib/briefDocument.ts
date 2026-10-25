/**
 * The Birth Readiness Brief as a printable page: the HTML that Print and Save as
 * PDF hand to the phone's print system. It holds only what the learner saved.
 *
 * This file has no imports so plain Node can run it in tests.
 */

export type BriefDocumentInput = {
  /** Every readiness prompt, with whether the learner checked it. */
  readiness: { label: string; checked: boolean }[];
  discussionQuestions: string[];
  reflections: { lessonTitle: string; prompt: string; text: string }[];
  /** Shown as "Printed on …", already formatted for the reader. */
  printedOn: string;
};

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** Keeps the learner's own line breaks. */
const paragraph = (text: string) => escapeHtml(text.trim()).replace(/\n/g, '<br>');

export function briefDocumentHtml({ readiness, discussionQuestions, reflections, printedOn }: BriefDocumentInput): string {
  const questions = discussionQuestions.map((q) => q.trim()).filter(Boolean);
  const readinessList = readiness
    .map((item) => `<li class="${item.checked ? 'done' : ''}"><span class="box">${item.checked ? '&#10003;' : ''}</span>${escapeHtml(item.label)}</li>`)
    .join('');
  const questionList = questions.length
    ? `<ol>${questions.map((q) => `<li>${paragraph(q)}</li>`).join('')}</ol>`
    : '<p class="empty">No questions added yet.</p>';
  const reflectionList = reflections.length
    ? reflections
        .map((r) => `<div class="reflection"><p class="lesson">${escapeHtml(r.lessonTitle)}</p><p class="prompt">${escapeHtml(r.prompt)}</p><p>${paragraph(r.text)}</p></div>`)
        .join('')
    : '<p class="empty">No class reflections saved yet.</p>';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Birth Readiness Brief</title>
<style>
  @page { margin: 18mm 16mm; }
  body { font-family: -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif; color: #1D2940; font-size: 12pt; line-height: 1.45; margin: 0; }
  .brand { color: #23716C; font-size: 9pt; font-weight: 700; letter-spacing: 0.08em; margin: 0; }
  h1 { font-size: 22pt; margin: 4px 0 2px; }
  .meta { color: #5A6680; font-size: 10pt; margin: 0 0 14px; }
  .notice { background: #EEF3F6; border-radius: 8px; padding: 10px 12px; font-size: 10pt; color: #3A4660; }
  h2 { color: #23716C; font-size: 14pt; margin: 22px 0 8px; border-bottom: 1px solid #D5DEE6; padding-bottom: 4px; }
  ul.readiness { list-style: none; padding: 0; margin: 0; }
  ul.readiness li { display: flex; gap: 10px; align-items: flex-start; margin: 6px 0; }
  .box { flex: 0 0 auto; width: 14px; height: 14px; border: 1.5px solid #23716C; border-radius: 3px; font-size: 11px; line-height: 14px; text-align: center; color: #FFFFFF; }
  li.done .box { background: #23716C; }
  ol { padding-left: 22px; margin: 0; }
  ol li { margin: 6px 0; break-inside: avoid; }
  .reflection { margin: 10px 0 14px; break-inside: avoid; }
  .reflection p { margin: 2px 0; }
  .lesson { color: #5A6680; font-size: 9.5pt; font-weight: 700; }
  .prompt { font-weight: 700; }
  .empty { color: #5A6680; font-style: italic; }
</style>
</head>
<body>
<p class="brand">BABYREADY</p>
<h1>Birth Readiness Brief</h1>
<p class="meta">Printed on ${escapeHtml(printedOn)}</p>
<p class="notice">A preparation guide for your own conversation with your care team. It is an educational tool, not medical advice or a substitute for your care team.</p>
<h2>Readiness prompts</h2>
<ul class="readiness">${readinessList}</ul>
<h2>Questions to discuss</h2>
${questionList}
<h2>Your class reflections</h2>
${reflectionList}
</body>
</html>`;
}
