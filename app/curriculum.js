import { reconcileProgress } from './progress-state.js';

export const CURRICULUM_VERSION = 2;
const makeDrill = (keys, offset = 0) => {
  const letters = [...keys],
    pairs = [];
  for (let i = 0; i < Math.max(12, letters.length * 2); i++)
    pairs.push(
      letters[(i + offset) % letters.length] +
        letters[
          (((letters.length - 1 - i + offset) % letters.length) + letters.length) % letters.length
        ],
    );
  return [...letters, ...pairs].join(' ');
};
function stage(language, key, title, description, keys, known, words, passages = []) {
  const allowed = new Set([...known]);
  const vocabulary = words
    .split(' ')
    .filter((word) => [...word].every((char) => allowed.has(char)));
  const variants = Array.from(
    { length: 3 },
    (_, index) =>
      passages[index] ||
      [
        makeDrill(keys, index),
        vocabulary
          .slice(index * 2)
          .concat(vocabulary.slice(0, index * 2))
          .join(' '),
        makeDrill(known.slice(0, Math.min(8, known.length)), index + 1),
      ]
        .filter(Boolean)
        .join(' '),
  );
  const groups = KEY_GROUPS[language][key];
  let introduced = PRIOR_KEYS[language][key] || '';
  const units = groups
    ? groups.map((unitKeys, index) => {
        introduced += unitKeys;
        const controlled = vocabulary.filter((word) =>
          [...word].every((char) => introduced.includes(char)),
        );
        const unitVariants = Array.from({ length: 3 }, (_, variant) =>
          [
            makeDrill(unitKeys, variant),
            makeDrill(
              [...new Set(introduced.slice(0, 4) + introduced.slice(-4))].join(''),
              variant + 1,
            ),
            controlled.slice(variant).concat(controlled.slice(0, variant)).slice(0, 4).join(' '),
          ]
            .filter(Boolean)
            .join(' '),
        );
        return {
          id: `${language}-${key}-${index}`,
          index,
          title,
          description,
          keys: unitKeys,
          known: introduced,
          variants: unitVariants,
        };
      })
    : [{ id: `${language}-${key}-0`, index: 0, title, description, keys, known, variants }];
  return {
    id: `${language}-${key}-v${CURRICULUM_VERSION}`,
    title,
    description,
    keys,
    known,
    variants,
    text: variants[0],
    units,
  };
}
const ruHome = 'фывапролджэ',
  ruTop = ruHome + 'йцукенгшщзхъё',
  ruAll = ruTop + 'ячсмитьбю';
const enHome = 'asdfghjkl;',
  enTop = enHome + 'qwertyuiop',
  enAll = enTop + 'zxcvbnm';
