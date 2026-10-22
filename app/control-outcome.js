import { compareGoal, MIN_CONTROL_EXPOSURES } from './engine.js';

// Вывод и действие используют одни условия.
export function controlOutcome(baseline, result) {
  const evidence = compareGoal(baseline, result),
    goal = result?.goal;
  const outcome = (kind, title, action, label) => ({ kind, title, action, label, goal, evidence });
  if (!baseline) return outcome('missing', 'Нет теста для сравнения', 'new', 'Пройти тест');
  const same =
    baseline.status === 'completed' &&
    baseline.language === result.language &&
    baseline.duration === result.duration &&
    baseline.version === result.version &&
    baseline.accuracyVersion === result.accuracyVersion &&
    baseline.reason === 'deadline' &&
    result.reason === 'deadline' &&
    !baseline.repeatedMaterial &&
    !result.repeatedMaterial;
  if (!same) return outcome('conditions', 'Условия тестов различаются', 'new', 'Пройти тест');
  const before = baseline.groups?.find((row) => row.group === goal);
  if (evidence.baseline.n < MIN_CONTROL_EXPOSURES || !before?.sources?.length)
    return outcome('baseline', 'В первом тесте мало данных', 'new', 'Пройти тест');
  if (evidence.covered) return outcome('compared', 'Частота ошибок', null, null);
  if (evidence.reason === 'familiar-material')
    return outcome('familiar', 'Этот текст уже знаком', 'repeat-control', 'Повторить проверку');
  return outcome(
    'coverage',
    'Нужно больше текста для проверки',
    'repeat-control',
    'Повторить проверку',
  );
}
