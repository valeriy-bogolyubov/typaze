import { VERSION, graphemes } from './engine.js';
const kinds = new Set(['substitution', 'omission', 'insertion', 'transposition']);
// Показываем сохранённые ошибки без пересчёта.
export function reviewErrors(result) {
  if (
    result?.status !== 'completed' ||
    result.mode === 'lesson' ||
    result.version !== VERSION ||
    result.accuracyVersion !== 'edit-v1' ||
    typeof result.source !== 'string' ||
    typeof result.value !== 'string' ||
    !Array.isArray(result.errors)
  )
    return [];
  const source = graphemes(result.source);
  if (!source.length) return [];
  return result.errors
    .flatMap((error, index) => {
      if (
        !error ||
        !kinds.has(error.kind) ||
        !Number.isInteger(error.r) ||
        error.r < 0 ||
        error.r > source.length ||
        typeof error.expected !== 'string' ||
        typeof error.actual !== 'string'
      )
        return [];
      const expected = graphemes(error.expected),
        actual = graphemes(error.actual);
      if (
        error.kind === 'insertion'
          ? expected.length !== 0 || actual.length === 0
          : expected.length === 0 ||
            error.r + expected.length > source.length ||
            source.slice(error.r, error.r + expected.length).join('') !==
              error.expected.normalize('NFC')
      )
        return [];
      if (error.kind === 'omission' ? actual.length !== 0 : actual.length === 0) return [];
      if (error.kind === 'transposition' && (expected.length !== 2 || actual.length !== 2))
        return [];
      const anchor = Math.min(error.r, source.length - 1);
      return [
        {
          ...error,
          index,
          anchor,
          end: error.kind === 'insertion' ? anchor + 1 : error.r + expected.length,
        },
      ];
    })
    .sort((a, b) => a.r - b.r || a.index - b.index);
}
export function reviewIndex(current, direction, count) {
  if (count < 1) return null;
  const next =
    direction === 'first'
      ? 0
      : direction === 'last'
        ? count - 1
        : current + (direction === 'previous' ? -1 : 1);
  return Math.max(0, Math.min(count - 1, next));
}
