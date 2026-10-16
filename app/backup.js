import { emptyProgress, isProgress, reconcileProgress } from './progress-state.js';
import { isValidResult } from './storage.js';

const MAX_BYTES = 5 * 1024 * 1024,
  MAX_HISTORY = 10000,
  MAX_TEXT = 2_000_000;
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const count = (value) => Number.isSafeInteger(value) && value >= 0;
const nonnegative = (value) => Number.isFinite(value) && value >= 0;
const accuracy = (value) =>
  value === null || (Number.isFinite(value) && value >= 0 && value <= 100);
const keys = (value, allowed) =>
  object(value) && Object.keys(value).every((key) => allowed.includes(key));
const strings = (value) =>
  Array.isArray(value) &&
  value.length <= 100000 &&
  value.every((item) => typeof item === 'string' && item.length <= 512);
const uniqueStrings = (value) => strings(value) && new Set(value).size === value.length;
const day = (value) =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(`${value}T00:00:00Z`)) &&
  new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const date = (value) =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(
    value,
  ) &&
  day(value.slice(0, 10)) &&
  Number.isFinite(Date.parse(value));
const optional = (row, key, validate) => row[key] === undefined || validate(row[key]);
const nullableString = (value) => value === null || typeof value === 'string';
const resultFields = [
  'id',
  'language',
  'mode',
  'status',
  'reason',
  'duration',
  'date',
  'version',
  'accuracyVersion',
  'source',
  'value',
  'seconds',
  'metrics',
  'groups',
  'errors',
  'bins',
  'seen',
  'practiceSeen',
  'textId',
  'edits',
  'wrongAttempts',
  'wrongKeys',
  'goal',
  'lessonId',
  'lessonUnit',
  'lessonUnitCount',
  'lessonReview',
  'baselineId',
  'eligible',
  'repeatedMaterial',
];
const fail = (message = 'Invalid backup', code = 'invalid') => {
  const error = new Error(message);
  error.code = code;
  throw error;
};
const same = (left, right) => canonical(left) === canonical(right);
function canonical(value) {
  return JSON.stringify(value, (_, item) =>
    object(item)
      ? Object.fromEntries(
          Object.keys(item)
            .sort()
            .map((key) => [key, item[key]]),
        )
      : item,
  );
}

