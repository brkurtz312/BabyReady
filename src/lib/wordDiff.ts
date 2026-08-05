export type WordDiffSegmentKind = 'unchanged' | 'added' | 'removed';

export type WordDiffSegment = {
  kind: WordDiffSegmentKind;
  value: string;
};

const tokenPattern = /\s*\S+\s*/g;
const maximumMatrixCells = 250_000;

function tokenize(value: string): string[] {
  return value.match(tokenPattern) ?? [];
}

function appendSegment(
  segments: WordDiffSegment[],
  kind: WordDiffSegmentKind,
  value: string,
) {
  if (!value) {
    return;
  }

  const previousSegment = segments.at(-1);
  if (previousSegment?.kind === kind) {
    previousSegment.value += value;
    return;
  }

  segments.push({ kind, value });
}

function buildBoundedDiff(
  baselineTokens: string[],
  comparisonTokens: string[],
): WordDiffSegment[] {
  const segments: WordDiffSegment[] = [];
  let prefixLength = 0;

  while (
    prefixLength < baselineTokens.length &&
    prefixLength < comparisonTokens.length &&
    baselineTokens[prefixLength] === comparisonTokens[prefixLength]
  ) {
    prefixLength += 1;
  }

  let suffixLength = 0;
  while (
    suffixLength < baselineTokens.length - prefixLength &&
    suffixLength < comparisonTokens.length - prefixLength &&
    baselineTokens[baselineTokens.length - suffixLength - 1] ===
      comparisonTokens[comparisonTokens.length - suffixLength - 1]
  ) {
    suffixLength += 1;
  }

  appendSegment(
    segments,
    'unchanged',
    baselineTokens.slice(0, prefixLength).join(''),
  );
  appendSegment(
    segments,
    'removed',
    baselineTokens
      .slice(prefixLength, baselineTokens.length - suffixLength)
      .join(''),
  );
  appendSegment(
    segments,
    'added',
    comparisonTokens
      .slice(prefixLength, comparisonTokens.length - suffixLength)
      .join(''),
  );
  appendSegment(
    segments,
    'unchanged',
    baselineTokens.slice(baselineTokens.length - suffixLength).join(''),
  );

  return segments;
}

export function buildWordDiff(
  baseline: string,
  comparison: string,
): WordDiffSegment[] {
  if (baseline === comparison) {
    return baseline ? [{ kind: 'unchanged', value: baseline }] : [];
  }

  const baselineTokens = tokenize(baseline);
  const comparisonTokens = tokenize(comparison);
  const matrixCells = (baselineTokens.length + 1) * (comparisonTokens.length + 1);

  if (matrixCells > maximumMatrixCells) {
    return buildBoundedDiff(baselineTokens, comparisonTokens);
  }

  const columnCount = comparisonTokens.length + 1;
  const lcsMatrix = new Uint32Array(
    (baselineTokens.length + 1) * columnCount,
  );

  for (let baselineIndex = baselineTokens.length - 1; baselineIndex >= 0; baselineIndex -= 1) {
    for (
      let comparisonIndex = comparisonTokens.length - 1;
      comparisonIndex >= 0;
      comparisonIndex -= 1
    ) {
      const cellIndex = baselineIndex * columnCount + comparisonIndex;
      if (baselineTokens[baselineIndex] === comparisonTokens[comparisonIndex]) {
        lcsMatrix[cellIndex] =
          1 + lcsMatrix[(baselineIndex + 1) * columnCount + comparisonIndex + 1];
      } else {
        lcsMatrix[cellIndex] = Math.max(
          lcsMatrix[(baselineIndex + 1) * columnCount + comparisonIndex],
          lcsMatrix[baselineIndex * columnCount + comparisonIndex + 1],
        );
      }
    }
  }

  const segments: WordDiffSegment[] = [];
  let baselineIndex = 0;
  let comparisonIndex = 0;

  while (
    baselineIndex < baselineTokens.length &&
    comparisonIndex < comparisonTokens.length
  ) {
    if (baselineTokens[baselineIndex] === comparisonTokens[comparisonIndex]) {
      appendSegment(segments, 'unchanged', baselineTokens[baselineIndex]);
      baselineIndex += 1;
      comparisonIndex += 1;
      continue;
    }

    const removeScore =
      lcsMatrix[(baselineIndex + 1) * columnCount + comparisonIndex];
    const addScore =
      lcsMatrix[baselineIndex * columnCount + comparisonIndex + 1];

    if (removeScore >= addScore) {
      appendSegment(segments, 'removed', baselineTokens[baselineIndex]);
      baselineIndex += 1;
    } else {
      appendSegment(segments, 'added', comparisonTokens[comparisonIndex]);
      comparisonIndex += 1;
    }
  }

  while (baselineIndex < baselineTokens.length) {
    appendSegment(segments, 'removed', baselineTokens[baselineIndex]);
    baselineIndex += 1;
  }

  while (comparisonIndex < comparisonTokens.length) {
    appendSegment(segments, 'added', comparisonTokens[comparisonIndex]);
    comparisonIndex += 1;
  }

  return segments;
}
