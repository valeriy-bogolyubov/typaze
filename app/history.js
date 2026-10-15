// Фильтрация не меняет сохранённые результаты.
export function historyRows(history, filters) {
  return [...history]
    .reverse()
    .filter(
      (row) =>
        row.language === filters.language &&
        (filters.mode === 'all' || row.mode === filters.mode) &&
        (filters.duration === 'all' ||
          row.duration === Number(filters.duration)),
    );
}
export function filtersForResult(result) {
  return {
    language: result.language,
    mode: result.mode,
    duration: String(result.duration === 60 ? 60 : 30),
  };
}

// Сравниваем завершённые тесты с одинаковыми условиями.
export function comparableTests(history, { language, duration }, version) {
  return history.filter(
    (row) =>
      row.mode === 'test' &&
      row.status === 'completed' &&
      row.eligible === true &&
      row.reason === 'deadline' &&
      !row.repeatedMaterial &&
      row.version === version &&
      row.accuracyVersion === 'edit-v1' &&
      row.language === language &&
      row.duration === Number(duration) &&
      Number.isFinite(row.metrics?.wpm),
  );
}
