'use strict';
/* Данные прототипа «Норматив».
   Нормативы ФСБ перенесены без изменений из старого проекта (fizo_fokus/js/norms-data.js).
   Источник: Правила приёма в Академию ФСБ России на 2026 год,
   приложение № 1 «Требования к уровню физической подготовки» и
   приложение № 2 «Таблица проверки уровня физической подготовки». */

/* Упражнения. higher — чем больше, тем лучше; time — время в секундах, показываем как м:сс; ex — пример ввода. */
const TESTS = {
  pullups: { name: 'Подтягивание на перекладине', short: 'Подтягивания', unit: 'раз', higher: true, decimals: 0, ex: '8' },
  pushups: { name: 'Сгибание и разгибание рук в упоре лёжа', short: 'Отжимания', unit: 'раз', higher: true, decimals: 0, ex: '30' },
  situps: { name: 'Поднимание туловища из положения лёжа на спине за 1 мин', short: 'Пресс за 1 мин', unit: 'раз', higher: true, decimals: 0, ex: '40' },
  pullupsLow: { name: 'Подтягивание из виса лёжа на низкой перекладине 90 см', short: 'Низкая перекладина', unit: 'раз', higher: true, decimals: 0, ex: '15' },
  kettlebell16: { name: 'Рывок гири 16 кг', short: 'Рывок гири 16 кг', unit: 'раз', higher: true, decimals: 0, ex: '20' },
  jump: { name: 'Прыжок в длину с места толчком двумя ногами', short: 'Прыжок в длину', unit: 'см', higher: true, decimals: 0, ex: '210' },
  sitreach: { name: 'Наклон вперёд из положения стоя на гимнастической скамье', short: 'Наклон вперёд', unit: 'см', higher: true, decimals: 0, signed: true, ex: '+8' },
  throw: { name: 'Метание спортивного снаряда', short: 'Метание', unit: 'м', higher: true, decimals: 0, ex: '30' },
  run30: { name: 'Бег на 30 м', short: 'Бег 30 м', unit: 'сек', higher: false, decimals: 1, ex: '5,4' },
  shuttle: { name: 'Челночный бег 3×10 м', short: 'Челнок 3×10', unit: 'сек', higher: false, decimals: 1, ex: '8,0' },
  run2000: { name: 'Бег на 2 км', short: 'Бег 2 км', unit: 'мин:сек', higher: false, decimals: 0, time: true, ex: '10:30' },
  ski: { name: 'Бег на лыжах 3 км', short: 'Лыжи 3 км', unit: 'мин:сек', higher: false, decimals: 0, time: true, ex: '18:30' },
  swim: { name: 'Плавание 50 м', short: 'Плавание 50 м', unit: 'мин:сек', higher: false, decimals: 0, time: true, ex: '0:55' },
  kettlePush2x24: { name: 'Толчок двух гирь по 24 кг', short: 'Толчок 2 гирь 24 кг', unit: 'раз', higher: true, decimals: 0, ex: '10' },
  benchPress: { name: 'Жим штанги (условия — по приказу)', short: 'Жим штанги', unit: 'раз', higher: true, decimals: 0, ex: '10' },
  trunkBends: { name: 'Наклоны туловища вперёд из положения лёжа на спине', short: 'Наклоны туловища', unit: 'раз', higher: true, decimals: 0, ex: '40' },
  kneeJumps2: { name: 'Прыжки из положения стоя на колене со сменой ног (не более 2 мин)', short: 'Прыжки с колена, 2 мин', unit: 'раз', higher: true, decimals: 0, ex: '50' },
  pushups2: { name: 'Сгибание и разгибание рук в упоре лёжа (не более 2 мин)', short: 'Отжимания, 2 мин', unit: 'раз', higher: true, decimals: 0, ex: '50' },
  situps2: { name: 'Наклоны туловища вперёд из положения лёжа на спине (не более 2 мин)', short: 'Наклоны, 2 мин', unit: 'раз', higher: true, decimals: 0, ex: '50' },
  burpees2: { name: 'Выпрыгивания из упора присев в упор лёжа и обратно (не более 2 мин)', short: 'Выпрыгивания, 2 мин', unit: 'раз', higher: true, decimals: 0, ex: '50' },
  kettlePress24: { name: 'Жим гири 24 кг', short: 'Жим гири 24 кг', unit: 'раз', higher: true, decimals: 0, ex: '20' },
  ksu: { name: 'Комплексное силовое упражнение', short: 'КСУ', unit: 'раз', higher: true, decimals: 0, ex: '30' },
  run60: { name: 'Бег на 60 м', short: 'Бег 60 м', unit: 'сек', higher: false, decimals: 1, ex: '8,6' },
  run100: { name: 'Бег на 100 м', short: 'Бег 100 м', unit: 'сек', higher: false, decimals: 1, ex: '14,6' },
  shuttle10: { name: 'Челночный бег 10×10 м', short: 'Челнок 10×10', unit: 'сек', higher: false, decimals: 1, ex: '27,5' },
  shuttle4x20: { name: 'Челночный бег 4×20 м', short: 'Челнок 4×20', unit: 'сек', higher: false, decimals: 1, ex: '18,5' },
  run1000: { name: 'Бег на 1 км', short: 'Бег 1 км', unit: 'мин:сек', higher: false, decimals: 0, time: true, ex: '3:50' },
  run3000: { name: 'Бег на 3 км', short: 'Бег 3 км', unit: 'мин:сек', higher: false, decimals: 0, time: true, ex: '13:30' },
  run5000: { name: 'Бег (кросс) на 5 км', short: 'Кросс 5 км', unit: 'мин:сек', higher: false, decimals: 0, time: true, ex: '24:00' },
  ski5: { name: 'Бег на лыжах 5 км', short: 'Лыжи 5 км', unit: 'мин:сек', higher: false, decimals: 0, time: true, ex: '28:00' },
  swim100: { name: 'Плавание 100 м', short: 'Плавание 100 м', unit: 'мин:сек', higher: false, decimals: 0, time: true, ex: '1:45' }
};

