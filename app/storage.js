import { emptyProgress, isProgress, reconcileProgress } from './progress-state.js';
const KEY = 'typaze.v1';
export const isValidResult = (r) =>
  r &&
  typeof r.id === 'string' &&
  ['ru', 'en'].includes(r.language) &&
  ['test', 'free', 'targeted', 'control', 'lesson'].includes(r.mode) &&
  ['completed', 'interrupted'].includes(r.status) &&
  typeof r.source === 'string' &&
  typeof r.value === 'string' &&
  Number.isFinite(r.seconds) &&
  Number.isFinite(Date.parse(r.date)) &&
  r.metrics &&
  Number.isFinite(r.metrics.wpm) &&
  Array.isArray(r.groups) &&
  Array.isArray(r.errors) &&
  Array.isArray(r.bins) &&
  Array.isArray(r.seen);
export function readStoredBackup() {
  try {
    return localStorage.getItem(KEY) || null;
  } catch {
    return null;
  }
}
export function commitImport(history, settings, progress, { readOnly = false } = {}) {
  if (!isProgress(progress)) return false;
  return persist(history, settings, { progress, force: readOnly, readOnly });
}
export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { history: [], settings: {}, progress: emptyProgress(), warning: null };
    const data = JSON.parse(raw);
    if (![1, 2].includes(data.schema) || !Array.isArray(data.history))
      return {
        history: [],
        settings: {},
        progress: emptyProgress(),
        warning: 'Сохранённая история имеет другой формат. Она не была перезаписана.',
        readOnly: true,
      };
    const validHistory = data.history.filter(isValidResult),
      history = validHistory.slice(-100),
      damaged =
        validHistory.length !== data.history.length ||
        (data.schema === 2 && !isProgress(data.progress));
    const progress = reconcileProgress(
      data.schema === 2 ? data.progress : emptyProgress(),
      validHistory,
    );
    return {
      history,
      progress,
      settings: data.settings && typeof data.settings === 'object' ? data.settings : {},
      warning: damaged
        ? 'Часть истории повреждена. Исходные данные сохранены без изменений.'
        : null,
      readOnly: damaged,
    };
  } catch {
    return {
      history: [],
      settings: {},
      progress: emptyProgress(),
      warning:
        'Не удалось прочитать историю. Тренировка доступна, результаты пока останутся в памяти.',
      readOnly: true,
    };
  }
}
export function persist(history, settings, { force = false, readOnly = false, progress } = {}) {
  if (readOnly && !force) return false;
  try {
    if (progress === undefined) {
      const saved = load();
      if (saved.readOnly && !force) return false;
      progress = saved.progress;
    }
    if (!isProgress(progress)) return false;
    localStorage.setItem(
      KEY,
      JSON.stringify({
        schema: 2,
        history: history.slice(-100),
        settings,
        progress: reconcileProgress(progress, history),
      }),
    );
    return true;
  } catch {
    return false;
  }
}
export function upsert(history, result) {
  return [...history.filter((r) => r.id !== result.id), result].slice(-100);
}
