// Прогресс хранится отдельно от истории попыток.
const lessonId = /^(ru|en)-(home|middle|top|bottom|words|sentences)-v2$/;
const finiteAccuracy = (value) => Number.isFinite(value) && value >= 0 && value <= 100;
const validDate = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value));
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const localDay = (date) => {
  const value = new Date(date);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
};
const days = (previous, date) => [...new Set([...previous, localDay(date)])].sort().slice(-3);
const recordKey = ({ language, duration, version, accuracyVersion = 'edit-v1' }) =>
  JSON.stringify([language, Number(duration), version, accuracyVersion]);
const validLatest = (value) =>
  object(value) &&
  typeof value.id === 'string' &&
  validDate(value.date) &&
  finiteAccuracy(value.accuracy);
const validDays = (value) =>
  Array.isArray(value) &&
  value.length <= 3 &&
  value.every((day) => typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day));
const validAttemptIds = (value) =>
  value.attemptIds === undefined ||
  (Array.isArray(value.attemptIds) &&
    value.attemptIds.length === value.attempts &&
    value.attemptIds.every((id) => typeof id === 'string') &&
    new Set(value.attemptIds).size === value.attempts);
const validSummary = (value) =>
  object(value) &&
  Number.isSafeInteger(value.attempts) &&
  value.attempts >= 0 &&
  typeof value.passed === 'boolean' &&
  validLatest(value.latest) &&
  validDays(value.passDays) &&
  validAttemptIds(value);

export function emptyProgress() {
  return { lessons: {}, records: {}, processedLessonIds: [] };
}

// Повреждённый прогресс не перезаписываем.
export function isProgress(value) {
  if (
    !object(value) ||
    !object(value.lessons) ||
    !object(value.records) ||
    !Array.isArray(value.processedLessonIds) ||
    !value.processedLessonIds.every((id) => typeof id === 'string')
  )
    return false;
  for (const [id, lesson] of Object.entries(value.lessons)) {
    if (
      !lessonId.test(id) ||
      !object(lesson) ||
      !object(lesson.units) ||
      !Number.isSafeInteger(lesson.attempts) ||
      lesson.attempts < 0 ||
      typeof lesson.legacyPassed !== 'boolean' ||
      !validLatest(lesson.latest) ||
      !validDays(lesson.passDays) ||
      !validDays(lesson.legacyPassDays) ||
      !validAttemptIds(lesson)
    )
      return false;
    if (
      lesson.unitCount !== undefined &&
      (!Number.isSafeInteger(lesson.unitCount) || lesson.unitCount < 1)
    )
      return false;
    for (const [index, unit] of Object.entries(lesson.units))
      if (!/^(0|[1-9]\d*)$/.test(index) || !validSummary(unit)) return false;
  }
  for (const [key, record] of Object.entries(value.records)) {
    if (
      !object(record) ||
      !['ru', 'en'].includes(record.language) ||
      !Number.isFinite(record.duration) ||
      record.duration <= 0 ||
      typeof record.version !== 'string' ||
      typeof record.accuracyVersion !== 'string' ||
      typeof record.id !== 'string' ||
      !validDate(record.date) ||
      !Number.isFinite(record.wpm) ||
      record.wpm < 0 ||
      !finiteAccuracy(record.accuracy) ||
      recordKey(record) !== key
    )
      return false;
  }
  return true;
}

function addResult(progress, result, seen) {
  if (!object(result) || typeof result.id !== 'string' || !validDate(result.date)) return;
  const accuracy = result.metrics?.accuracy;
  if (
    result.mode === 'lesson' &&
    result.status === 'completed' &&
    result.reason === 'material' &&
    lessonId.test(result.lessonId) &&
    result.lessonId.startsWith(`${result.language}-`) &&
    finiteAccuracy(accuracy)
  ) {
    const legacy = result.lessonUnit == null;
    const index = result.lessonUnit;
    if (
      !legacy &&
      (!Number.isSafeInteger(index) ||
        index < 0 ||
        !Number.isSafeInteger(result.lessonUnitCount) ||
        result.lessonUnitCount <= index)
    )
      return;
    if (seen.has(result.id)) return;
    seen.add(result.id);
    progress.processedLessonIds.push(result.id);
    const passed = accuracy >= 95;
    const latest = { id: result.id, date: result.date, accuracy };
    const lesson = (progress.lessons[result.lessonId] ??= {
      units: {},
      attempts: 0,
      attemptIds: [],
      legacyPassed: false,
      passDays: [],
      legacyPassDays: [],
    });
    lesson.attempts++;
    lesson.attemptIds?.push(result.id);
    if (!lesson.latest || Date.parse(result.date) >= Date.parse(lesson.latest.date))
      lesson.latest = latest;
    if (passed) lesson.passDays = days(lesson.passDays, result.date);
    if (legacy) {
      if (passed) {
        lesson.legacyPassed = true;
        lesson.legacyPassDays = days(lesson.legacyPassDays, result.date);
      }
    } else {
      lesson.unitCount = Math.max(lesson.unitCount || 0, result.lessonUnitCount);
      const unit = (lesson.units[index] ??= {
        attempts: 0,
        attemptIds: [],
        passed: false,
        passDays: [],
      });
      unit.attempts++;
      unit.passed ||= passed;
      unit.attemptIds?.push(result.id);
      if (!unit.latest || Date.parse(result.date) >= Date.parse(unit.latest.date))
        unit.latest = latest;
      if (passed) unit.passDays = days(unit.passDays, result.date);
    }
  }
  if (
    result.mode === 'test' &&
    result.status === 'completed' &&
    result.reason === 'deadline' &&
    result.eligible === true &&
    !result.repeatedMaterial &&
    ['ru', 'en'].includes(result.language) &&
    Number.isFinite(result.duration) &&
    result.duration > 0 &&
    typeof result.version === 'string' &&
    typeof result.accuracyVersion === 'string' &&
    finiteAccuracy(accuracy) &&
    Number.isFinite(result.metrics?.wpm) &&
    result.metrics.wpm >= 0
  ) {
    const key = recordKey(result),
      previous = progress.records[key];
    if (
      !previous ||
      result.metrics.wpm > previous.wpm ||
      (result.metrics.wpm === previous.wpm && accuracy > previous.accuracy)
    ) {
      progress.records[key] = {
        id: result.id,
        date: result.date,
        wpm: result.metrics.wpm,
        accuracy,
        language: result.language,
        duration: result.duration,
        version: result.version,
        accuracyVersion: result.accuracyVersion,
      };
    }
  }
}

export function reconcileProgress(progress, history = []) {
  const next = isProgress(progress) ? structuredClone(progress) : emptyProgress();
  const seen = new Set(next.processedLessonIds);
  for (const result of history) addResult(next, result, seen);
  return next;
}
export function recordProgress(progress, result) {
  return reconcileProgress(progress, [result]);
}
export function bestRecord(progress, options) {
  return progress?.records?.[recordKey(options)] ?? null;
}