/* Физические качества — «слоты» проверки: в каждом сдаётся одно упражнение на выбор. */
const QUALITY_LABELS = {
  strength: 'Сила',
  speed: 'Быстрота',
  endurance: 'Выносливость',
  'strength-speed': 'Сила или быстрота',
  one: 'Одно упражнение'
};
const slot = (id, options) => ({ id, label: QUALITY_LABELS[id], options });
const yearsWord = n => {
  const a = n % 100, b = n % 10;
  if (a > 10 && a < 20) return 'лет';
  if (b === 1) return 'год';
  return b > 1 && b < 5 ? 'года' : 'лет';
};
const ageLabel = (from, to) => {
  if (to >= 100) return `${from} лет и старше`;
  if (from <= 0) return `до ${to + 1} лет`;
  return `${from}–${to} ${yearsWord(to)}`;
};

/* ============================= ГТО ============================= */
/* Структура ступеней по приказу Минспорта № 117: пункты испытаний (в каждом — одно упражнение на выбор),
   обязательные и по выбору. keys — что сайт умеет отслеживать (есть пороги в таблице),
   other — варианты из приказа, которых на сайте пока нет. */
const GTO_ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII'];
const GTO_LEVELS = ['bronze', 'silver', 'gold'];
const GTO_LEVEL_NAMES = { none: 'нет', bronze: 'бронза', silver: 'серебро', gold: 'золото' };

/* Сколько испытаний нужно для знака [бронза, серебро, золото]. */
const gtoNeed = stage => (stage === 1 ? [5, 5, 5] : stage <= 11 ? [5, 5, 6] : [4, 4, 5]);

