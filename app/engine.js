export { MIN_PRACTICE_EXPOSURES, MIN_CONTROL_EXPOSURES } from './content.js';
export const VERSION = 'typaze-edit-v1';
const segmenter = new Intl.Segmenter('und', { granularity: 'grapheme' });
export const graphemes = (text) =>
  Array.from(segmenter.segment(text.normalize('NFC')), (x) => x.segment);
const MATCH = 1,
  TRANSPOSE = 2,
  SUBSTITUTE = 3,
  DELETE = 4,
  INSERT = 5,
  TIE = 16;
const better = (d, o, c, bd, bo, bc) => d < bd || (d === bd && (o < bo || (o === bo && c > bc)));

// Пересчитываем выравнивание с первого изменённого символа.
export class Aligner {
  constructor(text) {
    this.reference = graphemes(text);
    this.typed = [];
    this.rows = [];
    const n = this.reference.length;
    const first = {
      d: new Uint16Array(n + 1),
      o: new Uint16Array(n + 1),
      c: new Uint16Array(n + 1),
      p: new Uint8Array(n + 1),
    };
    for (let j = 1; j <= n; j++) {
      first.d[j] = j;
      first.o[j] = j;
      first.p[j] = DELETE;
    }
    this.rows.push(first);
  }
  update(value) {
    const next = Array.isArray(value) ? value : graphemes(value),
      ref = this.reference,
      n = ref.length;
    let common = 0;
    while (
      common < next.length &&
      common < this.typed.length &&
      next[common] === this.typed[common]
    )
      common++;
    this.rows.length = common + 1;
    this.typed = next;
    for (let i = common + 1; i <= next.length; i++) {
      const prev = this.rows[i - 1],
        prev2 = this.rows[i - 2];
      const row = {
        d: new Uint16Array(n + 1),
        o: new Uint16Array(n + 1),
        c: new Uint16Array(n + 1),
        p: new Uint8Array(n + 1),
      };
      row.d[0] = i;
      row.o[0] = i;
      row.p[0] = INSERT;
      for (let j = 1; j <= n; j++) {
        const equal = next[i - 1] === ref[j - 1];
        let bd = prev.d[j - 1] + (equal ? 0 : 1),
          bo = prev.o[j - 1] + (equal ? 0 : 1),
          bc = prev.c[j - 1] + (equal ? 1 : 0),
          op = equal ? MATCH : SUBSTITUTE,
          tie = 0;
        const choose = (d, o, c, p) => {
          if (better(d, o, c, bd, bo, bc)) {
            bd = d;
            bo = o;
            bc = c;
            op = p;
            tie = 0;
          } else if (d === bd && o === bo && c === bc) {
            tie = TIE;
            if (p < op) op = p;
          }
        };
        if (
          i > 1 &&
          j > 1 &&
          next[i - 1] === ref[j - 2] &&
          next[i - 2] === ref[j - 1] &&
          ref[j - 1] !== ref[j - 2]
        )
          choose(prev2.d[j - 2] + 2, prev2.o[j - 2] + 1, prev2.c[j - 2], TRANSPOSE);
        choose(row.d[j - 1] + 1, row.o[j - 1] + 1, row.c[j - 1], DELETE);
        choose(prev.d[j] + 1, prev.o[j] + 1, prev.c[j], INSERT);
        row.d[j] = bd;
        row.o[j] = bo;
        row.c[j] = bc;
        row.p[j] = op | tie;
      }
      this.rows.push(row);
    }
    return this.result();
  }
  result() {
    const i = this.typed.length,
      row = this.rows[i];
    let end = 0;
    for (let j = 1; j < row.d.length; j++) {
      if (
        better(row.d[j], row.o[j], row.c[j], row.d[end], row.o[end], row.c[end]) ||
        (row.d[j] === row.d[end] &&
          row.o[j] === row.o[end] &&
          row.c[j] === row.c[end] &&
          Math.abs(j - i) < Math.abs(end - i))
      )
        end = j;
    }
    let x = i,
      y = end;
    const ops = [],
      ambiguousRefs = new Set();
    while (x || y) {
      const code = this.rows[x].p[y],
        kind = code & 15,
        ambiguous = !!(code & TIE);
      if (kind === MATCH || kind === SUBSTITUTE) {
        ops.push({
          kind: kind === MATCH ? 'match' : 'substitution',
          r: y - 1,
          t: x - 1,
          expected: this.reference[y - 1],
          actual: this.typed[x - 1],
          ambiguous,
        });
        if (ambiguous) ambiguousRefs.add(y - 1);
        x--;
        y--;
      } else if (kind === TRANSPOSE) {
        ops.push({
          kind: 'transposition',
          r: y - 2,
          t: x - 2,
          expected: this.reference.slice(y - 2, y).join(''),
          actual: this.typed.slice(x - 2, x).join(''),
          ambiguous,
        });
        if (ambiguous) {
          ambiguousRefs.add(y - 1);
          ambiguousRefs.add(y - 2);
        }
        x -= 2;
        y -= 2;
      } else if (kind === DELETE) {
        ops.push({
          kind: 'omission',
          r: y - 1,
          t: x,
          expected: this.reference[y - 1],
          actual: '',
          ambiguous,
        });
        if (ambiguous) ambiguousRefs.add(y - 1);
        y--;
      } else if (kind === INSERT) {
        ops.push({
          kind: 'insertion',
          r: y,
          t: x - 1,
          expected: '',
          actual: this.typed[x - 1],
          ambiguous,
        });
        if (ambiguous) ambiguousRefs.add(Math.min(y, this.reference.length - 1));
        x--;
      } else throw Error('Invalid alignment path');
    }
    ops.reverse();
    // Неоднозначный конец слова не учитываем в диагностике.
    for (let j = 0; j < row.d.length; j++)
      if (
        j !== end &&
        row.d[j] === row.d[end] &&
        row.o[j] === row.o[end] &&
        row.c[j] === row.c[end]
      ) {
        let k = end - 1;
        while (k >= 0 && this.reference[k] !== ' ') {
          ambiguousRefs.add(k);
          k--;
        }
        break;
      }
    return { I: i, R: end, C: row.c[end], D: row.d[end], M: Math.max(i, end), ops, ambiguousRefs };
  }
}

