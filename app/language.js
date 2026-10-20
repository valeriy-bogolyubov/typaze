// Язык текста не зависит от языка интерфейса.
export function exerciseLanguage(settings) {
  return ['ru', 'en'].includes(settings.textLanguage)
    ? settings.textLanguage
    : ['ru', 'en'].includes(settings.detectedLanguage)
      ? settings.detectedLanguage
      : ['ru', 'en'].includes(settings.language)
        ? settings.language
        : 'ru';
}