function gtoRows(stage, sex) {
  const m = sex === 'male';
  const R = (mandatory, keys, other = '') => ({ mandatory, keys, other });
  const kidsStrength = m ? ['pullups', 'pullupsLow', 'pushups'] : ['pullupsLow', 'pushups'];
  const adultStrength = m ? ['pullups', 'pullupsLow', 'pushups', 'kettlebell16'] : ['pullupsLow', 'pushups'];
  if (stage === 1) return [
    R(true, ['run30'], 'бег 10 м'),
    R(true, [], 'шестиминутный бег, ходьба на лыжах, смешанное передвижение'),
    R(true, ['jump'], 'бросок набивного мяча, поднимание туловища за 30 с'),
    R(true, ['sitreach']),
    R(false, ['shuttle'], 'метание теннисного мяча в цель'),
    R(false, [], 'плавание')
  ];
  if (stage === 2) return [
    R(true, ['run30']),
    R(true, [], 'смешанное передвижение 1 км, бег на лыжах 1 км'),
    R(true, kidsStrength),
    R(true, ['sitreach']),
    R(false, ['jump', 'situps']),
    R(false, ['shuttle'], 'метание теннисного мяча в цель'),
    R(false, [], 'плавание 25 м')
  ];
  if (stage <= 5) {
    const endurance = stage === 3
      ? R(true, ['run1000'], 'бег на лыжах 1 км, кросс 2 км')
      : stage === 4
        ? R(true, [], 'бег 1500 м, бег на лыжах 2 км, кросс 3 км')
        : R(true, ['run2000', 'ski'], 'кросс 3 км');
    const extra = stage === 3 ? '' : stage === 4 ? 'стрельба, туристский поход' : 'стрельба, самозащита, туристский поход';
    return [
      R(true, stage === 3 ? ['run30'] : ['run30', 'run60']),
      endurance,
      R(true, kidsStrength),
      R(true, ['sitreach']),
      R(false, ['shuttle']),
      R(false, ['jump', 'situps']),
      R(false, ['throw', 'swim'], extra)
    ];
  }
  if (stage <= 9) return [
    R(true, ['run60', 'run100']),
    m ? R(true, ['run3000', 'ski5'], 'кросс 5 км') : R(true, stage >= 8 ? ['run1000', 'run2000', 'ski'] : ['run2000', 'ski'], 'кросс 3 км'),
    R(true, m ? ['pullups', 'kettlebell16', 'pushups'] : ['pullupsLow', 'pushups']),
    R(true, ['sitreach']),
    R(false, ['jump', 'situps']),
    R(false, ['throw', 'swim'], 'стрельба, самозащита, туристский поход')
  ];
  if (stage <= 11) return [
    R(true, ['run60']),
    m ? R(true, ['run1000', 'run3000', 'ski5'], 'кросс 5 км') : R(true, ['run1000', 'run2000', 'ski'], 'кросс 3 км'),
    R(true, adultStrength),
    R(true, ['sitreach']),
    R(false, ['jump', 'situps']),
    R(false, ['throw', 'swim'], 'стрельба, туристский поход')
  ];
  if (stage <= 15) {
    const nordic = stage >= 14 ? 'скандинавская ходьба 3 км, ' : '';
    const first = m
      ? R(true, ['run1000', 'run2000', 'ski5'], nordic + 'кросс 3 км')
      : R(true, ['run1000', 'run2000'], nordic + 'бег на лыжах 2 км, кросс 2 км');
    return stage <= 13
      ? [first, R(true, adultStrength), R(true, ['sitreach']), R(false, ['run60']), R(false, ['situps']), R(false, ['swim'], 'стрельба, туристский поход')]
      : [first, R(true, adultStrength), R(true, ['sitreach']), R(false, ['situps']), R(false, ['swim'], 'стрельба, туристский поход')];
  }
  return [
    R(true, [], 'смешанное передвижение, скандинавская ходьба, передвижение на лыжах'),
    R(true, [], stage === 18 ? 'сгибание рук в упоре о сиденье стула' : 'сгибание рук в упоре о гимнастическую скамью'),
    R(true, ['sitreach']),
    R(false, ['situps']),
    R(false, [], 'плавание 25 м, смешанное передвижение по пересечённой местности')
  ];
}

/* Подпись пункта: что он проверяет (для обязательных) или «По выбору». */
function gtoRowLabel(keys, mandatory, other = '') {
  if (!mandatory) return 'По выбору';
  const first = keys[0];
  if (['run30', 'run60', 'run100'].includes(first)) return 'Быстрота';
  if (['run1000', 'run2000', 'run3000', 'ski', 'ski5'].includes(first)) return 'Выносливость';
  if (['pullups', 'pullupsLow', 'pushups', 'kettlebell16', 'jump', 'situps'].includes(first)) return 'Сила';
  if (first === 'sitreach') return 'Гибкость';
  if (/бег|ходьба|передвижение/.test(other)) return 'Выносливость';
  if (/сгибание|отжим/.test(other)) return 'Сила';
  return 'Испытание';
}

const gtoGroup = (sex, age) => GTO_NORMS.find(x => x.sex === sex && age >= x.ageFrom && age <= x.ageTo) || null;

/* ============================= ФСО ============================= */
/* Академия ФСО России, гражданская молодёжь (юноши): информационный лист ФСО России «Информация об условиях
   и порядке приёма в Академию ФСО России» (Центр спецсвязи ФСО в Тюменской обл., без даты).
   Состав упражнений и правило «зачтено по всем трём» — Правила приёма в Академию ФСО в 2026 году, п. 44.
   b — «удовлетворительно», s — «хорошо», g — «отлично». */
const FSO_NORMS = {
  pullups: { b: 7, s: 9, g: 11 },
  run100: { b: 14.8, s: 14.2, g: 13.6 },
  run3000: { b: 810, s: 765, g: 720 }
};

/* ============================= СОБР и ОМОН ============================= */
/* Приказ Росгвардии от 11.10.2017 № 431 (ред. от 24.05.2021), приложение № 2, раздел III — минимальные результаты
   для граждан, желающих служить в СОБР и ОМОН. null — для этого возраста упражнение не предусмотрено.
   two — четыре упражнения «за время, не превышающее 2 мин». */