export function metrics(alignment, H, seconds) {
  return {
    wpm: seconds > 0 ? alignment.C / 5 / (seconds / 60) : 0,
    accuracy: alignment.M
      ? Math.max(0, Math.min(100, (100 * (alignment.M - alignment.D)) / (alignment.M + H)))
      : null,
    correct: alignment.C,
    remaining: alignment.D,
    corrected: H,
    volume: alignment.I,
  };
}
export function recordObservations(map, alignment, reference, limit = alignment.R) {
  const wrong = new Set();
  for (const op of alignment.ops)
    if (op.kind !== 'match') {
      wrong.add(Math.min(op.r, Math.max(0, reference.length - 1)));
      if (op.kind === 'transposition') wrong.add(op.r + 1);
    }
  for (let r = 0; r < Math.min(limit, alignment.R); r++) {
    if (!/\p{L}/u.test(reference[r])) continue;
    for (const len of [1, 2]) {
      if (
        r + len > Math.min(limit, alignment.R) ||
        !reference.slice(r, r + len).every((x) => /\p{L}/u.test(x))
      )
        continue;
      if (Array.from({ length: len }, (_, k) => r + k).some((k) => alignment.ambiguousRefs.has(k)))
        continue;
      const group = reference
          .slice(r, r + len)
          .join('')
          .toLowerCase(),
        key = `${r}:${len}`,
        old = map.get(key);
      const bad = Array.from({ length: len }, (_, k) => r + k).some((k) => wrong.has(k));
      map.set(key, { group, r, len, wrong: bad || !!old?.wrong });
    }
  }
}
export function summarizeGroups(observations, sourceAt = () => []) {
  const groups = new Map();
  for (const item of observations.values()) {
    const g = groups.get(item.group) || {
      group: item.group,
      n: 0,
      errors: 0,
      sources: new Set(),
      errorSources: new Set(),
    };
    g.n++;
    g.errors += Number(item.wrong);
    for (const id of sourceAt(item)) {
      g.sources.add(id);
      if (item.wrong) g.errorSources.add(id);
    }
    groups.set(item.group, g);
  }
  return [...groups.values()]
    .map((g) => ({ ...g, sources: [...g.sources], errorSources: [...g.errorSources] }))
    .sort((a, b) => b.errors - a.errors || b.n - a.n || a.group.localeCompare(b.group));
}