function validResult(row) {
  return (
    keys(row, resultFields) &&
    isValidResult(row) &&
    row.id.length > 0 &&
    row.id.length <= 512 &&
    date(row.date) &&
    nonnegative(row.seconds) &&
    [30, 60].includes(row.duration) &&
    row.source.length <= 10000 &&
    row.value.length <= 10000 &&
    row.source.length * row.value.length <= 50_000_000 &&
    keys(row.metrics, ['wpm', 'accuracy', 'correct', 'remaining', 'corrected', 'volume']) &&
    nonnegative(row.metrics.wpm) &&
    optional(row.metrics, 'accuracy', accuracy) &&
    ['correct', 'remaining', 'corrected', 'volume'].every((key) =>
      optional(row.metrics, key, count),
    ) &&
    row.groups.length <= 10000 &&
    row.groups.every(
      (group) =>
        keys(group, ['group', 'n', 'errors', 'sources', 'errorSources']) &&
        typeof group.group === 'string' &&
        group.group.length <= 64 &&
        count(group.n) &&
        count(group.errors) &&
        group.errors <= group.n &&
        optional(group, 'sources', strings) &&
        optional(group, 'errorSources', strings),
    ) &&
    row.errors.length <= 10000 &&
    row.errors.every(
      (error) =>
        keys(error, ['kind', 'r', 'expected', 'actual', 'ambiguous']) &&
        ['substitution', 'omission', 'insertion', 'transposition'].includes(error.kind) &&
        count(error.r) &&
        error.r <= row.source.length &&
        typeof error.expected === 'string' &&
        typeof error.actual === 'string' &&
        optional(error, 'ambiguous', (value) => typeof value === 'boolean'),
    ) &&
    row.bins.length <= 10000 &&
    row.bins.every(
      (bin) => keys(bin, ['second', 'wpm']) && nonnegative(bin.second) && nonnegative(bin.wpm),
    ) &&
    strings(row.seen) &&
    ['version', 'accuracyVersion', 'textId'].every((key) =>
      optional(row, key, (value) => typeof value === 'string' && value.length <= 512),
    ) &&
    ['goal', 'lessonId', 'baselineId'].every((key) => optional(row, key, nullableString)) &&
    ['edits', 'wrongAttempts'].every((key) => optional(row, key, count)) &&
    optional(row, 'reason', (value) =>
      [
        'deadline',
        'material',
        'manual',
        'interrupted',
        'blur',
        'hidden',
        'language',
        'navigation',
      ].includes(value),
    ) &&
    ['eligible', 'repeatedMaterial', 'lessonReview'].every((key) =>
      optional(row, key, (value) => typeof value === 'boolean'),
    ) &&
    (row.lessonUnitCount == null || row.lessonUnitCount <= 256) &&
    optional(
      row,
      'wrongKeys',
      (value) =>
        value.length <= 10000 && value.every((key) => keys(key, ['expected', 'actual', 'count'])),
    ) &&
    optional(row, 'practiceSeen', strings)
  );
}
function strictProgress(progress) {
  if (
    !isProgress(progress) ||
    !keys(progress, ['lessons', 'records', 'processedLessonIds']) ||
    !uniqueStrings(progress.processedLessonIds) ||
    progress.processedLessonIds.some((id) => !id)
  )
    return false;
  const ids = new Set(progress.processedLessonIds);
  const validLatest = (value) =>
    keys(value, ['id', 'date', 'accuracy']) &&
    date(value.date) &&
    accuracy(value.accuracy) &&
    value.accuracy !== null &&
    ids.has(value.id);
  const validDays = (value) => uniqueStrings(value) && value.length <= 3 && value.every(day);
  const validIds = (value) =>
    optional(
      value,
      'attemptIds',
      (list) =>
        uniqueStrings(list) && list.every((id) => ids.has(id)) && list.includes(value.latest.id),
    );
  for (const lesson of Object.values(progress.lessons)) {
    if (
      !keys(lesson, [
        'units',
        'attempts',
        'attemptIds',
        'legacyPassed',
        'latest',
        'passDays',
        'legacyPassDays',
        'unitCount',
      ]) ||
      !validLatest(lesson.latest) ||
      !validDays(lesson.passDays) ||
      !validDays(lesson.legacyPassDays) ||
      !validIds(lesson) ||
      lesson.attempts < 1 ||
      lesson.attempts > ids.size ||
      Object.keys(lesson.units).length > 256 ||
      optional(lesson, 'unitCount', (n) => n <= 256) === false
    )
      return false;
    const unitIds = new Set();
    let unitAttempts = 0;
    for (const [index, unit] of Object.entries(lesson.units)) {
      if (
        !keys(unit, ['attempts', 'attemptIds', 'passed', 'latest', 'passDays']) ||
        !validLatest(unit.latest) ||
        !validDays(unit.passDays) ||
        !validIds(unit) ||
        unit.attempts < 1 ||
        unit.attempts > lesson.attempts ||
        Number(index) >= 256 ||
        (lesson.unitCount !== undefined && Number(index) >= lesson.unitCount)
      )
        return false;
      unitAttempts += unit.attempts;
      for (const id of unit.attemptIds || []) {
        if (unitIds.has(id) || (lesson.attemptIds && !lesson.attemptIds.includes(id))) return false;
        unitIds.add(id);
      }
    }
    if (unitAttempts > lesson.attempts) return false;
  }
  for (const record of Object.values(progress.records))
    if (
      !keys(record, [
        'id',
        'date',
        'wpm',
        'accuracy',
        'language',
        'duration',
        'version',
        'accuracyVersion',
      ]) ||
      !date(record.date) ||
      !record.id ||
      record.id.length > 512 ||
      !record.version ||
      record.version.length > 512 ||
      !record.accuracyVersion ||
      record.accuracyVersion.length > 512 ||
      ![30, 60].includes(record.duration)
    )
      return false;
  return Object.keys(progress.records).length <= 10000;
}
function referencesAgree(progress, history) {
  const byId = new Map(history.map((row) => [row.id, row]));
  const agree = (latest, lessonId, index) => {
    const row = byId.get(latest.id);
    return (
      !row ||
      (row.mode === 'lesson' &&
        row.status === 'completed' &&
        row.reason === 'material' &&
        row.lessonId === lessonId &&
        (index === undefined || row.lessonUnit === Number(index)) &&
        row.date === latest.date &&
        row.metrics.accuracy === latest.accuracy)
    );
  };
  for (const [id, lesson] of Object.entries(progress.lessons)) {
    if (!agree(lesson.latest, id)) return false;
    for (const [index, unit] of Object.entries(lesson.units))
      if (!agree(unit.latest, id, index)) return false;
  }
  for (const record of Object.values(progress.records)) {
    const row = byId.get(record.id);
    if (
      row &&
      !(
        row.mode === 'test' &&
        row.status === 'completed' &&
        row.reason === 'deadline' &&
        row.eligible === true &&
        !row.repeatedMaterial &&
        ['date', 'language', 'duration', 'version', 'accuracyVersion'].every(
          (key) => row[key] === record[key],
        ) &&
        row.metrics.wpm === record.wpm &&
        row.metrics.accuracy === record.accuracy
      )
    )
      return false;
  }
  return true;
}

