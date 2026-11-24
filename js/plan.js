'use strict';
/* План тренировок от сегодняшнего дня до даты проверки.
   Правила простые и прозрачные:
   - тренировки только в выбранные дни; в неделе чередуются обычная и лёгкая тренировка;
   - в остальные дни — отдых или лёгкая разминка (не больше двух разминок в неделю);
   - каждая 4-я неделя — разгрузочная: только лёгкие тренировки;
   - контрольный замер раз в 2 недели и прикидка за 7–12 дней до сдачи;
   - за 4 дня до сдачи — только лёгкая работа, накануне — отдых;
   - чаще тренируем упражнение, где баллов меньше всего. */
const Plan = (() => {
  const TYPES = {
    train: { label: 'Тренировка', short: 'Трен.', minutes: '50–60 мин' },
    light: { label: 'Лёгкая тренировка', short: 'Лёгкая', minutes: '30–40 мин' },
    warmup: { label: 'Разминка', short: 'Разминка', minutes: '20–30 мин' },
    test: { label: 'Контрольный замер', short: 'Замер', minutes: 'около часа' },
    rest: { label: 'Отдых', short: 'Отдых', minutes: '' },
    exam: { label: 'День сдачи', short: 'Сдача', minutes: '' }
  };
  const CATEGORY = {
    pullups: 'strength', pushups: 'strength', situps: 'strength', kettlePress24: 'strength', ksu: 'strength',
    pullupsLow: 'strength', kettlebell16: 'strength', kettlePush2x24: 'strength', benchPress: 'strength', trunkBends: 'strength',
    kneeJumps2: 'stamina', pushups2: 'stamina', situps2: 'stamina', burpees2: 'stamina',
    run30: 'speed', run60: 'speed', run100: 'speed', shuttle10: 'speed', shuttle4x20: 'speed', shuttle: 'speed', jump: 'speed', throw: 'speed',
    run1000: 'endurance', run2000: 'endurance', run3000: 'endurance', run5000: 'endurance', ski: 'endurance', ski5: 'endurance',
    swim: 'endurance', swim100: 'endurance',
    sitreach: 'flex'
  };
  const DEFAULT_WEEKS = 8;
  const VISIBLE_WEEKS = 4;

  let host = null;
  let handlers = {};
  let selectedIso = null;
  let expanded = false;

  /* Насколько упражнению «нужно внимание»: чем дальше до цели, тем больше. */
  function need(row) {
    return row.need != null ? row.need : 30;
  }

  /* ============================= Построение ============================= */

  function build(state, m) {
    if (!m.req || !m.rows.length) return null;
    const start = Core.parseDate(state.planStart || Core.today());
    const examDate = state.exam ? Core.parseDate(state.exam) : null;
    const hasExam = Boolean(examDate) && Core.diffDays(start, examDate) >= 1;
    const end = hasExam ? examDate : Core.addDays(start, DEFAULT_WEEKS * 7 - 1);
    const total = Core.diffDays(start, end);
    const trainDays = new Set(state.days && state.days.length ? state.days : [0, 2, 4]);
    const perWeek = trainDays.size;
    const startWd = Core.weekday(start);
    const longPlan = total >= 42;

    const rows = m.rows;
    const ranked = rows.slice().sort((a, b) => need(b, m) - need(a, m));
    /* Плавное взвешенное чередование: слабое упражнение попадает в фокус чаще, но не всегда. */
    const weights = rows.map(r => ({ key: r.key, w: 1 + need(r, m) / 10, cur: 0 }));
    const totalW = weights.reduce((s, x) => s + x.w, 0);
    const nextPrimary = () => {
      weights.forEach(x => { x.cur += x.w; });
      const best = weights.reduce((a, b) => (b.cur > a.cur ? b : a));
      best.cur -= totalW;
      return best.key;
    };
    let secondaryCount = 0;
    let lightCount = 0;
    const variants = {};

    const missing = rows.some(r => r.now == null);
    let pendingFirstTest = missing;
    let lastTest = missing ? -Infinity : 0;
    const days = [];
    let weekKey = -1, trainPos = 0, offPos = 0, warmups = 0;

    for (let i = 0; i <= total; i += 1) {
      const date = Core.addDays(start, i);
      const wd = Core.weekday(date);
      const week = Math.floor((i + startWd) / 7);
      if (week !== weekKey) { weekKey = week; trainPos = 0; offPos = 0; warmups = 0; }
      const left = total - i;
      const deload = longPlan && week % 4 === 3 && !(hasExam && left <= 14);
      const day = { iso: Core.isoDate(date), date, wd, week, left, hasExam, deload, type: 'rest', focus: [], variant: 0, taper: false, eve: false };

      if (hasExam && left === 0) {
        day.type = 'exam';
      } else if (hasExam && left === 1) {
        day.type = 'rest';
        day.eve = true;
      } else if (trainDays.has(wd)) {
        const finalCheck = hasExam && left >= 7 && left <= 12 && i - lastTest >= 8;
        if (pendingFirstTest || (left >= 7 && i - lastTest >= 14) || finalCheck) {
          day.type = 'test';
          day.focus = rows.map(r => r.key);
          lastTest = i;
          pendingFirstTest = false;
        } else if (hasExam && left <= 4) {
          day.type = 'light';
          day.taper = true;
        } else if (deload || (perWeek >= 3 && trainPos % 2 === 1)) {
          day.type = 'light';
        } else {
          day.type = 'train';
        }
        if (day.type === 'light') {
          day.focus = [ranked[lightCount % ranked.length].key];
          lightCount += 1;
        }
        if (day.type === 'train') {
          const primary = nextPrimary();
          const others = ranked.filter(r => r.key !== primary && CATEGORY[r.key] !== CATEGORY[primary]);
          const pool = others.length ? others : ranked.filter(r => r.key !== primary);
          const secondary = pool.length ? pool[secondaryCount % pool.length].key : null;
          secondaryCount += 1;
          day.focus = secondary ? [primary, secondary] : [primary];
          variants[primary] = (variants[primary] || 0) + 1;
          day.variant = variants[primary];
        }
        trainPos += 1;
      } else {
        const canWarm = perWeek < 6 && warmups < 2 && !(hasExam && left <= 4);
        if (canWarm && offPos % 2 === 1) {
          day.type = 'warmup';
          warmups += 1;
        }
        offPos += 1;
      }
      days.push(day);
    }

    /* Группировка по календарным неделям (пн–вс). */
    const weeks = [];
    days.forEach(d => {
      let w = weeks[weeks.length - 1];
      if (!w || w.week !== d.week) {
        const monday = Core.addDays(d.date, -d.wd);
        w = { week: d.week, n: weeks.length + 1, monday, slots: Array(7).fill(null), deload: false, exam: false };
        weeks.push(w);
      }
      w.slots[d.wd] = d;
      if (d.deload) w.deload = true;
      if (d.type === 'exam') w.exam = true;
    });

    return { start, end, hasExam, total, days, weeks, perWeek, trainDays: [...trainDays].sort((a, b) => a - b) };
  }

  /* ============================= Содержание дня ============================= */

  function work(key, mode, row, variant) {
    const now = row ? row.now : null;
    const target = row ? row.targetResult : null;
    const times = n => Core.plural(n, 'раз', 'раза', 'раз');
    switch (key) {
      case 'pullups': {
        const max = now != null ? now : 4;
        if (mode === 'train') {
          if (max <= 3) return 'Подтягивания: 5 подходов по 1–2 раза, 4 медленных опускания по 5 с, австралийские подтягивания 3×10';
          const a = Math.max(1, Math.round(max * 0.6));
          const b = Math.max(a, Math.round(max * 0.75));
          return `Подтягивания: 5 подходов по ${a}–${b} ${times(b)}, отдых 2 мин; в конце 3 медленных опускания по 5 с`;
        }
        const n = Math.max(1, Math.round(max * 0.5));
        return `Подтягивания: 3 подхода по ${n} ${times(n)} — чисто, без рывков; вис на перекладине 2×30 с`;
      }
      case 'pushups': {
        const max = now != null ? now : 20;
        const a = Math.max(3, Math.round(max * 0.6));
        const b = Math.max(a, Math.round(max * 0.75));
        return mode === 'train'
          ? `Отжимания: 5 подходов по ${a}–${b} ${times(b)}, отдых 1,5 мин; корпус прямой, грудь касается опоры`
          : `Отжимания: 3 подхода по ${Math.max(3, Math.round(max * 0.5))} ${times(Math.round(max * 0.5))} в спокойном темпе`;
      }
      case 'situps': {
        const max = now != null ? now : 30;
        return mode === 'train'
          ? `Пресс: 4 подхода по 40 с в темпе зачёта (≈${Math.round(max * 0.7)} ${times(Math.round(max * 0.7))}), отдых 1 мин; планка 3×40 с`
          : 'Пресс: 2 подхода по 30 с спокойно, планка 2×30 с';
      }
      case 'kettlePress24': {
        const max = now != null ? now : 10;
        const a = Math.max(2, Math.round(max * 0.6));
        const b = Math.max(a, Math.round(max * 0.75));
        return mode === 'train'
          ? `Жим гири 24 кг: 5 подходов по ${a}–${b} ${times(b)}, отдых 2–3 мин; техника — по описанию в приказе`
          : 'Жим гири: 3 лёгких подхода гирей полегче, отработка техники и дыхания';
      }
      case 'run60': {
        const goal = target != null ? ` (цель — ${Core.fmt('run60', target)} с)` : '';
        return mode === 'train'
          ? `Бег 60 м: беговые упражнения 10 мин, 6×30 м со старта, 3×60 м на 90% усилия${goal}, отдых 3 мин`
          : 'Бег 60 м: 4×30 м со старта, работа рук, отдых полный';
      }
      case 'shuttle10':
      case 'shuttle4x20': {
        const goal = target != null ? ` (цель — ${Core.fmt(key, target)} с)` : '';
        return mode === 'train'
          ? `Челночный бег: отработка разворотов 10 мин, 6 ускорений по 2 отрезка, 3 прохода дистанции на 90%${goal}, отдых 3 мин`
          : 'Челночный бег: спокойная отработка разворотов, 4 прохода по 2 отрезка';
      }
      case 'run5000': {
        const T = target || 1320;
        return mode === 'train'
          ? (variant % 2 === 1
            ? `Кросс 5 км: интервалы 4×1 км по ${Core.fmtSec(T / 5)} (темп цели), между ними 3 мин трусцой`
            : 'Кросс 5 км: длительный лёгкий бег 40–50 мин в разговорном темпе')
          : 'Кросс: лёгкий бег 25–30 мин';
      }
      case 'ski5': {
        const T = target || 1500;
        return mode === 'train'
          ? `Лыжи 5 км: 4×1 км по ${Core.fmtSec(T / 5)} (темп цели), отдых 3 мин; нет снега — бег по пересечённой местности`
          : 'Лыжи: спокойно 30–40 мин или лёгкий бег';
      }
      case 'swim100': {
        const T = target || 105;
        return mode === 'train'
          ? `Плавание 100 м: 8×25 м быстро (отдых 30 с), 4×50 м по ${Core.fmtSec(T / 2)} (темп цели), между ними 1 мин`
          : 'Плавание: спокойно 300–400 м, техника дыхания';
      }
      case 'pullupsLow': {
        const max = now != null ? now : 12;
        const a = Math.max(3, Math.round(max * 0.6));
        const b = Math.max(a, Math.round(max * 0.75));
        return mode === 'train'
          ? `Низкая перекладина: 5 подходов по ${a}–${b} ${times(b)}, отдых 1,5 мин; тело прямое, подбородок выше перекладины`
          : `Низкая перекладина: 3 подхода по ${Math.max(3, Math.round(max * 0.5))} ${times(Math.round(max * 0.5))} спокойно`;
      }
      case 'kettlebell16': {
        const max = now != null ? now : 16;
        const a = Math.max(4, Math.round(max * 0.5));
        const b = Math.max(a, Math.round(max * 0.65));
        return mode === 'train'
          ? `Рывок гири 16 кг: 5 подходов по ${a}–${b} ${times(b)} (поровну на каждую руку), отдых 2–3 мин; технику лучше ставить с тренером`
          : 'Рывок гири: 3 лёгких подхода, отработка маха и фиксации';
      }
      case 'run30': {
        const goal = target != null ? ` (цель — ${Core.fmt('run30', target)} с)` : '';
        return mode === 'train'
          ? `Бег 30 м: беговые упражнения 10 мин, 6×20 м со старта, 4×30 м на 90% усилия${goal}, отдых 2–3 мин`
          : 'Бег 30 м: 4 старта по 15–20 м вполсилы, отдых полный';
      }
      case 'shuttle': {
        const goal = target != null ? ` (цель — ${Core.fmt('shuttle', target)} с)` : '';
        return mode === 'train'
          ? `Челночный бег 3×10: отработка разворотов 10 мин, 5 прохождений на 90% усилия${goal}, отдых 2 мин`
          : 'Челночный бег: спокойная отработка разворотов, 3–4 прохождения';
      }
      case 'run2000': {
        const T = target || 600;
        return mode === 'train'
          ? (variant % 2 === 1
            ? `Бег 2 км: интервалы 5×400 м по ${Core.fmtSec(T / 5)} (темп цели), между ними 2 мин трусцой`
            : 'Бег 2 км: лёгкий бег 25–30 мин в разговорном темпе, в конце 4 ускорения по 60 м')
          : 'Бег: лёгкий бег 15–20 мин';
      }
      case 'ski': {
        const T = target || 1100;
        return mode === 'train'
          ? `Лыжи 3 км: 3×1 км по ${Core.fmtSec(T / 3)} (темп цели), отдых 3 мин; нет снега — бег по пересечённой местности`
          : 'Лыжи: спокойно 25–30 мин или лёгкий бег';
      }
      case 'jump': {
        const goal = target != null ? ` (цель — ${Core.fmt('jump', target)} см)` : '';
        return mode === 'train'
          ? `Прыжок в длину: 5 серий по 3 прыжка с места в полную силу${goal}, отдых 2 мин; выпрыгивания из приседа 3×8, приседания 3×12`
          : 'Прыжок: имитация отталкивания и мах руками, 3×5 прыжков вполсилы';
      }
      case 'throw': {
        return mode === 'train'
          ? 'Метание: разминка плеча 10 мин, 3 серии по 5 бросков с разбега (замах, разворот корпуса), набивной мяч 3×10 из-за головы'
          : 'Метание: 10–15 спокойных бросков, отработка замаха';
      }
      case 'swim': {
        const T = target || 55;
        return mode === 'train'
          ? `Плавание 50 м: 8×25 м быстро (отдых 30 с), 3×50 м по ${Core.fmtSec(T)} (темп цели), между ними 1 мин`
          : 'Плавание: спокойно 200–300 м, техника дыхания';
      }
      case 'sitreach': {
        const goal = target != null ? ` (цель — ${Core.fmt('sitreach', target)} см)` : '';
        return mode === 'train'
          ? `Наклон вперёд: растяжка задней поверхности бедра 3×30 с, «складка» сидя 3×30 с, наклоны с удержанием 3×20 с${goal}; без рывков`
          : 'Наклон: мягкая растяжка 10 мин — гибкость лучше тренировать понемногу, но часто';
      }
      case 'kettlePush2x24':
      case 'benchPress': {
        const max = now != null ? now : 8;
        const a = Math.max(2, Math.round(max * 0.6));
        const b = Math.max(a, Math.round(max * 0.75));
        const name = key === 'benchPress' ? 'Жим штанги' : 'Толчок двух гирь 24 кг';
        return mode === 'train'
          ? `${name}: 5 подходов по ${a}–${b} ${times(b)}, отдых 2–3 мин; технику и вес лучше ставить с тренером`
          : `${name}: 3 лёгких подхода с меньшим весом, отработка техники`;
      }
      case 'trunkBends': {
        const max = now != null ? now : 30;
        return mode === 'train'
          ? `Наклоны туловища: 4 подхода по ${Math.round(max * 0.6)} ${times(Math.round(max * 0.6))} в темпе зачёта, отдых 1 мин; планка 3×40 с`
          : 'Наклоны туловища: 2 спокойных подхода, планка 2×30 с';
      }
      case 'kneeJumps2':
      case 'pushups2':
      case 'situps2':
      case 'burpees2': {
        const goal = target != null ? ` (норматив — ${Core.fmt(key, target)} за 2 мин)` : '';
        return mode === 'train'
          ? `${TESTS[key].short}: 3 отрезка по 40 с в темпе норматива${goal}, отдых 1,5 мин; в конце 1 полный подход на 2 мин раз в неделю`
          : `${TESTS[key].short}: 2 спокойных отрезка по 30 с, без отказа`;
      }
      case 'ksu':
        return mode === 'train'
          ? 'Комплексное силовое: 4 раунда по 1 минуте в темпе зачёта (по описанию в правилах приёма), отдых 2 мин; пресс 3×20'
          : 'Комплексное силовое: 2 спокойных раунда по 1 минуте — отработка техники';
      case 'run100': {
        const goal = target != null ? ` (цель — ${Core.fmt('run100', target)} с)` : '';
        return mode === 'train'
          ? `Бег 100 м: беговые упражнения 10 мин, 5×60 м с ускорением, 3×100 м на 90% усилия${goal}, отдых 3–4 мин`
          : 'Бег 100 м: 4×30 м со старта, работа рук и постановка стопы, отдых полный';
      }
      case 'run3000': {
        const T = target || 840;
        if (mode === 'train') {
          return variant % 2 === 1
            ? `Бег 3 км: интервалы 5×600 м по ${Core.fmtSec(T * 0.2)} (темп цели), между ними 2 мин трусцой`
            : 'Бег 3 км: длительный лёгкий бег 30–40 мин в разговорном темпе, в конце 4 ускорения по 80 м';
        }
        return 'Бег 3 км: лёгкий бег 20–25 мин, дыхание ровное';
      }
      case 'run1000': {
        const T = target || 287;
        if (mode === 'train') {
          return variant % 2 === 1
            ? `Бег 1 км: 6×200 м по ${Math.round(T * 0.2) - 2} с, отдых 1,5 мин`
            : `Бег 1 км: 3×400 м по ${Core.fmtSec(T * 0.4)} (темп цели), отдых 3 мин`;
        }
        return 'Бег 1 км: лёгкий бег 15–20 мин и 4 ускорения по 60 м';
      }
      default:
        return TESTS[key] ? TESTS[key].name : key;
    }
  }

  const lower = key => TESTS[key].short.charAt(0).toLowerCase() + TESTS[key].short.slice(1);

  function describe(day, m) {
    const byKey = Object.fromEntries(m.rows.map(r => [r.key, r]));
    const out = { title: '', steps: [], note: '', action: false };
    switch (day.type) {
      case 'train':
        out.title = 'Упор: ' + day.focus.map(lower).join(' и ');
        out.steps = [
          'Разминка 10–15 мин: суставная гимнастика, лёгкий бег, пара ускорений',
          ...day.focus.map((k, idx) => work(k, 'train', byKey[k], day.variant + idx)),
          'Заминка и растяжка 5–10 мин'
        ];
        out.note = 'Работай технично. Если появилась боль — остановись и замени тренировку отдыхом.';
        break;
      case 'light':
        out.title = day.taper ? 'Перед сдачей: коротко и легко' : 'Восстановление и техника: ' + lower(day.focus[0]);
        out.steps = [
          'Разминка 10 мин',
          work(day.focus[0], 'light', byKey[day.focus[0]], 0),
          'Растяжка 10 мин'
        ];
        out.note = day.taper
          ? 'До сдачи пара дней: ничего до отказа, только свежесть и техника.'
          : day.deload
            ? 'Разгрузочная неделя: нагрузка ниже, чтобы организм восстановился и закрепил прогресс.'
            : 'Лёгкий день: после него должно быть ощущение, что мог бы сделать больше.';
        break;
      case 'warmup':
        out.title = 'Подвижность и лёгкое движение';
        out.steps = [
          'Суставная гимнастика 5 мин',
          'Лёгкая трусца или быстрая ходьба 10 мин',
          'Растяжка ног, спины и плеч 10 мин',
          'Вис на перекладине 3×20–30 с'
        ];
        out.note = 'Без усилий: задача — разогнать кровь и снять скованность.';
        break;
      case 'test':
        out.title = 'Проверь, где ты сейчас';
        out.steps = [
          'Разминка 15 мин, 2–3 ускорения',
          ...day.focus.map(k => `${TESTS[k].name} — в полную силу`),
          'Между упражнениями отдых 5–10 мин',
          'Запиши результаты — план и таблица пересчитаются'
        ];
        out.note = 'Делай замер в одинаковых условиях: то же время дня, та же площадка.';
        out.action = true;
        break;
      case 'exam':
        out.title = 'Проверка физической подготовки';
        out.steps = ['Лёгкая разминка 15 мин', 'Ничего нового — делай так, как на замерах', 'Удачи!'];
        break;
      default:
        out.title = day.eve ? 'Завтра сдача — отдыхай' : 'Восстановление';
        out.steps = day.eve
          ? ['Прогулка 20–30 мин', 'Собери форму и документы', 'Ранний сон']
          : ['Сон 8+ часов', 'Прогулка 30–40 мин', 'Не догоняй пропущенные тренировки — просто продолжай по плану'];
    }
    return out;
  }

  /* ============================= Отрисовка ============================= */

  function mount(element, callbacks) {
    host = element;
    handlers = callbacks || {};
    host.addEventListener('click', event => {
      const dayBtn = event.target.closest('[data-day]');
      if (dayBtn) {
        selectedIso = dayBtn.dataset.day;
        render(true);
        return;
      }
      if (event.target.closest('[data-plan-more]')) { expanded = !expanded; render(); return; }
      if (event.target.closest('[data-plan-edit]') && handlers.onEdit) { handlers.onEdit(); return; }
      if (event.target.closest('[data-plan-test]') && handlers.onTest) handlers.onTest();
    });
  }

  function dayLabel(date, todayIso) {
    const iso = Core.isoDate(date);
    if (iso === todayIso) return 'Сегодня · ' + Core.fmtDay(date);
    if (iso === Core.isoDate(Core.addDays(Core.parseDate(todayIso), 1))) return 'Завтра · ' + Core.fmtDay(date);
    return Core.fmtDay(date);
  }

  function detailHtml(day, m, todayIso) {
    const d = describe(day, m);
    const meta = TYPES[day.type];
    return `
      <article class="plan-day type-${day.type}" id="planDay">
        <div class="plan-day__top">
          <span class="type-pill">${meta.label}</span>
          <span>${dayLabel(day.date, todayIso)}</span>
          ${meta.minutes ? `<span>· ${meta.minutes}</span>` : ''}
        </div>
        <h4>${d.title}</h4>
        <ol class="plan-day__steps">${d.steps.map(s => `<li>${s}</li>`).join('')}</ol>
        ${d.note ? `<p class="plan-day__note">${d.note}</p>` : ''}
        ${d.action ? '<button class="btn btn--primary btn--sm" type="button" data-plan-test>Внести результаты замера</button>' : ''}
      </article>`;
  }

  function weekHtml(w, todayIso) {
    const cells = w.slots.map((d, wd) => {
      const date = Core.addDays(w.monday, wd);
      if (!d) {
        return `<span class="day day--out" aria-hidden="true"><span class="day__wd">${Core.WD_SHORT[wd]}</span><span class="day__num">${date.getDate()}</span></span>`;
      }
      const isToday = d.iso === todayIso;
      const isSel = d.iso === selectedIso;
      const past = d.iso < todayIso;
      const cls = ['day', 'type-' + d.type, isToday ? 'is-today' : '', isSel ? 'is-selected' : '', past ? 'is-past' : ''].filter(Boolean).join(' ');
      return `<button type="button" class="${cls}" data-day="${d.iso}" aria-pressed="${isSel}" aria-label="${Core.fmtDay(d.date)}: ${TYPES[d.type].label}${isToday ? ', сегодня' : ''}">
          <span class="day__wd">${Core.WD_SHORT[wd]}</span><span class="day__num">${date.getDate()}</span><span class="day__type">${TYPES[d.type].short}</span>
        </button>`;
    }).join('');
    const badges = (w.deload ? '<span class="badge type-light">разгрузка</span>' : '') + (w.exam ? '<span class="badge type-exam">сдача</span>' : '');
    return `
      <div class="week">
        <div class="week__head"><b>Неделя ${w.n}</b><span>${Core.fmtRange(w.monday, Core.addDays(w.monday, 6))}</span>${badges}</div>
        <div class="week__days">${cells}</div>
      </div>`;
  }

  function render(onlyDetail) {
    if (!host) return;
    const state = Core.state;
    const m = Core.model();
    const plan = state.onboarded ? build(state, m) : null;
    if (!plan) { host.innerHTML = ''; return; }
    const todayIso = Core.today();

    if (!selectedIso || !plan.days.some(d => d.iso === selectedIso)) {
      const t = plan.days.find(d => d.iso === todayIso);
      selectedIso = t ? t.iso : (todayIso < plan.days[0].iso ? plan.days[0].iso : plan.days[plan.days.length - 1].iso);
    }
    const selected = plan.days.find(d => d.iso === selectedIso);

    if (onlyDetail && host.querySelector('#planDay')) {
      host.querySelector('#planDay').outerHTML = detailHtml(selected, m, todayIso);
      host.querySelectorAll('[data-day]').forEach(btn => {
        const on = btn.dataset.day === selectedIso;
        btn.classList.toggle('is-selected', on);
        btn.setAttribute('aria-pressed', String(on));
      });
      if (window.gsap && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        gsap.from('#planDay', { autoAlpha: 0, y: 8, duration: 0.35, ease: 'power2.out' });
      }
      return;
    }

    let current = plan.weeks.findIndex(w => w.slots.some(d => d && d.iso === todayIso));
    if (current < 0) current = todayIso < plan.days[0].iso ? 0 : plan.weeks.length - 1;
    const rest = plan.weeks.slice(current);
    const visible = expanded ? rest : rest.slice(0, VISIBLE_WEEKS);
    const hidden = rest.length - VISIBLE_WEEKS;

    const daysLeft = Core.diffDays(Core.parseDate(todayIso), plan.end);
    const when = plan.hasExam
      ? `До проверки ${daysLeft} ${Core.plural(daysLeft, 'день', 'дня', 'дней')} (${Core.fmtDate(plan.end)})`
      : `План на ${DEFAULT_WEEKS} недель — дата проверки не указана`;
    const perWeek = `${plan.perWeek} ${Core.plural(plan.perWeek, 'тренировка', 'тренировки', 'тренировок')} в неделю: ${plan.trainDays.map(i => Core.WD_SHORT[i]).join(', ')}`;
    const legend = ['train', 'light', 'warmup', 'test', 'rest', 'exam']
      .filter(t => t !== 'exam' || plan.hasExam)
      .map(t => `<span class="type-${t}">${TYPES[t].label}</span>`).join('');

    host.innerHTML = `
      <div class="panel__head">
        <div>
          <h3 id="planTitle">План тренировок</h3>
          <p class="panel__sub">${when} · ${perWeek}</p>
        </div>
        <button class="btn btn--ghost btn--sm" type="button" data-plan-edit>Изменить дату и дни</button>
      </div>
      ${detailHtml(selected, m, todayIso)}
      <div class="plan__legend" aria-hidden="true">${legend}</div>
      <div class="plan__weeks">${visible.map(w => weekHtml(w, todayIso)).join('')}</div>
      ${hidden > 0 ? `<button class="link-btn plan__more" type="button" data-plan-more>${expanded ? 'Свернуть' : `Показать весь план · ещё ${hidden} ${Core.plural(hidden, 'неделя', 'недели', 'недель')}`}</button>` : ''}
      <p class="panel__foot">План — ориентир, а не медицинская рекомендация. При боли, болезни или плохом самочувствии замени тренировку отдыхом. Пропустил день — не догоняй, просто продолжай.</p>`;
  }

  return { mount, render, build, describe, TYPES };
})();