export class Attempt {
  constructor({
    text,
    language = 'ru',
    duration = 30,
    mode = 'test',
    textId = '',
    paragraphs = [],
    lessonId = null,
    lessonUnit = null,
    lessonUnitCount = null,
    goal = null,
    baseline = null,
    now = () => performance.now(),
    id = globalThis.crypto?.randomUUID?.() || String(Math.random()),
  }) {
    this.id = id;
    this.text = text.normalize('NFC');
    this.language = language;
    this.duration = duration;
    this.mode = mode;
    this.textId = textId;
    this.paragraphs = paragraphs;
    this.lessonId = lessonId;
    this.lessonUnit = lessonUnit;
    this.lessonUnitCount = lessonUnitCount;
    this.goal = goal;
    this.baseline = baseline;
    this.now = now;
    this.aligner = new Aligner(this.text);
    this.alignment = this.aligner.result();
    this.value = '';
    this.state = 'ready';
    this.startedAt = null;
    this.segmentStart = null;
    this.activeMs = 0;
    this.endedAt = null;
    this.deadline = null;
    this.H = 0;
    this.edits = 0;
    this.wrongAttempts = 0;
    this.lastWrong = null;
    this.wrongKeys = new Map();
    this.reached = 0;
    this.observations = new Map();
    this.tokens = [];
    this.seq = 0;
    this.savedResult = null;
  }
  get timed() {
    return ['test', 'targeted', 'control'].includes(this.mode);
  }
  elapsed(at = this.now()) {
    return (
      (this.activeMs +
        (this.state === 'running' && this.segmentStart !== null
          ? Math.max(0, at - this.segmentStart)
          : 0)) /
      1000
    );
  }
  advance(at = this.now()) {
    if (this.state === 'running' && this.timed && at >= this.deadline)
      this.finish('completed', this.deadline, 'deadline');
    return this.state;
  }
  commit(raw, { inputType = 'insertText', at = this.now(), selectionStart = null } = {}) {
    this.advance(at);
    if (!['ready', 'running'].includes(this.state)) return false;
    let chars = graphemes(raw.replace(/[\r\n\t]/g, ''));
    if (chars.join('') === this.value) return false;
    if (chars.length > this.aligner.reference.length + 100) return false;
    if (this.state === 'ready' && chars.length) {
      this.state = 'running';
      this.startedAt = at;
      this.segmentStart = at;
      this.deadline = this.timed ? at + this.duration * 1000 : null;
    }
    if (this.mode === 'lesson') return this.commitLesson(chars, at, inputType);
    const old = graphemes(this.value);
    let prefix = 0,
      suffix = 0;
    while (prefix < old.length && prefix < chars.length && old[prefix] === chars[prefix]) prefix++;
    while (
      suffix < old.length - prefix &&
      suffix < chars.length - prefix &&
      old[old.length - 1 - suffix] === chars[chars.length - 1 - suffix]
    )
      suffix++;
    const repair =
      inputType.startsWith('delete') || inputType.startsWith('history') || prefix < old.length;
    if (repair) {
      recordObservations(this.observations, this.alignment, this.aligner.reference);
      this.edits++;
    }
    const before = this.alignment.D;
    this.tokens = [
      ...this.tokens.slice(0, prefix),
      ...chars
        .slice(prefix, chars.length - suffix)
        .map((char) => ({ char, time: this.elapsed(at), seq: ++this.seq })),
      ...(suffix ? this.tokens.slice(old.length - suffix) : []),
    ];
    this.value = chars.join('');
    this.alignment = this.aligner.update(chars);
    this.reached = Math.max(this.reached, this.alignment.R);
    if (repair) this.H += Math.max(0, before - this.alignment.D);
    if (chars.at(-1) === ' ') {
      let limit = this.alignment.R;
      while (limit > 0 && this.aligner.reference[limit - 1] !== ' ') limit--;
      recordObservations(this.observations, this.alignment, this.aligner.reference, limit);
    }
    if (
      this.alignment.R === this.aligner.reference.length &&
      this.alignment.I >= this.aligner.reference.length
    )
      this.finish('completed', at, 'material');
    return true;
  }
  commitLesson(chars, at, inputType) {
    const old = graphemes(this.value);
    if (chars.length < old.length) {
      let valid = 0;
      while (valid < chars.length && chars[valid] === this.aligner.reference[valid]) valid++;
      this.value = chars.slice(0, valid).join('');
      this.edits++;
    } else {
      let prefix = 0;
      while (prefix < old.length && prefix < chars.length && old[prefix] === chars[prefix])
        prefix++;
      if (prefix < old.length) {
        this.lastWrong = 'Исправляйте с конца упражнения';
        return false;
      }
      const accepted = [...old];
      for (const char of chars.slice(prefix)) {
        if (char === this.aligner.reference[accepted.length]) {
          accepted.push(char);
          this.lastWrong = null;
        } else {
          this.wrongAttempts++;
          this.lastWrong = char;
          const expected = this.aligner.reference[accepted.length] || '',
            key = JSON.stringify([expected, char]),
            entry = this.wrongKeys.get(key) || { expected, actual: char, count: 0 };
          entry.count++;
          this.wrongKeys.set(key, entry);
        }
      }
      this.value = accepted.join('');
    }
    this.alignment = this.aligner.update(this.value);
    this.reached = Math.max(this.reached, this.alignment.R);
    if (this.alignment.I === this.aligner.reference.length)
      this.finish('completed', at, 'material');
    return true;
  }
  pause(at = this.now()) {
    this.advance(at);
    if (this.state !== 'running') return;
    if (this.timed) {
      this.finish('interrupted', at, 'interrupted');
      return;
    }
    this.activeMs += at - this.segmentStart;
    this.segmentStart = null;
    this.state = 'paused';
  }
  resume(at = this.now()) {
    if (this.state === 'paused') {
      this.segmentStart = at;
      this.state = 'running';
    }
  }
  finish(status = 'completed', at = this.now(), reason = 'manual') {
    if (['completed', 'interrupted'].includes(this.state)) return this.savedResult;
    if (this.state === 'running') this.activeMs += Math.max(0, at - this.segmentStart);
    this.segmentStart = null;
    this.endedAt = at;
    this.state = status;
    this.reason = reason;
    recordObservations(this.observations, this.alignment, this.aligner.reference);
    const seconds = this.activeMs / 1000;
    const m = metrics(this.alignment, this.H, seconds);
    if (this.mode === 'lesson')
      m.accuracy =
        this.alignment.I + this.wrongAttempts
          ? (100 * this.alignment.I) / (this.alignment.I + this.wrongAttempts)
          : null;
    const offsets = [0];
    for (const char of this.aligner.reference) offsets.push(offsets.at(-1) + char.length);
    const spans = this.paragraphs.map((p, i) => ({
      ...p,
      end: p.end ?? this.paragraphs[i + 1]?.start ?? this.text.length,
    }));
    const seen = [
      ...new Set(spans.filter((p) => p.start < offsets[this.reached]).map((p) => p.id)),
    ];
    const groups = summarizeGroups(this.observations, (item) =>
      spans
        .filter((p) => p.start <= offsets[item.r] && p.end >= offsets[item.r + item.len])
        .map((p) => p.id),
    );
    const errors = this.alignment.ops
      .filter((op) => op.kind !== 'match')
      .map(({ kind, r, expected, actual, ambiguous }) => ({
        kind,
        r,
        expected,
        actual,
        ambiguous,
      }));
    const bins = Array.from({ length: Math.max(1, Math.ceil(seconds / 5)) }, () => 0);
    for (const op of this.alignment.ops)
      if (op.kind === 'match' && this.tokens[op.t]) {
        const bin = Math.min(bins.length - 1, Math.floor(this.tokens[op.t].time / 5));
        bins[bin]++;
      }
    this.savedResult = {
      id: this.id,
      version: VERSION,
      accuracyVersion: this.mode === 'lesson' ? 'lesson-v1' : 'edit-v1',
      date: new Date().toISOString(),
      status,
      reason,
      language: this.language,
      duration: this.duration,
      mode: this.mode,
      textId: this.textId,
      source: this.text,
      value: this.value,
      seconds,
      metrics: m,
      groups,
      errors,
      edits: this.edits,
      wrongAttempts: this.wrongAttempts,
      wrongKeys: [...this.wrongKeys.values()],
      goal: this.goal,
      lessonId: this.lessonId,
      lessonUnit: this.lessonUnit,
      lessonUnitCount: this.lessonUnitCount,
      seen,
      baselineId: this.baseline?.id || null,
      bins: bins.map((count, index) => {
        const span = Math.max(0.001, Math.min(5, seconds - index * 5));
        return { second: index * 5, wpm: count / 5 / (span / 60) };
      }),
      eligible:
        status === 'completed' &&
        this.mode === 'test' &&
        reason === 'deadline' &&
        this.alignment.I > 0,
    };
    return this.savedResult;
  }
}

