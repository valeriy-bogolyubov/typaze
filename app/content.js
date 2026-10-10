const ru = [
  'После дождя город стал тише. Мы свернули к реке и ненадолго остановились у воды. На другом берегу зажглись первые окна.',
  'В субботу библиотека открылась раньше обычного. Я выбрал книгу о путешествиях, нашёл свободное место у окна и незаметно провёл за чтением целый час.',
  'Утром в мастерской пахло деревом и свежим кофе. Мастер разложил инструменты, проверил чертёж и принялся за работу. К обеду новая полка была готова.',
  'Мы решили пройти последнюю часть пути пешком. Дорога шла через сосновый лес, затем спускалась к озеру. Возле старого причала стояла маленькая лодка.',
  'Перед встречей я перечитал заметки и оставил только важное. Короткий список помог обсудить каждый вопрос спокойно. После разговора у всех был понятный план.',
  'На кухне тихо работало радио. Пока закипал чайник, я нарезал хлеб и достал варенье. За открытым окном дворник собирал первые осенние листья.',
  'Хороший рассказ начинается с наблюдения. Иногда достаточно услышать разговор в поезде или заметить необычную деталь на знакомой улице, чтобы появилась новая история.',
  'Сад менялся каждый день. В начале недели появились маленькие бутоны, а к выходным дерево покрылось белыми цветами. Мы поставили скамейку в его тени.',
  'Новый маршрут оказался короче, чем мы ожидали. От станции до музея можно было дойти за десять минут. По пути нашлось небольшое кафе с вкусной выпечкой.',
  'Я закрыл лишние вкладки и вернулся к тексту. Теперь мысль было проще удержать. Сначала появился короткий абзац, затем ещё один, и к вечеру работа была закончена.',
  'Вечером мы собрали друзей за большим столом. Каждый принёс что-нибудь к ужину. Разговор переходил от новых книг к планам на лето, а часы шли незаметно.',
  'Поезд прибыл точно по расписанию. На платформе было прохладно, но солнце уже освещало крыши домов. Я убрал билет в карман и направился к выходу.',
  'Небольшие привычки помогают учиться. Несколько минут спокойной практики оставляют больше сил, чем попытка сделать всё сразу. Главное, чтобы следующий шаг был понятен.',
  'Редактор предложил убрать длинное вступление. Мы начали сразу с события, сократили повторения и уточнили последние строки. После правок текст стал живее и яснее.',
  'В походе особенно ценишь простые вещи: сухие носки, горячий чай и ровное место для палатки. Под вечер ветер стих, и на небе одна за другой появились звёзды.',
  'Старый фотоаппарат хранился в шкафу много лет. Я осторожно протёр объектив и открыл инструкцию. Оказалось, что для первого снимка нужно совсем немного настроек.',
  'В комнате стало светлее, когда мы переставили письменный стол к окну. На свободной стене повесили карту. Теперь здесь приятно работать и строить планы.',
  'На рынке продавали спелые яблоки, мёд и лесные орехи. Мы выбрали продукты для пирога и вернулись домой другой дорогой. У подъезда нас встретил сосед с собакой.',
  'Любую сложную задачу легче начать с небольшого действия. Откройте документ, запишите вопрос и попробуйте объяснить его своими словами. Решение часто становится ближе.',
  'Первые посетители галереи остановились у большой картины. Художник изобразил пустую набережную перед рассветом. В мягком свете привычный город выглядел совсем иначе.',
];
const en = [
  'After the rain, the city grew quiet. We walked down to the river and stopped beside the water. Across the bank, the first lights appeared in the windows.',
  'The library opened early on Saturday. I chose a book about travel, found a comfortable seat by the window, and spent an hour reading without noticing the time.',
  'The workshop smelled of wood and fresh coffee. Before starting, the maker laid out the tools and checked the drawing. By lunchtime, the new shelf was ready.',
  'We decided to walk the last part of the route. The path led through a pine forest and down to a lake. A small wooden boat rested beside the old pier.',
  'Before the meeting, I read my notes and kept only the important points. A short list helped us discuss each question calmly. Everyone left with a clear plan.',
  'A radio played quietly in the kitchen. While the water boiled, I sliced some bread and found a jar of jam. Outside, someone was gathering the first fallen leaves.',
  'A good story often begins with a small observation. A conversation on a train or an unusual detail on a familiar street can be enough to suggest a new idea.',
  'The garden changed every day. Small buds appeared at the start of the week, and by Sunday the tree was covered in white flowers. We put a bench in its shade.',
  'The new route was shorter than we expected. It took ten minutes to walk from the station to the museum. On the way, we found a quiet cafe with fresh bread.',
  'I closed the extra tabs and returned to my writing. It was easier to follow the thought now. One short paragraph led to another, and the work was finished by evening.',
  'We invited friends to dinner around a large table. Everyone brought something to share. The conversation moved from books to summer plans, and the hours passed quickly.',
  'The train arrived exactly on time. The platform was cool, but sunlight had already reached the rooftops. I put the ticket in my pocket and walked towards the exit.',
  'Small habits make learning easier. A few minutes of careful practice can leave more energy than trying to do everything at once. It helps to know the next step.',
  'The editor suggested removing the long introduction. We started with the event, cut repeated phrases, and made the final lines clearer. The story felt more alive.',
  'On a long walk, simple things matter: dry socks, hot tea, and a level place for a tent. Towards evening, the wind dropped and stars appeared above the trees.',
  'The old camera had been in a cupboard for years. I cleaned the lens carefully and opened the manual. It turned out that the first picture needed very few settings.',
  'The room became brighter when we moved the desk beside the window. We hung a map on the empty wall. It was a good place to work, read, and make new plans.',
  'At the market, we found ripe apples, honey, and fresh nuts. We bought what we needed for a pie and took a different road home. A friendly dog greeted us at the door.',
  'A difficult task is easier to begin with one small action. Open a document, write down a question, and explain it in your own words. The answer may become clearer.',
  'The first visitors stopped in front of a large painting. It showed an empty street just before dawn. In the soft light, the familiar city looked completely different.',
];
export const CORPUS = { ru, en };
export const hash = (text) => {
  let h = 2166136261;
  for (const c of text) {
    h ^= c.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
};
const shuffle = (list) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
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