// Читаем резервную копию без изменения настроек.
export function parseBackup(text) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > MAX_BYTES)
    fail('Backup is too large', 'size');
  let data;
  try {
    data = JSON.parse(text, (key, value) => {
      if (['__proto__', 'prototype', 'constructor'].includes(key)) fail();
      return value;
    });
  } catch {
    fail('Backup is not valid JSON');
  }
  if (
    !keys(data, ['schema', 'exportedAt', 'history', 'settings', 'progress']) ||
    ![1, 2].includes(data.schema) ||
    !Array.isArray(data.history) ||
    data.history.length > MAX_HISTORY ||
    !optional(data, 'exportedAt', date) ||
    !optional(data, 'settings', object)
  )
    fail();
  if (data.schema === 1 && data.progress !== undefined) fail();
  if (data.schema === 2 && !strictProgress(data.progress)) fail('Invalid saved progress');
  let size = 0;
  const ids = new Set();
  for (const row of data.history) {
    if (!validResult(row) || ids.has(row.id)) fail('Invalid or duplicate result');
    ids.add(row.id);
    size += row.source.length + row.value.length;
    if (size > MAX_TEXT) fail('Backup text is too large', 'size');
  }
  if (data.schema === 2 && !referencesAgree(data.progress, data.history))
    fail('Progress conflicts with result details', 'conflict');
  const history = [...data.history].sort(
    (a, b) => Date.parse(a.date) - Date.parse(b.date) || a.id.localeCompare(b.id),
  );
  return {
    history,
    progress: reconcileProgress(data.schema === 2 ? data.progress : emptyProgress(), history),
  };
}