// Сравниваем частоту ошибок с учётом числа наблюдений.
export function goalEvidence(result, goal = result?.goal) {
  const row = result?.groups?.find((g) => g.group === goal);
  const n = Math.max(0, Number(row?.n) || 0),
    errors = Math.min(n, Math.max(0, Number(row?.errors) || 0));
  return { n, errors, rate: n ? errors / n : null };
}
export function compareGoal(baseline, result, { min = 4 } = {}) {
  const goal = result?.goal || baseline?.goal,
    before = goalEvidence(baseline, goal),
    after = goalEvidence(result, goal);
  const sources = (record) => record?.groups?.find((g) => g.group === goal)?.sources;
  const baselineSources = sources(baseline),
    controlSources = sources(result);
  const known = (ids) =>
    Array.isArray(ids) &&
    ids.length > 0 &&
    ids.every((id) => typeof id === 'string' && id.length > 0);
  const enough = !!goal && before.n >= min && after.n >= min;
  const provenance = known(baselineSources) && known(controlSources);
  const familiar = provenance && baselineSources.some((id) => controlSources.includes(id));
  const covered = enough && provenance && !familiar;
  const reason =
    !enough || !provenance ? 'insufficient' : familiar ? 'familiar-material' : 'comparable';
  return {
    covered,
    reason,
    samples: { baseline: before.n, control: after.n },
    delta: covered ? (before.rate - after.rate) * 100 : null,
    baseline: before,
    control: after,
  };
}
export function recommendationState(results, current, hasMaterial = () => true) {
  const valid = [...results.filter((r) => r.id !== current?.id), ...(current ? [current] : [])]
    .filter(
      (r) =>
        r.status === 'completed' &&
        !r.repeatedMaterial &&
        ['test', 'control'].includes(r.mode) &&
        r.version === VERSION &&
        r.language === current?.language &&
        r.duration === current?.duration &&
        Date.now() - Date.parse(r.date) < 30 * 86400000,
    )
    .slice(-10);
  if (!valid.length) return { status: 'no-history', recommendation: null };
  const totals = new Map();
  for (const result of valid)
    for (const row of result.groups || []) {
      if (!row || !Number.isFinite(row.n) || row.n <= 0) continue;
      const g = totals.get(row.group) || {
        group: row.group,
        n: 0,
        errors: 0,
        attempts: 0,
        errorAttempts: 0,
        sources: new Set(),
        errorSources: new Set(),
      };
      g.n += row.n;
      g.errors += row.errors;
      g.attempts++;
      if (row.errors) g.errorAttempts++;
      for (const id of row.sources || []) g.sources.add(id);
      for (const id of row.errorSources || []) g.errorSources.add(id);
      totals.set(row.group, g);
    }
  const candidates = [...totals.values()].map((g) => ({
    ...g,
    recurrent:
      g.n >= 20 &&
      g.attempts >= 3 &&
      g.errors >= 4 &&
      g.errorAttempts >= 2 &&
      g.sources.size >= 2 &&
      g.errorSources.size >= 2,
  }));
  const qualified = candidates.filter(
    (g) =>
      g.recurrent ||
      (current?.groups || []).some((x) => x.group === g.group && x.n >= 8 && x.errors >= 3),
  );
  if (!qualified.length)
    return {
      status: candidates.some((g) => g.n >= 8) ? 'no-pattern' : 'insufficient',
      recommendation: null,
    };
  const available = qualified.filter((g) => hasMaterial(g.group));
  if (!available.length) return { status: 'no-material', recommendation: null };
  available.sort(
    (a, b) =>
      Number(b.recurrent) - Number(a.recurrent) ||
      b.errors / b.n - a.errors / a.n ||
      b.n - a.n ||
      graphemes(b.group).length - graphemes(a.group).length ||
      a.group.localeCompare(b.group),
  );
  return { status: 'ready', recommendation: available[0] };
}
export function recommendation(results, current, hasMaterial = () => true) {
  return recommendationState(results, current, hasMaterial).recommendation;
}