const KEY_GROUPS = {
  ru: {
    home: ['ао'],
    middle: ['вл', 'ып', 'фж', 'рдэ'],
    top: ['ег', 'ук', 'нш', 'цщ', 'йз', 'хъё'],
    bottom: ['ми', 'ст', 'чь', 'ябю'],
  },
  en: {
    home: ['fj'],
    middle: ['dk', 'sl', 'a;', 'gh'],
    top: ['ru', 'ei', 'wo', 'qp', 'ty'],
    bottom: ['vm', 'cn', 'zxb'],
  },
};
const PRIOR_KEYS = {
  ru: { home: '', middle: 'ао', top: ruHome, bottom: ruTop },
  en: { home: '', middle: 'fj', top: enHome, bottom: enTop },
};
export const LESSONS = {
  ru: [
    stage(
      'ru',
      'home',
      'Опорные клавиши',
      'Левый указательный — на «а», правый — на «о».',
      'ао',
      'ао',
      '',
    ),
    stage(
      'ru',
      'middle',
      'Основной ряд',
      'Возвращайте пальцы на опорный ряд.',
      ruHome,
      ruHome,
      'пора вода двор дрова лапа жара пара вал фара вол',
    ),
    stage(
      'ru',
      'top',
      'Верхний ряд',
      'Новые клавиши чередуются со знакомыми.',
      'йцукенгшщзхъё',
      ruTop,
      'окно река рука урок школа дорога дерево погода кофе врач шарф пауза флаг',
    ),
    stage(
      'ru',
      'bottom',
      'Нижний ряд',
      'Новые клавиши чередуются со знакомыми.',
      'ячсмитьбю',
      ruAll,
      'мир стол лист письмо место семья время мысль книга берег город яблоко человек',
    ),
    stage(
      'ru',
      'words',
      'Слова',
      'Смотрите на текст. Пробел нажимайте большим пальцем.',
      '',
      ruAll,
      '',
      [
        'место время работа слово книга окно утро вечер дорога город письмо река мысль история вместе берег точность движение привычка слово время река работа вместе',
        'утро город дорога берег книга письмо вечер работа окно время вместе история привычка мысль движение точность река слово работа время место вечер книга берег',
        'книга дорога точность движение утро место работа вечер мысль окно привычка река история город время вместе письмо берег слово книга утро работа место время',
      ],
    ),
    stage(
      'ru',
      'sentences',
      'Предложения',
      'Сохраняйте точность в связном тексте.',
      '',
      ruAll,
      '',
      [
        'Утром город был тихим. Мы открыли окно, поставили чайник и вернулись к работе. Через 10 минут пришло письмо: встречу перенесли на вечер.',
        'Поезд пришёл вовремя. За окном медленно проходили дома, деревья и небольшие станции. Я открыл книгу. До следующей остановки оставалось 20 минут.',
        'На столе лежали 3 листа бумаги. Я записал план, убрал лишние вещи и начал работу. Как лучше закончить эту историю? Ответ нашёлся к вечеру.',
      ],
    ),
  ],
  en: [
    stage(
      'en',
      'home',
      'Опорные клавиши',
      'Левый указательный — на f, правый — на j.',
      'fj',
      'fj',
      '',
    ),
    stage(
      'en',
      'middle',
      'Основной ряд',
      'Возвращайте пальцы на опорный ряд.',
      enHome,
      enHome,
      'a as ask fall glad half flask glass salad dash shall',
    ),
    stage(
      'en',
      'top',
      'Верхний ряд',
      'Новые клавиши чередуются со знакомыми.',
      'qwertyuiop',
      enTop,
      'the type write quiet road water field house read word thought paper',
    ),
    stage(
      'en',
      'bottom',
      'Нижний ряд',
      'Новые клавиши чередуются со знакомыми.',
      'zxcvbnm',
      enAll,
      'time work place book morning river next calm brave move name zinc box',
    ),
    stage(
      'en',
      'words',
      'Слова',
      'Смотрите на текст. Пробел нажимайте большим пальцем.',
      '',
      enAll,
      '',
      [
        'time work place word book morning evening road city letter river thought story together window motion practice accuracy return rhythm book time work place',
        'morning road window rhythm practice river book return letter time together story city thought motion accuracy work evening word place time letter river',
        'practice word book accuracy evening river morning city place window thought rhythm letter story time work together motion return place book river morning',
      ],
    ),
    stage(
      'en',
      'sentences',
      'Предложения',
      'Сохраняйте точность в связном тексте.',
      '',
      enAll,
      '',
      [
        'The city was quiet in the morning. We opened a window, made some tea, and returned to work. After 10 minutes, a letter arrived: the meeting was moved to the evening.',
        'The train arrived on time. Houses, trees, and small stations passed outside the window. I opened my book. There were 20 minutes until the next stop.',
        'There were 3 sheets of paper on the desk. I wrote a plan, put away the extra things, and began to work. How should this story end? The answer came later.',
      ],
    ),
  ],
};

