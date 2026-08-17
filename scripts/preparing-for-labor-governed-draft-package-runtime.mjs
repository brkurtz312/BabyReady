import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

export const GOVERNED_DRAFT_PACKAGE_CONFIRMATION =
  'CREATE_PREPARING_FOR_LABOR_GOVERNED_DRAFT_PACKAGE';

const manifestUrl = new URL(
  '../docs/content/preparing-for-labor-authoring-manifest.v1.json',
  import.meta.url,
);
const manifestModuleUrl = new URL(
  '../src/content/preparingForLaborManifest.ts',
  import.meta.url,
);

/**
 * Loads the same reviewed manifest resolver that the clinician workspace uses.
 * Keeping the CLI tied to this resolver prevents a second copy of learner
 * content, source mapping, or placement metadata from drifting over time.
 */
export async function loadPreparingForLaborDraftPackageEntries() {
  const [manifestText, source] = await Promise.all([
    readFile(manifestUrl, 'utf8'),
    readFile(manifestModuleUrl, 'utf8'),
  ]);
  const manifest = JSON.parse(manifestText);
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      resolveJsonModule: true,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const module = { exports: {} };

  vm.runInNewContext(compiled, {
    module,
    exports: module.exports,
    require: (specifier) => {
      if (specifier.endsWith('preparing-for-labor-authoring-manifest.v1.json')) {
        return manifest;
      }

      throw new Error(
        `The local governed-draft command cannot load unexpected manifest dependency "${specifier}".`,
      );
    },
  });

  const getEntries = module.exports.getPreparingForLaborDraftPackageEntries;
  if (typeof getEntries !== 'function') {
    throw new Error(
      'The Preparing for Labor manifest resolver did not expose its governed draft package.',
    );
  }

  return JSON.parse(JSON.stringify(getEntries()));
}

export function contentBlockPath(entry) {
  return [
    'courses',
    entry.courseId,
    'modules',
    entry.moduleId,
    'lessons',
    entry.lessonId,
    'contentBlocks',
    entry.id,
  ].join('/');
}

export function draftPackageKey(entry) {
  return `${entry.lessonId}/${entry.id}`;
}

export function sourceIdsForEntries(entries) {
  return [...new Set(entries.flatMap((entry) => entry.sourceIds))];
}

export function sourcePublicationState(snapshot) {
  if (!snapshot.exists) {
    return 'missing';
  }

  const value = snapshot.data()?.publicationState;
  return typeof value === 'string' ? value : 'missing-publication-state';
}

export function missingPublishedSourceIds(entries, sourceSnapshots) {
  return entries.flatMap((entry) => {
    const missingSourceIds = entry.sourceIds.filter(
      (sourceId) => sourcePublicationState(sourceSnapshots.get(sourceId)) !== 'published',
    );

    return missingSourceIds.length
      ? [
          {
            lessonId: entry.lessonId,
            contentBlockId: entry.id,
            missingPublishedSourceIds: missingSourceIds,
          },
        ]
      : [];
  });
}
