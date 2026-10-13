// Переводим интерфейс, сохраняя тексты упражнений.
const en = {
  'К результату': 'Back to result',
  'К курсу': 'Back to course',
  'Проверить результат': 'Check improvement',
  'Личный рекорд': 'Personal best',
  'Нет набранного текста': 'No text entered',
  'Нет теста для сравнения': 'No test to compare',
  'Условия тестов различаются': 'Test conditions differ',
  'В первом тесте мало данных': 'Not enough data in the first test',
  'Этот текст уже знаком': 'This text is already familiar',
  'Рекорд не обновлён: текст повторился.': 'No record: the text repeated.',
  'Текст закончился до таймера — без рекорда.': 'No record: the text ended before the timer.',
  До: 'Before',
  После: 'After',
  'Типы ошибок': 'Error types',
  'Сначала — короткий тест': 'Start with a short test',
  'Нужно больше данных': 'More data needed',
  'Пока нет повторяющихся ошибок': 'No recurring errors yet',
  'Нет нового текста для отработки': 'No fresh text for this focus',
  'Нет занятий': 'No sessions',
  'Пока нет результатов': 'No results yet',
  'Показать ещё': 'Show more',
  'Перейти к управлению': 'Move to controls',
  'Переключение в другое окно прерывает тест на время.':
    'Switching to another window interrupts a timed test.',
  'Попытка останется незавершённой.': 'This attempt will remain incomplete.',
  'Результаты, рекорды и прогресс обучения будут удалены.':
    'Results, records and course progress will be deleted.',
  'Нужно больше текста для проверки': 'More text needed for this check',
  'Ещё сочетания': 'More pairs',
  'Восстановить из файла': 'Restore from file',
  'Скачать исходные данные': 'Download original data',
  'Новые занятия': 'New sessions',
  'Уже есть': 'Already saved',
  'Старые записи вне последних 100': 'Older records outside the latest 100',
  Достижения: 'Milestones',
  Обновятся: 'Will be updated',
  'Эта история уже есть': 'This history is already saved',
  'Некоторые записи отличаются от сохранённых. Выберите другую копию.':
    'Some records differ from saved ones. Choose another backup.',
  'Файл слишком большой. Максимум — 5 МБ.': 'File too large. Maximum size is 5 MB.',
  'Не удалось прочитать историю. Выберите файл typaze.':
    'Could not read this history. Choose a typaze file.',
  'Не удалось сохранить историю. Проверьте доступ к хранилищу и повторите.':
    'Could not save history. Check storage access and try again.',
  'История восстановлена': 'History restored',
  'Восстановить историю?': 'Restore history?',
  Восстановить: 'Restore',
  'Повторить проверку': 'Repeat the check',
  Пальцы: 'Finger placement',
  Пройден: 'Passed',
  Закреплён: 'Retained',
  'Клавиши для повтора': 'Keys to revisit',
  'Продолжить отработку': 'Continue focused practice',
  из: 'of',
  до: 'before',
  после: 'after',
  'Пройти ещё один тест': 'Take another test',
  'Точность сопоставимых тестов': 'Accuracy across comparable tests',
  'Показатель графика': 'Chart metric',
  'Прервать тест; приостановить или продолжить практику': 'Stop a test; pause or resume practice',
  Клавиатура: 'Keyboard',
  Пробел: 'Space',
  'Частота ошибок': 'Error rate',
  'Разобрать в тексте': 'Review in text',
  Замены: 'Substitutions',
  Пропуски: 'Omissions',
  'Лишние символы': 'Insertions',
  Перестановки: 'Transpositions',
  'Найти в тексте': 'Find in text',
  Текст: 'Text',
  Аналитика: 'Analytics',
  'Разбор попытки': 'Review attempt',
  Все: 'All',
  Тесты: 'Tests',
  Проверки: 'Checks',
  Уроки: 'Lessons',
  История: 'History',
  Прервано: 'Interrupted',
  'Язык истории': 'History language',
  'Режим занятий': 'Session mode',
  'Последнее занятие': 'Latest session',
  'Последний тест': 'Latest test',
  Рекорд: 'Best',
  'Медиана последних 5': 'Median of last 5',
  'к предыдущим 5': 'vs previous 5',
  'Пока нет завершённых тестов.': 'No completed tests yet.',
  'Пройти тест': 'Take a test',
  Результат: 'Result',
  'Итоги попытки': 'Attempt summary',
  Символы: 'Characters',
  'Ошибки в тексте': 'Errors in text',
  Исправлено: 'Corrected',
  'Набранный текст': 'Typed text',
  Практика: 'Practice',
  Обучение: 'Learn',
  Прогресс: 'Progress',
  'Слепая печать': 'Touch typing',
  'К тренировке': 'Skip to practice',
  'typaze, практика': 'typaze, practice',
  'Основные разделы': 'Main navigation',
  'Язык интерфейса': 'Interface language',
  'Режим практики': 'Practice mode',
  'Язык текста': 'Text language',
  'Длительность теста': 'Test duration',
  Тренировка: 'Practice',
  'Тренировочный ввод': 'Typing input',
  Тест: 'Test',
  Свободно: 'Free practice',
  'По моим ошибкам': 'My weak spots',
  'Свободная практика': 'Free practice',
  Отработка: 'Focused practice',
  Проверка: 'Check',
  Урок: 'Lesson',
  свободно: 'Free practice',
  точность: 'accuracy',
  'Горячие клавиши': 'Shortcuts',
  Настройки: 'Settings',
  Закрыть: 'Close',
  'Размер текста': 'Text size',
  'Уменьшить движение': 'Reduce motion',
  'Скачать историю': 'Export history',
  'Удалить историю': 'Delete history',
  'Новый текст': 'New text',
  'Исправить ввод': 'Edit your typing',
  'Прервать попытку?': 'Leave this attempt?',
  Остаться: 'Stay',
  'Прервать и перейти': 'Leave attempt',
  'Удалить историю занятий?': 'Delete practice history?',
  Отмена: 'Cancel',
  Продолжить: 'Continue',
  Начать: 'Start',
  Повторить: 'Repeat',
  'Опорные клавиши': 'Home keys',
  'Основной ряд': 'Home row',
  'Верхний ряд': 'Upper row',
  'Нижний ряд': 'Lower row',
  Слова: 'Words',
  Предложения: 'Sentences',
  'Повторить сегодня': 'Review today',
  'Левый указательный — на «а», правый — на «о».': 'Left index on «а», right index on «о».',
  'Левый указательный — на f, правый — на j.': 'Left index on f, right index on j.',
  'Возвращайте пальцы на опорный ряд.': 'Return your fingers to the home row.',
  'Новые клавиши чередуются со знакомыми.': 'Alternate new keys with familiar ones.',
  'Смотрите на текст. Пробел нажимайте большим пальцем.':
    'Keep your eyes on the text. Use a thumb for the space bar.',
  'Сохраняйте точность в связном тексте.': 'Keep your accuracy in connected text.',
  'Подсказка клавиатуры': 'Keyboard guide',
  'Пробел — большой палец': 'Space — thumb',
  'Левый мизинец': 'Left little finger',
  'Левый безымянный': 'Left ring finger',
  'Левый средний': 'Left middle finger',
  'Левый указательный': 'Left index finger',
  'Правый указательный': 'Right index finger',
  'Правый средний': 'Right middle finger',
  'Правый безымянный': 'Right ring finger',
  'Правый мизинец': 'Right little finger',
  'Следите за положением рук': 'Check your hand position',
  Пауза: 'Pause',
  Закончить: 'Finish',
  'Прервать урок': 'Stop lesson',
  'Прервать тест': 'Stop test',
  'Практика на паузе.': 'Practice paused.',
  'Практика продолжается.': 'Practice resumed.',
  'Практика на паузе: окно потеряло фокус.': 'Practice paused: the window lost focus.',
  'Тест прерван': 'Test interrupted',
  'Урок прерван': 'Lesson interrupted',
  'Урок прерван.': 'Lesson interrupted.',
  'Тест прерван. В рекорды не входит.': 'Test interrupted. It will not count towards records.',
  'Новый тест': 'New test',
  'Продолжить свободно': 'Continue freely',
  'Продолжаем материал с места остановки. Предыдущий ввод остался в прерванной попытке.':
    'Continue from where you stopped. Earlier typing stays in the interrupted attempt.',
  'Упражнение завершено': 'Exercise completed',
  'К обучению': 'Go to learning',
  'Следующий шаг': 'Next step',
  'К первой ошибке': 'Show first error',
  Предыдущая: 'Previous',
  Следующая: 'Next',
  'К последнему фрагменту': 'Back to the last passage',
  'Последний фрагмент.': 'Last passage.',
  'Позиция приблизительная': 'Approximate position',
  Ничего: 'Nothing',
  'Не введено': 'Not typed',
  'К истории': 'History',
  'До отработки': 'Before practice',
  'Подробности попытки': 'Attempt details',
  'Активное время:': 'Active time:',
  'Темп по отрезкам активного времени': 'Pace over active time',
  Ошибка: 'Error',
  Ожидалось: 'Expected',
  Введено: 'Typed',
  Замена: 'Substitution',
  Пропуск: 'Omission',
  'Лишний символ': 'Insertion',
  Перестановка: 'Transposition',
  'Символы и сочетания': 'Characters and pairs',
  Потренировать: 'Practice',
  'Показано последнее занятие.': 'Latest session shown.',
  Язык: 'Text language',
  'Все занятия': 'All sessions',
  Длительность: 'Duration',
  'Сопоставимые результаты тестов, от старых к новым': 'Comparable test results, oldest to newest',
  Занятие: 'Session',
  Условия: 'Conditions',
  Темп: 'Pace',
  Точность: 'Accuracy',
  'Начать практику': 'Start practice',
  'История пока не сохраняется': 'History is not saving',
  'История удалена из этого браузера.': 'History deleted from this browser.',
  'Для тренировки вводите текст с клавиатуры.': 'Type with your keyboard to practice.',
  'Проверьте раскладку клавиатуры.': 'Check your keyboard layout.',
  'Для этой группы пока мало нового материала. Попробуйте другой текст.':
    'Not enough fresh material for this group. Try another text.',
  'Печатайте без спешки.': 'Take your time.',
  'Учебный шаг': 'Lesson',
  'Повторить сохранение': 'Retry saving',
  'Результат не сохранён в этом браузере.': 'This result could not be saved.',
  'Сохранение всё ещё недоступно. Результат остаётся в памяти.':
    'Saving is still unavailable. The result remains in memory.',
  'Результат сохранён в этом браузере.': 'Result saved in this browser.',
  'Настройки не удалось сохранить.': 'Could not save preferences.',
  'Не удалось сохранить прерванную попытку.': 'Could not save the interrupted attempt.',
  'Не удалось удалить сохранённую историю. Доступ к хранилищу ограничен.':
    'Could not delete history. Browser storage is restricted.',
  'Подробности этой попытки недоступны.': 'Details are unavailable for this attempt.',
  пробел: 'space',
  'Сохранённая история имеет другой формат. Она не была перезаписана.':
    'Saved history has an unsupported format. The original data was preserved.',
  'Часть истории повреждена. Исходные данные сохранены без изменений.':
    'Some history entries are damaged. The original data was preserved.',
  'Не удалось прочитать историю. Тренировка доступна, результаты пока останутся в памяти.':
    'Could not read history. You can practice; new results remain in memory.',
};
const patterns = [
  [/^Отработка «(.+)»$/, 'Practice «$1»'],
  [/^Ошибки с «(.+)»: (\d+) из (\d+)$/, 'Errors with «$1»: $2 of $3'],
  [/^Повторы «(.+)»: (\d+) из (\d+)$/, 'Practice «$1»: $2 of $3'],
  [/^Нажмите «(.+)»$/, 'Press «$1»'],
  [/^(\d+(?:[.,]\d+)?) с$/, '$1 s'],
  [/^Ошибка (\d+) из (\d+)$/, 'Error $1 of $2'],
  [/^Текст упражнения: (.*)$/, 'Exercise text: $1'],
  [/^(\d+) секунд$/, '$1 seconds'],
  [/^(\d+) из (\d+)$/, '$1 of $2'],
  [/^Потренировать «(.+)»$/, 'Practice «$1»'],
  [/^Ожидалось: (.+)$/, 'Expected: $1'],
  [/^Ввод символа: (.+)$/, 'Composing: $1'],
  [/^Попытка завершена\. Точность (.+)\.$/, 'Attempt completed. Accuracy $1.'],
];

