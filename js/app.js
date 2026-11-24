'use strict';
/* Норматив — главная страница.
   1) Первый вход — анкета (js/onboarding.js); после неё «открытие»: эмблема появляется в центре.
   2) При прокрутке эмблема делает оборот, уменьшается и уходит вправо; слева — результаты.
   3) Таблица «сейчас → норматив» по официальной таблице баллов, новые замеры.
   4) План тренировок до даты проверки (js/plan.js). */
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const root = document.documentElement;
  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const state = Core.load();

  let openAdd = () => {};
  let ringShown = 0;
  let ringTargetPct = 0;
  let cardsSeen = !hasGsap;

  /* ============================= Отрисовка ============================= */

  function render() {
    if (!state.onboarded) return;
    const m = Core.model();
    const sys = Core.system();
    $('#systemChip').textContent = sys.chip;
    $('#heroEyebrow').textContent = `${sys.name} · ${sys.context}`;
    renderHead(m, sys);
    renderCards(m);
    renderTable(m);
    Plan.render();
    const link = $('#sourceLink');
    link.textContent = sys.source.title;
    link.href = sys.source.url;
    $('#sourceNote').textContent = sys.note || '';
  }

  function renderHead(m, sys) {
    const p = state.profile;
    const group = m.req ? m.req.group : 'вне таблицы';
    const sexLabel = p.sex === 'female' ? 'Женщина' : 'Мужчина';
    const cat = sys.categories ? sys.categories.find(c => c.id === state.category) || sys.categories[0] : null;
    const catLabel = cat ? (cat.label === cat.label.toUpperCase() ? cat.label : cat.label.charAt(0).toLowerCase() + cat.label.slice(1)) : '';
    const goal = Goal.label(sys, m.req);
    const need = (cat && sys.goalKind !== 'category' ? ` · ${catLabel}` : '') + (m.req
      ? ` · нужно ${Core.needText(m.req)}` + (goal ? ` · твоя цель — ${goal}` : '')
      : ' · для этого возраста нормативов нет') +
      (m.req ? ' <button class="link-btn goal-link" type="button" data-goal-edit>Изменить цель</button>' : '');
    const demo = state.demo
      ? '<p class="demo-note">Это пример с демо-данными. <button class="link-btn link-btn--warn" type="button" data-open-onb>Пройти анкету</button> — и план построится по твоим результатам.</p>'
      : '';
    $('#dashHead').innerHTML = `
      <p class="eyebrow">${sys.name} · ${sys.context}</p>
      <h2 class="dash__title" id="dashTitle">Сейчас <span class="arrow">→</span> норматив</h2>
      <p class="dash__meta">${sexLabel}, ${p.age} ${Core.plural(p.age, 'год', 'года', 'лет')} · ${Core.isLevels(m.req) && sys.id === 'gto' ? group : `группа «${group}»`}${need}</p>
      ${demo}`;
  }

  function levelTone(level, target) {
    if (level == null) return 'none';
    if (Core.rank(level) >= Core.rank(target)) return 'ok';
    return Core.rank(level) > 0 ? 'warn' : 'bad';
  }

  function rowTone(row, m) {
    return m.kind === 'levels' ? levelTone(row.level, m.target) : Core.tone(row.pts, m.req, m.target);
  }

  function ringHtml(pct) {
    return `
        <div class="ring" role="img" aria-label="Прогресс к цели: ${pct}%">
          <svg viewBox="0 0 80 80" aria-hidden="true">
            <circle class="ring__track" cx="40" cy="40" r="34"></circle>
            <circle class="ring__fill" id="ringFill" cx="40" cy="40" r="34" pathLength="100" stroke-dasharray="${cardsSeen ? ringShown : 0} 100"></circle>
          </svg>
          <span class="ring__pct">${pct}%</span>
        </div>`;
  }

  /* ГТО: знак сейчас, обязательные испытания и ближайшие шаги к следующему уровню. */
  function renderLevelCards(m) {
    const L = m.target;
    const req = m.req;
    const word = Core.levelName(req, L);
    const single = Core.levelsOf(req).length === 1;
    const gto = !req.summaryLabel;
    const uw = req.unitWord || ['испытание', 'испытания', 'испытаний'];
    const pct = Math.min(100, Math.round(m.atTarget / Math.max(1, m.needTarget) * 100));
    const reached = Core.rank(m.badge) >= Core.rank(L);
    const left = Math.max(m.needTarget - m.atTarget, m.mandatoryCount - m.mandAtTarget);
    const badgeTone = reached ? 'ok' : m.badge !== 'none' ? 'warn' : 'bad';
    const note = reached
      ? 'Цель взята — можно записываться на сдачу'
      : `${single ? 'Осталось подтянуть' : `До «${word}»`}: ещё ${left} ${Core.plural(left, ...uw)}`;
    const steps = m.rows.filter(r => r.step && Core.rank(r.level) < Core.rank(L));
    const missing = m.rows.filter(r => r.now == null).length;
    const stepsHtml = steps.length
      ? steps.map(r => `<li><b>${r.t.short}</b><span>${Core.fmtDelta(r.key, r.step.delta)}${single ? ' до норматива' : ' → ' + Core.levelName(req, r.step.level)}</span></li>`).join('')
      : `<li>${missing ? 'Сначала сделай замер — и появятся шаги' : 'Всё уже на уровне цели'}</li>`;
    const untracked = m.untracked.length
      ? `<p class="card__note card__note--muted">Сдать отдельно: ${m.untracked.map(u => u.other).join('; ')}</p>`
      : '';
    $('#cards').innerHTML = `
      <article class="card card--sum tone-${badgeTone}">
        ${ringHtml(pct)}
        <div>
          <p class="card__label">${req.summaryLabel || 'Знак сейчас'}</p>
          <p class="card__value">${Core.levelTitle(req, m.badge)}</p>
          <p class="card__note">${note}</p>
        </div>
      </article>
      <article class="card tone-${m.mandAtTarget === m.mandatoryCount ? 'ok' : 'bad'}">
        <p class="card__label">${gto ? 'Обязательные' : 'Выполнено'}</p>
        <p class="card__value">${m.mandAtTarget} <span>из ${m.mandatoryCount}${single ? '' : ` на «${word}»`}</span></p>
        <div class="mini-dots">${m.rows.filter(r => r.slot.mandatory).map(r => `<span class="tone-${rowTone(r, m)}" title="${r.t.short}: ${r.level ? Core.levelName(req, r.level) : 'нет замера'}"></span>`).join('')}</div>
        ${untracked}
      </article>
      <article class="card">
        <p class="card__label">Ближайший шаг</p>
        <ul class="steps">${stepsHtml}</ul>
      </article>`;
    if (cardsSeen) animateRing(pct);
    else ringTargetPct = pct;
  }

  function renderCards(m) {
    const box = $('#cards');
    if (!m.req) { box.innerHTML = ''; return; }
    if (m.kind === 'levels') { renderLevelCards(m); return; }
    const known = m.rows.filter(r => r.pts != null);
    const single = m.rows.length === 1;
    const pct = Math.min(100, Math.round(m.sum / m.req.sum * 100));
    const gap = m.req.sum - m.sum;
    const minNeed = m.req.min || 0;
    const okMin = m.rows.filter(r => (r.pts || 0) >= minNeed && r.pts != null).length;
    const allMin = minNeed ? okMin === m.rows.length : true;
    const sumTone = gap <= 0 && allMin ? 'ok' : (allMin && m.sum > 0) ? 'warn' : 'bad';
    const steps = m.rows.filter(r => r.step).sort((a, b) => b.step.gain - a.step.gain);
    const missing = m.rows.length - known.length;
    const stepsHtml = steps.length
      ? steps.map(r => `<li><b>${r.t.short}</b><span>${Core.fmtDelta(r.key, r.step.delta)} → +${r.step.gain} ${Core.plural(r.step.gain, 'балл', 'балла', 'баллов')}</span></li>`).join('')
      : `<li>${missing ? 'Сначала сделай замер — и появятся шаги' : 'Во всех упражнениях уже максимум'}</li>`;

    box.innerHTML = `
      <article class="card card--sum tone-${sumTone}">
        <div class="ring" role="img" aria-label="Сумма: ${pct}% от проходной">
          <svg viewBox="0 0 80 80" aria-hidden="true">
            <circle class="ring__track" cx="40" cy="40" r="34"></circle>
            <circle class="ring__fill" id="ringFill" cx="40" cy="40" r="34" pathLength="100" stroke-dasharray="${cardsSeen ? ringShown : 0} 100"></circle>
          </svg>
          <span class="ring__pct">${pct}%</span>
        </div>
        <div>
          <p class="card__label">${single ? 'Баллы в упражнении' : 'Сумма баллов'}</p>
          <p class="card__value">${m.sum} <span>из ${m.req.sum}</span></p>
          <p class="card__note">${gap > 0 ? `Не хватает ${gap} ${Core.plural(gap, 'балла', 'баллов', 'баллов')}` : 'Проходной балл набран'}${m.target > Core.basePoints(m.req) ? ` · твоя цель — ${m.target * m.rows.length}` : ''}</p>
        </div>
      </article>
      ${m.showMin ? `
      <article class="card tone-${allMin ? 'ok' : 'bad'}">
        <p class="card__label">Минимум в каждом</p>
        <p class="card__value">${okMin} <span>из ${m.rows.length}</span></p>
        <p class="card__note">${missing ? `нет замера: ${missing}` : `упражнений не ниже ${m.req.min} баллов`}</p>
        <div class="mini-dots">${m.rows.map(r => `<span class="tone-${rowTone(r, m)}" title="${r.t.short}: ${r.pts ?? '—'} б."></span>`).join('')}</div>
      </article>` : `
      <article class="card">
        <p class="card__label">Что сдаёшь</p>
        <ul class="steps">${m.rows.map(r => `<li><b>${r.t.short}</b><span class="tone-${rowTone(r, m)} steps__pts">${r.pts ?? '—'} б.</span></li>`).join('')}</ul>
        <p class="card__note">${categoryHint()}</p>
      </article>`}
      <article class="card">
        <p class="card__label">Ближайший шаг</p>
        <ul class="steps">${stepsHtml}</ul>
      </article>`;

    if (cardsSeen) animateRing(pct);
    else ringTargetPct = pct;
  }

  function categoryHint() {
    const sys = Core.system();
    if (!sys.categories) return '';
    const cat = sys.categories.find(c => c.id === state.category) || sys.categories[0];
    return cat.label + ': ' + cat.hint.charAt(0).toLowerCase() + cat.hint.slice(1);
  }

  function animateRing(pct) {
    const fill = $('#ringFill');
    if (!fill) return;
    if (!hasGsap || reduceMotion) fill.setAttribute('stroke-dasharray', `${pct} 100`);
    else gsap.fromTo(fill, { attr: { 'stroke-dasharray': `${ringShown} 100` } }, { attr: { 'stroke-dasharray': `${pct} 100` }, duration: 1.3, ease: 'power3.out' });
    ringShown = pct;
  }

  /* Прогресс к порогу цели в процентах: нижняя точка шкалы — на один «шаг» хуже бронзы. */
  function levelPct(r, v) {
    if (v == null) return 0;
    const b = r.levels.bronze;
    const T = r.targetResult;
    const top = r.levels.gold ?? r.levels.silver ?? b;
    const spread = Math.abs(top - b) || Math.abs(b) * 0.2 || 1;
    const floor = r.t.higher ? b - spread : b + spread;
    const p = r.t.higher ? (v - floor) / (T - floor) : (floor - v) / (floor - T);
    return Math.max(0, Math.min(100, p * 100));
  }

  function renderLevelTable(m) {
    const L = m.target;
    const req = m.req;
    const ids = Core.levelsOf(req);
    const gto = !req.summaryLabel;
    const head = ids.map(id => `<th scope="col"${id === L ? ' class="is-target"' : ''}>${Core.levelCol(req, id)}</th>`).join('');
    $('#normsTable').classList.add('norms--levels');
    $('#normsTable').innerHTML = `
      <thead>
        <tr>
          <th scope="col">${gto ? 'Испытание' : 'Упражнение'}</th>
          <th scope="col">Сейчас</th>
          <th scope="col">${ids.length === 1 ? 'Итог' : 'Уровень'}</th>
          ${head}
          <th scope="col">Прогресс к цели</th>
          <th scope="col"><span class="sr-only">Добавить замер</span></th>
        </tr>
      </thead>
      <tbody>${m.rows.map(r => {
        const pct = v => levelPct(r, v).toFixed(1) + '%';
        const cells = ids.map(id => `<td data-label="${Core.levelCol(req, id)}" class="lvl${id === L ? ' is-target' : ''}">${Core.fmt(r.key, r.levels[id])}</td>`).join('');
        const title = (r.slot.names && r.slot.names[r.key]) || r.t.name;
        const sub = gto ? (r.slot.mandatory ? 'обязательное' : 'по выбору') : r.slot.label.toLowerCase();
        return `
        <tr data-key="${r.key}" class="tone-${rowTone(r, m)}">
          <th scope="row"><span class="ex" title="${title}"><b>${r.t.short}</b><small>${sub} · ${r.t.unit}</small></span></th>
          <td data-label="Сейчас" class="now">${Core.fmt(r.key, r.now)}</td>
          <td data-label="${ids.length === 1 ? 'Итог' : 'Уровень'}"><span class="pts pts--word">${r.level ? Core.levelName(req, r.level) : '—'}</span></td>
          ${cells}
          <td class="bar-cell">
            <div class="bar" role="img" aria-label="${r.t.short}: ${Math.round(levelPct(r, r.now))}% до уровня «${Core.levelName(req, L)}»" style="--w:${pct(r.now)};--s:${pct(r.start)};--m:${pct(r.levels.bronze)}">
              <span class="bar__fill"></span>${L !== 'bronze' ? '<span class="bar__min"></span>' : ''}${r.start != null ? '<span class="bar__start"></span>' : ''}
            </div>
          </td>
          <td class="add-cell"><button class="row-add" type="button" data-add="${r.key}" aria-label="Добавить замер: ${r.t.short}">+</button></td>
        </tr>`;
      }).join('')}</tbody>`;
    $('#legendBad').textContent = gto ? 'без знака' : 'не выполнено';
    $('#legendWarn').textContent = 'ниже цели';
    if (req.footText) {
      $('#tableFoot').innerHTML = req.footText + ' Светлая засечка на полосе — первый замер.';
      return;
    }
    const need = req.need[L];
    $('#tableFoot').innerHTML = `Пороги — из таблицы ГТО для ступени «${req.group}». ` +
      `<b>Знак «${Core.levelName(req, L)}»</b> — когда на этот уровень сданы все обязательные испытания и всего ${need} ${Core.plural(need, 'испытание', 'испытания', 'испытаний')}. ` +
      `Столбец цели подсвечен${L !== 'bronze' ? ', пунктир на полосе — бронза' : ''}, светлая засечка — первый замер.` +
      (m.untracked.length ? ` Обязательное испытание «${m.untracked.map(u => u.other).join('; ')}» сайт пока не отслеживает — сдай его отдельно.` : '');
  }

  function renderTable(m) {
    const table = $('#normsTable');
    const foot = $('#tableFoot');
    if (!m.req) { table.innerHTML = ''; foot.textContent = ''; return; }
    if (m.kind === 'levels') { renderLevelTable(m); return; }
    table.classList.remove('norms--levels');
    table.innerHTML = `
      <thead>
        <tr>
          <th scope="col">Упражнение</th>
          <th scope="col">Старт</th>
          <th scope="col">Сейчас</th>
          <th scope="col">Баллы</th>
          ${m.showMin ? `<th scope="col">Минимум<small>${m.req.min} б.</small></th>` : ''}
          <th scope="col">Цель<small>${m.target} б.</small></th>
          <th scope="col">Прогресс к цели</th>
          <th scope="col"><span class="sr-only">Добавить замер</span></th>
        </tr>
      </thead>
      <tbody>${m.rows.map(r => rowHtml(r, m)).join('')}</tbody>`;
    const n = m.rows.length;
    const goal = n === 1
      ? `<b>Цель</b> — результат на ${m.target} баллов. `
      : m.target > Core.basePoints(m.req)
        ? `<b>Твоя цель</b> — по ${m.target} ${Core.plural(m.target, 'баллу', 'балла', 'баллов')} в каждом упражнении, в сумме ${m.target * n}; для прохода хватит ${m.req.sum}. `
        : `<b>Цель</b> — по ${m.target} ${Core.plural(m.target, 'баллу', 'балла', 'баллов')} в каждом упражнении, тогда в сумме выйдет не меньше ${m.req.sum}. `;
    $('#legendBad').textContent = m.showMin ? 'ниже минимума' : 'мало баллов';
    $('#legendWarn').textContent = m.showMin ? 'минимум есть' : 'ниже цели';
    foot.innerHTML = (m.showMin ? `<b>Минимум</b> — результат на ${m.req.min} баллов: ниже нельзя ни в одном упражнении. ` : '') +
      goal + (m.showMin ? 'На полосе: пунктир — минимум, светлая засечка — твой первый замер.' : 'Светлая засечка на полосе — твой первый замер.');
  }

  function rowHtml(r, m) {
    const pct = v => Math.max(0, Math.min(100, (v || 0) / m.target * 100)).toFixed(1) + '%';
    const label = `${r.t.short}: ${r.pts ?? 0} из ${m.target} баллов цели`;
    return `
      <tr data-key="${r.key}" class="tone-${rowTone(r, m)}">
        <th scope="row"><span class="ex"><b>${r.t.short}</b><small>${r.slot.label} · ${r.t.unit}</small></span></th>
        <td data-label="Старт" class="muted">${Core.fmt(r.key, r.start)}</td>
        <td data-label="Сейчас" class="now">${Core.fmt(r.key, r.now)}</td>
        <td data-label="Баллы"><span class="pts">${r.pts ?? '—'}</span></td>
        ${m.showMin ? `<td data-label="Минимум">${Core.fmt(r.key, r.minResult)}</td>` : ''}
        <td data-label="Цель">${Core.fmt(r.key, r.targetResult)}</td>
        <td class="bar-cell">
          <div class="bar" role="img" aria-label="${label}" style="--w:${pct(r.pts)};--s:${pct(r.startPts)};--m:${pct(m.req.min)}">
            <span class="bar__fill"></span>${m.showMin ? '<span class="bar__min"></span>' : ''}${r.start != null ? '<span class="bar__start"></span>' : ''}
          </div>
        </td>
        <td class="add-cell"><button class="row-add" type="button" data-add="${r.key}" aria-label="Добавить замер: ${r.t.short}">+</button></td>
      </tr>`;
  }

  /* ============================= Новый замер ============================= */

  function setupDialog() {
    const dialog = $('#addDialog');
    const form = $('#addForm');
    const select = $('#addKey');
    const input = $('#addValue');
    const date = $('#addDate');
    const hint = $('#addHint');
    const preview = $('#addPreview');

    function update() {
      const key = select.value;
      const t = TESTS[key];
      const what = t.time ? 'Минуты и секунды' : t.decimals ? 'Секунды' : t.unit === 'раз' ? 'Количество раз' : t.unit === 'см' ? 'Сантиметры' : 'Метры';
      hint.textContent = `${what}, например ${t.ex}`;
      input.placeholder = t.ex;
      preview.className = 'preview';
      if (!input.value.trim()) { preview.textContent = ''; return; }
      const value = Core.parseValue(key, input.value);
      const ev = value == null ? null : Core.evaluate(key, value);
      if (!ev) {
        preview.className = 'preview error';
        preview.textContent = 'Не получилось прочитать результат — проверь формат.';
        return;
      }
      const current = Core.model().rows.find(r => r.key === key);
      if (ev.level !== undefined) {
        const was = current ? current.level : null;
        const wasText = was == null ? '' : was === ev.level ? ' (как сейчас)' : ` (сейчас: ${Core.levelName(Core.model().req, was)})`;
        preview.innerHTML = `= <b>${ev.text}</b>${wasText}`;
        return;
      }
      const diff = current && current.pts != null ? ev.pts - current.pts : null;
      const diffText = diff == null ? '' : diff === 0 ? ' (как сейчас)' : ` (${diff > 0 ? '+' : '−'}${Math.abs(diff)} к текущему)`;
      preview.innerHTML = `= <b>${ev.pts}</b> ${Core.plural(ev.pts, 'балл', 'балла', 'баллов')}${diffText}`;
    }

    function open(key) {
      select.innerHTML = Core.model().rows.map(r => `<option value="${r.key}">${TESTS[r.key].name}</option>`).join('');
      if (key) select.value = key;
      input.value = '';
      date.value = Core.today();
      date.max = Core.today();
      update();
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
      input.focus();
    }

    function close() {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }

    select.addEventListener('change', update);
    input.addEventListener('input', update);
    $('#addCancel').addEventListener('click', close);

    form.addEventListener('submit', event => {
      event.preventDefault();
      const key = select.value;
      const value = Core.parseValue(key, input.value);
      if (value == null) {
        update();
        if (!input.value.trim()) { preview.className = 'preview error'; preview.textContent = 'Введи результат.'; }
        input.focus();
        return;
      }
      if (!state.results[key]) state.results[key] = [];
      state.results[key].push({ date: date.value || Core.today(), value });
      Core.save();
      close();
      render();
      flashRow(key);
    });

    return open;
  }

  function flashRow(key) {
    const row = document.querySelector(`tr[data-key="${key}"]`);
    if (!row || !hasGsap || reduceMotion) return;
    gsap.fromTo(row, { backgroundColor: 'rgba(233, 192, 111, 0.2)' }, { backgroundColor: 'rgba(233, 192, 111, 0)', duration: 1.6, ease: 'power2.out', clearProps: 'backgroundColor' });
    gsap.from(row.querySelector('.bar__fill'), { width: 0, duration: 1, ease: 'power3.out', clearProps: 'width' });
  }

  /* ============================= Кнопки ============================= */

  function setupRain() {
    const button = $('#rainToggle');
    const sync = () => {
      button.setAttribute('aria-pressed', String(Boolean(state.rain)));
      button.title = state.rain ? 'Выключить дождь' : 'Включить дождь';
      Sky.setRain(Boolean(state.rain));
    };
    button.addEventListener('click', () => { state.rain = !state.rain; Core.save(); sync(); });
    sync();
    return sync;
  }

  /* Окно «Изменить цель»: тот же блок, что в анкете, но без повторного прохождения анкеты. */
  function setupGoalDialog() {
    const dialog = $('#goalDialog');
    const body = $('#goalBody');
    let sel = null;
    const paint = () => {
      const sys = Core.system();
      const req = Core.requirement(state.profile.sex, state.profile.age, sel.category, sys.id, sel.goal);
      body.innerHTML = Goal.html(sys, sel, req);
    };
    const close = () => (typeof dialog.close === 'function' ? dialog.close() : dialog.removeAttribute('open'));
    document.addEventListener('click', event => {
      if (!event.target.closest('[data-goal-edit]')) return;
      sel = { category: state.category, goal: { points: null, margin: 0, ...(state.goal || {}) } };
      paint();
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    });
    body.addEventListener('click', event => { if (sel && Goal.handle(event, sel)) paint(); });
    body.addEventListener('input', event => { if (sel) Goal.handleInput(event, sel); });
    $('#goalCancel').addEventListener('click', close);
    $('#goalForm').addEventListener('submit', event => {
      event.preventDefault();
      if (Core.system().goalKind === 'category') state.category = sel.category;
      state.goal = { ...sel.goal };
      Core.save();
      close();
      render();
    });
  }

  function setupButtons() {
    $('#addBtn').addEventListener('click', () => openAdd());
    $('#profileBtn').addEventListener('click', () => Onboarding.open({ editing: state.onboarded && !state.demo, closable: state.onboarded }));
    document.addEventListener('click', event => {
      const add = event.target.closest('[data-add]');
      if (add) { openAdd(add.dataset.add); return; }
      if (event.target.closest('[data-open-onb]')) Onboarding.open({ editing: false, closable: true });
    });
    $('#resetAll').addEventListener('click', () => {
      if (!window.confirm('Удалить все замеры и ответы анкеты в этом браузере и пройти анкету заново?')) return;
      Core.resetAll();
      Onboarding.open({ step: 0 });
    });
  }

  /* ============================= Эмблема 2.5D ============================= */

  /* Объём — «слоёный пирог»: спереди сама эмблема, за ней пачка затемнённых копий;
     при повороте они складываются в металлический торец. Сзади — гладкий металлический реверс. */
  let emblemSystem = null;

  function buildEmblem() {
    const host = $('#emblemIdle');
    host.innerHTML = '';
    emblemSystem = Core.system().id;
    const src = new URL(Core.system().emblem, document.baseURI).href;
    root.style.setProperty('--emblem-url', `url("${src}")`);
    const img = new Image();
    img.src = src;
    return img.decode().then(() => {
      root.style.setProperty('--emblem-ratio', (img.naturalWidth / img.naturalHeight).toFixed(4));
      let edgeSrc = null;
      try {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const g = c.getContext('2d');
        g.drawImage(img, 0, 0);
        g.globalCompositeOperation = 'source-atop';
        g.fillStyle = 'rgba(30, 33, 38, 0.74)';
        g.fillRect(0, 0, c.width, c.height);
        edgeSrc = c.toDataURL('image/png');
      } catch (e) { edgeSrc = null; /* без сервера canvas недоступен — затемним фильтром */ }

      const layersCount = window.innerWidth < 861 ? 10 : 20;
      const frag = document.createDocumentFragment();
      const back = document.createElement('div');
      back.className = 'emblem-back';
      frag.appendChild(back);
      for (let i = layersCount; i >= 1; i -= 1) {
        const layer = document.createElement('img');
        layer.className = 'emblem-layer';
        layer.alt = '';
        layer.src = edgeSrc || src;
        if (!edgeSrc) layer.style.filter = 'brightness(.35)';
        layer.style.setProperty('--k', (i / layersCount).toFixed(3));
        frag.appendChild(layer);
      }
      const face = document.createElement('img');
      face.className = 'emblem-layer emblem-layer--front';
      face.alt = '';
      face.src = src;
      frag.appendChild(face);
      const shine = document.createElement('div');
      shine.className = 'emblem-shine';
      frag.appendChild(shine);
      host.appendChild(frag);
    });
  }

  /* Куда «приземляется» эмблема на широком экране: в правую колонку (#emblemSlot). */
  function dockTarget() {
    const slot = $('#emblemSlot');
    const move = $('#emblemMove');
    const rect = slot.getBoundingClientRect();
    const top = parseFloat(getComputedStyle(slot).top) || 100;
    const scale = Math.min(rect.width / move.offsetWidth, rect.height / move.offsetHeight, 0.8);
    return {
      x: rect.left + rect.width / 2 - window.innerWidth / 2,
      y: top + rect.height / 2 - window.innerHeight / 2,
      scale
    };
  }

  function setupScene() {
    const move = $('#emblemMove');
    const spin = $('#emblemSpin');
    const setShine = p => root.style.setProperty('--shine', (100 - p * 100).toFixed(1) + '%');

    const mm = gsap.matchMedia();
    mm.add({ desktop: '(min-width: 861px)', mobile: '(max-width: 860px)' }, ctx => {
      const { desktop } = ctx.conditions;
      const vh = () => window.innerHeight;
      gsap.set(move, { x: 0, y: () => -vh() * 0.09, scale: 1, autoAlpha: 1 });

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: '#dash',
          start: 'top bottom',
          end: 'top top',
          scrub: reduceMotion ? true : 0.9,
          invalidateOnRefresh: true
        },
        onUpdate: () => setShine(tl.progress())
      });

      tl.to('.hero__copy', { y: -70, autoAlpha: 0, duration: 0.35, ease: 'power1.in' }, 0)
        .to('.scroll-hint', { autoAlpha: 0, duration: 0.12 }, 0);

      if (desktop) {
        tl.to(move, { x: () => dockTarget().x, y: () => dockTarget().y, scale: () => dockTarget().scale, duration: 1, ease: 'power2.inOut' }, 0);
      } else {
        /* На телефоне справа места нет: эмблема уходит за таблицу полупрозрачным знаком. */
        tl.to(move, { y: () => -vh() * 0.12, scale: 0.8, autoAlpha: 0.14, duration: 1, ease: 'power2.inOut' }, 0);
      }
      if (!reduceMotion) tl.to(spin, { rotationY: 360, duration: 1, ease: 'power2.inOut' }, 0);
      return () => gsap.set(spin, { clearProps: 'transform' });
    });
  }

  /* «Открытие»: эмблема и заголовок появляются — при загрузке и сразу после анкеты. */
  function playIntro() {
    if (!hasGsap) return;
    if (reduceMotion) { gsap.set(['#emblemStage', '.hero__copy > *'], { autoAlpha: 1 }); return; }
    gsap.fromTo('#emblemStage', { autoAlpha: 0, scale: 0.86 }, { autoAlpha: 1, scale: 1, duration: 1.9, ease: 'power3.out' });
    gsap.fromTo('.hero__copy > *', { y: 36, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.2, stagger: 0.12, delay: 0.35, ease: 'power3.out' });
    gsap.fromTo(root, { '--shine': '100%' }, { '--shine': '0%', duration: 2.2, delay: 0.6, ease: 'power2.inOut' });
  }

  function setupReveals() {
    ScrollTrigger.batch('.reveal', {
      start: 'top 92%',
      once: true,
      onEnter: els => { if (els.length) gsap.to(els, { opacity: 1, y: 0, duration: 0.9, stagger: 0.1, ease: 'power3.out' }); }
    });
    ScrollTrigger.create({
      trigger: '#cards',
      start: 'top 85%',
      once: true,
      onEnter: () => {
        cardsSeen = true;
        animateRing(ringTargetPct);
        if (!reduceMotion) gsap.from('.bar__fill', { width: 0, duration: 1.2, stagger: 0.12, delay: 0.25, ease: 'power3.out', clearProps: 'width' });
      }
    });
  }

  /* При прокрутке небо слегка темнеет, но светлый угол остаётся. */
  function setupDarkness() {
    const depth = 1;
    if (hasGsap) {
      const st = ScrollTrigger.create({
        start: 0,
        end: () => window.innerHeight * 1.15,
        onUpdate: self => Sky.setDarkness(depth * self.progress)
      });
      Sky.setDarkness(depth * st.progress, true);
    } else {
      const update = () => Sky.setDarkness(depth * Math.min(1, window.scrollY / (window.innerHeight * 1.15)));
      window.addEventListener('scroll', update, { passive: true });
      update();
    }
  }

  /* ============================= Анкета ↔ главная ============================= */

  function afterOnboarding() {
    render();
    window.scrollTo(0, 0);
    const done = () => {
      if (hasGsap) ScrollTrigger.refresh();
      playIntro();
    };
    /* Сменилось ведомство — пересобираем эмблему (у каждого своя картинка и пропорции). */
    if (emblemSystem !== Core.system().id) buildEmblem().catch(() => {}).finally(done);
    else done();
  }

  /* ============================= Запуск ============================= */

  function init() {
    root.classList.add(hasGsap ? 'anim' : 'no-gsap');
    if (hasGsap) gsap.registerPlugin(ScrollTrigger);
    const firstVisit = !state.onboarded;
    if (firstVisit) root.classList.add('is-onboarding');

    setupRain();
    openAdd = setupDialog();
    setupButtons();
    setupGoalDialog();
    Plan.mount($('#plan'), {
      onEdit: () => Onboarding.open({ editing: !state.demo, closable: true, step: state.demo ? 0 : 3 }),
      onTest: () => openAdd()
    });
    Onboarding.init({
      onFinish: afterOnboarding,
      onDemo: () => { Core.useDemo(); afterOnboarding(); },
      onClose: () => { if (hasGsap) ScrollTrigger.refresh(); }
    });
    setupDarkness();
    render();

    buildEmblem()
      .catch(() => { /* без эмблемы страница всё равно работает */ })
      .finally(() => {
        if (hasGsap) {
          setupScene();
          setupReveals();
          ScrollTrigger.refresh();
        }
        if (!firstVisit) playIntro();
      });

    if (firstVisit) Onboarding.open({ step: 0 });
    if (hasGsap && document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
  }

  init();
})();
