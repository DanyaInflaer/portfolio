(function () {
  'use strict';

  var html = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
  var chars = [];

  heading.setAttribute('aria-label', text);
  heading.textContent = '';
  text.split(' ').forEach(function (word, index, all) {
    var wrap = document.createElement('span');
    wrap.className = 'word';
    wrap.setAttribute('aria-hidden', 'true');
    word.split('').forEach(function (letter) {
      var node = document.createElement('span');
      node.className = 'ch lock';
      node.textContent = letter;
      wrap.appendChild(node);
      chars.push({ el: node, final: letter, done: false, width: 0 });
    });
    heading.appendChild(wrap);
    if (index < all.length - 1) heading.appendChild(document.createTextNode(' '));
  });

  function showRest() {
    html.classList.add('hero-in');
  }

  function scrambleGreeting() {
    var pool = '01#%&@$<>/{}[]=+*?';
    var plan;
    var started;
    var lastSwap = 0;

    // Фиксируем ширину букв, чтобы строка не прыгала, пока символы меняются.
    chars.forEach(function (c) { c.width = c.el.getBoundingClientRect().width; });
    chars.forEach(function (c) {
      c.el.style.width = c.width + 'px';
      c.el.classList.remove('lock');
      c.el.textContent = pool.charAt(Math.floor(Math.random() * pool.length));
    });
    heading.classList.add('ready');

    plan = chars.map(function (c, i) { return 260 + i * 70 + Math.random() * 180; });
    started = performance.now();
    setTimeout(showRest, 900);

    function tick(now) {
      var elapsed = now - started;
      var swap = now - lastSwap > 45;
      if (swap) lastSwap = now;

      chars.forEach(function (c, i) {
        if (c.done) return;
        if (elapsed >= plan[i]) {
          c.done = true;
          c.el.textContent = c.final;
          c.el.classList.add('lock');
        } else if (swap) {
          c.el.textContent = pool.charAt(Math.floor(Math.random() * pool.length));
        }
      });

      if (chars.every(function (c) { return c.done; })) {
        chars.forEach(function (c) { c.el.style.width = ''; });
        return;
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
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
    var timeout = new Promise(function (resolve) { setTimeout(resolve, 900); });
    Promise.race([fontWait, timeout]).then(function () {
      scrambleGreeting();
      setTimeout(function () { html.classList.add('chart-in'); }, 500);
    });
  }

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

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var rect = hero.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      var total = Math.max(22, Math.min(90, Math.round((width * height) / 16000)));
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

    function draw(move) {
      var i, j, a, b, dx, dy, dist, alpha;
      ctx.clearRect(0, 0, width, height);

      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        if (move) {
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

      ctx.lineWidth = 1;
      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        for (j = i + 1; j < nodes.length; j++) {
          b = nodes[j];
          dx = a.x - b.x;
          dy = a.y - b.y;
          dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < LINK) {
            alpha = (1 - dist / LINK) * 0.22;
            ctx.strokeStyle = 'rgba(143,163,199,' + alpha.toFixed(3) + ')';
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
        dx = a.x - pointer.x;
        dy = a.y - pointer.y;
        dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < REACH) {
          alpha = (1 - dist / REACH) * 0.6;
          ctx.strokeStyle = 'rgba(255,180,59,' + alpha.toFixed(3) + ')';
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(pointer.x, pointer.y);
          ctx.stroke();
        }
      }

      ctx.fillStyle = 'rgba(190,205,235,0.6)';
      for (i = 0; i < nodes.length; i++) {
        ctx.beginPath();
        ctx.arc(nodes[i].x, nodes[i].y, nodes[i].r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function loop() {
      draw(true);
      frameId = requestAnimationFrame(loop);
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

    resize();
    play();
  })();

  /* ---------- Полоса прокрутки ---------- */

  (function progress() {
    var bar = document.querySelector('.progress');
    var waiting = false;
    function update() {
      var max = html.scrollHeight - window.innerHeight;
      var value = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
      bar.style.transform = 'scaleX(' + value.toFixed(4) + ')';
      waiting = false;
    }
    window.addEventListener('scroll', function () {
      if (!waiting) {
        waiting = true;
        requestAnimationFrame(update);
      }
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
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
    }, { threshold: 0.4 });
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

    function balanceAt(sum, rate, month, capitalize) {
      var r = rate / 100 / 12;
      return capitalize ? sum * Math.pow(1 + r, month) : sum * (1 + r * month);
    }

    function showError(message) {
      outError.textContent = message;
      outError.hidden = false;
    }

    function update() {
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
      outTotal.textContent = fmt(total);
      outGain.textContent = fmt(total - sum);

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

    form.addEventListener('input', update);
    form.addEventListener('submit', function (event) { event.preventDefault(); });
    update();
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
