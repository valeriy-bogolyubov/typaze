const KEY = 'typaze.v1';
export function load() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || '{"history":[],"settings":{}}');
    return { history: Array.isArray(data.history) ? data.history : [], settings: data.settings || {}, warning: null };
  } catch {
    return { history: [], settings: {}, warning: 'Не удалось прочитать историю.' };
  }
}
export function persist(history, settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify({schema: 1, history: history.slice(-100), settings}));
    return true;
  } catch { return false; }
}
export function upsert(history, result) {
  return [...history.filter((row) => row.id !== result.id), result].slice(-100);
}