const SOBR_NORMS = {
  maleAges: [[0, 29], [30, 34], [35, 39], [40, 44], [45, 49], [50, 54], [55, 120]],
  femaleAges: [[0, 24], [25, 29], [30, 34], [35, 39], [40, 44], [45, 120]],
  sobr: {
    pullups: [18, 16, 12, 9, 8, 6, 5],
    pushups: [null, null, 50, 45, 40, 30, 20],
    kettlePush2x24: [null, null, 11, 8, 7, 6, 5],
    benchPress: [10, 9, null, null, null, null, null],
    run100: [13, 14.2, 14.8, 16, 17, 18, 19],
    run1000: [null, null, null, null, 245, 305, 335],
    run3000: [null, null, 830, 885, null, null, null],
    run5000: [1290, 1410, null, null, null, null, null],
    two: [60, 60, 50, 45, 40, 30, 20]
  },
  omon: {
    pullups: [16, 14, 11, 9, 8, 6, 5],
    pushups: [null, null, 45, 40, 35, 30, 20],
    kettlePush2x24: [null, null, 11, 8, 7, 6, 5],
    run100: [13.2, 14.2, 14.8, 16, 17, 18, 19],
    shuttle10: [25.5, 27.5, 28.5, 31, 34, 37, 40],
    run1000: [null, null, null, null, 245, 305, 335],
    run3000: [720, 740, 830, 885, null, null, null],
    two: [55, 50, 45, 40, 35, 30, 20]
  },
  female: {
    pushups: [18, 17, 16, 15, 14, 12],
    trunkBends: [43, 37, 33, 29, 25, 21],
    run100: [16.6, 17.2, null, null, null, null],
    run60: [null, null, 10.7, 10.9, 11.5, null],
    shuttle10: [34, 35, 38, 40, 44, 48],
    run1000: [240, 260, 280, 300, 320, 340]
  }
};

/* Цель «с запасом»: повторений больше на margin, время меньше на margin × 0,3 (бег быстрее на 10% — это очень много). */
const SOBR_MARGINS = [
  { id: 0, label: 'Ровно норматив', hint: 'Цель — минимальные результаты из приказа' },
  { id: 0.1, label: 'С запасом', hint: 'На 10% больше повторений и на 3% быстрее, чтобы сдать даже в плохой день' },
  { id: 0.2, label: 'С большим запасом', hint: 'На 20% больше повторений и на 6% быстрее' }
];

function withMargin(key, value, margin) {
  const t = TESTS[key];
  if (t.higher) return Math.ceil(value * (1 + margin));
  const v = value * (1 - margin * 0.3);
  if (t.time) return Math.floor(v / 5) * 5;
  return Math.floor(v * 10) / 10;
}

function sobrRequirement(sex, age, unit, goal = {}) {
  const male = sex === 'male';
  const ages = male ? SOBR_NORMS.maleAges : SOBR_NORMS.femaleAges;
  const g = ages.findIndex(([a, b]) => age >= a && age <= b);
  if (g < 0) return null;
  const t = male ? SOBR_NORMS[unit === 'omon' ? 'omon' : 'sobr'] : SOBR_NORMS.female;
  const mk = (id, label, keys) => {
    const options = keys.filter(k => t[k] && t[k][g] != null);
    if (!options.length) return null;
    return { id, label, mandatory: true, options, thr: Object.fromEntries(options.map(k => [k, { b: t[k][g] }])) };
  };
  let slots;
  if (male) {
    slots = [
      mk('r1', 'Сила', ['pullups', 'pushups', 'kettlePush2x24']),
      mk('r2', 'Сила', ['benchPress']),
      mk('r3', 'Быстрота', ['run100']),
      mk('r4', 'Быстрота и ловкость', ['shuttle10']),
      mk('r5', 'Выносливость', ['run1000', 'run3000', 'run5000']),
      ...['kneeJumps2', 'pushups2', 'situps2', 'burpees2'].map((k, i) => ({
        id: 'c' + (i + 1), label: 'За 2 минуты', mandatory: true, options: [k], thr: { [k]: { b: t.two[g] } }
      }))
    ];
  } else {
    slots = [
      mk('r1', 'Сила', ['pushups', 'trunkBends']),
      mk('r2', 'Быстрота', ['run100', 'run60', 'shuttle10']),
      mk('r3', 'Выносливость', ['run1000'])
    ];
  }
  slots = slots.filter(Boolean);
  const n = slots.length;
  const margin = Number(goal.margin) || 0;
  if (margin) {
    slots.forEach(s => s.options.forEach(k => { s.thr[k] = { ...s.thr[k], s: withMargin(k, s.thr[k].b, margin) }; }));
  }
  return {
    kind: 'levels',
    group: ageLabel(ages[g][0], ages[g][1]),
    target: margin ? 'silver' : 'bronze',
    levels: margin ? ['bronze', 'silver'] : ['bronze'],
    levelNames: { bronze: 'выполнен', silver: 'с запасом' },
    levelCols: { bronze: 'Норматив', silver: 'Цель' },
    noneName: 'не выполнен',
    summaryLabel: 'Норматив',
    unitWord: ['упражнение', 'упражнения', 'упражнений'],
    need: { bronze: n, silver: n },
    needText: `выполнить норматив в каждом из ${n} упражнений` + (margin ? ` (цель — ${margin === 0.2 ? 'с большим запасом' : 'с запасом'})` : ''),
    footText: 'Пороги — минимальные результаты из приказа Росгвардии № 431 (приложение № 2, раздел III) для твоего возраста. ' +
      'В приказе не сказано, все ли упражнения сдаются и выполняются ли упражнения «за 2 минуты» подряд — сайт считает, что нужно выполнить каждое.',
    slots
  };
}

