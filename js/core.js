'use strict';
/* Ядро «Норматива»: состояние (хранится в браузере), расчёт баллов по официальной таблице,
   форматирование результатов и работа с датами. Им пользуются главная, план и анкета. */
const Core = (() => {
  const STORE_KEY = 'normativ.v2';
  const SYSTEM_BY_ID = Object.fromEntries(SYSTEMS.map(s => [s.id, s]));
  const clone = obj => JSON.parse(JSON.stringify(obj));
  const state = {};

  /* ============================= Состояние ============================= */

  function blank(rain = true) {
    return {
      version: 2, onboarded: false, demo: false, rain,
      system: 'fsb', category: null, choices: {}, goal: { points: null, margin: 0 }, profile: { sex: 'male', age: 18 },
      exam: null, days: [0, 2, 4], planStart: null, results: {}
    };
  }

  function replace(next) {
    Object.keys(state).forEach(k => { delete state[k]; });
    Object.assign(state, next);
  }

  function load() {
    let saved = null;
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) saved = JSON.parse(raw);
    } catch (e) { saved = null; }
    const valid = saved && saved.onboarded && saved.profile && saved.results;
    replace(valid ? { ...blank(), ...saved } : blank(saved && 'rain' in saved ? saved.rain : true));
    if (!saved && window.matchMedia('(prefers-reduced-motion: reduce)').matches) state.rain = false;
    return state;
  }

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* хранилище недоступно */ }
  }

  function useDemo() {
    replace({ ...blank(state.rain), ...clone(DEMO_STATE), rain: state.rain, planStart: today() });
    save();
  }

  function resetAll() {
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ничего */ }
    replace(blank(state.rain));
  }

  /* ============================= Нормативы ============================= */

  const system = id => SYSTEM_BY_ID[id || state.system] || SYSTEM_BY_ID.fsb;
  const P = () => state.profile;

  /* Таблица баллов упражнения: у каждого ведомства своя, у МО ещё и по возрасту (до 35 / 35+). */
  const scaleOf = (key, sex, age, sysId) => system(sysId).scale(key, sex, age) || null;

  /* Требования: группа, минимум в каждом упражнении, сумма и «слоты» (качества с упражнениями на выбор). */
  /* goal — личная цель: { points: баллов в каждом упражнении (null — проходной), margin: запас для СОБР/ОМОН }. */
  function requirement(sex = P().sex, age = P().age, category = state.category, sysId, goal = state.goal) {
    const sys = system(sysId);
    const cat = sys.categories ? (sys.categories.some(c => c.id === category) ? category : sys.categories[0].id) : null;
    const g = goal || {};
    const r = sys.requirement(sex, age, cat, g);
    if (r && r.kind !== 'levels' && g.points) r.goalPoints = g.points;
    return r;
  }

  const isLevels = req => Boolean(req && req.kind === 'levels');
  const RANK = { none: 0, bronze: 1, silver: 2, gold: 3 };
  const rank = level => RANK[level || 'none'] || 0;
  const hasResult = k => (state.results[k] || []).length > 0;

  /* Какие слоты сдаются и каким упражнением.
     Баллы: все слоты. ГТО: все обязательные пункты, которые сайт отслеживает, и нужное число пунктов по выбору
     (явно выбранные, затем по порядку; «skip» — «не сдаю»). Упражнение: выбор → где есть результат → первое. */
  function activeSlots(req, choices = state.choices || {}, has = hasResult) {
    if (!req) return [];
    const pick = s => (s.options.includes(choices[s.id]) ? choices[s.id] : s.options.find(has) || s.options[0]);
    if (!isLevels(req)) return req.slots.map(s => ({ slot: s, key: pick(s) }));
    const mandatoryCount = req.slots.filter(s => s.mandatory).length;
    const k = Math.max(0, req.need[req.target] - mandatoryCount);
    const optional = req.slots.filter(s => !s.mandatory && s.options.length);
    const on = optional.filter(s => s.options.includes(choices[s.id]));
    optional.filter(s => !choices[s.id]).forEach(s => { if (on.length < k) on.push(s); });
    return req.slots
      .filter(s => s.options.length && (s.mandatory || on.includes(s)))
      .map(s => ({ slot: s, key: pick(s) }));
  }

  const chosenKeys = (req, choices) => activeSlots(req, choices).map(x => x.key);

  /* Уровни (ГТО, ФСО, СОБР): пороги берутся из требований — slot.thr[упражнение] = { b, s, g }.
     Названия уровней задаёт ведомство (знаки ГТО, оценки ФСО, «норматив выполнен» у СОБР). */
  const levelsOf = req => (req && req.levels) || GTO_LEVELS;
  const levelName = (req, id) => (id === 'none' || id == null
    ? ((req && req.noneName) || 'без знака')
    : ((req && req.levelNames) || GTO_LEVEL_NAMES)[id]);
  const levelTitle = (req, id) => {
    if (id === 'none' || id == null) return 'Пока нет';
    const n = levelName(req, id);
    return n.charAt(0).toUpperCase() + n.slice(1);
  };
  const levelCol = (req, id) => ((req && req.levelCols) || { bronze: 'Бронза', silver: 'Серебро', gold: 'Золото' })[id];

  function thresholdsFor(key, req = requirement()) {
    const s = req && req.slots.find(x => x.thr && x.thr[key]);
    if (!s) return null;
    const t = s.thr[key];
    return { bronze: t.b ?? null, silver: t.s ?? null, gold: t.g ?? null };
  }

  function levelFor(key, value, req = requirement()) {
    const thr = thresholdsFor(key, req);
    if (!thr || value == null || !Number.isFinite(Number(value))) return null;
    const higher = TESTS[key].higher;
    let level = 'none';
    levelsOf(req).forEach(id => {
      const v = thr[id];
      if (v != null && (higher ? value >= v - 1e-9 : value <= v + 1e-9)) level = id;
    });
    return level;
  }

  /* Ближайший следующий уровень: сколько добавить. */
  function nextLevelStep(key, value, thr, req) {
    const current = rank(levelFor(key, value, req));
    const next = levelsOf(req).find(id => RANK[id] > current && thr[id] != null);
    if (!next || value == null) return null;
    return { level: next, delta: Math.abs(thr[next] - value) };
  }

  /* Баллы за результат: лучший балл, порог которого выполнен. */
  function pointsFor(key, value, sex = P().sex, age = P().age, sysId) {
    const scale = scaleOf(key, sex, age, sysId);
    const t = TESTS[key];
    if (!scale || value == null || !Number.isFinite(Number(value))) return null;
    let best = 0;
    for (const [points, threshold] of scale) {
      const ok = t.higher ? value >= threshold - 1e-9 : value <= threshold + 1e-9;
      if (ok && points > best) best = points;
    }
    return best;
  }

  /* Результат, которого хватает на заданные баллы. */
  function resultFor(key, points, sex = P().sex, age = P().age, sysId) {
    const scale = scaleOf(key, sex, age, sysId);
    if (!scale || points == null) return null;
    const thresholds = scale.filter(([p]) => p >= points).map(([, thr]) => thr);
    if (!thresholds.length) return null;
    return TESTS[key].higher ? Math.min(...thresholds) : Math.max(...thresholds);
  }

  /* Следующая ступенька таблицы: сколько добавить и сколько баллов это даст. */
  function nextStep(key, value, sex = P().sex, age = P().age) {
    const current = pointsFor(key, value, sex, age);
    if (current == null) return null;
    const above = scaleOf(key, sex, age).map(([p]) => p).filter(p => p > current);
    if (!above.length) return null;
    const points = Math.min(...above);
    const threshold = resultFor(key, points, sex, age);
    return { gain: points - current, delta: Math.abs(threshold - value), threshold };
  }

  /* Цель: поровну баллов на каждое упражнение, чтобы набрать нужную сумму (и не меньше минимума). */
  const basePoints = req => (req && !isLevels(req) && req.slots.length ? Math.max(req.min || 0, Math.ceil(req.sum / req.slots.length)) : null);
  /* Личная цель (например, 60 вместо проходных 40) не может быть ниже проходной и выше 100. */
  const targetPoints = req => {
    const base = basePoints(req);
    if (base == null) return null;
    return req.goalPoints ? Math.min(100, Math.max(base, req.goalPoints)) : base;
  };

  /* Показывать ли отдельный «минимум»: только если он есть и ниже цели. */
  const showMin = req => Boolean(req && !isLevels(req) && req.min > 0 && req.min < targetPoints(req));

  /* Что нужно сдать — одной фразой. */
  function needText(req) {
    if (!req) return '';
    if (isLevels(req)) {
      if (req.needText) return req.needText;
      const n = req.need[req.target];
      const mandatory = req.slots.filter(s => s.mandatory).length;
      return `${n} ${plural(n, 'испытание', 'испытания', 'испытаний')} на «${levelName(req, req.target)}», из них ${mandatory} обязательных`;
    }
    const n = req.slots.length;
    if (n === 1) return `не меньше ${req.sum} баллов в одном упражнении`;
    const words = { 2: 'два', 3: 'три', 4: 'четыре' }[n] || String(n);
    if (req.min > 0) return `не меньше ${req.min} баллов в каждом упражнении и ${req.sum} в сумме за ${words}`;
    return `не меньше ${req.sum} баллов в сумме за ${words} упражнения`;
  }

  function history(key) {
    return (state.results[key] || []).slice().sort((a, b) => a.date.localeCompare(b.date));
  }

  /* ГТО: строки по сдаваемым пунктам, текущий знак и сколько испытаний уже на уровне цели. */
  function levelModel(req) {
    const target = req.target;
    const rows = activeSlots(req).map(({ slot, key }) => {
      const hist = history(key);
      const start = hist.length ? hist[0].value : null;
      const now = hist.length ? hist[hist.length - 1].value : null;
      const levels = thresholdsFor(key, req);
      const level = levelFor(key, now, req);
      const top = levels.gold ?? levels.silver ?? levels.bronze;
      const spread = Math.max(1e-6, Math.abs(top - levels.bronze) || Math.abs(levels.bronze) * 0.15 || 1);
      const dist = now == null ? spread * 3 : Math.max(0, TESTS[key].higher ? levels[target] - now : now - levels[target]);
      return {
        key,
        t: TESTS[key],
        slot,
        start,
        now,
        levels,
        level,
        startLevel: levelFor(key, start, req),
        targetResult: levels[target],
        minResult: levels.bronze,
        step: nextLevelStep(key, now, levels, req),
        need: Math.min(3, dist / spread) * 30 + (slot.mandatory && rank(level) < rank(target) ? 10 : 0)
      };
    });
    const untracked = req.slots.filter(s => s.mandatory && !s.options.length);
    const mandatoryRows = rows.filter(r => r.slot.mandatory);
    /* Непроверяемые обязательные пункты считаем сданными отдельно — иначе знак на сайте недостижим. */
    const achieved = L => mandatoryRows.every(r => rank(r.level) >= RANK[L]) &&
      rows.filter(r => rank(r.level) >= RANK[L]).length >= req.need[L] - untracked.length;
    const badge = levelsOf(req).slice().reverse().find(achieved) || 'none';
    return {
      kind: 'levels',
      req,
      target,
      rows,
      badge,
      atTarget: rows.filter(r => rank(r.level) >= RANK[target]).length,
      needTarget: Math.max(0, req.need[target] - untracked.length),
      mandAtTarget: mandatoryRows.filter(r => rank(r.level) >= RANK[target]).length,
      mandatoryCount: mandatoryRows.length,
      untracked,
      showMin: false
    };
  }

  /* Оценка одного результата для подсказок: баллы или уровень ГТО. */
  function evaluate(key, value, sex = P().sex, age = P().age, sysId, req = requirement(sex, age, state.category, sysId)) {
    if (isLevels(req)) {
      const level = levelFor(key, value, req);
      if (level == null) return null;
      return {
        level,
        text: levelName(req, level),
        tone: level === 'none' ? 'bad' : rank(level) >= RANK[req.target] ? 'ok' : 'warn'
      };
    }
    const pts = pointsFor(key, value, sex, age, sysId);
    if (pts == null) return null;
    return { pts, text: `${pts} ${plural(pts, 'балл', 'балла', 'баллов')}`, tone: tone(pts, req, targetPoints(req)) };
  }

  function model() {
    const req = requirement();
    if (isLevels(req)) return levelModel(req);
    const target = targetPoints(req);
    const keys = chosenKeys(req);
    const rows = keys.map((key, i) => {
      const hist = history(key);
      const start = hist.length ? hist[0].value : null;
      const now = hist.length ? hist[hist.length - 1].value : null;
      return {
        key,
        t: TESTS[key],
        slot: req.slots[i],
        start,
        now,
        startPts: pointsFor(key, start),
        pts: pointsFor(key, now),
        minResult: req && req.min ? resultFor(key, req.min) : null,
        targetResult: target ? resultFor(key, target) : null,
        step: now != null ? nextStep(key, now) : null
      };
    });
    rows.forEach(r => { r.need = r.pts == null ? 30 : Math.max(0, target - r.pts) + (req.min && r.pts < req.min ? 15 : 0); });
    const sum = rows.reduce((total, row) => total + (row.pts || 0), 0);
    return { kind: 'points', req, target, rows, sum, showMin: showMin(req) };
  }

  function tone(pts, req, target) {
    if (pts == null || !req) return 'none';
    if (pts === 0 || (req.min > 0 && pts < req.min)) return 'bad';
    if (pts < target) return 'warn';
    return 'ok';
  }

  /* ============================= Форматирование ============================= */

  function plural(n, one, few, many) {
    const a = Math.abs(n) % 100;
    const b = a % 10;
    if (a > 10 && a < 20) return many;
    if (b > 1 && b < 5) return few;
    if (b === 1) return one;
    return many;
  }

  function fmtSec(total) {
    const s = Math.round(total);
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }

  function fmt(key, value) {
    if (value == null) return '—';
    const t = TESTS[key];
    if (t.time) return fmtSec(value);
    if (t.decimals) return value.toFixed(t.decimals).replace('.', ',');
    const n = Math.round(value);
    return t.signed && n > 0 ? '+' + n : String(n).replace('-', '−');
  }

  function fmtDelta(key, delta) {
    const t = TESTS[key];
    if (t.higher) {
      const n = Math.max(1, Math.round(delta));
      return '+' + n + ' ' + (t.unit === 'раз' ? plural(n, 'раз', 'раза', 'раз') : t.unit);
    }
    if (t.decimals) return '−' + delta.toFixed(1).replace('.', ',') + ' с';
    return '−' + Math.round(delta) + ' с';
  }

  /* Разбор введённого результата: «8», «14,6», «14:30» (или «14.30»). */
  function parseValue(key, raw) {
    const t = TESTS[key];
    let s = String(raw == null ? '' : raw).trim().replace(',', '.');
    if (!s) return null;
    if (t.time) {
      s = s.replace('.', ':');
      if (s.includes(':')) {
        const [m, sec] = s.split(':').map(Number);
        if (!Number.isFinite(m) || !Number.isFinite(sec) || sec >= 60 || m < 0 || sec < 0) return null;
        return m * 60 + sec;
      }
      const n = Number(s);
      if (!Number.isFinite(n) || n <= 0) return null;
      return n < 60 ? n * 60 : n; /* «14» — это 14 минут, «870» — секунды */
    }
    const n = Number(s.replace('−', '-'));
    if (!Number.isFinite(n) || (n < 0 && !t.signed)) return null;
    return t.decimals ? Math.round(n * 10) / 10 : Math.round(n);
  }

  /* ============================= Даты ============================= */

  const WD_SHORT = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];
  const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const pad = n => String(n).padStart(2, '0');

  const isoDate = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const today = () => isoDate(new Date());
  function parseDate(s) {
    const [y, m, d] = String(s).split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const diffDays = (a, b) => Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 86400000);
  const weekday = d => (d.getDay() + 6) % 7; /* 0 — понедельник */
  const fmtDay = d => WD_SHORT[weekday(d)] + ', ' + d.getDate() + ' ' + MONTHS[d.getMonth()];
  const fmtDate = d => d.getDate() + ' ' + MONTHS[d.getMonth()];
  function fmtRange(a, b) {
    if (a.getMonth() === b.getMonth()) return a.getDate() + '–' + b.getDate() + ' ' + MONTHS[b.getMonth()];
    return fmtDate(a) + ' – ' + fmtDate(b);
  }

  return {
    state, load, save, useDemo, resetAll,
    system, requirement, chosenKeys, activeSlots, isLevels, rank, levelFor, thresholdsFor, evaluate,
    levelsOf, levelName, levelTitle, levelCol, basePoints,
    pointsFor, resultFor, nextStep, targetPoints, showMin, needText, history, model, tone,
    plural, fmtSec, fmt, fmtDelta, parseValue,
    WD_SHORT, isoDate, today, parseDate, addDays, diffDays, weekday, fmtDay, fmtDate, fmtRange
  };
})();