export function message(value, language = 'ru') {
  const raw = String(value ?? '');
  if (language !== 'en') return raw;
  const valueTrimmed = raw.trim();
  let result = en[valueTrimmed];
  if (result === undefined) {
    for (const [pattern, replacement] of patterns)
      if (pattern.test(valueTrimmed)) {
        result = valueTrimmed.replace(pattern, replacement);
        break;
      }
  }
  if (result === undefined && valueTrimmed.includes(' · '))
    result = valueTrimmed
      .split(' · ')
      .map((part) => message(part, language))
      .join(' · ');
  if (result === undefined) {
    const sentences = valueTrimmed.split(/(?<=[.!?])\s+/u);
    if (sentences.length > 1)
      result = sentences.map((sentence) => message(sentence, language)).join(' ');
  }
  if (result === undefined)
    result = valueTrimmed
      .replace(/(\d+) с активно/g, '$1 s active')
      .replace(/(\d+) секунд/g, '$1 seconds')
      .replace(/(\d+) с\b/g, '$1 s')
      .replace(/(\d+) из (\d+)/g, '$1 of $2');
  return raw.replace(valueTrimmed, result.replace(/«пробел»/g, '«space»'));
}

export function localizeElement(root, language) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode()))
    if (!node.parentElement?.closest('code,kbd,.lesson-keys'))
      node.nodeValue = message(node.nodeValue, language);
  for (const element of [root, ...root.querySelectorAll('[aria-label],[title]')])
    for (const attribute of ['aria-label', 'title'])
      if (element.hasAttribute(attribute))
        element.setAttribute(attribute, message(element.getAttribute(attribute), language));
}

// Смена языка сохраняет узлы и обработчики.
export function captureStaticLabels(roots) {
  const texts = [],
    attributes = [];
  for (const root of roots) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) texts.push([node, node.nodeValue]);
    for (const element of [root, ...root.querySelectorAll('[aria-label]')])
      if (element.hasAttribute('aria-label'))
        attributes.push([element, element.getAttribute('aria-label')]);
  }
  return (language) => {
    for (const [node, value] of texts) node.nodeValue = message(value, language);
    for (const [element, value] of attributes)
      element.setAttribute('aria-label', message(value, language));
  };
}
