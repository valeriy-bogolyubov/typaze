const sources = (value) =>
  Array.isArray(value) ? value.filter((id) => typeof id === 'string' && id) : [];

// Исключаем отработанные тексты из проверки.
export function practiceSources(journey, { baseline, goal, extra = [] }) {
  const same = !!baseline && journey?.baseline?.id === baseline.id && journey.goal === goal;
  return [
    ...new Set([
      ...(same ? sources(journey.practiceSeen) : []),
      ...(same ? sources(journey.practice?.seen) : []),
      ...sources(extra),
    ]),
  ];
}
export function restoreJourney(result, history) {
  if (!result?.baselineId) return null;
  return {
    baseline: history.find((row) => row.id === result.baselineId) || null,
    goal: result.goal,
    practice: result.mode === 'targeted' ? result : null,
    practiceSeen: [
      ...new Set([
        ...sources(result.practiceSeen),
        ...(result.mode === 'targeted' ? sources(result.seen) : []),
      ]),
    ],
  };
}
