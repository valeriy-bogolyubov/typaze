export const CORPUS = {
  ru: ['После дождя город стал тише. Мы свернули к реке и остановились у воды.'],
  en: ['After the rain, the city grew quiet. We walked down to the river.'],
};
export const hash = (text) => {
  let h = 2166136261;
  for (const c of text) {
    h ^= c.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
};
export const MIN_PRACTICE_EXPOSURES = 6;
export const MIN_CONTROL_EXPOSURES = 4;
export function makeText(language) {
  const rows = CORPUS[language] || CORPUS.ru;
  let text = '';
  const paragraphs = [];
  let repetitionAt = null;
  while (text.length < 4300) {
    for (let i = 0; i < rows.length; i++) {
      if (text) text += ' ';
      const start = text.length;
      text += rows[i];
      paragraphs.push({ id: `${language}-${i}`, start, end: text.length });
    }
    if (repetitionAt === null) repetitionAt = text.length;
  }
  return { text, textId: hash(text), paragraphs, repetitionAt };
}