/* Таблица баллов: [баллы, порог результата]. requirements: min — минимум за каждое упражнение, sum3 — сумма за три. */
const FSB_NORMS = {
  scales: {
    male: {
      pullups: [[100,30],[98,29],[96,28],[94,27],[92,26],[90,25],[88,24],[86,23],[84,22],[82,21],[80,20],[78,19],[76,18],[73,17],[70,16],[66,15],[62,14],[58,13],[54,12],[50,11],[46,10],[42,9],[38,8],[34,7],[30,6],[25,5]],
      run100: [[100,11.8],[98,11.9],[96,12],[94,12.1],[92,12.2],[90,12.3],[88,12.4],[86,12.5],[84,12.6],[82,12.7],[80,12.8],[78,12.9],[76,13],[74,13.1],[72,13.2],[69,13.3],[66,13.4],[63,13.5],[60,13.6],[57,13.7],[54,13.8],[51,13.9],[48,14],[46,14.1],[44,14.2],[42,14.3],[40,14.4],[38,14.5],[36,14.6],[34,14.7],[32,14.8],[31,14.9],[30,15],[29,15.1],[28,15.2],[27,15.3],[26,15.4],[25,15.6],[24,15.8]],
      run3000: [[100,585],[99,589],[98,593],[97,597],[96,601],[95,605],[94,609],[93,613],[92,617],[91,621],[90,625],[89,629],[88,633],[87,637],[86,641],[85,645],[84,649],[83,653],[82,657],[81,661],[80,665],[79,670],[78,675],[77,680],[76,685],[75,690],[74,692],[73,694],[72,696],[71,698],[70,700],[69,702],[68,704],[67,706],[66,708],[65,710],[64,712],[63,714],[62,716],[61,718],[60,720],[59,726],[58,732],[57,738],[56,744],[55,750],[54,756],[53,762],[52,768],[51,774],[50,780],[49,786],[48,792],[47,798],[46,804],[45,810],[44,816],[43,822],[42,828],[41,834],[40,840],[39,845],[38,850],[37,855],[36,860],[35,865],[34,870],[33,875],[32,880],[31,885],[30,890],[29,895],[28,900],[27,905],[26,910],[25,915],[24,920]]
    },
    female: {
      ksu: [[100,46],[98,45],[96,44],[94,43],[92,42],[90,41],[88,40],[86,39],[83,38],[81,37],[79,36],[77,35],[75,34],[72,33],[68,32],[64,31],[60,30],[56,29],[52,28],[48,27],[43,26],[39,25],[35,24],[31,23],[28,22]],
      run100: [[100,14.8],[99,14.9],[97,15],[95,15.1],[93,15.2],[91,15.3],[89,15.4],[87,15.5],[85,15.6],[83,15.7],[81,15.8],[79,15.9],[77,16],[75,16.1],[72,16.2],[69,16.3],[66,16.4],[63,16.5],[60,16.6],[58,16.7],[56,16.8],[55,16.9],[53,17],[52,17.1],[51,17.2],[49,17.3],[48,17.4],[47,17.5],[46,17.6],[45,17.7],[44,17.8],[43,17.9],[41,18],[40,18.1],[38,18.2],[37,18.3],[36,18.4],[35,18.5],[33,18.6],[32,18.7],[31,18.8],[30,18.9],[29,19],[28,19.2],[27,19.4],[26,19.6]],
      run1000: [[100,220],[99,221],[98,222],[97,223],[96,224],[94,225],[92,226],[90,227],[88,228],[86,229],[84,230],[82,231],[80,232],[78,233],[76,234],[74,235],[72,236],[69,237],[66,238],[63,239],[60,240],[59,242],[58,244],[57,247],[56,250],[55,253],[54,256],[53,259],[52,262],[51,265],[50,267],[49,269],[48,271],[47,273],[46,275],[45,277],[44,279],[43,281],[42,283],[41,285],[40,287],[39,289],[38,291],[37,293],[36,295],[35,297],[34,299],[33,301],[32,303],[31,305],[30,307],[29,309],[28,310],[27,315],[26,320]]
    }
  },
  requirements: [
    { sex: 'male', ageFrom: 0, ageTo: 19, min: 30, sum3: 120 },
    { sex: 'male', ageFrom: 20, ageTo: 24, min: 30, sum3: 180 },
    { sex: 'female', ageFrom: 0, ageTo: 19, min: 28, sum3: 110 },
    { sex: 'female', ageFrom: 20, ageTo: 24, min: 28, sum3: 140 }
  ]
};

