'use strict';
/* Анкета при первом входе (и по кнопке «Анкета»):
   1) норматив → 2) пол, возраст (и должность для МВД) → 3) упражнения и текущие результаты → 4) дата и дни. */
const Onboarding = (() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const animate = () => typeof window.gsap !== 'undefined' && !reduceMotion;
  const STEPS = 4;
  const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  let root, card, body, nextBtn, backBtn, closeBtn, countEl, bars;
  let step = 0;
  let draft = null;
  let editing = false;
  let closable = false;
  let callbacks = {};
  let busy = false;

  /* ============================= Черновик ответов ============================= */

  function makeDraft() {
    const s = Core.state;
    const own = s.onboarded && !s.demo;
    const values = {};
    if (own) {
      Object.keys(s.results || {}).forEach(k => {
        const h = Core.history(k);
        if (h.length && TESTS[k]) values[k] = Core.fmt(k, h[h.length - 1].value);
      });
    }
    return {
      system: own ? s.system : 'fsb',
      category: own ? s.category : null,
      choices: own ? { ...(s.choices || {}) } : {},
      goal: own && s.goal ? { ...s.goal } : { points: null, margin: 0 },
      sex: own ? s.profile.sex : 'male',
      age: own ? String(s.profile.age) : '',
      values,
      exam: own && s.exam ? s.exam : '',
      noDate: own ? !s.exam : false,
      days: own && s.days && s.days.length ? s.days.slice() : [0, 2, 4]
    };
  }

  const sys = () => Core.system(draft.system);
  const ageNumber = () => Number(draft.age);
  const minExamIso = () => Core.isoDate(Core.addDays(new Date(), 3));
  const category = () => {
    const cats = sys().categories;
    if (!cats) return null;
    return cats.some(c => c.id === draft.category) ? draft.category : cats[0].id;
  };
  const req = () => Core.requirement(draft.sex, ageNumber(), category(), draft.system, draft.goal);
  const goalBoxHtml = () => (sys().goalKind === 'category' ? '' : Goal.html(sys(), draft, req()));
  function repaintGoal() {
    const box = $('#goalBox', body);
    if (box) box.innerHTML = goalBoxHtml();
  }

  const hasValue = k => Boolean(draft.values[k] && String(draft.values[k]).trim());

  /* Выбранное упражнение в слоте (null — пункт по выбору, который не сдаётся). */
  function slotChoice(slot) {
    const r = req();
    if (!r) return null;
    const active = Core.activeSlots(r, draft.choices, hasValue).find(x => x.slot.id === slot.id);
    return active ? active.key : null;
  }

  /* ============================= Шаги ============================= */

  function stepSystem() {
    const cards = SYSTEMS.map(s => {
      const on = draft.system === s.id;
      const media = s.emblem
        ? `<img class="sys__img" src="${s.emblem}" alt="">`
        : `<span class="sys__mono">${s.short}</span>`;
      return `
        <button type="button" class="sys${on ? ' is-on' : ''}" role="radio" aria-checked="${on}" data-sys="${s.id}"${s.available ? '' : ' disabled'}>
          ${media}<span class="sys__name">${s.name}</span><span class="sys__sub">${s.available ? s.sub : 'скоро'}</span>
        </button>`;
    }).join('');
    return `
      <p class="onb__eyebrow">Анкета · около минуты</p>
      <h2 class="onb__title" id="onbTitle">Какой норматив сдаёшь?</h2>
      <p class="onb__lead">Выбери ведомство — возьмём официальную таблицу баллов и составим план от твоих замеров до результата.</p>
      <div class="sys-grid" role="radiogroup" aria-labelledby="onbTitle">${cards}</div>
      <p class="onb__note">Остальные ведомства добавим, когда найдём их официальные нормативы.</p>
      ${editing ? '' : '<button class="link-btn onb__demo" type="button" data-demo>Сначала посмотреть на примере</button>'}`;
  }

  function stepAbout() {
    const seg = [['male', 'Мужчина'], ['female', 'Женщина']].map(([v, label]) => {
      const on = draft.sex === v;
      return `<button type="button" class="seg__btn${on ? ' is-on' : ''}" role="radio" aria-checked="${on}" data-sex="${v}">${label}</button>`;
    }).join('');
    const cats = sys().categories;
    const catHtml = cats ? `
      <fieldset class="cats">
        <legend>${sys().categoryQuestion || 'Выбери вариант'}</legend>
        <div class="cat-list" role="radiogroup">
          ${cats.map(c => {
            const on = category() === c.id;
            return `<button type="button" class="cat${on ? ' is-on' : ''}" role="radio" aria-checked="${on}" data-cat="${c.id}"><b>${c.label}</b><small>${c.hint}</small></button>`;
          }).join('')}
        </div>
      </fieldset>` : '';
    return `
      <p class="onb__eyebrow">Шаг 2 · о себе</p>
      <h2 class="onb__title" id="onbTitle">Расскажи о себе</h2>
      <p class="onb__lead">${sys().id === 'gto'
        ? 'От пола и возраста зависит ступень ГТО и пороги на знак.'
        : sys().kind === 'levels'
          ? 'От пола и возраста зависят упражнения и минимальные результаты.'
          : `От пола и возраста${cats ? ' и должности' : ''} зависят таблица баллов и проходной уровень.`}</p>
      <div class="seg" role="radiogroup" aria-label="Пол">${seg}</div>
      <label class="field field--big">Возраст, полных лет
        <input id="onbAge" type="number" inputmode="numeric" min="${sys().ageMin || 14}" max="${sys().ageMax || 60}" placeholder="18" value="${draft.age}">
      </label>
      ${catHtml}
      <div id="goalBox">${goalBoxHtml()}</div>
      <p class="onb__msg" id="onbMsg" aria-live="polite"></p>`;
  }

  function slotHtml(slot, r, target) {
    const levels = Core.isLevels(r);
    const withOptional = levels && r.slots.some(s => !s.mandatory);
    const prefix = withOptional ? (slot.mandatory ? `Обязательное · ${slot.label.toLowerCase()}` : 'По выбору') : slot.label;
    /* Пункт ГТО, который сайт не отслеживает. */
    if (!slot.options.length) {
      return `
      <div class="res res--off" data-slot-box="${slot.id}">
        <div class="res__label"><b>${prefix}</b><small>${slot.other} — ${slot.mandatory ? 'сдаётся отдельно, сайт пока не отслеживает' : 'сайт пока не отслеживает'}</small></div>
      </div>`;
    }
    const key = slotChoice(slot);
    const chipList = slot.options.map(k => {
      const on = k === key;
      const name = (slot.names && slot.names[k]) || TESTS[k].short;
      return `<button type="button" class="chip${on ? ' is-on' : ''}" role="radio" aria-checked="${on}" data-slot="${slot.id}" data-key="${k}">${name}</button>`;
    });
    if (levels && !slot.mandatory) {
      chipList.push(`<button type="button" class="chip chip--skip${key ? '' : ' is-on'}" role="radio" aria-checked="${!key}" data-slot="${slot.id}" data-key="skip">Не сдаю</button>`);
    }
    const chips = chipList.length > 1 ? `
      <div class="res__choices" role="radiogroup" aria-label="${prefix}: упражнение">${chipList.join('')}</div>` : '';
    if (!key) {
      return `
      <div class="res res--skip" data-slot-box="${slot.id}">
        <div class="res__label"><b>${prefix}</b><small>${slot.options.map(k => TESTS[k].short).join(', ')}${slot.other ? ', ' + slot.other : ''}</small></div>
        ${chips}
      </div>`;
    }
    const t = TESTS[key];
    let hint;
    if (levels) {
      const thr = Core.thresholdsFor(key, r);
      hint = Core.levelsOf(r).map(id => `${id === r.target ? '<b>' : ''}${Core.levelCol(r, id).toLowerCase()} ${Core.fmt(key, thr[id])}${id === r.target ? '</b>' : ''}`).join(' · ') + ` · ${t.unit}`;
    } else {
      const min = r && r.min && Core.showMin(r) ? Core.fmt(key, Core.resultFor(key, r.min, draft.sex, ageNumber(), draft.system)) : null;
      const goal = target ? Core.fmt(key, Core.resultFor(key, target, draft.sex, ageNumber(), draft.system)) : '—';
      hint = (min ? `минимум ${min} · ` : '') + `цель ${goal} · ${t.unit}`;
    }
    const name = (slot.names && slot.names[key]) || t.name;
    const many = slot.options.length > 1 || levels;
    return `
      <div class="res" data-slot-box="${slot.id}">
        <label class="res__label" for="res-${key}"><b>${many ? prefix + ': ' + name.charAt(0).toLowerCase() + name.slice(1) : name}</b><small>${many ? '' : prefix + ' · '}${hint}</small></label>
        <div class="res__row">
          <input class="res__input" id="res-${key}" data-res="${key}" inputmode="decimal" autocomplete="off" placeholder="${t.ex || ''}" value="${draft.values[key] || ''}">
          <span class="pts res__pts" id="pts-${key}"></span>
        </div>
        ${chips}
      </div>`;
  }

  function stepResults() {
    const r = req();
    const target = Core.targetPoints(r);
    const anyChoice = r && r.slots.some(s => s.options.length > 1);
    const levels = Core.isLevels(r);
    const lead = levels && r.slots.some(s => !s.mandatory)
      ? `Обязательные испытания сдаются все, из испытаний по выбору нужно ${optionalNeeded(r)}. Введи свои результаты — самозамер или последние. Не знаешь — оставь пустым, первой тренировкой в плане будет замер.`
      : `${anyChoice ? 'Выбери упражнение, которое будешь сдавать, и введи' : 'Введи'} свой результат: самозамер или последний. Не знаешь — оставь пустым, первой тренировкой в плане будет замер.`;
    return `
      <p class="onb__eyebrow">Шаг 3 · текущая форма</p>
      <h2 class="onb__title" id="onbTitle">Твои результаты сейчас</h2>
      <p class="onb__lead">${lead}</p>
      <div class="res-list">${r ? r.slots.map(s => slotHtml(s, r, target)).join('') : ''}</div>
      <p class="onb__msg" id="onbMsg" aria-live="polite"></p>`;
  }

  /* ГТО: сколько пунктов по выбору нужно для знака (но не больше, чем сайт умеет отслеживать). */
  function optionalNeeded(r) {
    const mandatory = r.slots.filter(s => s.mandatory).length;
    const k = Math.max(0, r.need[r.target] - mandatory);
    const available = r.slots.filter(s => !s.mandatory && s.options.length).length;
    return Math.min(k, available);
  }

  function stepPlan() {
    const days = DAY_NAMES.map((n, i) => {
      const on = draft.days.includes(i);
      return `<button type="button" class="day-toggle${on ? ' is-on' : ''}" aria-pressed="${on}" data-wd="${i}">${n}</button>`;
    }).join('');
    return `
      <p class="onb__eyebrow">Шаг 4 · план</p>
      <h2 class="onb__title" id="onbTitle">Когда проверка?</h2>
      <p class="onb__lead">Построим план от сегодняшнего дня до даты сдачи: тренировки, отдых, разминки и контрольные замеры.</p>
      <label class="field field--big">Дата проверки
        <input id="onbExam" type="date" min="${minExamIso()}" value="${draft.exam}"${draft.noDate ? ' disabled' : ''}>
      </label>
      <label class="check"><input type="checkbox" id="onbNoDate"${draft.noDate ? ' checked' : ''}><span>Дату пока не знаю — составить план на 8 недель</span></label>
      <fieldset class="days">
        <legend>В какие дни можешь тренироваться?</legend>
        <div class="days__row">${days}</div>
      </fieldset>
      <p class="onb__msg" id="onbMsg" aria-live="polite"></p>`;
  }

  const RENDERERS = [stepSystem, stepAbout, stepResults, stepPlan];

  /* ============================= Проверка ответов ============================= */

  function validate() {
    let ok = true;
    let msg = '';
    let error = false;
    if (step === 0) {
      ok = sys().available === true;
    } else if (step === 1) {
      const age = ageNumber();
      const s = sys();
      const lo = s.ageMin || 14;
      const hi = s.ageMax || 60;
      if (!draft.age) { ok = false; msg = 'Укажи возраст — от него зависит проходной балл.'; }
      else if (!Number.isInteger(age) || age < lo || age > hi) {
        ok = false; error = true;
        msg = s.id === 'fsb'
          ? `Нормативы для поступления в Академию ФСБ России есть для возраста от ${lo} до ${hi} лет.`
          : `Для этого ведомства возраст — от ${lo} до ${hi} лет.`;
      } else {
        const r = req();
        if (!r) { ok = false; error = true; msg = (s.unavailableText && s.unavailableText(draft.sex, age)) || 'Для этого возраста нормативов нет.'; }
        else {
          msg = `Группа «${r.group}»: нужно ${Core.needText(r)}.` +
            (Core.targetPoints(r) > Core.basePoints(r) ? ` Твоя цель — по ${Core.targetPoints(r)} ${Core.plural(Core.targetPoints(r), 'баллу', 'балла', 'баллов')} в каждом.` : '');
        }
      }
    } else if (step === 2) {
      const r = req();
      const active = r ? Core.activeSlots(r, draft.choices, hasValue) : [];
      active.forEach(({ key }) => {
        const raw = draft.values[key];
        if (raw && String(raw).trim() && Core.parseValue(key, raw) == null) ok = false;
      });
      if (Core.isLevels(r)) {
        const k = optionalNeeded(r);
        const on = active.filter(x => !x.slot.mandatory).length;
        if (on < k) {
          ok = false; error = true;
          msg = `Для знака нужно ещё ${k - on} ${Core.plural(k - on, 'испытание', 'испытания', 'испытаний')} по выбору.`;
        } else {
          msg = `Будешь сдавать ${active.length} ${Core.plural(active.length, 'испытание', 'испытания', 'испытаний')} на сайте` +
            (r.slots.some(s => s.mandatory && !s.options.length) ? ' + обязательное, которое сдаётся отдельно.' : '.');
        }
      }
    } else if (step === 3) {
      if (!draft.noDate) {
        if (!draft.exam) { ok = false; msg = 'Выбери дату проверки или отметь, что пока не знаешь её.'; }
        else if (draft.exam < minExamIso()) { ok = false; error = true; msg = 'Дата должна быть хотя бы через 3 дня.'; }
      }
      const n = draft.days.length;
      if (ok || draft.noDate || draft.exam) {
        if (n < 2) { ok = false; error = true; msg = 'Выбери хотя бы 2 дня в неделю.'; }
        else if (n > 6) { ok = false; error = true; msg = 'Нужен хотя бы один день отдыха в неделю.'; }
        else if (ok) {
          const weeks = draft.noDate ? 8 : Math.max(1, Math.round(Core.diffDays(new Date(), Core.parseDate(draft.exam)) / 7));
          msg = `План на ${weeks} ${Core.plural(weeks, 'неделю', 'недели', 'недель')}, ${n} ${Core.plural(n, 'тренировка', 'тренировки', 'тренировок')} в неделю.` +
            (n >= 5 ? ' Много — следи за восстановлением.' : ' Между тренировками будут дни отдыха и разминки.');
        }
      }
    }
    nextBtn.disabled = !ok;
    const msgEl = $('#onbMsg', body);
    if (msgEl) {
      msgEl.textContent = msg;
      msgEl.classList.toggle('is-error', error);
    }
    return ok;
  }

  function updateResult(key) {
    const chip = $('#pts-' + key, body);
    if (!chip) return;
    const raw = draft.values[key];
    const r = req();
    const target = Core.targetPoints(r);
    chip.className = 'pts res__pts';
    if (!raw || !String(raw).trim()) { chip.textContent = 'не знаю'; chip.classList.add('tone-none'); return; }
    const value = Core.parseValue(key, raw);
    const ev = value == null ? null : Core.evaluate(key, value, draft.sex, ageNumber(), draft.system, r);
    if (!ev) { chip.textContent = 'не понял'; chip.classList.add('tone-bad'); return; }
    chip.textContent = ev.text;
    chip.classList.add('tone-' + ev.tone);
  }

  function refreshResults() {
    const r = req();
    (r ? Core.activeSlots(r, draft.choices, hasValue) : []).forEach(x => updateResult(x.key));
  }

  /* ============================= Навигация ============================= */

  function paintChrome() {
    countEl.textContent = `Шаг ${step + 1} из ${STEPS}`;
    bars.forEach((bar, i) => bar.classList.toggle('is-done', i <= step));
    backBtn.hidden = step === 0;
    nextBtn.textContent = step === STEPS - 1 ? (editing ? 'Сохранить и обновить план' : 'Построить мой план') : 'Далее';
  }

  function paintStep() {
    body.innerHTML = RENDERERS[step]();
    paintChrome();
    if (step === 2) refreshResults();
    validate();
  }

  /* На шагах с полями — фокус в первое поле, иначе на заголовок (его прочитает экранный диктор). */
  function focusFirst() {
    let target = step === 0 ? null : body.querySelector('input:not([disabled])');
    if (!target) {
      target = $('#onbTitle', body);
      if (target) target.setAttribute('tabindex', '-1');
    }
    target = target || nextBtn;
    try { target.focus({ preventScroll: true }); } catch (e) { target.focus(); }
  }

  function go(to) {
    if (busy || to < 0 || to >= STEPS) return;
    const dir = to > step ? 1 : -1;
    step = to;
    if (!animate()) { paintStep(); focusFirst(); return; }
    busy = true;
    gsap.to(body, {
      x: -28 * dir, autoAlpha: 0, duration: 0.2, ease: 'power2.in',
      onComplete: () => {
        paintStep();
        gsap.fromTo(body, { x: 28 * dir, autoAlpha: 0 }, {
          x: 0, autoAlpha: 1, duration: 0.42, ease: 'power3.out',
          onComplete: () => { busy = false; focusFirst(); }
        });
      }
    });
  }

  function hide(after) {
    const done = () => {
      root.hidden = true;
      document.documentElement.classList.remove('is-onboarding');
      if (after) after();
    };
    if (!animate()) { done(); return; }
    gsap.to(card, { y: -24, scale: 0.97, autoAlpha: 0, duration: 0.5, ease: 'power2.in', onComplete: done });
  }

  /* ============================= Завершение ============================= */

  function finish() {
    if (!validate()) return;
    const s = Core.state;
    const r = req();
    if (!s.onboarded || s.demo) s.results = {};
    s.onboarded = true;
    s.demo = false;
    s.system = draft.system;
    s.category = category();
    s.goal = { ...draft.goal };
    s.profile = { sex: draft.sex, age: ageNumber() };
    const active = Core.activeSlots(r, draft.choices, hasValue);
    s.choices = Object.fromEntries(r.slots.filter(sl => sl.options.length).map(sl => {
      const a = active.find(x => x.slot.id === sl.id);
      return [sl.id, a ? a.key : 'skip'];
    }));
    const date = Core.today();
    active.forEach(({ key: k }) => {
      const value = Core.parseValue(k, draft.values[k]);
      if (value == null) return;
      const h = Core.history(k);
      const last = h.length ? h[h.length - 1].value : null;
      if (last != null && Math.abs(last - value) < 1e-9) return;
      if (!s.results[k]) s.results[k] = [];
      s.results[k].push({ date, value });
    });
    s.exam = draft.noDate ? null : draft.exam;
    s.days = draft.days.slice().sort((a, b) => a - b);
    s.planStart = date;
    Core.save();
    const first = !editing;
    hide(() => callbacks.onFinish && callbacks.onFinish({ first }));
  }

  /* ============================= Открытие и события ============================= */

  function open(opts = {}) {
    editing = Boolean(opts.editing);
    closable = opts.closable != null ? Boolean(opts.closable) : editing;
    draft = makeDraft();
    step = Math.max(0, Math.min(STEPS - 1, opts.step || 0));
    document.documentElement.classList.add('is-onboarding');
    root.hidden = false;
    closeBtn.hidden = !closable;
    paintStep();
    if (animate()) {
      gsap.set(body, { x: 0, autoAlpha: 1 });
      gsap.fromTo(card, { y: 36, scale: 0.98, autoAlpha: 0 }, { y: 0, scale: 1, autoAlpha: 1, duration: 0.9, ease: 'power3.out', onComplete: focusFirst });
    } else {
      focusFirst();
    }
  }

  function selectIn(container, selector, chosen) {
    container.querySelectorAll(selector).forEach(b => {
      const on = b === chosen;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-checked', String(on));
    });
  }

  function init(cb) {
    callbacks = cb || {};
    root = $('#onboarding');
    card = $('.onb__card', root);
    body = $('#onbBody');
    nextBtn = $('#onbNext');
    backBtn = $('#onbBack');
    closeBtn = $('#onbClose');
    countEl = $('#onbCount');
    bars = [...root.querySelectorAll('.onb__progress span')];

    nextBtn.addEventListener('click', () => {
      if (!validate()) return;
      if (step < STEPS - 1) go(step + 1);
      else finish();
    });
    backBtn.addEventListener('click', () => go(step - 1));
    closeBtn.addEventListener('click', () => hide(() => callbacks.onClose && callbacks.onClose()));

    body.addEventListener('click', event => {
      const sysBtn = event.target.closest('[data-sys]');
      if (sysBtn && !sysBtn.disabled) {
        if (draft.system !== sysBtn.dataset.sys) draft.category = null;
        draft.system = sysBtn.dataset.sys;
        selectIn(body, '[data-sys]', sysBtn);
        validate();
        return;
      }
      const sex = event.target.closest('[data-sex]');
      if (sex) {
        draft.sex = sex.dataset.sex;
        selectIn(body, '[data-sex]', sex);
        repaintGoal();
        validate();
        return;
      }
      if (Goal.handle(event, draft)) {
        repaintGoal();
        validate();
        return;
      }
      const cat = event.target.closest('[data-cat]');
      if (cat) {
        draft.category = cat.dataset.cat;
        selectIn(body, '[data-cat]', cat);
        repaintGoal();
        validate();
        return;
      }
      const chip = event.target.closest('[data-slot]');
      if (chip) {
        const slotId = chip.dataset.slot;
        draft.choices[slotId] = chip.dataset.key;
        const r = req();
        const list = body.querySelector('.res-list');
        if (r && list) {
          /* Перерисовываем весь список: в ГТО выбор одного пункта по выбору может выключить другой. */
          list.innerHTML = r.slots.map(s => slotHtml(s, r, Core.targetPoints(r))).join('');
          refreshResults();
          const again = list.querySelector(`[data-slot="${slotId}"].is-on`);
          if (again) again.focus();
        }
        validate();
        return;
      }
      const wd = event.target.closest('[data-wd]');
      if (wd) {
        const i = Number(wd.dataset.wd);
        draft.days = draft.days.includes(i) ? draft.days.filter(x => x !== i) : [...draft.days, i];
        wd.classList.toggle('is-on', draft.days.includes(i));
        wd.setAttribute('aria-pressed', String(draft.days.includes(i)));
        validate();
        return;
      }
      if (event.target.closest('[data-demo]')) {
        hide(() => callbacks.onDemo && callbacks.onDemo());
      }
    });

    body.addEventListener('input', event => {
      const t = event.target;
      if (Goal.handleInput(event, draft)) { validate(); return; }
      if (t.id === 'onbAge') { draft.age = t.value.trim(); repaintGoal(); }
      else if (t.dataset.res) { draft.values[t.dataset.res] = t.value; updateResult(t.dataset.res); }
      else if (t.id === 'onbExam') draft.exam = t.value;
      validate();
    });

    body.addEventListener('change', event => {
      if (event.target.id !== 'onbNoDate') return;
      draft.noDate = event.target.checked;
      const exam = $('#onbExam', body);
      if (exam) exam.disabled = draft.noDate;
      validate();
    });

    root.addEventListener('keydown', event => {
      if (event.key === 'Escape' && closable) { hide(() => callbacks.onClose && callbacks.onClose()); return; }
      if (event.key === 'Enter' && event.target.tagName === 'INPUT' && event.target.type !== 'checkbox') {
        event.preventDefault();
        nextBtn.click();
      }
    });
  }

  return { init, open };
})();