const union = (a = [], b = []) => [...new Set([...a, ...b])].sort();
const unionDays = (a, b) => union(a, b).slice(-3);
function milestones(progress) {
  const value = structuredClone(progress);
  delete value.processedLessonIds;
  for (const lesson of Object.values(value.lessons)) {
    delete lesson.attemptIds;
    for (const unit of Object.values(lesson.units)) delete unit.attemptIds;
  }
  return value;
}
function mergeSummary(a, b, overlap) {
  if (!a) return structuredClone(b);
  if (!b) return structuredClone(a);
  const merged = {
    ...a,
    ...b,
    latest: Date.parse(b.latest.date) > Date.parse(a.latest.date) ? b.latest : a.latest,
    passDays: unionDays(a.passDays, b.passDays),
  };
  if (a.attemptIds && b.attemptIds) {
    merged.attemptIds = union(a.attemptIds, b.attemptIds);
    merged.attempts = merged.attemptIds.length;
  } else {
    delete merged.attemptIds;
    merged.attempts = overlap ? Math.max(a.attempts, b.attempts) : a.attempts + b.attempts;
  }
  return merged;
}
function withKnownIds(progress, history) {
  const next = structuredClone(progress);
  for (const [id, lesson] of Object.entries(next.lessons)) {
    const matching = history.filter(
      (row) => row.lessonId === id && next.processedLessonIds.includes(row.id),
    );
    if (!lesson.attemptIds && matching.length === lesson.attempts)
      lesson.attemptIds = matching.map((row) => row.id);
    for (const [index, unit] of Object.entries(lesson.units)) {
      const rows = matching.filter((row) => row.lessonUnit === Number(index));
      if (!unit.attemptIds && rows.length === unit.attempts)
        unit.attemptIds = rows.map((row) => row.id);
    }
  }
  return next;
}
function mergeProgress(left, right) {
  const next = structuredClone(left),
    seen = new Set(left.processedLessonIds),
    overlap = right.processedLessonIds.some((id) => seen.has(id));
  next.processedLessonIds = union(left.processedLessonIds, right.processedLessonIds);
  for (const [id, incoming] of Object.entries(right.lessons)) {
    const previous = next.lessons[id];
    if (!previous) {
      next.lessons[id] = structuredClone(incoming);
      continue;
    }
    const lesson = mergeSummary(previous, incoming, overlap);
    lesson.legacyPassed = previous.legacyPassed || incoming.legacyPassed;
    lesson.legacyPassDays = unionDays(previous.legacyPassDays, incoming.legacyPassDays);
    if (previous.unitCount !== undefined || incoming.unitCount !== undefined)
      lesson.unitCount = Math.max(previous.unitCount || 0, incoming.unitCount || 0);
    lesson.units = { ...previous.units };
    for (const [index, unit] of Object.entries(incoming.units)) {
      lesson.units[index] = mergeSummary(previous.units[index], unit, overlap);
      lesson.units[index].passed = !!(previous.units[index]?.passed || unit.passed);
    }
    lesson.attempts = Math.max(
      lesson.attempts,
      Object.values(lesson.units).reduce((total, unit) => total + unit.attempts, 0),
    );
    next.lessons[id] = lesson;
  }
  for (const [key, record] of Object.entries(right.records)) {
    const old = next.records[key];
    if (!old || record.wpm > old.wpm || (record.wpm === old.wpm && record.accuracy > old.accuracy))
      next.records[key] = record;
  }
  return next;
}

// При конфликте ID отменяем объединение.
export function prepareImport(current, incoming) {
  const byId = new Map(current.history.map((row) => [row.id, row])),
    conflicts = [];
  let duplicate = 0;
  for (const row of incoming.history) {
    if (byId.has(row.id)) {
      if (!same(byId.get(row.id), row)) conflicts.push(row.id);
      else duplicate++;
    } else byId.set(row.id, row);
  }
  if (
    conflicts.length ||
    !referencesAgree(incoming.progress, current.history) ||
    !referencesAgree(current.progress, incoming.history)
  ) {
    const error = new Error('Backup conflicts with existing results');
    error.code = 'conflict';
    error.ids = conflicts;
    throw error;
  }
  const all = [...byId.values()].sort(
      (a, b) => Date.parse(a.date) - Date.parse(b.date) || a.id.localeCompare(b.id),
    ),
    history = all.slice(-100);
  const currentIds = new Set(current.history.map((row) => row.id)),
    retained = new Set(history.map((row) => row.id));
  const left = withKnownIds(reconcileProgress(current.progress, current.history), all),
    right = withKnownIds(reconcileProgress(incoming.progress, incoming.history), all);
  const progress = mergeProgress(left, right);
  return {
    history,
    progress,
    added: history.filter((row) => !currentIds.has(row.id)).length,
    duplicate,
    discarded: incoming.history.filter((row) => !retained.has(row.id)).length,
    conflicts: [],
    milestonesChanged: !same(milestones(current.progress), milestones(progress)),
  };
}
