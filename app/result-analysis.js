import { graphemes } from './engine.js';
const kinds = ['substitution', 'omission', 'insertion', 'transposition'];
// Сводка ошибок и темпа по сохранённой попытке.
export function analyzeResult(result) {
  const types = kinds.map((kind) => ({ kind, count: 0 }));
  for (const error of result.errors || []) {
    const row = types.find((row) => row.kind === error?.kind);
    if (!row) continue;
    row.count += Math.max(
      graphemes(error.expected || '').length,
      graphemes(error.actual || '').length,
    );
  }
  const groups = (result.groups || [])
    .filter(
      (g) =>
        g &&
        typeof g.group === 'string' &&
        Number.isFinite(g.n) &&
        g.n > 0 &&
        Number.isFinite(g.errors) &&
        g.errors > 0 &&
        g.errors <= g.n,
    )
    .map((g) => ({ ...g, rate: g.errors / g.n }))
    .sort(
      (a, b) =>
        b.errors - a.errors || b.rate - a.rate || b.n - a.n || a.group.localeCompare(b.group),
    );
  const bins = (result.bins || [])
    .filter(
      (b) =>
        b &&
        Number.isFinite(b.second) &&
        b.second >= 0 &&
        b.second < result.seconds &&
        Number.isFinite(b.wpm) &&
        b.wpm >= 0,
    )
    .map((b) => ({ ...b, end: Math.min(b.second + 5, result.seconds) }));
  return { types: types.filter((row) => row.count > 0), groups, bins };
}
