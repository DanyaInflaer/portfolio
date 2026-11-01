(function () {
  'use strict';

  var html = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Смена темы ---------- */

  (function themes() {
    var barColor = { contrast: '#0A0F1C', dark: '#0A0F1C', light: '#ECEEF2' };
    var buttons = document.querySelectorAll('[data-theme-set]');
    var meta = document.querySelector('meta[name="theme-color"]');

    function apply(name, save) {
      if (!barColor[name]) name = 'contrast';
      html.setAttribute('data-theme', name);
      buttons.forEach(function (button) {
        button.setAttribute('aria-pressed', String(button.getAttribute('data-theme-set') === name));
      });
      if (meta) meta.setAttribute('content', barColor[name]);
      if (save) {
        try { localStorage.setItem('theme', name); } catch (e) {}
      }
      document.dispatchEvent(new CustomEvent('themechange'));
    }

    buttons.forEach(function (button) {
      button.addEventListener('click', function () {
        var name = button.getAttribute('data-theme-set');
        if (name === html.getAttribute('data-theme')) return;

        if (reduce || !document.startViewTransition) {
          apply(name, true);
          return;
        }

        // Новая тема расходится кругом от нажатой кнопки.
        var rect = button.getBoundingClientRect();
        var x = rect.left + rect.width / 2;
        var y = rect.top + rect.height / 2;
        var radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
        var transition = document.startViewTransition(function () { apply(name, true); });
        transition.ready.then(function () {
          html.animate(
            { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + radius + 'px at ' + x + 'px ' + y + 'px)'] },
            { duration: 650, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', pseudoElement: '::view-transition-new(root)' }
          );
        }, function () {});
      });
    });

    apply(html.getAttribute('data-theme') || 'contrast', false);
  })();

  /* ---------- «Расшифровка» букв ---------- */

  var POOL = '01#%&@$<>/{}[]=+*?';

  function randomChar() {
    return POOL.charAt(Math.floor(Math.random() * POOL.length));
  }

  // Разбирает текст элемента на буквы, чтобы потом проявлять их по очереди.
  function splitChars(el, text) {
    var list = [];
    el.setAttribute('aria-label', text);
    el.textContent = '';
    text.split(' ').forEach(function (word, index, all) {
      var wrap = document.createElement('span');
      wrap.className = 'word';
      wrap.setAttribute('aria-hidden', 'true');
      word.split('').forEach(function (letter) {
        var node = document.createElement('span');
        node.className = 'ch lock';
        node.textContent = letter;
        wrap.appendChild(node);
        list.push({ el: node, final: letter, done: false, busy: false, width: 0 });
      });
      el.appendChild(wrap);
      if (index < all.length - 1) el.appendChild(document.createTextNode(' '));
    });
    return list;
  }

  // Сначала буквы случайные, потом по очереди встают на место.
  function decrypt(list, opts, onDone) {
    var lastSwap = 0;
    var started;
    var plan;

    // Фиксируем ширину букв, чтобы строка не прыгала, пока символы меняются.
    list.forEach(function (c) { c.width = c.el.getBoundingClientRect().width; });
    list.forEach(function (c) {
      c.done = false;
      c.el.style.width = c.width + 'px';
      c.el.classList.remove('lock');
      c.el.textContent = randomChar();
    });

    plan = list.map(function (c, i) { return opts.first + i * opts.step + Math.random() * opts.spread; });
    started = performance.now();

    function tick(now) {
      var elapsed = now - started;
      var swap = now - lastSwap > 45;
      if (swap) lastSwap = now;

      list.forEach(function (c, i) {
        if (c.done) return;
        if (elapsed >= plan[i]) {
          c.done = true;
          c.el.textContent = c.final;
          c.el.classList.add('lock');
        } else if (swap) {
          c.el.textContent = randomChar();
        }
      });

      if (list.every(function (c) { return c.done; })) {
        list.forEach(function (c) { c.el.style.width = ''; });
        if (onDone) onDone();
        return;
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ---------- Приветствие по времени суток ---------- */

  function greetingFor(date) {
    var h = date.getHours();
    if (h >= 5 && h < 12) return 'Доброе утро';
    if (h >= 12 && h < 18) return 'Добрый день';
    if (h >= 18 && h < 23) return 'Добрый вечер';
    return 'Доброй ночи';
  }

  var heading = document.getElementById('greeting');
  var text = greetingFor(new Date());
  var chars = splitChars(heading, text);

  function showRest() {
    html.classList.add('hero-in');
  }

  // Когда приветствие готово, буквы мерцают под курсором.
  function enableFlicker() {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    function flicker(c, delay) {
      // Пауза между повторами, чтобы буква не мерцала бесконечно под неподвижным курсором.
      if (!c || c.busy || performance.now() < (c.cooldown || 0)) return;
      c.busy = true;
      c.cooldown = performance.now() + delay + 1200;
      setTimeout(function () {
        var ticks = 0;
        c.el.style.width = c.el.getBoundingClientRect().width + 'px';
        c.el.classList.remove('lock');
        var timer = setInterval(function () {
          ticks++;
          if (ticks > 6) {
            clearInterval(timer);
            c.el.textContent = c.final;
            c.el.classList.add('lock');
            c.el.style.width = '';
            c.busy = false;
            return;
          }
          c.el.textContent = randomChar();
        }, 45);
      }, delay);
    }

    heading.addEventListener('pointerover', function (event) {
      var target = event.target.closest ? event.target.closest('.ch') : null;
      if (!target) return;
      var index = -1;
      chars.forEach(function (c, i) { if (c.el === target) index = i; });
      if (index < 0) return;
      flicker(chars[index], 0);
      flicker(chars[index - 1], 60);
      flicker(chars[index + 1], 60);
    });
  }

  function startGreeting() {
    if (reduce) {
      heading.classList.add('ready');
      showRest();
      html.classList.add('chart-in');
      return;
    }
    var fontWait = (document.fonts && document.fonts.load)
      ? document.fonts.load('700 100px Geologica', text).catch(function () {})
      : Promise.resolve();
    var timeout = new Promise(function (resolve) { setTimeout(resolve, 400); });
    Promise.race([fontWait, timeout]).then(function () {
      decrypt(chars, { first: 260, step: 70, spread: 180 }, enableFlicker);
      heading.classList.add('ready');
      setTimeout(showRest, 650);
      setTimeout(function () { html.classList.add('chart-in'); }, 500);
    });
  }

  /* ---------- Заголовки разделов проявляются при прокрутке ---------- */

  (function headings() {
    if (reduce || !('IntersectionObserver' in window)) return;
    var items = [];
    document.querySelectorAll('.section h2').forEach(function (el) {
      items.push({ el: el, list: splitChars(el, el.textContent.trim()) });
      el.classList.add('dec-wait');
    });

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        items.forEach(function (item) {
          if (item.el !== entry.target) return;
          item.el.classList.remove('dec-wait');
          decrypt(item.list, { first: 60, step: 38, spread: 90 });
        });
      });
    }, { threshold: 0.6 });
    items.forEach(function (item) { observer.observe(item.el); });
  })();

  /* ---------- Линия роста ---------- */

  (function buildChart() {
    var path = document.getElementById('chart-path');
    var dot = document.getElementById('chart-dot');
    var seed = 7;
    function rand() {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    }

    var count = 48;
    var y = 165;
    var d = '';
    var lastX = 0;
    var lastY = y;
    for (var i = 0; i < count; i++) {
      var x = (i / (count - 1)) * 950;
      y += (rand() - 0.5) * 28 - 2.2;
      y = Math.max(24, Math.min(188, y));
      d += (i === 0 ? 'M' : ' L') + x.toFixed(1) + ' ' + y.toFixed(1);
      lastX = x;
      lastY = y;
    }
    path.setAttribute('d', d);
    dot.style.left = (lastX / 1000) * 100 + '%';
    dot.style.top = (lastY / 200) * 100 + '%';
  })();

  /* ---------- Сеть точек на главном экране ---------- */

  (function network() {
    var hero = document.getElementById('top');
    var canvas = document.getElementById('net');
    var ctx = canvas.getContext('2d');
    var width = 0;
    var height = 0;
    var nodes = [];
    var pointer = { x: -999, y: -999 };
    var visible = true;
    var frameId = 0;
    var LINK = 140;
    var REACH = 190;
    var frameGap = 0;
    var lastFrame = 0;
    var colors = { line: '143,163,199', node: '190,205,235', accent: '255,180,59' };

    // Цвета сети берём из текущей темы.
    function readColors() {
      var style = getComputedStyle(hero);
      colors.line = style.getPropertyValue('--net-line').replace(/\s/g, '') || colors.line;
      colors.node = style.getPropertyValue('--net-node').replace(/\s/g, '') || colors.node;
      colors.accent = style.getPropertyValue('--net-accent').replace(/\s/g, '') || colors.accent;
    }

    function resize() {
      var small = window.innerWidth < 700;
      var dpr = Math.min(window.devicePixelRatio || 1, small ? 1 : 2);
      frameGap = small ? 33 : 0;
      var rect = hero.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // На телефонах точек меньше: сеть остаётся красивой, а процессор отдыхает.
      var total = Math.max(22, Math.min(small ? 46 : 90, Math.round((width * height) / 16000)));
      nodes = [];
      for (var i = 0; i < total; i++) {
        nodes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          r: 1 + Math.random() * 1.4
        });
      }
      draw(false);
    }

    // Линии одинаковой яркости рисуются одним вызовом, а не по одной.
    var BUCKETS = 5;
    var buckets = [];
    for (var b = 0; b < BUCKETS; b++) buckets.push([]);

    function draw(move) {
      var i, j, a, c, dx, dy, dist, alpha, k, list;
      ctx.clearRect(0, 0, width, height);

      if (move) {
        for (i = 0; i < nodes.length; i++) {
          a = nodes[i];
          dx = pointer.x - a.x;
          dy = pointer.y - a.y;
          dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < REACH && dist > 1) {
            a.vx += (dx / dist) * 0.012;
            a.vy += (dy / dist) * 0.012;
          }
          a.vx *= 0.995;
          a.vy *= 0.995;
          a.x += a.vx;
          a.y += a.vy;
          if (a.x < -10) a.x = width + 10;
          if (a.x > width + 10) a.x = -10;
          if (a.y < -10) a.y = height + 10;
          if (a.y > height + 10) a.y = -10;
        }
      }

      for (k = 0; k < BUCKETS; k++) buckets[k].length = 0;
      ctx.lineWidth = 1;

      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        for (j = i + 1; j < nodes.length; j++) {
          c = nodes[j];
          dx = a.x - c.x;
          dy = a.y - c.y;
          if (dx > LINK || dx < -LINK || dy > LINK || dy < -LINK) continue;
          dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < LINK) {
            k = Math.min(BUCKETS - 1, Math.floor((1 - dist / LINK) * BUCKETS));
            buckets[k].push(a.x, a.y, c.x, c.y);
          }
        }
      }

      for (k = 0; k < BUCKETS; k++) {
        list = buckets[k];
        if (!list.length) continue;
        alpha = ((k + 0.5) / BUCKETS) * 0.22;
        ctx.strokeStyle = 'rgba(' + colors.line + ',' + alpha.toFixed(3) + ')';
        ctx.beginPath();
        for (j = 0; j < list.length; j += 4) {
          ctx.moveTo(list[j], list[j + 1]);
          ctx.lineTo(list[j + 2], list[j + 3]);
        }
        ctx.stroke();
      }

      // Линии от курсора к ближайшим точкам.
      if (pointer.x > -900) {
        for (i = 0; i < nodes.length; i++) {
          a = nodes[i];
          dx = a.x - pointer.x;
          dy = a.y - pointer.y;
          dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < REACH) {
            alpha = (1 - dist / REACH) * 0.6;
            ctx.strokeStyle = 'rgba(' + colors.accent + ',' + alpha.toFixed(3) + ')';
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(pointer.x, pointer.y);
            ctx.stroke();
          }
        }
      }

      // Все точки одним вызовом.
      ctx.fillStyle = 'rgba(' + colors.node + ',0.6)';
      ctx.beginPath();
      for (i = 0; i < nodes.length; i++) {
        ctx.moveTo(nodes[i].x + nodes[i].r, nodes[i].y);
        ctx.arc(nodes[i].x, nodes[i].y, nodes[i].r, 0, Math.PI * 2);
      }
      ctx.fill();
    }

    // На телефонах сеть рисуется 30 раз в секунду: на глаз то же самое, а батарея живёт дольше.
    function loop(now) {
      frameId = requestAnimationFrame(loop);
      if (frameGap && now - lastFrame < frameGap - 2) return;
      lastFrame = now;
      draw(true);
    }

    function play() {
      if (reduce || frameId || !visible || document.hidden) return;
      frameId = requestAnimationFrame(loop);
    }

    function pause() {
      cancelAnimationFrame(frameId);
      frameId = 0;
    }

    hero.addEventListener('pointermove', function (event) {
      var rect = hero.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
    });
    hero.addEventListener('pointerleave', function () {
      pointer.x = -999;
      pointer.y = -999;
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) pause();
      else play();
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) play();
        else pause();
      }).observe(hero);
    }

    var resizeTimer = 0;
    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 120);
    }
    if ('ResizeObserver' in window) new ResizeObserver(onResize).observe(hero);
    else window.addEventListener('resize', onResize);

    document.addEventListener('themechange', function () {
      readColors();
      if (!frameId) draw(false);
    });

    readColors();
    resize();
    play();
  })();

  /* ---------- Прокрутка: полоса сверху и уплывающий главный экран ---------- */

  (function scrollEffects() {
    var bar = document.querySelector('.progress');
    var hero = document.getElementById('top');
    var inner = hero.querySelector('.hero-inner');
    var chart = hero.querySelector('.chart');
    var maxScroll = 0;
    var heroHeight = 1;
    var lastDrift = -1;
    var waiting = false;

    // Размеры страницы читаем только когда они меняются, а не на каждом кадре прокрутки.
    function measure() {
      maxScroll = Math.max(html.scrollHeight - window.innerHeight, 0);
      heroHeight = hero.offsetHeight || 1;
      update();
    }

    function update() {
      waiting = false;
      var y = window.scrollY;
      bar.style.transform = 'scaleX(' + (maxScroll > 0 ? Math.min(y / maxScroll, 1) : 0).toFixed(4) + ')';

      if (reduce) return;
      var d = Math.round(Math.min(Math.max(y, 0), heroHeight));
      if (d === lastDrift) return;
      lastDrift = d;
      inner.style.transform = 'translate3d(0,' + (d * 0.25).toFixed(1) + 'px,0)';
      inner.style.opacity = Math.max(0, 1 - (d / heroHeight) * 1.25).toFixed(3);
      chart.style.transform = 'translate3d(0,' + (d * 0.45).toFixed(1) + 'px,0)';
    }

    window.addEventListener('scroll', function () {
      if (!waiting) {
        waiting = true;
        requestAnimationFrame(update);
      }
    }, { passive: true });
    window.addEventListener('resize', measure);
    if ('ResizeObserver' in window) new ResizeObserver(measure).observe(document.body);
    measure();
  })();

  /* ---------- Скриншот проекта наклоняется за курсором ---------- */

  (function tilt() {
    var link = document.querySelector('.shot a');
    if (!link || reduce || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    link.addEventListener('pointermove', function (event) {
      var rect = link.getBoundingClientRect();
      var px = (event.clientX - rect.left) / rect.width;
      var py = (event.clientY - rect.top) / rect.height;
      link.style.setProperty('--rx', ((0.5 - py) * 6).toFixed(2) + 'deg');
      link.style.setProperty('--ry', ((px - 0.5) * 8).toFixed(2) + 'deg');
      link.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
      link.style.setProperty('--my', (py * 100).toFixed(1) + '%');
      link.classList.add('tilting');
    });

    link.addEventListener('pointerleave', function () {
      link.classList.remove('tilting');
      link.style.setProperty('--rx', '0deg');
      link.style.setProperty('--ry', '0deg');
    });
  })();

  /* ---------- Линии, которые прорисовываются при появлении ---------- */

  (function rules() {
    var items = document.querySelectorAll('.ruled');
    if (reduce || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0, rootMargin: '0px 0px -12% 0px' });
    items.forEach(function (el) { observer.observe(el); });
  })();

  /* ---------- Калькулятор вклада ---------- */

  (function depositCalc() {
    var form = document.getElementById('calc-form');
    var sumInput = document.getElementById('calc-sum');
    var monthsInput = document.getElementById('calc-months');
    var rateInput = document.getElementById('calc-rate');
    var capInput = document.getElementById('calc-cap');
    var outMonths = document.getElementById('out-months');
    var outTotal = document.getElementById('out-total');
    var outGain = document.getElementById('out-gain');
    var outError = document.getElementById('out-error');
    var outLine = document.getElementById('out-line');
    var live = document.getElementById('calc-live');
    var chart = outLine.ownerSVGElement;
    var shown = { total: 0, gain: 0 };
    var last = { total: 0, gain: 0 };
    var frames = {};
    var touched = false;
    var announceTimer = 0;
    var money = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });

    function plural(n, one, few, many) {
      var a = Math.abs(n) % 100;
      var b = a % 10;
      if (a > 10 && a < 20) return many;
      if (b > 1 && b < 5) return few;
      if (b === 1) return one;
      return many;
    }

    function fmt(value) {
      return money.format(Math.round(value)).replace(/ /g, ' ') + ' ₽';
    }

    // Число плавно перетекает от старого значения к новому.
    function tweenText(key, el, to, duration) {
      cancelAnimationFrame(frames[key]);
      if (reduce) {
        shown[key] = to;
        el.textContent = fmt(to);
        return;
      }
      var from = shown[key];
      var start = performance.now();
      function frame(now) {
        var t = Math.min((now - start) / duration, 1);
        var eased = 1 - Math.pow(1 - t, 3);
        shown[key] = from + (to - from) * eased;
        el.textContent = fmt(shown[key]);
        if (t < 1) frames[key] = requestAnimationFrame(frame);
      }
      frames[key] = requestAnimationFrame(frame);
    }

    // Линия графика прорисовывается слева направо.
    function revealChart(duration) {
      if (reduce || !chart.animate) return;
      chart.animate(
        [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }],
        { duration: duration, easing: 'cubic-bezier(0.65, 0, 0.35, 1)' }
      );
    }

    // Итог для программ чтения с экрана объявляем один раз, когда человек закончил вводить.
    function announce(message, delay) {
      clearTimeout(announceTimer);
      announceTimer = setTimeout(function () { live.textContent = message; }, delay);
    }

    function balanceAt(sum, rate, month, capitalize) {
      var r = rate / 100 / 12;
      return capitalize ? sum * Math.pow(1 + r, month) : sum * (1 + r * month);
    }

    function showError(message) {
      outError.textContent = message;
      outError.hidden = false;
      announce(message, 600);
    }

    function update(animate) {
      var sum = parseFloat(sumInput.value);
      var months = parseInt(monthsInput.value, 10);
      var rate = parseFloat(rateInput.value);
      var capitalize = capInput.checked;

      if (!(sum > 0) || sum > 1e10) {
        showError('Введите сумму вклада больше нуля.');
        return;
      }
      if (!(months >= 1) || months > 360) {
        showError('Введите срок от 1 до 360 месяцев.');
        return;
      }
      if (!(rate >= 0) || rate > 100) {
        showError('Введите ставку от 0 до 100 процентов годовых.');
        return;
      }
      outError.hidden = true;

      var total = balanceAt(sum, rate, months, capitalize);
      outMonths.textContent = months + ' ' + plural(months, 'месяц', 'месяца', 'месяцев');
      last.total = total;
      last.gain = total - sum;
      if (animate) {
        tweenText('total', outTotal, last.total, 520);
        tweenText('gain', outGain, last.gain, 520);
        revealChart(450);
      } else {
        shown.total = last.total;
        shown.gain = last.gain;
        outTotal.textContent = fmt(last.total);
        outGain.textContent = fmt(last.gain);
      }
      announce('Через ' + outMonths.textContent + ' на счёте будет ' + fmt(total) + '. Доход по процентам: ' + fmt(total - sum) + '.', 700);

      var d = '';
      var span = total - sum;
      for (var i = 0; i <= months; i++) {
        var value = balanceAt(sum, rate, i, capitalize);
        var x = (i / months) * 400;
        var y = span > 0 ? 130 - ((value - sum) / span) * 120 : 70;
        d += (i === 0 ? 'M' : ' L') + x.toFixed(1) + ' ' + y.toFixed(1);
      }
      outLine.setAttribute('d', d);
    }

    form.addEventListener('input', function () {
      touched = true;
      update(true);
    });
    form.addEventListener('submit', function (event) { event.preventDefault(); });
    update(false);

    // Когда калькулятор появляется на экране, числа набегают с нуля.
    if (!reduce && 'IntersectionObserver' in window) {
      var intro = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        intro.disconnect();
        if (touched || outError.hidden === false) return;
        shown.total = 0;
        shown.gain = 0;
        outTotal.textContent = fmt(0);
        outGain.textContent = fmt(0);
        tweenText('total', outTotal, last.total, 1100);
        tweenText('gain', outGain, last.gain, 1100);
        revealChart(1000);
      }, { threshold: 0.6 });
      intro.observe(document.querySelector('.calc-result'));
    }
  })();

  /* ---------- Кнопка «Скопировать адрес» ---------- */

  (function copyMail() {
    var button = document.getElementById('copy');
    var status = document.getElementById('copy-status');
    var address = 'teamgrowth37@gmail.com';
    var timer = 0;

    function say(message) {
      status.textContent = message;
      clearTimeout(timer);
      timer = setTimeout(function () { status.textContent = ''; }, 3000);
    }

    function fallback() {
      var field = document.createElement('textarea');
      field.value = address;
      field.setAttribute('readonly', '');
      field.style.position = 'fixed';
      field.style.opacity = '0';
      document.body.appendChild(field);
      field.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(field);
      say(ok ? 'Адрес скопирован' : 'Не получилось скопировать. Выделите адрес выше вручную.');
    }

    button.addEventListener('click', function () {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(address).then(function () {
          say('Адрес скопирован');
        }, fallback);
      } else {
        fallback();
      }
    });
  })();

  startGreeting();
})();