export const LESSON_ACCURACY = 95;
export function isCompletedLessonAttempt(row) {
  return row?.status === 'completed' && row.mode === 'lesson' && row.reason === 'material';
}
export function isMasteredLessonAttempt(row) {
  return !!(
    isCompletedLessonAttempt(row) &&
    LESSONS[row.language]?.some((lesson) => lesson.id === row.lessonId) &&
    Number.isFinite(row.metrics?.accuracy) &&
    row.metrics.accuracy >= LESSON_ACCURACY &&
    row.metrics.accuracy <= 100
  );
}
const localDay = (date) => {
  const value = new Date(date);
  if (!Number.isFinite(value.getTime())) return null;
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
};
const dayTime = (day) => Date.parse(`${day}T00:00:00Z`);
function lessonProgress(lesson, history, progress) {
  const validHistory = history
    .filter(
      (row) =>
        isCompletedLessonAttempt(row) &&
        LESSONS[row.language]?.some((item) => item.id === row.lessonId),
    )
    .map((row, index) =>
      typeof row.id === 'string'
        ? row
        : { ...row, id: `curriculum-history:${row.lessonId}:${row.date}:${index}` },
    );
  return reconcileProgress(progress, validHistory).lessons?.[lesson.id] || {};
}
export function lessonStatus(lesson, history = [], now = Date.now(), progress = {}) {
  const saved = lessonProgress(lesson, history, progress),
    totalUnits = lesson.units.length;
  const historyAttempts = history.filter(
    (row) => isCompletedLessonAttempt(row) && row.lessonId === lesson.id,
  );
  const latestHistory = historyAttempts
    .toSorted((a, b) => Date.parse(a.date) - Date.parse(b.date))
    .at(-1);
  const latest = !saved.latest
    ? latestHistory
    : latestHistory && Date.parse(latestHistory.date) >= Date.parse(saved.latest.date)
      ? latestHistory
      : saved.latest;
  const legacyDays = saved.legacyPassDays || [];
  const units = lesson.units.map((_, index) => {
    const unit = saved.units?.[index] || {};
    const days = [
      ...new Set([...(unit.passDays || []), ...(saved.legacyPassed ? legacyDays : [])]),
    ].sort();
    return { ...unit, passed: !!(saved.legacyPassed || unit.passed), passDays: days };
  });
  const completedUnits = units.filter((unit) => unit.passed).length,
    passed = completedUnits === totalUnits;
  const retained = passed && units.every((unit) => unit.passDays.length >= 2);
  const latestAccuracy = latest?.metrics?.accuracy ?? latest?.accuracy;
  const reviewNeeded =
    passed && Number.isFinite(latestAccuracy) && latestAccuracy < LESSON_ACCURACY;
  // Повторения в один день не увеличивают интервал.
  const due =
    passed &&
    units.some((unit) => {
      const days = unit.passDays,
        gap = days.length < 2 ? 1 : days.length === 2 ? 3 : 7;
      const last = days.at(-1);
      return !!last && dayTime(localDay(now)) - dayTime(last) >= gap * 86400000;
    });
  const unfinished = units.findIndex((unit) => !unit.passed);
  const reviewUnit = units
    .map((unit, index) => ({ unit, index }))
    .sort((a, b) => {
      const aWeak =
        Number.isFinite(a.unit.latest?.accuracy) && a.unit.latest.accuracy < LESSON_ACCURACY;
      const bWeak =
        Number.isFinite(b.unit.latest?.accuracy) && b.unit.latest.accuracy < LESSON_ACCURACY;
      return (
        Number(bWeak) - Number(aWeak) ||
        a.unit.passDays.length - b.unit.passDays.length ||
        String(a.unit.passDays.at(-1) || '').localeCompare(String(b.unit.passDays.at(-1) || '')) ||
        a.index - b.index
      );
    })[0].index;
  return {
    attempts: saved.attempts ?? historyAttempts.length,
    latest,
    mastered: passed,
    passed,
    retained,
    reviewNeeded,
    due,
    completedUnits,
    totalUnits,
    nextUnit: unfinished < 0 ? reviewUnit : unfinished,
  };
}
export function lessonForAttempt(id, history = [], progress = {}, options = {}) {
  const base = Object.values(LESSONS)
    .flat()
    .find((lesson) => lesson.id === id);
  if (!base) return null;
  const status = lessonStatus(base, history, Date.now(), progress);
  const explicit = Number.isInteger(options.repeatUnit) ? options.repeatUnit : null;
  const unitIndex =
    explicit === null ? status.nextUnit : Math.max(0, Math.min(base.units.length - 1, explicit));
  const unit = base.units[unitIndex],
    saved = lessonProgress(base, history, progress);
  const count =
    (saved.units?.[unitIndex]?.attempts || 0) +
    (unitIndex === 0
      ? (saved.attempts || 0) -
        Object.values(saved.units || {}).reduce((sum, row) => sum + (row.attempts || 0), 0)
      : 0);
  return {
    ...base,
    ...unit,
    id: base.id,
    text: unit.variants[Math.max(0, count) % unit.variants.length],
    unitIndex,
    unitCount: base.units.length,
    unitKeys: unit.keys,
  };
}
export function nextLesson(language, history = [], now = Date.now(), progress = {}) {
  const rows = LESSONS[language] || LESSONS.ru,
    status = rows.map((lesson) => ({ lesson, ...lessonStatus(lesson, history, now, progress) }));
  return (
    status.find((row) => row.attempts && !row.passed) ||
    status.find((row) => row.reviewNeeded || row.due) ||
    status.find((row) => !row.passed) ||
    status[0]
  ).lesson;
}
export function lessonFeedback(result) {
  const counts = new Map();
  for (const row of result?.wrongKeys || []) {
    if (typeof row.expected !== 'string' || !Number.isFinite(row.count) || row.count <= 0) continue;
    const key = `${row.expected}\u0000${row.actual ?? ''}`,
      previous = counts.get(key);
    counts.set(key, {
      expected: row.expected,
      actual: row.actual ?? '',
      count: (previous?.count || 0) + row.count,
    });
  }
  const wrongKeys = [...counts.values()].sort((a, b) => b.count - a.count);
  const weak = new Map();
  for (const row of wrongKeys) weak.set(row.expected, (weak.get(row.expected) || 0) + row.count);
  return {
    wrongKeys,
    weakKeys: [...weak].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count),
  };
}
