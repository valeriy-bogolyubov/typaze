// Подсказки клавиш для русской и английской раскладок.
const letters = [
  [
    'KeyQ',
    'KeyW',
    'KeyE',
    'KeyR',
    'KeyT',
    'KeyY',
    'KeyU',
    'KeyI',
    'KeyO',
    'KeyP',
    'BracketLeft',
    'BracketRight',
  ],
  ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote'],
  ['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash'],
];
export function keyboardRows(language) {
  const ru = language === 'ru',
    rows = [
      ru ? 'йцукенгшщзхъ' : 'qwertyuiop[]',
      ru ? 'фывапролджэ' : "asdfghjkl;'",
      ru ? 'ячсмитьбю.' : 'zxcvbnm,./',
    ];
  const shifted = ru
    ? ['ЙЦУКЕНГШЩЗХЪ', 'ФЫВАПРОЛДЖЭ', 'ЯЧСМИТЬБЮ,']
    : ['QWERTYUIOP{}', 'ASDFGHJKL:"', 'ZXCVBNM<>?'];
  const topLower = ru ? 'ё1234567890-=' : '`1234567890-=',
    topUpper = ru ? 'Ё!"№;%:?*()_+' : '~!@#$%^&*()_+';
  const topCodes = [
    'Backquote',
    ...Array.from({ length: 9 }, (_, i) => `Digit${i + 1}`),
    'Digit0',
    'Minus',
    'Equal',
  ];
  const top = [...topLower].map((lower, i) => ({
    code: topCodes[i],
    lower,
    upper: [...topUpper][i],
  }));
  top.push({ code: 'Backspace', label: 'Backspace', size: 'wide' });
  const result = rows.map((row, i) =>
    [...row].map((lower, j) => ({ code: letters[i][j], lower, upper: [...shifted[i]][j] })),
  );
  result[2].unshift({ code: 'ShiftLeft', label: 'Shift', size: 'wide' });
  result[2].push({ code: 'ShiftRight', label: 'Shift', size: 'wide' });
  return [
    top,
    ...result,
    [{ code: 'Space', lower: ' ', upper: ' ', label: 'Пробел', size: 'space' }],
  ];
}
export function keyHint(char, language, { capsLock = false } = {}) {
  if (typeof char !== 'string' || !char) return null;
  const normalized = char.normalize('NFC');
  for (const key of keyboardRows(language).flat()) {
    if (key.lower !== normalized && key.upper !== normalized) continue;
    const isLetter = /\p{L}/u.test(normalized);
    const shift = key.upper !== key.lower && (normalized === key.upper) !== (isLetter && capsLock);
    return { code: key.code, shift };
  }
  return null;
}

// Shift нажимается противоположной рукой.
export function shiftKeyFor(code) {
  return /^(Key[QWERTASDFGZXCVB]|Digit[1-5]|Backquote)$/.test(code) ? 'ShiftRight' : 'ShiftLeft';
}
