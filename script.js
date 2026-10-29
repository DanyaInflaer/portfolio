(function () {
  var toggle = document.getElementById('inspector-toggle');
  var hint = document.getElementById('hint');
  var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // На телефонах и планшетах наведения нет, поэтому инспектор там отключён.
  if (!canHover) {
    if (toggle) toggle.hidden = true;
    return;
  }

  var enabled = true;
  try {
    if (localStorage.getItem('inspector') === 'off') enabled = false;
  } catch (e) {}

  if (hint) hint.hidden = false;

  var root = document.createElement('div');
  root.className = 'insp';
  root.hidden = true;
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML =
    '<span class="insp-layer insp-margin"></span>' +
    '<span class="insp-layer insp-padding"></span>' +
    '<span class="insp-layer insp-content"></span>' +
    '<span class="insp-label"></span>';
  document.body.appendChild(root);

  var margin = root.querySelector('.insp-margin');
  var padding = root.querySelector('.insp-padding');
  var content = root.querySelector('.insp-content');
  var label = root.querySelector('.insp-label');
  var current = null;
  var introTimer = null;

  function px(value) {
    return parseFloat(value) || 0;
  }

  function place(node, left, top, width, height) {
    node.style.left = left + 'px';
    node.style.top = top + 'px';
    node.style.width = Math.max(width, 0) + 'px';
    node.style.height = Math.max(height, 0) + 'px';
  }

  function draw(el) {
    var r = el.getBoundingClientRect();
    var cs = getComputedStyle(el);
    var m = { t: px(cs.marginTop), r: px(cs.marginRight), b: px(cs.marginBottom), l: px(cs.marginLeft) };
    var p = { t: px(cs.paddingTop), r: px(cs.paddingRight), b: px(cs.paddingBottom), l: px(cs.paddingLeft) };

    place(margin, r.left - m.l, r.top - m.t, r.width + m.l + m.r, r.height + m.t + m.b);
    place(padding, r.left, r.top, r.width, r.height);
    place(content, r.left + p.l, r.top + p.t, r.width - p.l - p.r, r.height - p.t - p.b);

    var cls = el.classList.length ? '.' + el.classList[0] : (el.id ? '#' + el.id : '');
    label.innerHTML =
      '<b>' + el.tagName.toLowerCase() + cls + '</b> ' +
      Math.round(r.width) + ' × ' + Math.round(r.height);

    var labelTop = r.top - m.t - 30;
    if (labelTop < 4) labelTop = r.bottom + m.b + 6;
    label.style.left = Math.max(r.left, 4) + 'px';
    label.style.top = labelTop + 'px';

    root.hidden = false;
    current = el;
  }

  function hide() {
    root.hidden = true;
    current = null;
  }

  function cancelIntro() {
    if (introTimer) {
      clearTimeout(introTimer);
      introTimer = null;
    }
  }

  function inspect(event) {
    if (!enabled) return;
    var target = event.target.closest ? event.target.closest('[data-inspect]') : null;
    if (target) draw(target);
    else hide();
  }

  // Пока идёт показ при загрузке, браузер может сам прислать событие наведения.
  // Его игнорируем: показ прерывает только настоящее движение мыши.
  document.addEventListener('mouseover', function (event) {
    if (introTimer) return;
    inspect(event);
  });

  document.addEventListener('mousemove', function (event) {
    if (!introTimer) return;
    if (!event.movementX && !event.movementY) return;
    cancelIntro();
    inspect(event);
  });

  document.addEventListener('mouseleave', hide);

  window.addEventListener('scroll', function () {
    if (current && enabled) draw(current);
  }, { passive: true });

  window.addEventListener('resize', function () {
    if (current && enabled) draw(current);
  });

  function setEnabled(value) {
    enabled = value;
    toggle.setAttribute('aria-pressed', String(value));
    toggle.textContent = value ? 'Инспектор включён' : 'Инспектор выключен';
    try {
      localStorage.setItem('inspector', value ? 'on' : 'off');
    } catch (e) {}
    if (!value) {
      cancelIntro();
      hide();
    }
  }

  toggle.addEventListener('click', function () {
    setEnabled(!enabled);
  });

  setEnabled(enabled);

  // Один показ при загрузке: подсвечиваем имя, потом управление переходит к курсору.
  if (enabled && !reduceMotion) {
    var title = document.getElementById('name');
    introTimer = setTimeout(function () {
      draw(title);
      introTimer = setTimeout(function () {
        introTimer = null;
        hide();
      }, 2200);
    }, 500);
  }
})();
