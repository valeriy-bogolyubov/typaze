// Отрисовываем до пяти строк.
export function layoutLines(chars, columns) {
  const lines = [];
  let start = 0;
  while (start < chars.length) {
    let end = Math.min(chars.length, start + columns);
    if (chars[end] === ' ') end++;
    else if (end < chars.length && chars[end - 1] !== ' ') {
      let split = end;
      while (split > start && chars[split - 1] !== ' ') split--;
      if (split > start) end = split;
    }
    lines.push({ start, end });
    start = end;
  }
  return lines;
}
export function scenePosition({
  lines,
  current,
  first,
  refCaret,
  charWidth,
  fontSize,
  lineHeight,
}) {
  return {
    x: (refCaret - (lines[current]?.start || 0)) * charWidth,
    y: current * lineHeight + (lineHeight - fontSize * 1.2) / 2,
    offset: first === 0 ? 0 : -first * lineHeight,
  };
}
export function createTypingScene(viewport, caret) {
  const doc = viewport.ownerDocument,
    track = doc.createElement('div');
  track.className = 'text-track';
  viewport.replaceChildren(track);
  track.append(caret);
  const mounted = new Map();
  let previousKey = null,
    previousLine = null,
    previousX = null;
  return {
    layout(options) {
      const { key, lines, first, current, lineHeight } = options;
      const reset = previousKey !== key;
      if (reset) {
        for (const row of mounted.values()) row.element.remove();
        mounted.clear();
        previousKey = key;
        previousLine = null;
      }
      const position = scenePosition(options);
      // Сбрасываем анимацию при смене разметки.
      track.classList.toggle('scene-reset', reset);
      track.style.transform = `translateY(${position.offset}px)`;
      if (reset || previousLine !== current) caret.classList.add('caret-snap');
      else if (previousX !== position.x) caret.classList.remove('caret-snap');
      caret.style.top = `${position.y}px`;
      caret.style.transform = `translateX(${position.x}px)`;
      previousLine = current;
      previousX = position.x;
      const start = Math.max(0, first - 1),
        end = Math.min(lines.length, first + 4),
        rendered = [];
      for (const [index, row] of mounted)
        if (index < start || index >= end) {
          row.element.remove();
          mounted.delete(index);
        }
      for (let index = start; index < end; index++) {
        const line = lines[index];
        let row = mounted.get(index);
        if (!row) {
          const element = doc.createElement('div');
          element.className = 'type-line';
          element.style.top = `${index * lineHeight}px`;
          const letters = [];
          for (let ref = line.start; ref < line.end; ref++) {
            const letter = doc.createElement('span');
            letter.className = 'letter';
            letter.dataset.ref = String(ref);
            letter.append(doc.createTextNode(''));
            element.append(letter);
            letters.push(letter);
          }
          row = { line, letters, element };
          mounted.set(index, row);
          track.insertBefore(element, caret);
        }
        rendered.push(row);
      }
      return rendered;
    },
  };
}