/* Ведомства для анкеты. available: false — официальные нормативы ещё не добавлены, в анкете «скоро».
   requirement(пол, возраст, категория) → { group, min, sum, slots }:
   min — минимум баллов в каждом упражнении (0 — не требуется), sum — нужная сумма баллов,
   slots — какие качества сдаются и какие упражнения можно выбрать в каждом. */
const SYSTEMS = [
  {
    id: 'fsb', short: 'ФСБ', name: 'Академия ФСБ России', sub: 'Академия · поступление',
    chip: 'ФСБ · поступление в Академию', context: 'поступление', available: true,
    emblem: 'assets/emblems/fsb.png', ageMin: 14, ageMax: 24,
    source: {
      title: 'Правила приёма в Академию ФСБ России на 2026 год, приложения № 1 и № 2',
      url: 'https://web.archive.org/web/20260808165948/http://www.academy.fsb.ru/info/pravila-priyema/pravila-priema-v-akademiyu-fsb-rossii-na-obuchenie-po-programmam-bakalavriata-i-programmam-spetsiali/'
    },
    note: 'Неофициальный тренажёр, сайт не связан с ФСБ России. Условия проверки уточняй в действующих правилах приёма.',
    scale: (key, sex) => (FSB_NORMS.scales[sex] || {})[key] || null,
    requirement(sex, age) {
      const r = FSB_NORMS.requirements.find(x => x.sex === sex && age >= x.ageFrom && age <= x.ageTo);
      if (!r) return null;
      return {
        group: r.ageFrom === 0 ? 'до 20 лет' : '20–24 года',
        min: r.min,
        sum: r.sum3,
        slots: sex === 'female'
          ? [slot('strength', ['ksu']), slot('speed', ['run100']), slot('endurance', ['run1000'])]
          : [slot('strength', ['pullups']), slot('speed', ['run100']), slot('endurance', ['run3000'])]
      };
    }
  },
  {
    id: 'fso', short: 'ФСО', name: 'Академия ФСО России', sub: 'Академия · поступление',
    chip: 'ФСО · поступление в Академию', context: 'поступление', available: true, kind: 'levels',
    emblem: 'assets/emblems/fso.png', ageMin: 16, ageMax: 24,
    source: {
      title: 'Правила приёма в Академию ФСО России в 2026 году (п. 44) и информационный лист ФСО России о приёме в Академию',
      url: 'https://www.abiturient76.ru/upload/medialibrary/0ee/epk3km2du3vk7wk9gxufzake1cr6t04j.pdf'
    },
    note: 'Неофициальный тренажёр, сайт не связан с ФСО России. Пороги — из информационного листа ФСО без даты; актуальные значения уточни в подразделении ФСО по набору.',
    goalKind: 'category',
    categoryQuestion: 'На какую оценку целишься?',
    categories: [
      { id: 'bronze', label: 'Зачёт — «удовлетворительно»', hint: 'Минимум для поступления: все три упражнения не ниже «удовлетворительно»' },
      { id: 'silver', label: '«Хорошо»', hint: 'Все три упражнения на «хорошо» или лучше' },
      { id: 'gold', label: '«Отлично»', hint: 'Все три упражнения на «отлично»' }
    ],
    unavailableText: sex => (sex === 'female'
      ? 'Девушки сдают комплексное силовое упражнение, бег 100 м и 1 км, но минимальные значения для них в открытом доступе не найдены — уточни в подразделении ФСО по набору.'
      : 'Для этого возраста нормативов нет.'),
    requirement(sex, age, target = 'bronze') {
      if (sex !== 'male') return null;
      const slots = [['strength', 'pullups'], ['speed', 'run100'], ['endurance', 'run3000']]
        .map(([id, k]) => ({ ...slot(id, [k]), mandatory: true, thr: { [k]: FSO_NORMS[k] } }));
      const names = { bronze: 'удовлетворительно', silver: 'хорошо', gold: 'отлично' };
      return {
        kind: 'levels',
        group: 'гражданская молодёжь',
        target,
        levels: GTO_LEVELS,
        levelNames: names,
        levelCols: { bronze: 'Удовл.', silver: 'Хорошо', gold: 'Отлично' },
        noneName: 'не сдано',
        summaryLabel: 'Оценка сейчас',
        unitWord: ['упражнение', 'упражнения', 'упражнений'],
        need: { bronze: 3, silver: 3, gold: 3 },
        needText: `все три упражнения не ниже «${names[target]}»`,
        footText: 'Пороги — из информационного листа ФСО России для гражданской молодёжи. «Зачтено» ставится, когда все три упражнения сданы не ниже «удовлетворительно».',
        slots
      };
    }
  },
  {
    id: 'mvd', short: 'МВД', name: 'МВД России', sub: 'Поступление на службу',
    chip: 'МВД · поступление на службу', context: 'поступление на службу', available: true,
    emblem: 'assets/emblems/mvd.png', ageMin: 18, ageMax: 60,
    source: {
      title: 'Приказ МВД России от 05.05.2018 № 275 (ред. от 10.01.2022), пункты 198 и 200',
      url: 'https://legalacts.ru/doc/prikaz-mvd-rossii-ot-05052018-n-275-ob-utverzhdenii/'
    },
    note: 'Неофициальный тренажёр, сайт не связан с МВД России. Какие упражнения засчитываются для твоей должности, уточни в отделе кадров.',
    categoryQuestion: 'На какую должность поступаешь?',
    categories: [
      { id: 'police', label: 'Полиция, 1–3 группы', hint: 'Сумма баллов за 2 упражнения: сила и быстрота' },
      { id: 'special', label: 'Спецподразделения', hint: 'Сумма за 3 упражнения: отряды спецназначения по контролю за оборотом наркотиков, отделы физзащиты' },
      { id: 'other', label: 'Другие должности', hint: 'Не полиция или полиция 4-й группы: баллы в одном упражнении' }
    ],
    scale: (key, sex) => (MVD_NORMS.scales[sex] || {})[key] || null,
    requirement(sex, age, category = 'police') {
      const r = (MVD_NORMS.candidate[sex] || []).find(x => age >= x.ageFrom && age <= x.ageTo);
      if (!r) return null;
      const female = sex === 'female';
      const strength = female ? ['pushups', 'situps'] : ['pullups', 'pushups', 'kettlePress24'];
      const speed = female ? ['shuttle10'] : ['shuttle10', 'shuttle4x20'];
      const endurance = female ? ['run1000', 'ski5', 'swim100'] : ['run5000', 'ski5', 'swim100'];
      const group = ageLabel(r.ageFrom, r.ageTo);
      if (category === 'special') {
        return { group, min: 0, sum: r.sum3, slots: [slot('strength', strength), slot('speed', speed), slot('endurance', endurance)] };
      }
      if (category === 'other') {
        return { group, min: r.one, sum: r.one, slots: [slot('one', [...strength, ...speed])] };
      }
      return { group, min: 0, sum: r.sum2, slots: [slot('strength', strength), slot('speed', speed)] };
    }
  },
  {
    id: 'mo', short: 'МО', name: 'Министерство обороны', sub: 'Служба по контракту',
    chip: 'МО · служба по контракту', context: 'поступление на контракт', available: true,
    emblem: 'assets/emblems/mo.png', ageMin: 18, ageMax: 65,
    source: {
      title: 'Наставление по физической подготовке в ВС РФ (приказ МО РФ от 20.04.2023 № 230), п. 124 и приложение № 13',
      url: 'https://legalacts.ru/doc/prikaz-ministra-oborony-rf-ot-20042023-n-230-ob/'
    },
    note: 'Требования сверены с исходной редакцией Наставления 2023 года; в 2025 году в него вносились изменения — уточни требования в пункте отбора на военную службу по контракту. Плавание и часть упражнений на выбор (подъём переворотом, рывок гири, бег 400 м) пока не поддерживаются.',
    scale(key, sex, age) {
      const s = MO_NORMS.scales[key];
      if (!s) return null;
      return age >= 35 && s.o35 ? s.o35 : s.u35;
    },
    requirement(sex, age) {
      const row = (MO_NORMS.candidate[sex] || []).find(([range]) => age >= range[0] && age <= range[1]);
      if (!row) return null;
      const [range, min, sum2, sum3] = row;
      const speed = ['run60', 'run100', 'shuttle10'];
      let slots;
      let sum;
      if (sex === 'female') {
        if (age < 45) { slots = [slot('strength', ['pushups', 'situps']), slot('speed', speed), slot('endurance', ['run1000'])]; sum = sum3; }
        else { slots = [slot('strength-speed', ['pushups', 'situps', ...speed]), slot('endurance', ['run1000'])]; sum = sum2; }
      } else if (age < 50) {
        slots = [slot('strength', age < 25 ? ['pullups'] : ['pullups', 'pushups']), slot('speed', speed), slot('endurance', ['run1000', 'run3000'])];
        sum = sum3;
      } else {
        slots = [slot('strength-speed', ['pullups', 'pushups', ...speed]), slot('endurance', ['run1000', 'run3000'])];
        sum = sum2;
      }
      return { group: ageLabel(range[0], range[1]), min, sum, slots };
    }
  },
  { id: 'rosgvardia', short: 'РГ', name: 'Росгвардия', available: false },
  {
    id: 'sobr', short: 'СОБР', name: 'СОБР и ОМОН', sub: 'Росгвардия · спецотряды',
    chip: 'Росгвардия · СОБР и ОМОН', context: 'отбор в спецподразделения', available: true, kind: 'levels',
    emblem: 'assets/emblems/sobr.png', ageMin: 18, ageMax: 60,
    source: {
      title: 'Приказ Росгвардии от 11.10.2017 № 431 (ред. от 24.05.2021), приложение № 2, раздел III',
      url: 'https://legalacts.ru/doc/prikaz-rosgvardii-ot-11102017-n-431-ob-utverzhdenii-kvalifikatsionnykh/'
    },
    note: 'Неофициальный тренажёр, сайт не связан с Росгвардией. Порядок сдачи и условия упражнений (например, вес штанги) приказ не описывает — уточни в отделе кадров.',
    categoryQuestion: 'В какое подразделение?',
    categories: [
      { id: 'sobr', label: 'СОБР', hint: 'Специальный отряд быстрого реагирования' },
      { id: 'omon', label: 'ОМОН', hint: 'Отряд мобильный особого назначения' }
    ],
    goalKind: 'margin',
    requirement: (sex, age, unit = 'sobr', goal = {}) => sobrRequirement(sex, age, unit, goal)
  },
  {
    id: 'gto', short: 'ГТО', name: 'Комплекс ГТО', sub: 'Знаки отличия',
    chip: 'ГТО · знаки отличия', context: 'знаки отличия', available: true, kind: 'levels',
    emblem: 'assets/emblems/gto.png', ageMin: 6, ageMax: 100,
    source: {
      title: 'Приказ Минспорта России от 22.02.2023 № 117 «Об утверждении государственных требований ВФСК ГТО»',
      url: 'https://legalacts.ru/doc/prikaz-minsporta-rossii-ot-22022023-n-117-ob-utverzhdenii/'
    },
    note: 'Неофициальный тренажёр. Знак присваивается по итогам сдачи в центре тестирования ГТО — правила и запись на gto.ru. Стрельба, самозащита, туристский поход, кросс и ещё несколько испытаний на сайте пока не отслеживаются.',
    goalKind: 'category',
    categoryQuestion: 'Какой знак хочешь получить?',
    categories: [
      { id: 'gold', label: 'Золотой знак', hint: 'Испытания для знака — на уровень «золото»' },
      { id: 'silver', label: 'Серебряный знак', hint: 'Испытания для знака — на «серебро» или выше' },
      { id: 'bronze', label: 'Бронзовый знак', hint: 'Испытания для знака — на «бронзу» или выше' }
    ],
    thresholds(key, sex, age) {
      const g = gtoGroup(sex, age);
      return g && g.tests[key] ? g.tests[key] : null;
    },
    requirement(sex, age, target = 'gold') {
      const g = gtoGroup(sex, age);
      if (!g) return null;
      const need = gtoNeed(g.stage);
      const slots = gtoRows(g.stage, sex).map((r, i) => {
        const options = r.keys.filter(k => g.tests[k]);
        return {
          id: 'r' + (i + 1),
          label: gtoRowLabel(options, r.mandatory, r.other),
          mandatory: r.mandatory,
          options,
          other: r.other,
          thr: Object.fromEntries(options.map(k => [k, g.tests[k]])),
          names: Object.fromEntries(options.filter(k => g.tests[k].label).map(k => [k, g.tests[k].label]))
        };
      });
      return {
        kind: 'levels',
        stage: g.stage,
        group: `${GTO_ROMAN[g.stage]} ступень, ${ageLabel(g.ageFrom, g.ageTo)}`,
        target,
        need: { bronze: need[0], silver: need[1], gold: need[2] },
        slots
      };
    }
  }
];

/* Демо-данные: кнопка «Посмотреть на примере» в анкете. */
const DEMO_STATE = {
  version: 2,
  onboarded: true,
  demo: true,
  rain: true,
  system: 'fsb',
  category: null,
  choices: {},
  profile: { sex: 'male', age: 18 },
  exam: '2027-07-01',
  days: [0, 2, 4],
  planStart: null,
  results: {
    pullups: [
      { date: '2026-10-01', value: 4 },
      { date: '2026-10-25', value: 6 },
      { date: '2026-11-15', value: 7 }
    ],
    run100: [
      { date: '2026-10-01', value: 15.2 },
      { date: '2026-10-25', value: 14.9 },
      { date: '2026-11-15', value: 14.6 }
    ],
    run3000: [
      { date: '2026-10-01', value: 920 },
      { date: '2026-10-25', value: 895 },
      { date: '2026-11-15', value: 870 }
    ]
  }
};
