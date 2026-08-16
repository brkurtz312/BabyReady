export function parsePreparingForLaborContentBlockPath(path, courseId) {
  const segments = path.split('/');

  if (
    segments.length !== 8 ||
    segments[0] !== 'courses' ||
    segments[1] !== courseId ||
    segments[2] !== 'modules' ||
    segments[4] !== 'lessons' ||
    segments[6] !== 'contentBlocks'
  ) {
    return null;
  }

  return {
    moduleId: segments[3],
    lessonId: segments[5],
    id: segments[7],
  };
}
