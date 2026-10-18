import {
  Attempt,
  VERSION,
  graphemes,
  recommendation,
  recommendationState,
  goalEvidence,
  MIN_PRACTICE_EXPOSURES,
} from './engine.js';
import { makeText, hasMaterial, LESSONS, fingerFor, hash } from './content.js';
import {
  load,
  persist,
  upsert,
  readStoredBackup,
  commitImport,
} from './storage.js';
import { emptyProgress, recordProgress, bestRecord } from './progress-state.js';
import { practiceSources, restoreJourney } from './practice-journey.js';
import { controlOutcome } from './control-outcome.js';
import { parseBackup, prepareImport } from './backup.js';
import { createDropdowns } from './dropdowns.js';
import { shouldFocusTyping } from './input-focus.js';
import { message, localizeElement, captureStaticLabels } from './i18n.js';
import { exerciseLanguage } from './language.js';
import { createTypingScene, layoutLines } from './typing-scene.js';
import {
  lessonForAttempt,
  lessonStatus,
  nextLesson,
  isMasteredLessonAttempt,
  lessonFeedback,
} from './curriculum.js';
import { historyRows, filtersForResult, comparableTests } from './history.js';
import { reviewErrors, reviewIndex } from './result-review.js';
import { keyboardRows, keyHint, shiftKeyFor } from './keyboard-guide.js';
import { analyzeResult } from './result-analysis.js';
import { createNavigationMotion } from './navigation-motion.js';
import { createLanguageSwitches } from './language-switch.js';

const $ = (id) => document.getElementById(id);
const h = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const n = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const number = (value, digits = 1) =>
  Number(value).toLocaleString(uiLanguage() === 'en' ? 'en-US' : 'ru-RU', {
    maximumFractionDigits: digits,
  });
const accuracy = (value) => (value === null || value === undefined ? '—' : `${number(value)}%`);
const modeNames = {
  test: 'Тест',
  free: 'Свободная практика',
  targeted: 'Отработка',
  control: 'Проверка',
  lesson: 'Урок',
};
const errorNames = {
  substitution: 'Замена',
  omission: 'Пропуск',
  insertion: 'Лишний символ',
  transposition: 'Перестановка',
};
const arrow =
  '<span class="arrow" aria-hidden="true"><svg viewBox="0 0 24 16"><path d="M1 8h20m-6-6 6 6-6 6"/></svg></span>';
const button = (label, action, { primary = false, value = '' } = {}) =>
  `<button type="button" class="action${primary ? ' primary' : ''}" data-action="${action}"${value ? ` data-value="${h(value)}"` : ''}>${h(t(label))}${primary ? arrow : ''}</button>`;
const stored = load();
let history = stored.history,
  progress = stored.progress || emptyProgress(),
  settings = stored.settings,
  storageWarning = stored.warning,
  storageReadOnly = !!stored.readOnly;
settings.textLanguage = exerciseLanguage(settings);
delete settings.detectedLanguage;
const uiLanguage = () => (settings.uiLanguage === 'en' ? 'en' : 'ru');
const t = (value) => message(value, uiLanguage());
const localize = (root) => localizeElement(root, uiLanguage());
const staticLabels = captureStaticLabels(
  document.querySelectorAll(
    '.app-header,.app-footer,.skip-link,dialog,#practice-controls .selectors,.typing-surface > label,#error-review,#review-entry,#result-inspect-controls,#keyboard-button',
  ),
);
const state = {
  route: 'practice',
  language: exerciseLanguage(settings),
  duration: settings.duration === 60 ? 60 : 30,
  mode: 'test',
  attempt: null,
  result: null,
  focused: false,
  composing: false,
  journey: null,
  pending: null,
  fromHistory: false,
  notice: '',
  review: null,
  filter: { language: exerciseLanguage(settings), mode: 'all', duration: 'all' },
  progressDuration: settings.duration === 60 ? 60 : 30,
  progressMetric: 'wpm',
  historyLimit: 30,
  adaptiveStatus: 'no-history',
  showKeyboard: !!settings.showKeyboard,
};
let timer = null,
  wrapCache = null,
  dragAnchor = null,
  resizeFrame = null,
  pendingBackup = null,
  backupRead = 0;
const input = $('typing-input');
const pressedKeys = new Set(),
  wrongKeys = new Set();
let capsLock = false;
const scene = createTypingScene($('text-window'), $('caret'));
const navigationMotion = createNavigationMotion({
  nav: document.querySelector('.app-header nav'),
  views: { practice: $('practice-view'), learn: $('learn-view'), progress: $('progress-view') },
  reducedMotion: () => !!settings.reducedMotion,
});
const html = (id, value) => {
  if ($(id).innerHTML !== value) $(id).innerHTML = value;
};
const languageSwitches = createLanguageSwitches({ reducedMotion: () => !!settings.reducedMotion });
const mountTextLanguage = (host, language, disabled = false) =>
  languageSwitches.mount($(host), { language, disabled, label: t('Язык текста') });
const text = (id, value) => {
  const translated = t(value);
  if ($(id).textContent !== translated) $(id).textContent = translated;
};
const announce = (value) => text('announcement', value);
const warn = (value) => {
  state.notice = value;
  text('input-status', value);
};
const setSaved = () => persist(history, settings, { readOnly: storageReadOnly, progress });
const isActive = () => ['running', 'paused'].includes(state.attempt?.state);
const dropdowns = createDropdowns({
  onChoose: (select) => {
    if (state.route === 'practice') focusInput();
    else $(`${select.id}-trigger`)?.focus({ preventScroll: true });
  },
});

