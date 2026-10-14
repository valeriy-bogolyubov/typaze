export function exerciseLanguage(settings) {
  return ['ru', 'en'].includes(settings.textLanguage)
    ? settings.textLanguage
    : ['ru', 'en'].includes(settings.language) ? settings.language : 'ru';
}
