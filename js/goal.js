'use strict';
/* Выбор личной цели — общий блок для анкеты и окна «Изменить цель» на главной.
   Три вида цели (sys.goalKind):
   - баллы (ФСБ, МВД, МО) — сколько баллов хочешь в каждом упражнении: проходной, 60, 80, 100 или своё число;
   - 'category' (ГТО, ФСО) — знак или оценка;
   - 'margin' (СОБР, ОМОН) — ровно норматив или с запасом.
   sel — изменяемый объект { category, goal: { points, margin } }. */
const Goal = (() => {
  const PRESETS = [60, 80, 100];

  const button = (attr, value, on, label, hint) =>
    `<button type="button" class="cat${on ? ' is-on' : ''}" role="radio" aria-checked="${on}" ${attr}="${value}"><b>${label}</b>${hint ? `<small>${hint}</small>` : ''}</button>`;

  function html(sys, sel, req) {
    if (sys.goalKind === 'category') {
      const current = sys.categories.some(c => c.id === sel.category) ? sel.category : sys.categories[0].id;
      return `
        <fieldset class="cats goal">
          <legend>${sys.categoryQuestion}</legend>
          <div class="cat-list" role="radiogroup">${sys.categories.map(c => button('data-goal-cat', c.id, c.id === current, c.label, c.hint)).join('')}</div>
        </fieldset>`;
    }
    if (sys.goalKind === 'margin') {
      const m = Number(sel.goal.margin) || 0;
      return `
        <fieldset class="cats goal">
          <legend>Какой результат хочешь?</legend>
          <div class="cat-list" role="radiogroup">${SOBR_MARGINS.map(x => button('data-goal-margin', x.id, x.id === m, x.label, x.hint)).join('')}</div>
        </fieldset>`;
    }
    const base = Core.basePoints(req);
    const cur = sel.goal.points && (base == null || sel.goal.points > base) ? sel.goal.points : null;
    const presets = PRESETS.filter(p => base == null || p > base);
    const chip = (value, label) => {
      const on = (value || null) === cur;
      return `<button type="button" class="chip${on ? ' is-on' : ''}" role="radio" aria-checked="${on}" data-goal-points="${value}">${label}</button>`;
    };
    const custom = cur && !presets.includes(cur) ? cur : '';
    return `
      <fieldset class="cats goal">
        <legend>Сколько баллов хочешь в каждом упражнении?</legend>
        <div class="goal-row" role="radiogroup">
          ${chip(0, base != null ? `Проходной · ${base}` : 'Проходной')}
          ${presets.map(p => chip(p, p === 100 ? '100 — максимум' : String(p))).join('')}
          <label class="goal-own">своё <input class="goal-input" type="number" inputmode="numeric" min="1" max="100" placeholder="${base != null ? base + 5 : 70}" value="${custom}" aria-label="Своя цель в баллах"></label>
        </div>
        <small class="goal-hint">${base != null
          ? `Проходной уровень — по ${base} ${Core.plural(base, 'баллу', 'балла', 'баллов')}. Цель выше — значит, план и полосы прогресса будут тянуть тебя дальше.`
          : 'Проходной уровень посчитается, когда укажешь возраст.'}</small>
      </fieldset>`;
  }

  /* Клик по варианту. true — если выбор изменился (тогда блок нужно перерисовать). */
  function handle(event, sel) {
    const cat = event.target.closest('[data-goal-cat]');
    if (cat) { sel.category = cat.dataset.goalCat; return true; }
    const margin = event.target.closest('[data-goal-margin]');
    if (margin) { sel.goal.margin = Number(margin.dataset.goalMargin) || 0; return true; }
    const pts = event.target.closest('[data-goal-points]');
    if (pts) { sel.goal.points = Number(pts.dataset.goalPoints) || null; return true; }
    return false;
  }

  /* Ввод своего числа. Перерисовывать не нужно — только снимаем выделение с готовых вариантов. */
  function handleInput(event, sel) {
    const input = event.target;
    if (!input.classList || !input.classList.contains('goal-input')) return false;
    const v = Math.round(Number(input.value));
    sel.goal.points = Number.isFinite(v) && v >= 1 && v <= 100 ? v : null;
    const box = input.closest('.goal');
    if (box) {
      box.querySelectorAll('[data-goal-points]').forEach(b => {
        const on = (Number(b.dataset.goalPoints) || null) === sel.goal.points;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-checked', String(on));
      });
    }
    return true;
  }

  /* Короткая подпись цели для главной. */
  function label(sys, req) {
    if (!req) return '';
    /* У СОБР/ОМОН, ГТО и ФСО цель уже названа в описании требований. */
    if (sys.goalKind === 'margin' || sys.goalKind === 'category') return '';
    const t = Core.targetPoints(req);
    return t > Core.basePoints(req) ? `по ${t} ${Core.plural(t, 'баллу', 'балла', 'баллов')} в каждом` : '';
  }

  return { html, handle, handleInput, label };
})();