function applySettings() {
  if ([28, 30, 32, 34, 36, 38, 40, 42, 44].includes(settings.fontSize))
    document.documentElement.style.setProperty('--type-size', `${settings.fontSize}px`);
  document.documentElement.classList.toggle('motion-reduced', !!settings.reducedMotion);
  document.documentElement.lang = uiLanguage();
  staticLabels(uiLanguage());
  navigationMotion.syncPreferences();
  languageSwitches.syncPreferences();
  $('practice-view').setAttribute('aria-label', t('Тренировка'));
  $('result-overview').setAttribute('aria-label', t('Результат'));
  $('interface-language').value = uiLanguage();
}
function focusInput() {
  if (
    state.route === 'practice' &&
    state.attempt &&
    ['ready', 'running'].includes(state.attempt.state) &&
    !document.querySelector('dialog[open]') &&
    !dropdowns.isOpen
  )
    input.focus({ preventScroll: true });
}
function resumePractice() {
  if (state.attempt?.state !== 'paused') return;
  state.attempt.resume();
  renderPractice();
  focusInput();
  announce('Практика продолжается.');
}
function focusHeading() {
  const heading =
    !$('adaptive-panel').hidden && state.route === 'practice'
      ? $('adaptive-panel').querySelector('h1')
      : document.querySelector('main section:not([hidden]) h1');
  if (heading) {
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }
}
function updateHeader() {
  const route =
    state.route === 'practice' && state.attempt?.mode === 'lesson' ? 'learn' : state.route;
  document.querySelectorAll('[data-route]').forEach((a) => {
    if (a.dataset.route === route) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  navigationMotion.setActive(route);
  text('footer-note', storageWarning ? 'История пока не сохраняется' : '');
  $('footer-note').hidden = !storageWarning;
}
function routeTo(route) {
  clearInterval(timer);
  timer = null;
  state.review = null;
  state.route = ['learn', 'progress'].includes(route) ? route : 'practice';
  window.history.replaceState(null, '', `#${state.route}`);
  updateHeader();
  document.title = 'typaze';
  announce('');
  dropdowns.close();
  navigationMotion.show(state.route);
  if (state.route === 'learn') {
    state.language = exerciseLanguage(settings);
    renderLearn();
    focusHeading();
  } else if (state.route === 'progress') {
    renderProgress();
    focusHeading();
  } else {
    state.language = exerciseLanguage(settings);
    state.mode = 'test';
    startAttempt();
  }
}
function request(action) {
  if (isActive()) {
    state.pending = action;
    $('leave-dialog').showModal();
  } else action();
}
function startAttempt({
  mode = state.mode,
  goal = null,
  baseline = null,
  lesson = null,
  continueText = null,
  excludeSeen = [],
} = {}) {
  clearInterval(timer);
  state.route = 'practice';
  state.result = null;
  state.fromHistory = false;
  state.review = null;
  state.composing = false;
  state.focused = false;
  warn('');
  wrapCache = null;
  window.history.replaceState(null, '', '#practice');
  document.title = 'typaze';
  announce('');
  dropdowns.close();
  navigationMotion.show('practice', { resetScroll: true });
  if (mode === 'adaptive') {
    const latest = [...history]
      .reverse()
      .find(
        (r) =>
          r.status === 'completed' &&
          r.mode === 'test' &&
          r.language === state.language &&
          r.duration === state.duration &&
          r.version === VERSION,
      );
    const diagnosis = recommendationState(history, latest, (g) =>
      hasMaterial(state.language, g, latest?.seen || []),
    );
    if (!diagnosis.recommendation) {
      state.attempt = null;
      state.adaptiveStatus = diagnosis.status;
      renderAdaptive();
      updateHeader();
      focusHeading();
      return;
    }
    goal = diagnosis.recommendation.group;
    baseline = latest;
    mode = 'targeted';
  }
  const practiceSeen = practiceSources(state.journey, { baseline, goal, extra: excludeSeen });
  const exclude =
    mode === 'control' || mode === 'targeted'
      ? [
          ...new Set([
            ...practiceSeen,
            ...(baseline?.seen || state.journey?.baseline?.seen || []),
            ...(mode === 'control' ? state.journey?.practice?.seen || [] : []),
          ]),
        ]
      : [];
  const material = lesson
    ? { text: lesson.text, textId: `${lesson.id}-${hash(lesson.text)}`, paragraphs: [] }
    : continueText
      ? { text: continueText, textId: `continued-${Date.now()}`, paragraphs: [] }
      : makeText(state.language, {
          goal: ['targeted', 'control'].includes(mode) ? goal : null,
          purpose: mode,
          exclude,
          first: mode === 'test' && !history.some((r) => r.language === state.language),
        });
  if (!material) {
    state.attempt = null;
    state.mode = 'adaptive';
    state.adaptiveStatus = 'no-material';
    renderAdaptive();
    updateHeader();
    focusHeading();
    return;
  }
  state.attempt = new Attempt({
    ...material,
    language: state.language,
    duration: mode === 'targeted' ? 30 : state.duration,
    mode,
    goal,
    lessonId: lesson?.id || null,
    lessonUnit: lesson?.unitIndex,
    lessonUnitCount: lesson?.unitCount,
    baseline,
  });
  state.attempt.repetitionAt = material.repetitionAt ?? Infinity;
  if (lesson) state.attempt.lesson = lesson;
  if (mode === 'targeted') state.journey = { baseline, goal, practice: null, practiceSeen };
  if (mode === 'test' || mode === 'free' || mode === 'lesson') state.journey = null;
  input.value = '';
  input.setSelectionRange(0, 0);
  input.scrollTop = 0;
  renderPractice();
  focusInput();
  timer = setInterval(tick, 100);
}
function tick() {
  const a = state.attempt;
  if (!a || state.route !== 'practice') return;
  const before = a.state;
  a.advance();
  if (before === 'running' && a.state === 'completed') {
    finishUI();
    return;
  }
  if (a.state === 'running') renderClock();
}
function renderClock() {
  const a = state.attempt;
  if (!a) return;
  if (a.state === 'running') {
    const seconds = a.timed
      ? Math.max(0, Math.ceil(a.duration - a.elapsed()))
      : Math.floor(a.elapsed());
    text(
      'service-title',
      a.timed
        ? `${seconds} с`
        : a.mode === 'lesson'
          ? `${a.alignment.I} из ${a.aligner.reference.length}`
          : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`,
    );
    $('service-title').className = 'clock';
  }
}
function renderPractice() {
  const a = state.attempt;
  if (!a) return;
  updateHeader();
  $('typing-surface').hidden = false;
  $('result-text').hidden = false;
  $('adaptive-panel').hidden = true;
  const compactResult = a.state === 'completed',
    disclosure = $('result-text');
  $('practice-view').classList.toggle('has-result-summary', compactResult);
  $('result-overview').hidden = !compactResult;
  $('result-text-summary').hidden = true;
  $('result-inspect-controls').hidden = !compactResult;
  $('result-details-toggle').hidden = a.mode === 'lesson';
  if (!compactResult) {
    disclosure.open = true;
    delete disclosure.dataset.resultId;
  } else if (disclosure.dataset.resultId !== a.savedResult?.id) {
    disclosure.open = false;
    disclosure.dataset.resultId = a.savedResult?.id || '';
  }
  $('result-review-tools').hidden =
    !compactResult || !reviewErrors(state.result || a.savedResult).length;
  $('practice-view').dataset.state = a.state;
  const terminal = ['completed', 'interrupted'].includes(a.state);
  input.disabled = terminal || a.state === 'paused';
  $('practice-controls').hidden = terminal;
  $('input-help').hidden = terminal || a.mode !== 'lesson' || a.state === 'paused';
  $('result-panel').hidden = !terminal;
  $('mode-select').value = state.mode;
  $('duration-select').value = String(state.duration);
  const locked = a.state !== 'ready';
  for (const id of ['mode-select', 'duration-select']) $(id).disabled = locked;
  $('practice-options').hidden = ['lesson', 'targeted', 'control'].includes(a.mode);
  mountTextLanguage(
    'practice-languages',
    a.language,
    locked || ['targeted', 'control'].includes(a.mode),
  );
  $('duration-label').hidden = a.mode === 'free';

  $('keyboard-button').hidden = a.mode === 'control';
  $('keyboard-button').setAttribute('aria-pressed', String(state.showKeyboard));
  if (a.state === 'ready') {
    $('service-title').className = ['test', 'free'].includes(a.mode) ? 'sr-only' : '';
    text(
      'service-title',
      a.mode === 'targeted'
        ? `Отработка «${a.goal}»`
        : a.mode === 'control'
          ? 'Проверка'
          : a.mode === 'lesson'
            ? `${t(a.lesson?.title || 'Учебный шаг')} · ${(a.lesson?.unitIndex || 0) + 1}/${a.lesson?.unitCount || 1}`
            : 'Тренировка',
    );
    text('input-help', a.mode === 'lesson' ? a.lesson?.description || 'Печатайте без спешки.' : '');
    html('live-actions', a.mode === 'control' ? button('К результату', 'baseline') : '');
  } else if (a.state === 'running') {
    renderClock();
    text(
      'input-help',
      a.mode === 'lesson' ? fingerFor(a.aligner.reference[a.alignment.R], a.language) : '',
    );
    html(
      'live-actions',
      a.timed
        ? button('Прервать тест', 'interrupt')
        : button('Пауза', 'pause') +
            button(a.mode === 'lesson' ? 'Прервать урок' : 'Закончить', 'finish'),
    );
  } else if (a.state === 'paused') {
    $('service-title').className = '';
    text('service-title', 'Пауза');
    text('input-help', '');
    html(
      'live-actions',
      button('Продолжить', 'resume', { primary: true }) +
        button(a.mode === 'lesson' ? 'Прервать урок' : 'Закончить', 'finish'),
    );
  } else renderResult();
  localize($('live-actions'));
  if (terminal) {
    localize($('result-overview'));
    localize($('result-panel'));
  }
  localize($('service-title'));
  renderText();
  renderErrorReview();
  renderKeyboard();
  renderFingerGuide();
  syncResultInspect();
  dropdowns.refresh();
}
function caretReference() {
  const a = state.attempt;
  if (!a) return 0;
  const position = graphemes(a.value.slice(0, input.selectionEnd ?? a.value.length)).length;
  if (position >= a.alignment.I) return a.alignment.R;
  for (const op of a.alignment.ops) {
    if (op.kind === 'omission') continue;
    if (position <= op.t) return op.r;
    if (op.kind === 'transposition' && position === op.t + 1) return op.r + 1;
  }
  return a.alignment.R;
}
function renderText() {
  const a = state.attempt;
  if (!a || !$('result-text').open) return;
  const window = $('text-window'),
    style = getComputedStyle($('typing-surface'));
  const fontSize = parseFloat(style.fontSize),
    lineHeight = parseFloat(style.lineHeight);
  // Ширина символа JetBrains Mono равна 0,6 размера шрифта.
  const charWidth = fontSize * 0.6,
    columns = Math.max(12, Math.floor(window.clientWidth / charWidth));
  if (!wrapCache || wrapCache.id !== a.id || wrapCache.columns !== columns)
    wrapCache = { id: a.id, columns, lines: layoutLines(a.aligner.reference, columns) };
  const review = activeReview(),
    selectedError = review?.errors[review.index];
  const lines = wrapCache.lines,
    refCaret = selectedError?.anchor ?? caretReference();
  let current = lines.findIndex((line) => refCaret >= line.start && refCaret < line.end);
  if (current < 0) current = Math.max(0, lines.length - 1);
  const first = Math.max(0, current - 1),
    visible = lines.slice(first, first + 3);
  const statuses = new Map(),
    insertions = new Map();
  for (const op of a.alignment.ops) {
    if (op.kind === 'insertion') {
      insertions.set(op.r, (insertions.get(op.r) || '') + op.actual);
      continue;
    }
    if (op.kind === 'transposition') {
      for (let k = 0; k < 2; k++)
        statuses.set(op.r + k, {
          class: 'wrong',
          actual: graphemes(op.actual)[k],
          typed: op.t + k,
        });
    } else
      statuses.set(op.r, {
        class: op.kind === 'match' ? 'done' : op.kind === 'omission' ? 'wrong omitted' : 'wrong',
        actual: op.actual,
        typed: op.kind === 'omission' ? null : op.t,
      });
  }
  const selectedStart = graphemes(a.value.slice(0, input.selectionStart || 0)).length,
    selectedEnd = graphemes(a.value.slice(0, input.selectionEnd || 0)).length;
  const rendered = scene.layout({
    key: `${a.id}:${columns}:${fontSize}`,
    lines,
    first,
    current,
    refCaret,
    charWidth,
    fontSize,
    lineHeight,
  });
  for (const { line, letters } of rendered) {
    for (let r = line.start; r < line.end; r++) {
      const letter = letters[r - line.start],
        status = statuses.get(r);
      const className = `letter${status ? ' ' + status.class : ''}`;
      if (letter.className !== className) letter.className = className;
      const glyph = status?.actual || a.aligner.reference[r];
      if (letter.firstChild.nodeValue !== glyph) letter.firstChild.nodeValue = glyph;
      if (letter.hasAttribute('title')) letter.removeAttribute('title');
      if (status?.class.includes('wrong'))
        letter.title = t(
          `Ожидалось: ${a.aligner.reference[r] === ' ' ? 'пробел' : a.aligner.reference[r]}`,
        );
      if (
        selectedEnd > selectedStart &&
        status?.typed >= selectedStart &&
        status?.typed < selectedEnd
      )
        letter.classList.add('selected');
      if (a.mode === 'targeted' && a.goal) {
        const size = graphemes(a.goal).length;
        for (let offset = 0; offset < size; offset++)
          if (
            a.aligner.reference
              .slice(r - offset, r - offset + size)
              .join('')
              .toLowerCase() === a.goal
          )
            letter.classList.add('goal');
      }
      if (a.mode === 'lesson' && a.lastWrong && r === a.alignment.R) {
        letter.classList.add('wrong');
        letter.title = `Ожидалось: ${a.aligner.reference[r]}, введено: ${a.lastWrong}`;
      }
      if (selectedError && r >= selectedError.anchor && r < selectedError.end)
        letter.classList.add('review-target');
      let extra = letter.querySelector('.extra-mark');
      const tail =
        r === a.aligner.reference.length - 1
          ? insertions.get(a.aligner.reference.length) || ''
          : '';
      const extraText = (insertions.get(r) || '') + tail;
      if (extraText) {
        if (!extra) {
          extra = document.createElement('span');
          extra.className = 'extra-mark';
          letter.append(extra);
        }
        const label = `+${extraText}`;
        if (extra.textContent !== label) extra.textContent = label;
        extra.classList.toggle('extra-tail', !!tail && !insertions.has(r));
      } else extra?.remove();
    }
  }
  const caret = $('caret');
  caret.classList.toggle('idle', a.state === 'ready' && state.focused);
  caret.classList.toggle('unfocused', !state.focused);
  caret.classList.toggle('paused', !['ready', 'running'].includes(a.state));
  text(
    'source-description',
    `Текст упражнения: ${visible.map((l) => a.aligner.reference.slice(l.start, l.end).join('')).join('')}`,
  );
  if (input.value !== a.value) {
    const position = Math.min(input.selectionEnd || a.value.length, a.value.length);
    input.value = a.value;
    input.setSelectionRange(position, position);
  }
}
function activeReview() {
  const review = state.review;
  return review &&
    state.route === 'practice' &&
    state.result?.id === review.resultId &&
    state.attempt?.state === 'completed'
    ? review
    : null;
}
function reviewFragment(value, empty) {
  return value ? value.replace(/ /g, `[${t('пробел')}]`) : t(empty);
}
function renderErrorReview() {
  const review = activeReview(),
    region = $('error-review');
  region.hidden = !review;
  if ($('review-entry')) $('review-entry').hidden = !!review;
  if (!review) return;
  const error = review.errors[review.index];
  text(
    'review-description',
    `Ошибка ${review.index + 1} из ${review.errors.length} · ${errorNames[error.kind]}`,
  );
  html(
    'review-comparison',
    `<span>${h(t('Ожидалось'))} <code>${h(reviewFragment(error.expected, 'Ничего'))}</code></span><span>${h(t('Введено'))} <code>${h(reviewFragment(error.actual, 'Не введено'))}</code></span>`,
  );
  text('review-uncertainty', error.ambiguous ? 'Позиция приблизительная' : '');
  $('review-uncertainty').hidden = !error.ambiguous;
  $('review-stepping').hidden = review.errors.length < 2;
  // aria-disabled сохраняет фокус на крайних кнопках.
  $('review-previous').setAttribute('aria-disabled', String(review.index === 0));
  $('review-next').setAttribute('aria-disabled', String(review.index === review.errors.length - 1));
}
function showError(direction = 'first') {
  const result = state.result;
  if (!result) return;
  let review = activeReview();
  if (!review) {
    const errors = reviewErrors(result);
    if (!errors.length) return;
    review = { resultId: result.id, index: 0, errors };
    state.review = review;
  }
  review.index = Number.isInteger(direction)
    ? Math.max(0, Math.min(review.errors.length - 1, direction))
    : reviewIndex(review.index, direction, review.errors.length);
  $('result-text').open = true;
  if ($('attempt-details')) $('attempt-details').open = false;
  syncResultInspect();
  wrapCache = null;
  renderText();
  renderErrorReview();
  if (direction === 'first' || Number.isInteger(direction)) {
    $('review-description').focus({ preventScroll: true });
    $('error-review').scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }
  const error = review.errors[review.index];
  const label = t(
    `Ошибка ${review.index + 1} из ${review.errors.length} · ${errorNames[error.kind]}`,
  );
  announce(
    `${label}. ${t('Ожидалось')}: «${reviewFragment(error.expected, 'Ничего')}». ${t('Введено')}: «${reviewFragment(error.actual, 'Не введено')}»${error.ambiguous ? '. ' + t('Позиция приблизительная') : ''}`,
  );
}
function leaveErrorReview() {
  if (!activeReview()) return;
  state.review = null;
  renderText();
  renderErrorReview();
  $('review-entry')?.focus({ preventScroll: true });
  $('typing-surface').scrollIntoView({ block: 'nearest', behavior: 'instant' });
  announce('Последний фрагмент.');
}
$('result-text').addEventListener('toggle', () => {
  if ($('result-text').open) {
    wrapCache = null;
    renderText();
  } else if (activeReview()) {
    const focusInside = $('result-text').contains(document.activeElement);
    state.review = null;
    renderErrorReview();
    if (focusInside) $('result-text-toggle').focus({ preventScroll: true });
  }
  syncResultInspect();
});
function syncResultInspect() {
  $('result-text-toggle').setAttribute('aria-expanded', String($('result-text').open));
  $('result-details-toggle').setAttribute('aria-expanded', String(!!$('attempt-details')?.open));
}
function inspectResult(which) {
  const target = which === 'text' ? $('result-text') : $('attempt-details');
  if (!target) return;
  const open = !target.open;
  $('result-text').open = which === 'text' && open;
  if ($('attempt-details')) $('attempt-details').open = which === 'details' && open;
  if (open && which === 'text') {
    wrapCache = null;
    renderText();
  }
  syncResultInspect();
}
function renderKeyboard() {
  const a = state.attempt,
    div = $('keyboard-hint');
  div.hidden =
    !a ||
    a.mode === 'control' ||
    !state.showKeyboard ||
    !['ready', 'running', 'paused'].includes(a.state);
  if (div.hidden) {
    pressedKeys.clear();
    wrongKeys.clear();
    return;
  }
  if (div.dataset.language !== a.language) {
    div.dataset.language = a.language;
    div.innerHTML = `<p class="keyboard-cue sr-only"></p>${keyboardRows(a.language)
      .map(
        (row) =>
          `<div class="key-row">${row.map((key) => `<kbd data-code="${key.code}"${key.lower ? ` data-character="${h(key.lower)}"` : ''} class="${key.size ? 'key-' + key.size : ''}${['KeyF', 'KeyJ'].includes(key.code) ? ' home-key' : ''}">${key.code === 'Backspace' ? '<svg viewBox="0 0 24 18" aria-hidden="true"><path d="M8 2h13v14H8L2 9zM12 6l6 6m0-6-6 6"/></svg><span class="sr-only">Backspace</span>' : h(key.label ? t(key.label) : key.lower)}</kbd>`).join('')}</div>`,
      )
      .join('')}`;
  }
  div.setAttribute('aria-label', t('Подсказка клавиатуры'));
  const expected = a.aligner.reference[caretReference()],
    hint = keyHint(expected, a.language, { capsLock });
  div.querySelector('.keyboard-cue').textContent = expected
    ? t(`${fingerFor(expected, a.language)} · «${expected === ' ' ? 'пробел' : expected}»`)
    : '';
  for (const key of div.querySelectorAll('kbd')) {
    if (key.dataset.code === 'Space') key.textContent = t('Пробел');
    key.classList.toggle(
      'expected',
      !!hint &&
        (key.dataset.code === hint.code ||
          (hint.shift && key.dataset.code === shiftKeyFor(hint.code))),
    );
    key.classList.toggle('pressed', pressedKeys.has(key.dataset.code));
    key.classList.toggle('wrong-press', wrongKeys.has(key.dataset.code));
  }
  div.classList.toggle('is-paused', a.state === 'paused');
}
function clearPressedKeys() {
  pressedKeys.clear();
  wrongKeys.clear();
  if (state.route === 'practice') renderKeyboard();
}
document.addEventListener('keydown', (event) => {
  if (
    !state.showKeyboard ||
    document.activeElement !== input ||
    !['ready', 'running'].includes(state.attempt?.state) ||
    state.composing ||
    event.isComposing ||
    event.metaKey ||
    event.ctrlKey ||
    event.altKey
  )
    return;
  capsLock = !!event.getModifierState?.('CapsLock');
  const code = event.code || keyHint(event.key, state.attempt.language)?.code;
  if (!code) return;
  pressedKeys.add(code);
  const expected = state.attempt.aligner.reference[caretReference()];
  if (event.key.length === 1 && event.key.normalize('NFC') !== expected) wrongKeys.add(code);
  renderKeyboard();
});
document.addEventListener('keyup', (event) => {
  const code = event.code || keyHint(event.key, state.attempt?.language)?.code;
  pressedKeys.delete(code);
  wrongKeys.delete(code);
  if (state.route === 'practice' && state.showKeyboard) renderKeyboard();
});
window.addEventListener('blur', clearPressedKeys);
function finishUI() {
  clearInterval(timer);
  timer = null;
  const a = state.attempt;
  if (!a?.savedResult) return;
  const result = a.savedResult;
  result.repeatedMaterial = a.alignment.R > a.repetitionAt;
  result.eligible = result.eligible && !result.repeatedMaterial;
  if (a.mode === 'lesson') result.lessonReview = !!a.lesson?.isReview;
  if (['targeted', 'control'].includes(a.mode) && state.journey)
    result.practiceSeen = [
      ...new Set([
        ...(state.journey.practiceSeen || []),
        ...(a.mode === 'targeted' ? result.seen : []),
      ]),
    ];
  state.result = result;
  progress = recordProgress(progress, result);
  history = upsert(history, result);
  const saved = setSaved();
  storageWarning = saved ? null : 'Результат не сохранён в этом браузере.';
  if (a.mode === 'targeted' && state.journey) {
    state.journey.practice = result;
    state.journey.practiceSeen = result.practiceSeen;
  }
  if ($('leave-dialog').open) {
    state.pending = null;
    $('leave-dialog').close();
  }
  document.title = 'typaze';
  renderPractice();
  announce(
    result.status === 'interrupted'
      ? a.mode === 'lesson'
        ? 'Урок прерван.'
        : 'Тест прерван. В рекорды не входит.'
      : `Попытка завершена. Точность ${accuracy(result.metrics.accuracy)}.`,
  );
  focusHeading();
}
function finish(status = 'completed') {
  const a = state.attempt;
  if (!a) return;
  a.advance();
  if (!a.savedResult)
    a.finish(status, performance.now(), status === 'interrupted' ? 'interrupted' : 'manual');
  finishUI();
}
function recordNote(result) {
  if (!result.eligible) return '';
  const best = bestRecord(progress, {
    language: result.language,
    duration: result.duration,
    version: result.version,
  });
  return best?.id === result.id ? t('Личный рекорд') : '';
}
function renderResult() {
  const r = state.result || state.attempt.savedResult;
  if (!r) return;
  state.result = r;
  text('service-title', r.status === 'completed' ? 'Результат' : 'Тест прерван');
  $('result-overview').innerHTML = `<dl class="result-dashboard"><div><dt>WPM</dt><dd>${number(r.metrics.wpm)}</dd></div><div><dt>${h(t('Точность'))}</dt><dd>${accuracy(r.metrics.accuracy)}</dd></div></dl>`;
  $('result-panel').innerHTML = `<div class="actions">${button('Новый тест', 'new', { primary: true })}${button('Прогресс', 'progress')}</div>${detailsMarkup(r)}`;
}
function summaryMarkup(r) {
  const m = r.metrics;
  const metrics = [
    ['WPM', number(m.wpm), 'pace'],
    ['Точность', accuracy(m.accuracy), 'accuracy'],
    ['Символы', number(m.volume, 0), 'volume'],
    ['Ошибки в тексте', number(m.remaining, 0), 'errors'],
    ['Исправлено', number(m.corrected, 0), 'corrections'],
  ];
  return `<dl class="result-dashboard" aria-label="${h(t('Итоги попытки'))}">${metrics.map(([label, value, key]) => `<div class="result-stat stat-${key}"><dt>${h(t(label))}</dt><dd>${h(value)}</dd></div>`).join('')}</dl>`;
}
function saveNotice() {
  if (!storageWarning) return '';
  return `<p class="save-message"><span>${h(t(storageWarning))}</span><button type="button" class="text-button" data-action="${storageReadOnly ? 'original-backup' : 'retry-save'}">${h(t(storageReadOnly ? 'Скачать исходные данные' : 'Повторить сохранение'))}</button></p>`;
}
function comparisonMarkup(result) {
  const baseline = state.journey?.baseline || history.find((row) => row.id === result.baselineId),
    outcome = controlOutcome(baseline, result);
  if (outcome.kind !== 'compared')
    return `<section class="comparison comparison-status"><h2>${h(t(outcome.title))}</h2></section>`;
  const pair = (label, g) =>
    `<div><dt>${h(t(label))}</dt><dd>${accuracy(g.rate * 100)}</dd><span>${g.errors} ${h(t('из'))} ${g.n}</span></div>`;
  return `<section class="comparison comparison-focus${outcome.evidence.delta > 0 ? ' is-improved' : ''}"><h2>${h(t('Частота ошибок'))} «${h(outcome.goal)}»</h2><dl class="comparison-pair">${pair('До', outcome.evidence.baseline)}${pair('После', outcome.evidence.control)}</dl></section>`;
}
function chartMarkup(values, title, { metric = 'wpm' } = {}) {
  if (values.length < 2) return '';
  const max = metric === 'accuracy' ? 100 : Math.max(20, ...values.map((v) => n(v.value))),
    unit = metric === 'accuracy' ? '%' : ' WPM';
  const points = values
    .map((v, i) => `${(i / (values.length - 1)) * 100},${100 - (n(v.value) / max) * 100}`)
    .join(' ');
  return `<figure class="readable-chart"><div class="chart-scale" aria-hidden="true"><span>${number(max, 0)}${unit}</span><span>0</span></div><svg class="tempo-chart" viewBox="-1 -4 102 108" preserveAspectRatio="none" role="img" aria-label="${h(t(title))}"><title>${h(t(title))}</title><desc>${h(values.map((v) => `${v.label}: ${number(v.value)}${unit}`).join('; '))}</desc><path class="grid" vector-effect="non-scaling-stroke" d="M0 0H100M0 50H100M0 100H100"/><polyline class="trace" vector-effect="non-scaling-stroke" points="${points}"/></svg><figcaption><span>${h(values[0].label)}</span><span>${h(values.at(-1).label)}</span></figcaption></figure>`;
}
function renderLessonResult(r) {
  const lesson = LESSONS[r.language].find((row) => row.id === r.lessonId);
  if (!lesson) {
    $('result-overview').innerHTML = button('К обучению', 'learn', { primary: true });
    return;
  }
  const status = lessonStatus(lesson, history, Date.now(), progress),
    passed = isMasteredLessonAttempt(r),
    feedback = lessonFeedback(r);
  const next = LESSONS[r.language][LESSONS[r.language].indexOf(lesson) + 1];
  const action = passed
    ? r.lessonReview && status.due && status.nextUnit !== r.lessonUnit
      ? button('Продолжить', 'lesson', { primary: true, value: r.lessonId })
      : status.passed
        ? next
          ? button('Следующий шаг', 'lesson', { primary: true, value: next.id })
          : button('Пройти тест', 'new', { primary: true })
        : button('Продолжить', 'lesson', { primary: true, value: r.lessonId })
    : button('Повторить', 'repeat-lesson', {
        primary: true,
        value: `${r.lessonId}:${r.lessonUnit || 0}`,
      });
  const keys = feedback.weakKeys.slice(0, 3);
  $('result-overview').innerHTML =
    `<dl class="lesson-summary"><div><dt>${h(t('Точность'))}</dt><dd>${accuracy(r.metrics.accuracy)}</dd></div><div><dt>${h(t(lesson.title))}</dt><dd>${status.completedUnits}<small> / ${status.totalUnits}</small></dd></div></dl>${keys.length ? `<div class="lesson-feedback"><h2>${h(t('Клавиши для повтора'))}</h2><div>${keys.map((key) => `<span><code>${h(key.key === ' ' ? t('Пробел') : key.key)}</code><span>${h(t(fingerFor(key.key, r.language)))}</span><span>${key.count}</span></span>`).join('')}</div></div>` : ''}<div class="actions">${action}${button('К курсу', 'learn')}</div>${saveNotice()}`;
}
function renderFingerGuide() {
  const a = state.attempt,
    guide = $('finger-guide');
  guide.hidden = a?.mode !== 'lesson' || !['ready', 'running', 'paused'].includes(a?.state);
  if (guide.hidden) return;
  const known = a.lesson?.known || '',
    groups = new Map();
  for (const key of known) {
    const finger = fingerFor(key, a.language);
    groups.set(finger, (groups.get(finger) || []).concat(key));
  }
  const signature = `${a.lessonId}:${a.lesson?.unitIndex}:${uiLanguage()}`;
  if (guide.dataset.unit === signature) return;
  guide.dataset.unit = signature;
  guide.innerHTML = `<summary>${h(t('Пальцы'))}</summary><div class="finger-map">${[...groups].map(([finger, keys]) => `<div><span>${h(t(finger))}</span><code>${h(keys.join(' '))}</code></div>`).join('')}<div><span>${h(t('Пробел — большой палец'))}</span><kbd>${h(t('Пробел'))}</kbd></div></div>`;
}
function detailsMarkup(r) {
  return `<details id="attempt-details" class="details"><summary>Подробности попытки</summary><div class="detail-content">${h(t('Активное время:'))} ${number(r.seconds)} с</div></details>`;
}

function renderAdaptive() {
  $('typing-surface').hidden = true;
  $('result-text').hidden = true;
  $('result-overview').hidden = true;
  $('result-inspect-controls').hidden = true;
  $('practice-view').classList.remove('has-result-summary');
  $('error-review').hidden = true;
  $('result-panel').hidden = true;
  $('input-help').hidden = true;
  $('input-status').textContent = '';
  $('practice-controls').hidden = false;
  $('adaptive-panel').hidden = false;
  $('keyboard-hint').hidden = true;
  $('keyboard-button').hidden = true;
  $('finger-guide').hidden = true;
  pressedKeys.clear();
  wrongKeys.clear();
  $('practice-options').hidden = false;
  mountTextLanguage('practice-languages', state.language);
  $('duration-label').hidden = false;
  $('mode-select').value = 'adaptive';
  $('duration-select').value = String(state.duration);
  for (const id of ['mode-select', 'duration-select']) $(id).disabled = false;
  html('live-actions', '');
  $('service-title').className = 'sr-only';
  text('service-title', 'По моим ошибкам');
  $('adaptive-panel').innerHTML = `<h1>${h(t('Пройдите тест'))}</h1><div class="actions">${button('Новый тест', 'new', { primary: true })}</div>`;
  dropdowns.refresh();
}
function renderLearn() {
  state.language = exerciseLanguage(settings);
  $('learn-view').innerHTML = `<div class="page-head"><h1>${h(t('Слепая печать'))}</h1><div id="course-languages"></div></div><div class="lesson-list">${LESSONS[state.language].map((lesson, i) => `<button type="button" class="lesson-row" data-action="lesson" data-value="${h(lesson.id)}"><span class="lesson-index">${i + 1}</span><span><h2>${h(t(lesson.title))}</h2></span></button>`).join('')}</div>`;
  mountTextLanguage('course-languages', state.language);
  dropdowns.refresh();
}
function dateLabel(value) {
  const d = new Date(value);
  return Number.isNaN(+d)
    ? '—'
    : d.toLocaleString(uiLanguage() === 'en' ? 'en-US' : 'ru-RU', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
}
const progressModeLabels = {
  all: 'Все',
  test: 'Тесты',
  free: 'Свободно',
  targeted: 'Отработка',
  control: 'Проверки',
  lesson: 'Уроки',
};
function progressChoices(key, options, value, label) {
  return `<div class="progress-choices" role="radiogroup" aria-label="${h(t(label))}">${options.map(([choice, title]) => `<button type="button" role="radio" aria-checked="${String(choice) === String(value)}" tabindex="${String(choice) === String(value) ? 0 : -1}" data-progress-key="${key}" data-value="${h(choice)}">${h(t(title))}</button>`).join('')}</div>`;
}
function chooseProgress(key, value) {
  if (key === 'duration') {
    state.progressDuration = Number(value);
    if (!['all', 'free', 'lesson'].includes(state.filter.mode)) state.filter.duration = value;
  } else if (key === 'metric') state.progressMetric = value;
  else {
    state.filter[key] = value;
    if (key === 'mode')
      state.filter.duration = ['all', 'free', 'lesson'].includes(value)
        ? 'all'
        : String(state.progressDuration);
  }
  renderProgress();
  $('progress-view')
    .querySelector(`[data-progress-key="${key}"][data-value="${value}"]`)
    ?.focus({ preventScroll: true });
}
function renderProgress() {
  const filters = state.filter,
    rows = historyRows(history, filters);
  const languageHistory = history.filter((r) => r.language === filters.language);
  const tests = comparableTests(
      history,
      { language: filters.language, duration: state.progressDuration },
      VERSION,
    ),
    latestTest = tests.at(-1);
  const latest = history.at(-1),
    latestHidden = latest && !rows.some((row) => row.id === latest.id);
  const best = bestRecord(progress, {
    language: filters.language,
    duration: state.progressDuration,
    version: VERSION,
  });
  const modeOptions = Object.entries(progressModeLabels).filter(
    ([mode]) =>
      mode === 'all' || mode === filters.mode || languageHistory.some((r) => r.mode === mode),
  );
  const median = (list) => {
    const sorted = list.map((r) => r.metrics.wpm).sort((a, b) => a - b);
    return sorted.length % 2
      ? sorted[(sorted.length - 1) / 2]
      : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
  };
  let change = '';
  if (tests.length >= 10) {
    const before = median(tests.slice(-10, -5)),
      after = median(tests.slice(-5)),
      delta = after - before;
    change = `<p class="progress-change">${h(t('Медиана последних 5'))} <span>${number(after)} WPM</span><span class="trend-delta">${delta > 0 ? '+' : ''}${number(delta)} WPM</span><span>${h(t('к предыдущим 5'))}</span></p>`;
  }
  const metric = state.progressMetric;
  const curve =
    tests.length > 1
      ? chartMarkup(
          tests.slice(-20).map((r) => ({
            label: dateLabel(r.date),
            value: metric === 'accuracy' ? r.metrics.accuracy : r.metrics.wpm,
          })),
          metric === 'accuracy'
            ? 'Точность сопоставимых тестов'
            : 'Сопоставимые результаты тестов, от старых к новым',
          { metric },
        )
      : '';
  const record = best
    ? `<p class="progress-record">${h(t('Рекорд'))} <span>${number(best.wpm)} WPM</span><span>${accuracy(best.accuracy)}</span></p>`
    : '';
  const testSummary = latestTest
    ? `<div class="progress-test-body${curve ? ' has-curve' : ''}"><div class="progress-test-summary"><p class="progress-pace"><span>${number(latestTest.metrics.wpm)}</span><small>WPM</small></p><p class="progress-accuracy"><span>${accuracy(latestTest.metrics.accuracy)}</span><small>${h(t('точность'))}</small></p><p class="progress-test-note">${h(t('Последний тест'))}<time datetime="${h(latestTest.date)}">${h(dateLabel(latestTest.date))}</time></p>${record}</div>${
        curve
          ? `<div class="progress-trend">${progressChoices(
              'metric',
              [
                ['wpm', 'Темп'],
                ['accuracy', 'Точность'],
              ],
              metric,
              'Показатель графика',
            )}${curve}</div>`
          : ''
      }</div>${change}`
    : `<div class="progress-no-tests"><p>${h(t('Пока нет завершённых тестов.'))}</p>${button('Пройти тест', 'progress-test')}${record}</div>`;
  const activityName = (r) => {
    if (r.mode === 'lesson') {
      const lesson = LESSONS[r.language]?.find((row) => row.id === r.lessonId);
      return lesson
        ? `${t(lesson.title)}${Number.isInteger(r.lessonUnit) ? ` · ${r.lessonUnit + 1}/${r.lessonUnitCount || lesson.units.length}` : ''}`
        : t('Урок');
    }
    return `${t(modeNames[r.mode] || r.mode)}${r.goal ? ` «${r.goal}»` : ''}`;
  };
  $('progress-view').innerHTML =
    `<div class="page-head progress-head"><div class="course-heading"><h1>${h(t('Прогресс'))}</h1><div id="history-languages"></div></div></div>${
      history.length || best
        ? `${
            languageHistory.length || best
              ? `<section class="progress-tests" aria-labelledby="progress-tests-title"><div class="progress-section-head"><h2 id="progress-tests-title">${h(t('Тесты'))}</h2>${progressChoices(
                  'duration',
                  [
                    [30, '30 с'],
                    [60, '60 с'],
                  ],
                  state.progressDuration,
                  'Длительность теста',
                )}</div>${testSummary}</section>`
              : ''
          }<section class="progress-history" aria-labelledby="progress-history-title"><div class="progress-section-head"><h2 id="progress-history-title">${h(t('История'))}</h2>${latestHidden ? `<button type="button" class="quiet latest-session" data-action="show-latest">${h(t('Последнее занятие'))}</button>` : ''}</div>${languageHistory.length ? progressChoices('mode', modeOptions, filters.mode, 'Режим занятий') : ''}${
            rows.length
              ? `<div class="history-columns" aria-hidden="true"><span>${h(t('Занятие'))}</span><span>WPM</span><span>${h(t('Точность'))}</span><span></span></div><ol class="history-list">${rows
                  .slice(0, state.historyLimit)
                  .map(
                    (r) =>
                      `<li><button type="button" class="history-entry history-open" data-action="open-result" data-value="${h(r.id)}"><span class="history-activity"><span class="history-mode">${h(activityName(r))}${!['lesson', 'free'].includes(r.mode) ? ` <span class="history-duration">${h(t(`${r.duration} с`))}</span>` : ''}</span><time datetime="${h(r.date)}">${h(dateLabel(r.date))}</time>${r.status === 'interrupted' ? `<span class="history-status">${h(t('Прервано'))}</span>` : ''}</span><span class="history-number"><span class="sr-only">WPM </span>${r.status === 'interrupted' || r.mode === 'lesson' ? '—' : number(r.metrics.wpm)}</span><span class="history-number"><span class="sr-only">${h(t('Точность'))} </span>${r.status === 'interrupted' ? '—' : accuracy(r.metrics.accuracy)}</span><span class="history-arrow" aria-hidden="true">↗</span></button></li>`,
                  )
                  .join(
                    '',
                  )}</ol>${rows.length > state.historyLimit ? button('Показать ещё', 'history-more') : ''}`
              : `<div class="progress-empty-filter"><p>${h(t('Нет занятий'))}</p>${languageHistory.length ? button('Все занятия', 'history-all') : button('Начать практику', 'progress-test', { primary: true })}</div>`
          }</section>${storageWarning ? `<p class="save-message" role="status">${h(t(storageWarning))}</p>` : ''}`
        : `<div class="empty-state"><h2>${h(t('Пока нет результатов'))}</h2><div class="actions">${button('Начать практику', 'progress-test', { primary: true })}</div></div>`
    }`;
  localize($('progress-view'));
  languageSwitches.mount($('history-languages'), {
    language: filters.language,
    history: true,
    label: t('Язык истории'),
  });
  dropdowns.refresh();
}
function openResult(id) {
  const r = history.find((r) => r.id === id);
  if (!r) return;
  if (typeof r.source !== 'string' || typeof r.value !== 'string') {
    announce('Подробности этой попытки недоступны.');
    return;
  }
  clearInterval(timer);
  state.review = null;
  announce('');
  state.language = r.language;
  state.duration = r.duration;
  state.mode = r.mode === 'free' ? 'free' : 'test';
  state.route = 'practice';
  state.fromHistory = true;
  state.journey = restoreJourney(r, history);
  state.result = r;
  window.history.replaceState(null, '', '#practice');
  const a = new Attempt({
    text: r.source,
    language: r.language,
    duration: r.duration,
    mode: r.mode,
    goal: r.goal,
    lessonId: r.lessonId,
    id: r.id,
  });
  a.value = r.value;
  a.alignment = a.aligner.update(r.value);
  a.H = r.metrics.corrected;
  a.activeMs = r.seconds * 1000;
  a.state = r.status;
  a.savedResult = r;
  a.repetitionAt = Infinity;
  state.attempt = a;
  input.value = r.value;
  input.setSelectionRange(r.value.length, r.value.length);
  wrapCache = null;
  navigationMotion.show('practice', { resetScroll: true });
  renderPractice();
  focusHeading();
}
function newTest() {
  state.language = exerciseLanguage(settings);
  state.filter.language = state.language;
  state.mode = state.attempt?.mode === 'free' ? 'free' : 'test';
  startAttempt({ mode: state.mode });
}
function startLesson(id, repeatUnit) {
  const lesson = lessonForAttempt(id, history, progress, { repeatUnit });
  if (!lesson) return;
  lesson.isReview = lessonStatus(
    LESSONS[id.startsWith('en-') ? 'en' : 'ru'].find((row) => row.id === id),
    history,
    Date.now(),
    progress,
  ).passed;
  state.language = id.startsWith('en-') ? 'en' : 'ru';
  state.mode = 'test';
  startAttempt({ mode: 'lesson', lesson });
}
function startTarget(group) {
  const baseline =
    state.result && ['test', 'control'].includes(state.result.mode)
      ? state.result
      : [...history]
          .reverse()
          .find(
            (r) =>
              r.mode === 'test' &&
              r.status === 'completed' &&
              r.language === state.language &&
              r.duration === state.duration &&
              r.version === VERSION,
          );
  if (!hasMaterial(state.language, group, baseline?.seen || [])) {
    warn('Для этой группы пока мало нового материала. Попробуйте другой текст.');
    return;
  }
  state.mode = 'adaptive';
  startAttempt({ mode: 'targeted', goal: group, baseline: baseline || null });
}
const actions = {
  new: () => request(newTest),
  learn: () => request(() => routeTo('learn')),
  progress: () => request(() => routeTo('progress')),
  'show-latest': () => {
    const latest = history.at(-1);
    if (!latest) return;
    state.filter = filtersForResult(latest);
    state.progressDuration = latest.duration === 60 ? 60 : 30;
    renderProgress();
    [...$('progress-view').querySelectorAll('.history-open')]
      .find((node) => node.dataset.value === latest.id)
      ?.focus();
    announce('Показано последнее занятие.');
  },
  'inspect-text': () => inspectResult('text'),
  'inspect-details': () => inspectResult('details'),
  'history-all': () => chooseProgress('mode', 'all'),
  'history-more': () => {
    state.historyLimit += 30;
    renderProgress();
  },
  'progress-test': () => {
    state.language = state.filter.language;
    settings.textLanguage = state.language;
    state.duration = state.progressDuration;
    settings.duration = state.duration;
    state.mode = 'test';
    setSaved();
    startAttempt({ mode: 'test' });
  },
  'review-index': (value) => showError(Number(value)),
  'review-first': () => showError('first'),
  'review-previous': () => showError('previous'),
  'review-next': () => showError('next'),
  'review-return': leaveErrorReview,
  interrupt: () => finish('interrupted'),
  finish: () => finish(state.attempt?.mode === 'lesson' ? 'interrupted' : 'completed'),
  pause: () => {
    state.attempt.pause();
    renderPractice();
    announce('Практика на паузе.');
  },
  resume: resumePractice,
  'continue-free': () => {
    const source = state.attempt.aligner.reference.slice(state.attempt.alignment.R).join('');
    state.mode = 'free';
    startAttempt({ mode: 'free', continueText: source || null });
    text(
      'input-help',
      'Продолжаем материал с места остановки. Предыдущий ввод остался в прерванной попытке.',
    );
  },
  'practice-group': (value) => request(() => startTarget(value)),
  control: () => {
    const journey = state.journey;
    if (!journey?.baseline) return;
    state.duration = journey.baseline.duration;
    state.language = journey.baseline.language;
    startAttempt({ mode: 'control', goal: journey.goal, baseline: journey.baseline });
  },
  baseline: () => {
    const id = state.journey?.baseline?.id;
    if (id) openResult(id);
    else newTest();
  },
  lesson: (id) => request(() => startLesson(id)),
  'repeat-lesson': (value) =>
    request(() => {
      const [id, unit] = value.split(':');
      startLesson(id, unit === undefined ? undefined : Number(unit));
    }),
  'repeat-control': () => {
    const r = state.result,
      baseline = state.journey?.baseline;
    if (r?.goal && baseline)
      startAttempt({ mode: 'control', goal: r.goal, baseline, excludeSeen: r.seen || [] });
  },
  'repeat-target': () => {
    const r = state.result,
      baseline = state.journey?.baseline;
    if (r?.goal)
      startAttempt({ mode: 'targeted', goal: r.goal, baseline, excludeSeen: r.seen || [] });
  },
  'open-result': (id) => request(() => openResult(id)),
  keyboard: () => {
    if (!state.attempt) return;
    state.showKeyboard = !state.showKeyboard;
    settings.showKeyboard = state.showKeyboard;
    setSaved();
    renderPractice();
    focusInput();
  },
  'original-backup': () => downloadOriginal(),
  'retry-save': () => {
    const ok = setSaved();
    storageWarning = ok ? null : 'Сохранение всё ещё недоступно. Результат остаётся в памяти.';
    renderResult();
    localize($('result-overview'));
    localize($('result-panel'));
    syncResultInspect();
    updateHeader();
    announce(ok ? 'Результат сохранён в этом браузере.' : storageWarning);
  },
};

function chooseTextLanguage(language, { keyboard = false } = {}) {
  if (!['ru', 'en'].includes(language) || isActive()) return;
  const a = state.attempt;
  if (state.route === 'practice' && ['targeted', 'control'].includes(a?.mode)) return;
  if (language === exerciseLanguage(settings)) {
    if (!keyboard) focusInput();
    return;
  }
  const stage =
    a?.mode === 'lesson' ? LESSONS[a.language].findIndex((lesson) => lesson.id === a.lessonId) : -1;
  settings.textLanguage = language;
  state.language = language;
  state.filter.language = language;
  if (!setSaved()) storageWarning = 'Настройки не удалось сохранить.';
  if (state.route === 'learn') renderLearn();
  else if (state.route === 'practice') {
    if (stage >= 0) startLesson(LESSONS[language][stage].id);
    else startAttempt({ mode: state.mode });
  }
  if (keyboard)
    document
      .querySelector(`section:not([hidden]) [data-text-language="${language}"]`)
      ?.focus({ preventScroll: true });
  else focusInput();
}
document.addEventListener('keydown', (event) => {
  if (
    !activeReview() ||
    !event.target.closest('#error-review') ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey
  )
    return;
  const directions = { ArrowLeft: 'previous', ArrowRight: 'next', Home: 'first', End: 'last' };
  if (directions[event.key]) {
    event.preventDefault();
    showError(directions[event.key]);
  }
});
document.addEventListener('keydown', (event) => {
  const option = event.target.closest('[data-text-language]');
  if (!option || option.disabled || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key))
    return;
  event.preventDefault();
  const language =
    event.key === 'Home'
      ? 'ru'
      : event.key === 'End'
        ? 'en'
        : option.dataset.textLanguage === 'ru'
          ? 'en'
          : 'ru';
  chooseTextLanguage(language, { keyboard: true });
});
document.addEventListener('keydown', (event) => {
  const choice = event.target.closest('[data-progress-key]');
  if (
    !choice ||
    !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)
  )
    return;
  event.preventDefault();
  const choices = [...choice.parentElement.querySelectorAll('[data-progress-key]')],
    index = choices.indexOf(choice);
  const next =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? choices.length - 1
        : (index + (['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1) + choices.length) %
          choices.length;
  chooseProgress(choice.dataset.progressKey, choices[next].dataset.value);
});
document.addEventListener('click', (event) => {
  if (event.target.closest('a.skip-link')) {
    event.preventDefault();
    if (state.route === 'practice') focusInput();
    else focusHeading();
    return;
  }
  const progressChoice = event.target.closest('[data-progress-key]');
  if (progressChoice) {
    chooseProgress(progressChoice.dataset.progressKey, progressChoice.dataset.value);
    return;
  }
  const language = event.target.closest('[data-text-language]');
  if (language) {
    if (!language.disabled) chooseTextLanguage(language.dataset.textLanguage);
    return;
  }
  const link = event.target.closest('a[data-route],a.wordmark');
  if (link) {
    event.preventDefault();
    const next = link.dataset.route || 'practice';
    const sameSection =
      next === state.route &&
      (next !== 'practice' ||
        (state.attempt?.mode !== 'lesson' &&
          ['ready', 'running', 'paused'].includes(state.attempt?.state)));
    if (sameSection) {
      if (next === 'practice') focusInput();
      return;
    }
    request(() => routeTo(next));
    return;
  }
  const control = event.target.closest('[data-action]');
  if (control) actions[control.dataset.action]?.(control.dataset.value);
});
for (const [id, key] of [
  ['mode-select', 'mode'],
  ['duration-select', 'duration'],
])
  $(id).addEventListener('change', (event) => {
    const value = key === 'duration' ? Number(event.target.value) : event.target.value;
    request(() => {
      state[key] = value;
      if (key !== 'mode') {
        settings[key] = value;
        setSaved();
      }
      startAttempt({ mode: state.mode });
    });
  });
document.addEventListener('change', (event) => {
  const id = event.target.id;
  if (id === 'interface-language') {
    settings.uiLanguage = event.target.value;
    setSaved();
    applySettings();
    warn(state.notice);
    announce('');
    if (state.route === 'learn') renderLearn();
    else if (state.route === 'progress') renderProgress();
    else if (state.attempt) renderPractice();
    else renderAdaptive();
    dropdowns.refresh();
  }
});
input.addEventListener('beforeinput', (event) => {
  if (
    ['insertFromPaste', 'insertFromDrop', 'insertLineBreak', 'insertParagraph'].includes(
      event.inputType,
    )
  ) {
    event.preventDefault();
    if (!event.inputType.includes('Line') && !event.inputType.includes('Paragraph'))
      warn('Для тренировки вводите текст с клавиатуры.');
  }
});
for (const name of ['paste', 'drop'])
  input.addEventListener(name, (event) => {
    event.preventDefault();
    warn('Для тренировки вводите текст с клавиатуры.');
  });
input.addEventListener('compositionstart', () => {
  state.composing = true;
});
input.addEventListener('compositionupdate', (event) => {
  warn(event.data ? `Ввод символа: ${event.data}` : '');
});
input.addEventListener('compositionend', (event) => {
  state.composing = false;
  commitInput('insertCompositionText', event.data);
});
input.addEventListener('input', (event) => {
  if (!event.isComposing && !state.composing)
    commitInput(event.inputType || 'insertText', event.data);
});
function commitInput(inputType, data) {
  navigationMotion.stopContent();
  const a = state.attempt;
  if (!a) return;
  const raw = input.value,
    selection = input.selectionEnd;
  const accepted = a.commit(raw, { inputType });
  if (a.savedResult) {
    input.value = a.value;
    input.setSelectionRange(a.value.length, a.value.length);
    finishUI();
    return;
  }
  if (input.value !== a.value) {
    input.value = a.value;
    input.setSelectionRange(
      Math.min(selection, a.value.length),
      Math.min(selection, a.value.length),
    );
  }
  if (!accepted) {
    renderText();
    return;
  }
  warn('');
  if (a.mode === 'lesson' && a.lastWrong)
    warn(
      `Нажмите «${a.aligner.reference[a.alignment.R] === ' ' ? 'пробел' : a.aligner.reference[a.alignment.R]}»`,
    );
  else if (
    a.value.length >= 4 &&
    ((a.language === 'ru' && /^[a-z ]{4,}$/i.test(a.value)) ||
      (a.language === 'en' && /^[а-яё ]{4,}$/i.test(a.value)))
  )
    warn('Проверьте раскладку клавиатуры.');
  renderPractice();
}
input.addEventListener('focus', () => {
  state.focused = true;
  if (state.attempt && ['ready', 'running'].includes(state.attempt.state)) renderPractice();
  else renderText();
});
input.addEventListener('blur', () => {
  state.focused = false;
  renderText();
});
input.addEventListener('keyup', () => {
  if (state.attempt && !state.composing) renderText();
});
input.addEventListener('select', () => {
  if (state.attempt && !state.composing) renderText();
});
function typedForReference(ref) {
  const a = state.attempt;
  for (const op of a.alignment.ops) {
    if (op.r >= ref && op.kind !== 'omission') return op.t;
    if (op.kind === 'transposition' && op.r + 1 === ref) return op.t + 1;
  }
  return a.alignment.I;
}
function setSelectionByReference(ref, anchor = null) {
  const a = state.attempt,
    position = typedForReference(ref),
    chars = graphemes(a.value);
  const start = anchor === null ? position : Math.min(anchor, position),
    end = anchor === null ? position : Math.max(anchor, position);
  input.setSelectionRange(
    chars.slice(0, start).join('').length,
    chars.slice(0, end).join('').length,
  );
  renderText();
}
$('typing-surface').addEventListener('mousedown', (event) => {
  if (!state.attempt || !['ready', 'running'].includes(state.attempt.state)) return;
  event.preventDefault();
  focusInput();
  const letter = event.target.closest('[data-ref]');
  if (letter) {
    dragAnchor = typedForReference(Number(letter.dataset.ref));
    setSelectionByReference(Number(letter.dataset.ref));
  } else {
    dragAnchor = null;
    input.setSelectionRange(state.attempt.value.length, state.attempt.value.length);
    renderText();
  }
});
$('typing-surface').addEventListener('mousemove', (event) => {
  if (event.buttons === 1 && dragAnchor !== null) {
    const letter = event.target.closest('[data-ref]');
    if (letter) setSelectionByReference(Number(letter.dataset.ref), dragAnchor);
  }
});
document.addEventListener('mouseup', () => {
  dragAnchor = null;
});
document.addEventListener(
  'keydown',
  (event) => {
    const target = event.target,
      selection = window.getSelection();
    if (target === input) return;
    if (
      shouldFocusTyping(event, {
        available:
          state.route === 'practice' &&
          ['ready', 'running', 'paused'].includes(state.attempt?.state),
        blocked: !!document.querySelector('dialog[open]') || dropdowns.isOpen,
        editable: !!target.closest(
          'input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"]',
        ),
        interactive: !!target.closest('button,a,summary,[role="combobox"]'),
        selection: !!selection && !selection.isCollapsed,
      })
    ) {
      if (state.attempt.state === 'paused') resumePractice();
      else focusInput();
    }
  },
  true,
);
document.addEventListener('pointerup', (event) => {
  if (
    event.button === 0 &&
    !event.target.closest(
      'button,a,input,textarea,select,summary,label,dialog,[role="option"],[contenteditable]',
    ) &&
    window.getSelection()?.isCollapsed
  )
    focusInput();
});
for (const dialog of document.querySelectorAll('dialog'))
  dialog.addEventListener('close', () => queueMicrotask(focusInput));
window.addEventListener('focus', () => queueMicrotask(focusInput));
document.addEventListener('keydown', (event) => {
  if (document.querySelector('dialog[open]')) return;
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault();
    request(newTest);
    return;
  }
  if (event.key === 'Escape' && activeReview()) {
    event.preventDefault();
    leaveErrorReview();
    return;
  }
  if (event.key === 'Escape' && state.route === 'practice' && isActive()) {
    event.preventDefault();
    if (state.attempt.timed) finish('interrupted');
    else if (state.attempt.state === 'running') actions.pause();
    else resumePractice();
  }
});
function loseWindow() {
  const a = state.attempt;
  if (!a || a.state !== 'running') return;
  a.advance();
  if (a.savedResult) {
    finishUI();
    return;
  }
  a.pause();
  if (a.savedResult) finishUI();
  else {
    renderPractice();
    announce('Практика на паузе: окно потеряло фокус.');
  }
}
window.addEventListener('blur', loseWindow);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) loseWindow();
});
window.addEventListener('resize', () => {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(() => {
    wrapCache = null;
    if (state.route === 'practice' && state.attempt) renderText();
  });
});
window.addEventListener('hashchange', () => request(() => routeTo(location.hash.slice(1))));
$('confirm-leave').addEventListener('click', () => {
  const pending = state.pending;
  state.pending = null;
  const a = state.attempt;
  if (a && isActive()) {
    a.advance();
    if (!a.savedResult) a.finish('interrupted');
    history = upsert(history, a.savedResult);
    if (!setSaved()) storageWarning = 'Не удалось сохранить прерванную попытку.';
  }
  $('leave-dialog').close();
  if (pending) pending();
});
$('leave-dialog').addEventListener('close', () => {
  state.pending = null;
});
$('settings-button').addEventListener('click', () => {
  const size = parseFloat(getComputedStyle($('typing-surface')).fontSize);
  $('font-size').value = String(size);
  text('font-output', `${size} px`);
  $('font-size').disabled = isActive();
  $('reduced-motion').checked = !!settings.reducedMotion;
  $('settings-dialog').showModal();
  $('import-button').disabled = isActive();
  $('original-export-button').hidden = !storageReadOnly;
  $('backup-status').hidden = true;
  dropdowns.refresh();
});
$('font-size').addEventListener('input', (event) => {
  settings.fontSize = Number(event.target.value);
  applySettings();
  text('font-output', `${settings.fontSize} px`);
  wrapCache = null;
  if (state.attempt) renderText();
  if (!setSaved()) storageWarning = 'Настройки не удалось сохранить.';
});
$('reduced-motion').addEventListener('change', (event) => {
  settings.reducedMotion = event.target.checked;
  applySettings();
  setSaved();
});
$('shortcuts-button').addEventListener('click', () => $('shortcuts-dialog').showModal());
function downloadText(value, name) {
  const blob = new Blob([value], { type: 'application/json' }),
    url = URL.createObjectURL(blob),
    link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function downloadOriginal() {
  const raw = readStoredBackup();
  if (raw !== null)
    downloadText(raw, `typaze-original-${new Date().toISOString().slice(0, 10)}.json`);
}
function backupStatus(value, error = false) {
  text('backup-status', value);
  $('backup-status').hidden = !value;
  $('backup-status').classList.toggle('is-error', error);
}
function importSummary(prepared) {
  const rows = [
    ['Новые занятия', prepared.added],
    ['Уже есть', prepared.duplicate],
  ];
  if (prepared.discarded) rows.push(['Старые записи вне последних 100', prepared.discarded]);
  if (prepared.milestonesChanged) rows.push(['Достижения', t('Обновятся')]);
  $('restore-summary').innerHTML = rows
    .map(([label, value]) => `<div><dt>${h(t(label))}</dt><dd>${h(value)}</dd></div>`)
    .join('');
}
$('export-button').addEventListener('click', () =>
  downloadText(
    JSON.stringify(
      { schema: 2, exportedAt: new Date().toISOString(), history, settings, progress },
      null,
      2,
    ),
    `typaze-${new Date().toISOString().slice(0, 10)}.json`,
  ),
);
$('original-export-button').addEventListener('click', downloadOriginal);
$('import-button').addEventListener('click', () => {
  if (isActive()) return;
  backupStatus('');
  $('backup-file').value = '';
  $('backup-file').click();
});
$('backup-file').addEventListener('change', async (event) => {
  const file = event.target.files[0],
    request = ++backupRead;
  if (!file) return;
  $('import-button').disabled = true;
  try {
    if (file.size > 5 * 1024 * 1024) throw new Error('size');
    const incoming = parseBackup(await file.text());
    if (request !== backupRead || !$('settings-dialog').open) return;
    const prepared = prepareImport({ history, progress }, incoming);
    if (!prepared.added && !prepared.milestonesChanged && !prepared.discarded) {
      backupStatus('Эта история уже есть');
      return;
    }
    pendingBackup = prepared;
    importSummary(prepared);
    text('restore-error', '');
    $('restore-error').hidden = true;
    $('settings-dialog').close();
    $('restore-dialog').showModal();
  } catch (error) {
    if (request !== backupRead) return;
    backupStatus(
      error.code === 'conflict'
        ? 'Некоторые записи отличаются от сохранённых. Выберите другую копию.'
        : file.size > 5 * 1024 * 1024
          ? 'Файл слишком большой. Максимум — 5 МБ.'
          : 'Не удалось прочитать историю. Выберите файл typaze.',
      true,
    );
  } finally {
    if (request === backupRead) $('import-button').disabled = isActive();
  }
});
$('confirm-restore').addEventListener('click', () => {
  if (!pendingBackup) return;
  const prepared = pendingBackup;
  if (!commitImport(prepared.history, settings, prepared.progress, { readOnly: storageReadOnly })) {
    text(
      'restore-error',
      'Не удалось сохранить историю. Проверьте доступ к хранилищу и повторите.',
    );
    $('restore-error').hidden = false;
    return;
  }
  history = prepared.history;
  progress = prepared.progress;
  storageReadOnly = false;
  storageWarning = null;
  pendingBackup = null;
  $('restore-dialog').close();
  $('settings-dialog').close();
  updateHeader();
  if (state.route === 'progress') renderProgress();
  else if (state.route === 'learn') renderLearn();
  else if (state.attempt) renderPractice();
  else renderAdaptive();
  announce('История восстановлена');
});
$('restore-dialog').addEventListener('close', () => {
  const cancelled = !!pendingBackup;
  pendingBackup = null;
  if (cancelled) $('settings-dialog').showModal();
});
$('clear-button').addEventListener('click', () => $('clear-dialog').showModal());
$('confirm-clear').addEventListener('click', () => {
  history = [];
  progress = emptyProgress();
  const saved = persist(history, settings, { force: true, progress });
  storageReadOnly = !saved;
  storageWarning = saved
    ? null
    : 'Не удалось удалить сохранённую историю. Доступ к хранилищу ограничен.';
  $('clear-dialog').close();
  $('settings-dialog').close();
  updateHeader();
  if (state.route === 'progress') renderProgress();
  else if (state.route === 'learn') renderLearn();
  else if (!isActive()) {
    state.mode = 'test';
    startAttempt();
  }
  announce(saved ? 'История удалена из этого браузера.' : storageWarning);
});

applySettings();
await document.fonts.ready;
routeTo(location.hash.slice(1) || 'practice');
if (storageWarning) announce(storageWarning);
