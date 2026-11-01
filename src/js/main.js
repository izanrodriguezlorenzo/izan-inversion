(function () {
  'use strict';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var css = getComputedStyle(document.documentElement);
  var tok = function (n) { return css.getPropertyValue(n).trim(); };
  var C = {
    bg: tok('--bg'), surface: tok('--surface'), line: tok('--line'), lineStrong: tok('--line-strong'),
    text: tok('--text'), text2: tok('--text-2'), text3: tok('--text-3'),
    cartera: tok('--serie-cartera'), sp: tok('--serie-sp500'), nd: tok('--serie-nasdaq100'), neg: tok('--negative'), surface2: tok('--surface-2'),
    mono: tok('--font-mono'), sans: tok('--font-sans')
  };

  var nf = function (d) { return new Intl.NumberFormat('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: 'always' }); };
  var n2 = nf(2), n1 = nf(1), n0 = nf(0);
  var pct = function (v, sign) {
    if (v === null || v === undefined) return '—';
    return (sign && v > 0 ? '+' : '') + n2.format(v).replace('-', '−') + ' %';
  };
  var eur0 = function (v) { return n0.format(v) + ' €'; };
  var fecha = function (iso, corta) {
    var d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('es-ES', corta ? { day: 'numeric', month: 'short', year: 'numeric' } : { day: 'numeric', month: 'long', year: 'numeric' });
  };
  var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };

  function onVisible(el, fn) {
    if (!('IntersectionObserver' in window)) { fn(); return; }
    var io = new IntersectionObserver(function (es) {
      if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); fn(); }
    }, { threshold: 0.25 });
    io.observe(el);
  }

  function countUp(el, to, ms, fmt) {
    if (reduced) { el.textContent = fmt(to); return; }
    var t0 = null;
    (function step(ts) {
      if (t0 === null) t0 = ts;
      var k = Math.min(1, (ts - t0) / ms);
      el.textContent = fmt(to * easeOut(k));
      if (k < 1) requestAnimationFrame(step);
    })(performance.now());
  }

  fetch('data/web-data.json').then(function (r) { return r.json(); }).then(init).catch(function (e) {
    console.error('No se pudieron cargar los datos', e);
  });

  var NAMES = { 'GOOGL.O': 'Alphabet', 'META.O': 'Meta', 'MSFT.O': 'Microsoft', 'DIGIS.MC': 'DIGI Spain', 'AMZN.O': 'Amazon', 'Cash': 'Efectivo' };
  var COL = { 'GOOGL.O': tok('--emp-alphabet'), 'META.O': tok('--emp-meta'), 'MSFT.O': tok('--emp-microsoft'), 'DIGIS.MC': tok('--emp-digi'), 'AMZN.O': tok('--emp-amazon'), 'Cash': tok('--emp-efectivo') };
  var LOGO = { 'GOOGL.O': 'goog', 'META.O': 'meta', 'MSFT.O': 'msft', 'DIGIS.MC': 'digi', 'AMZN.O': 'amzn' };
  var LOGOW = { 'GOOGL.O': 48, 'META.O': 62, 'MSFT.O': 42, 'DIGIS.MC': 66, 'AMZN.O': 54 };

  function init(D) {
    document.querySelector('[data-corte]').textContent = fecha(D.meta.corte);
    renderTir(D);
    renderLine(D);
    renderBars(D);
    renderDrawdown(D);
    renderDonut(D);
    renderHeat(D);
    renderTesis(D);
    wipeFallback();
  }

  /* Pestañas de la TIR neta: el relleno se desliza con clip-path */
  function renderTir(D) {
    var base = D.tir_periodos, ks = Object.keys(base), P = {}, order = [];
    var prev = D.annual.filter(function (a) { return a.year === +D.meta.corte.slice(0, 4) - 1; })[0];
    order.push(ks[0]); P[ks[0]] = base[ks[0]];
    if (prev) { order.push('y' + prev.year); P['y' + prev.year] = { periodo: prev.tir, anualizada: prev.tir }; }
    ks.slice(1).forEach(function (k) { order.push(k); P[k] = base[k]; });
    var keys = order, cur = keys.length - 1;
    var lab = function (k) { return /^y\d{4}$/.test(k) ? k.slice(1) : /año en curso/.test(k) ? D.meta.corte.slice(0, 4) : (k === 'Desde el inicio' ? 'Desde ' + D.meta.inicio.slice(0, 4) : k); };
    var box = document.getElementById('tabs');
    var wrap = document.createElement('div'); wrap.className = 'tabs-wrap';
    box.parentNode.insertBefore(wrap, box); wrap.appendChild(box);
    box.style.gridTemplateColumns = 'repeat(' + keys.length + ',1fr)';
    box.setAttribute('role', 'tablist');
    keys.forEach(function (k, i) {
      var b = document.createElement('button'); b.className = 'tab'; b.type = 'button'; b.setAttribute('role', 'tab'); b.textContent = lab(k);
      b.addEventListener('click', function () { pick(i); });
      box.appendChild(b);
    });
    var fill = document.createElement('div'); fill.className = 'tabs__fill'; fill.setAttribute('aria-hidden', 'true');
    var inner = document.createElement('span'); inner.style.gridTemplateColumns = 'repeat(' + keys.length + ',1fr)';
    keys.forEach(function (k) { var i = document.createElement('i'); i.textContent = lab(k); inner.appendChild(i); });
    fill.appendChild(inner); box.appendChild(fill);
    function pick(i) {
      cur = i; var n = keys.length;
      fill.style.clipPath = 'inset(0 ' + ((n - 1 - i) / n * 100) + '% 0 ' + (i / n * 100) + '% round 999px)';
      box.querySelectorAll('.tab').forEach(function (t, j) { t.setAttribute('aria-selected', j === i ? 'true' : 'false'); });
      var p = P[keys[i]];
      document.getElementById('tir-periodo').textContent = pct(p.periodo, true);
      var an = /^(3 años|Desde el inicio)$/.test(keys[i]);
      var isYear = /^y\d{4}$/.test(keys[i]);
      document.getElementById('tir-anual').parentNode.hidden = !an;
      document.getElementById('tir-anual').textContent = an ? pct(p.anualizada, true) : '';
      document.getElementById('tir-nota').textContent = /año en curso/.test(keys[i])
        ? 'Del 1 de enero al ' + fecha(D.meta.corte) + ', sin anualizar.'
        : (isYear ? 'Año ' + keys[i].slice(1) + ' completo.' : (keys[i] === '1 año' ? 'Últimos 12 meses hasta el ' + fecha(D.meta.corte) + '.' : 'Hasta el ' + fecha(D.meta.corte) + '.'));
    }
    pick(cur);
  }

  /* Año a año: barras TWR de la cartera frente a los índices */
  function renderBars(D) {
    var A = D.annual, full = A.slice(0, -1);
    var beat = full.filter(function (a) { return a.twr > a.sp500 && a.twr > a.nasdaq100; }).length;
    var last = A[A.length - 1];
    document.getElementById('anos-txt').textContent =
      'La cartera superó al S&P 500 y al Nasdaq 100 en ' + beat + ' de los ' + full.length + ' años completos. ' + last.year + ' no ha terminado y no está anualizado.';
    var el = document.getElementById('chart-bars');
    var chart = echarts.init(el, null, { renderer: 'canvas' });
    var bar = function (name, key, color) {
      return { name: name, type: 'bar', barGap: '12%', itemStyle: { color: color, borderRadius: 3 }, data: A.map(function (a) { return a[key]; }), emphasis: { disabled: true } };
    };
    chart.setOption({
      animation: false, textStyle: { fontFamily: C.sans },
      grid: { left: 4, right: 8, top: 16, bottom: 4, containLabel: true },
      xAxis: { type: 'category', data: A.map(function (a) { return String(a.year); }), axisTick: { show: false }, axisLine: { lineStyle: { color: C.lineStrong } }, axisLabel: { color: C.text2, fontFamily: C.mono, fontSize: 12, margin: 12 } },
      yAxis: { type: 'value', axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: C.line } }, axisLabel: { color: C.text3, fontFamily: C.mono, fontSize: 11, formatter: function (v) { return n0.format(v).replace('-', '−') + ' %'; } } },
      tooltip: {
        trigger: 'axis', confine: true, axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(255,255,255,0.04)' } },
        backgroundColor: C.surface, borderColor: C.lineStrong, borderWidth: 1, padding: [10, 12], extraCssText: 'box-shadow:none;border-radius:10px;',
        formatter: function (ps) {
          var h = '<div class="tip"><div class="tip__date">' + ps[0].axisValue + (ps[0].axisValue == last.year ? ' (sin anualizar)' : '') + '</div>';
          ps.forEach(function (p) { h += '<div class="tip__row"><span class="dot" style="background:' + p.color + '"></span><span class="tip__name">' + p.seriesName + '</span><span class="tip__val">' + pct(p.value, true) + '</span></div>'; });
          return h + '</div>';
        }
      },
      series: [bar('Cartera (TWR)', 'twr', C.cartera), bar('Nasdaq 100', 'nasdaq100', C.nd), bar('S&P 500', 'sp500', C.sp)]
    });
    new ResizeObserver(function () { chart.resize(); }).observe(el);
  }

  function renderLine(D) {
    var el = document.getElementById('chart-line');
    var S = D.line_1000, last = S[S.length - 1];
    var legend = document.getElementById('legend-line');
    var finalFmt = function (v) { return eur0(v); };

    // Los valores finales se muestran ya (sin JS la información no se pierde) y se animan al entrar.
    ['p', 's', 'n'].forEach(function (k) {
      var li = legend.querySelector('[data-s="' + k + '"]');
      li.querySelector('[data-count]').textContent = finalFmt(last[k]);
      li.querySelector('[data-pct]').textContent = pct((last[k] / 1000 - 1) * 100, true);
    });

    onVisible(el, function () {
      var chart = echarts.init(el, null, { renderer: 'canvas' });
      var ms = reduced ? 0 : 2200;
      var series = function (key, name, color, dashed, width, z) {
        return {
          name: name, type: 'line', showSymbol: false, symbol: 'circle', symbolSize: 8, z: z,
          data: S.map(function (p) { return [p.d, p[key]]; }),
          lineStyle: { color: color, width: width, type: 'solid', cap: 'round', join: 'round' },
          itemStyle: { color: color, borderColor: C.bg, borderWidth: 2 },
          emphasis: { disabled: true }, animationDuration: ms, animationEasing: 'cubicOut'
        };
      };
      chart.setOption({
        animation: !reduced, animationDuration: ms, animationEasing: 'cubicOut',
        textStyle: { fontFamily: C.sans },
        grid: { left: 4, right: 12, top: 16, bottom: 4, containLabel: true },
        xAxis: {
          type: 'time', boundaryGap: false,
          axisLine: { lineStyle: { color: C.lineStrong } }, axisTick: { show: false },
          axisLabel: { color: C.text3, fontFamily: C.mono, fontSize: 11, hideOverlap: true },
          splitLine: { show: false },
          axisPointer: { lineStyle: { color: C.text3, width: 1, type: 'solid' }, label: { show: false } }
        },
        yAxis: {
          type: 'value', scale: false, min: 0,
          axisLine: { show: false }, axisTick: { show: false },
          axisLabel: { color: C.text3, fontFamily: C.mono, fontSize: 11, formatter: function (v) { return n0.format(v); } },
          splitLine: { lineStyle: { color: C.line } }
        },
        tooltip: {
          trigger: 'axis', confine: true, transitionDuration: 0.12,
          position: function (pt, params, dom, rect, size) {
            // En pantallas estrechas el panel se fija arriba a la izquierda, donde no tapa las líneas.
            return size.viewSize[0] < 600 ? [8, 4] : undefined;
          },
          backgroundColor: C.surface, borderColor: C.lineStrong, borderWidth: 1, padding: [12, 14],
          extraCssText: 'box-shadow:none;border-radius:10px;',
          axisPointer: { type: 'line', snap: true },
          formatter: function (ps) {
            if (!ps.length) return '';
            var p = ps[0], iso = p.value[0];
            var v = {}; ps.forEach(function (x) { v[x.seriesName] = x.value[1]; });
            var row = function (cls, name) {
              return '<div class="tip__row"><span class="dot ' + cls + '"></span><span class="tip__name">' + name +
                '</span><span class="tip__val">' + eur0(v[name]) + '</span></div>';
            };
            var vsSp = (v['Cartera'] / v['S&P 500'] - 1) * 100, vsNd = (v['Cartera'] / v['Nasdaq 100'] - 1) * 100;
            return '<div class="tip"><div class="tip__date">' + fecha(String(iso).slice(0, 10)) + '</div>' +
              row('dot--cartera', 'Cartera') + row('dot--sp', 'S&P 500') + row('dot--nd', 'Nasdaq 100') +
              '<div class="tip__diff">Cartera frente a S&amp;P 500: <b>' + pct(vsSp, true) + '</b><br>Cartera frente a Nasdaq 100: <b>' + pct(vsNd, true) + '</b></div></div>';
          }
        },
        series: [
          series('n', 'Nasdaq 100', C.nd, true, 1.5, 1),
          series('s', 'S&P 500', C.sp, true, 1.5, 2),
          series('p', 'Cartera', C.cartera, false, 2.75, 3)
        ]
      });
      new ResizeObserver(function () { chart.resize(); }).observe(el);

      // Las cifras suben a la vez que se dibuja la línea
      legend.querySelectorAll('[data-s]').forEach(function (li) {
        var k = li.getAttribute('data-s');
        countUp(li.querySelector('[data-count]'), last[k], ms, finalFmt);
        countUp(li.querySelector('[data-pct]'), (last[k] / 1000 - 1) * 100, ms, function (x) { return pct(x, true); });
      });
    });
  }


  /* Caídas: línea roja que se descubre hacia la derecha al hacer scroll */
  function renderDrawdown(D) {
    var el = document.getElementById('chart-dd');
    var chart = echarts.init(el, null, { renderer: 'canvas' });
    chart.setOption({
      animation: false, textStyle: { fontFamily: C.sans },
      grid: { left: 4, right: 12, top: 16, bottom: 4, containLabel: true },
      xAxis: { type: 'time', boundaryGap: false, position: 'bottom', axisLine: { lineStyle: { color: C.lineStrong } }, axisTick: { show: false }, axisLabel: { color: C.text3, fontFamily: C.mono, fontSize: 11, hideOverlap: true }, axisPointer: { lineStyle: { color: C.text3 }, label: { show: false } } },
      yAxis: { type: 'value', max: 0, axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: C.line } }, axisLabel: { color: C.text3, fontFamily: C.mono, fontSize: 11, formatter: function (v) { return v === 0 ? '0 %' : '−' + n0.format(-v) + ' %'; } } },
      tooltip: {
        trigger: 'axis', confine: true, transitionDuration: 0.12, backgroundColor: C.surface, borderColor: C.lineStrong, borderWidth: 1, padding: [10, 12], extraCssText: 'box-shadow:none;border-radius:10px;',
        formatter: function (ps) {
          var p = ps[0];
          return '<div class="tip"><div class="tip__date">' + fecha(String(p.value[0]).slice(0, 10)) + '</div><div class="tip__row"><span class="tip__name">Por debajo del máximo</span><span class="tip__val">' + pct(p.value[1], false) + '</span></div></div>';
        }
      },
      series: [{
        type: 'line', showSymbol: false, symbol: 'circle', symbolSize: 8,
        data: D.drawdown_series.map(function (p) { return [p.d, p.dd]; }),
        lineStyle: { color: C.neg, width: 1.75 }, itemStyle: { color: C.neg },
        areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(244,80,110,0.04)' }, { offset: 1, color: 'rgba(244,80,110,0.32)' }]) },
        markPoint: { symbol: 'circle', symbolSize: 8, itemStyle: { color: C.neg, borderColor: C.bg, borderWidth: 2 }, label: { show: true, position: 'right', color: C.text2, fontFamily: C.mono, fontSize: 11, offset: [4, 0], formatter: function (p) { return pct(p.value, false); } }, data: [{ type: 'min' }] },
        emphasis: { disabled: true }
      }]
    });
    new ResizeObserver(function () { chart.resize(); }).observe(el);

    var MS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    var my = function (iso) { var d = iso.split('-'); return MS[+d[1] - 1] + ' ' + d[0]; };
    var box = document.getElementById('dd-rows');
    box.innerHTML = '<div class="ddrow ddrow--h"><div>Caída</div><div>Cae durante</div><div>Se recupera en</div><div>Profundidad</div></div>';
    D.drawdown_worst.slice(0, 5).forEach(function (w) {
      var r = document.createElement('div'); r.className = 'ddrow';
      r.innerHTML = '<div class="ddrow__t"></div><div class="mono ddrow__n"></div><div class="mono ddrow__n"></div><div class="ddrow__d mono"></div>';
      var c = r.children;
      c[0].textContent = 'Desde ' + my(w.inicio);
      c[1].textContent = w.dias_a_valle + ' días';
      c[2].textContent = w.recuperacion ? w.dias_recuperacion + ' días' : 'sin recuperar';
      if (!w.recuperacion) c[2].className += ' ddrow__open';
      c[3].textContent = pct(w.caida_pct, false);
      box.appendChild(r);
    });
  }

  /* Composición: anillo SVG con logos, interactivo */
  function renderDonut(D) {
    var el = document.getElementById('donut');
    var order = ['MSFT.O', 'DIGIS.MC', 'Cash', 'AMZN.O', 'GOOGL.O', 'META.O'];
    var rows = order.map(function (t) { return D.composition.filter(function (c) { return c.ticker === t; })[0]; }).filter(Boolean);
    var tot = rows.reduce(function (a, r) { return a + r.weight_pct; }, 0);
    var NS = 'http://www.w3.org/2000/svg';
    function draw() {
      var narrow = el.clientWidth < 560, W = narrow ? 540 : 900, H = narrow ? 440 : 560, cx = W / 2, cy = H / 2, R = narrow ? 98 : 190, r0 = R * 0.6, K2 = narrow ? 0.72 : 1;
      var svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('width', '100%'); svg.setAttribute('role', 'img'); svg.style.display = 'block'; svg.style.maxHeight = '560px';
      var mk = function (n, at, p) { var e = document.createElementNS(NS, n); for (var k in at) e.setAttribute(k, at[k]); (p || svg).appendChild(e); return e; };
      var pt = function (a, r) { var q = (a - 90) * Math.PI / 180; return [cx + r * Math.cos(q), cy + r * Math.sin(q)]; };
      var pc = function (v) { return n1.format(v) + ' %'; };
      var start = 0, items = [];
      rows.forEach(function (r, i) { var sw = 360 * r.weight_pct / tot, a0 = start, a1 = start + sw; start = a1; items.push({ t: r.ticker, v: r.weight_pct, a0: a0, a1: a1, am: (a0 + a1) / 2, i: i }); });
      var g = mk('g', {}), gap = 1.2;
      items.forEach(function (s) {
        var a0 = s.a0 + gap / 2, a1 = s.a1 - gap / 2, p0 = pt(a0, R), p1 = pt(a1, R), q1 = pt(a1, r0), q0 = pt(a0, r0), large = (a1 - a0) > 180 ? 1 : 0;
        var grp = mk('g', { 'class': 'sl', 'data-t': s.t }, g); grp.style.transformOrigin = cx + 'px ' + cy + 'px'; grp.style.setProperty('--d', (s.i * 70) + 'ms');
        mk('path', { d: 'M' + p0[0] + ' ' + p0[1] + ' A' + R + ' ' + R + ' 0 ' + large + ' 1 ' + p1[0] + ' ' + p1[1] + ' L' + q1[0] + ' ' + q1[1] + ' A' + r0 + ' ' + r0 + ' 0 ' + large + ' 0 ' + q0[0] + ' ' + q0[1] + ' Z', fill: COL[s.t], stroke: COL[s.t], 'stroke-width': 1, 'stroke-linejoin': 'round' }, grp);
      });
      var c1 = mk('text', { x: cx, y: cy - (narrow ? 4 : 8), 'text-anchor': 'middle', fill: C.text, 'font-size': narrow ? 24 : 38, 'font-weight': 500, 'font-family': C.mono });
      c1.textContent = 'Cartera';
      var c2 = mk('text', { x: cx, y: cy + (narrow ? 20 : 28), 'text-anchor': 'middle', fill: C.text2, 'font-size': narrow ? 12 : 14, 'font-family': C.sans });
      c2.textContent = 'peso por posición';
      var L = [], Rr = [], gapY = narrow ? 52 : 62;
      items.forEach(function (s) { var e = pt(s.am, R + 5), side = Math.sin(s.am * Math.PI / 180) >= 0 ? 'r' : 'l', o = { s: s, e: e, side: side, y: pt(s.am, R + 30)[1] }; (side === 'r' ? Rr : L).push(o); });
      [L, Rr].forEach(function (arr) {
        arr.sort(function (a, b) { return a.y - b.y; });
        for (var k = 1; k < arr.length; k++) if (arr[k].y - arr[k - 1].y < gapY) arr[k].y = arr[k - 1].y + gapY;
        var over = arr.length ? arr[arr.length - 1].y - (H - 34) : 0; if (over > 0) arr.forEach(function (o) { o.y -= over; });
        var under = arr.length ? 34 - arr[0].y : 0; if (under > 0) arr.forEach(function (o) { o.y += under; });
      });
      L.concat(Rr).forEach(function (o) {
        var s = o.s, dir = o.side === 'r' ? 1 : -1, elbow = pt(s.am, R + 24), tx = cx + dir * (R + (narrow ? 20 : 64)), w = (LOGOW[s.t] || 40) * K2;
        var lg = mk('g', { 'class': 'lb', 'data-t': s.t }); lg.style.setProperty('--d', (s.i * 70 + 500) + 'ms');
        mk('path', { d: 'M' + o.e[0] + ' ' + o.e[1] + ' L' + elbow[0] + ' ' + o.y + ' L' + tx + ' ' + o.y, fill: 'none', stroke: C.lineStrong, 'stroke-width': 1.25 }, lg);
        mk('circle', { cx: o.e[0], cy: o.e[1], r: 2.5, fill: COL[s.t] }, lg);
        var lx = dir > 0 ? tx + 8 : tx - 8 - w;
        if (LOGO[s.t]) { mk('image', { href: 'assets/logos/' + LOGO[s.t] + '.svg', x: lx, y: o.y - w / 2, width: w, height: w, preserveAspectRatio: 'xMidYMid meet' }, lg); }
        else {
          var r2 = 20 * K2, ccx = lx + w / 2;
          mk('circle', { cx: ccx, cy: o.y, r: r2, fill: 'none', stroke: C.text2, 'stroke-width': 1.5 }, lg);
          mk('text', { x: ccx, y: o.y + 7 * K2, 'text-anchor': 'middle', fill: C.text2, 'font-size': 20 * K2, 'font-family': C.sans }, lg).textContent = '€';
        }
        var px = dir > 0 ? lx + w + 12 : lx - 12;
        mk('text', { x: px, y: o.y + 7, 'text-anchor': dir > 0 ? 'start' : 'end', fill: C.text, 'font-size': narrow ? 18 : 22, 'font-weight': 500, 'font-family': C.mono }, lg).textContent = pc(s.v);
      });
      svg.setAttribute('aria-label', 'Peso de cada posición: ' + rows.map(function (r) { return NAMES[r.ticker] + ' ' + pc(r.weight_pct); }).join(', '));
      el.innerHTML = ''; el.appendChild(svg);

      var sl = svg.querySelectorAll('.sl'), lb = svg.querySelectorAll('.lb'), by = {};
      sl.forEach(function (e) { by[e.getAttribute('data-t')] = e; }); lb.forEach(function (e) { by[e.getAttribute('data-t') + '|l'] = e; });
      var sel = null, hov = null, cur = '-', raf = 0;
      function setC(t, from, to) {
        cancelAnimationFrame(raf); c2.textContent = t ? NAMES[t] : 'peso por posición';
        if (!t) { c1.textContent = 'Cartera'; return; }
        if (reduced) { c1.textContent = pc(to); return; }
        var t0 = null;
        (function f(ts) { if (t0 === null) t0 = ts; var q = Math.min(1, (ts - t0) / 420), e = easeOut(q); c1.textContent = pc(from + (to - from) * e); if (q < 1) raf = requestAnimationFrame(f); })(performance.now());
      }
      function apply() {
        var n = hov || sel;
        items.forEach(function (s) { var e = by[s.t], l = by[s.t + '|l'], on = n === s.t, off = n && !on; e.classList.toggle('on', on); e.classList.toggle('off', !!off); l.classList.toggle('on', on); l.classList.toggle('off', !!off); });
        if (n !== cur) { cur = n; var s = items.filter(function (x) { return x.t === n; })[0]; setC(n, s ? s.v * 0.55 : 0, s ? s.v : 0); }
      }
      items.forEach(function (s) {
        var e = by[s.t], q = (s.am - 90) * Math.PI / 180, m = narrow ? 7 : 12;
        e.style.setProperty('--tx', (Math.cos(q) * m).toFixed(1) + 'px'); e.style.setProperty('--ty', (Math.sin(q) * m).toFixed(1) + 'px');
        e.setAttribute('tabindex', '0'); e.setAttribute('role', 'button'); e.setAttribute('aria-label', NAMES[s.t] + ' ' + pc(s.v));
        e.addEventListener('pointerenter', function (ev) { if (ev.pointerType === 'mouse') { hov = s.t; apply(); } });
        e.addEventListener('pointerleave', function (ev) { if (ev.pointerType === 'mouse') { hov = null; apply(); } });
        e.addEventListener('click', function () { sel = sel === s.t ? null : s.t; hov = null; apply(); });
        e.addEventListener('focus', function () { hov = s.t; apply(); }); e.addEventListener('blur', function () { hov = null; apply(); });
        e.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); sel = sel === s.t ? null : s.t; apply(); } });
      });
      svg.addEventListener('click', function (ev) { if (ev.target === svg) { sel = null; hov = null; apply(); } });
      if (reduced) svg.classList.add('go', 'nomo'); else onVisible(el, function () { svg.classList.add('go'); });
      if (!reduced) svg.querySelectorAll('.sl,.lb').forEach(function (e) { e.style.opacity = 0; });
      if (!reduced) onVisible(el, function () { svg.querySelectorAll('.sl,.lb').forEach(function (e) { e.style.opacity = ''; }); });
    }
    draw();
    var lastNarrow = el.clientWidth < 560;
    new ResizeObserver(function () { var n = el.clientWidth < 560; if (n !== lastNarrow) { lastNarrow = n; draw(); } }).observe(el);
  }

  /* Mapa de calor mensual (TWR): interactivo, escala divergente, gris en 0 % */
  function renderHeat(D) {
    var box = document.getElementById('heat'), read = document.getElementById('heat-read');
    var MS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    var MF = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    var bg = function (v) {
      if (v === null || v === undefined) return null;
      var k = Math.min(1, Math.abs(v) / 30), base = v >= 0 ? C.cartera : C.neg;
      return 'color-mix(in srgb,' + base + ' ' + Math.round(14 + k * 66) + '%,' + C.surface2 + ')';
    };
    var sgn = function (v) { return pct(v, true); };
    var html = '<div class="heat__row heat__head"><div></div>' + MS.map(function (m) { return '<div class="mono">' + m + '</div>'; }).join('') + '<div class="mono">Año</div></div>';
    D.monthly_twr.forEach(function (r, ri) {
      html += '<div class="heat__row" data-y="' + r.year + '"><div class="heat__y mono">' + r.year + '</div>';
      r.months.forEach(function (v, mi) {
        html += v === null || v === undefined ? '<div class="hc hc--na"></div>'
          : '<button type="button" class="hc mono" data-v="' + v + '" data-l="' + MF[mi] + ' ' + r.year + '" data-m="' + mi + '" style="background:' + bg(v) + '">' + Math.round(v) + '</button>';
      });
      html += r.annual === null || r.annual === undefined ? '<div></div>'
        : '<button type="button" class="hc hc--yr mono" data-v="' + r.annual + '" data-l="Año ' + r.year + '" data-m="12" style="background:' + bg(r.annual) + '">' + Math.round(r.annual) + ' %</button>';
      html += '</div>';
    });
    box.innerHTML = html;
    var cells = box.querySelectorAll('button.hc');
    function show(c) {
      cells.forEach(function (x) { x.classList.toggle('sel', x === c); });
      var row = c.parentNode, col = +c.getAttribute('data-m');
      box.querySelectorAll('.heat__row').forEach(function (rw) { rw.classList.toggle('dim', rw !== row); });
      var v = +c.getAttribute('data-v');
      read.innerHTML = '<span class="heat__rl"></span><span class="heat__rv mono"></span>';
      read.firstChild.textContent = c.getAttribute('data-l') + (c.classList.contains('hc--yr') ? ' completo' : '');
      read.lastChild.textContent = sgn(v); read.lastChild.className = 'heat__rv mono ' + (v < 0 ? 'neg' : 'pos');
    }
    function clear() { cells.forEach(function (x) { x.classList.remove('sel'); }); box.querySelectorAll('.heat__row').forEach(function (rw) { rw.classList.remove('dim'); }); read.innerHTML = '<span class="heat__rl">Pasa el cursor o toca un mes</span>'; }
    cells.forEach(function (c) {
      c.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') show(c); });
      c.addEventListener('focus', function () { show(c); });
      c.addEventListener('click', function () { show(c); });
    });
    box.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') clear(); });
    // Mejor y peor mes, y meses en positivo
    var all = []; D.monthly_twr.forEach(function (r) { r.months.forEach(function (v, i) { if (v !== null && v !== undefined) all.push({ v: v, l: MF[i] + ' ' + r.year }); }); });
    all.sort(function (a, b) { return a.v - b.v; });
    var pos = all.filter(function (x) { return x.v > 0; }).length;
    document.getElementById('heat-stats').innerHTML =
      '<div><span>Mejor mes</span><b class="mono pos">' + sgn(all[all.length - 1].v) + '</b><em>' + all[all.length - 1].l + '</em></div>' +
      '<div><span>Peor mes</span><b class="mono neg">' + sgn(all[0].v) + '</b><em>' + all[0].l + '</em></div>' +
      '<div><span>Meses en positivo</span><b class="mono">' + n0.format(pos / all.length * 100) + ' %</b><em>' + pos + ' de ' + all.length + '</em></div>';
    clear();
    if (!reduced) onVisible(box, function () {
      var i = 0; cells.forEach(function (c) { c.style.animationDelay = (i++ * 12) + 'ms'; c.classList.add('in'); });
    }); else cells.forEach(function (c) { c.classList.add('in'); });
  }

  /* Tesis: lista de lectura; al pulsar, el panel se abre desde la fila */
  function renderTesis(D) {
    var list = document.getElementById('tesis-list');
    var order = ['GOOGL.O', 'META.O', 'MSFT.O', 'AMZN.O'];
    order.forEach(function (t) {
      var c = D.composition.filter(function (x) { return x.ticker === t; })[0]; if (!c) return;
      var b = document.createElement('button'); b.className = 'tesb'; b.type = 'button'; b.setAttribute('aria-label', 'Abrir la tesis de ' + NAMES[t]);
      b.innerHTML = '<div class="tes"><div class="tes__n"></div><div class="tes__p mono"></div><div class="tes__e"></div><div class="tes__l">Leer</div></div>';
      b.querySelector('.tes__n').textContent = NAMES[t];
      b.querySelector('.tes__p').textContent = n1.format(c.weight_pct) + ' % de la cartera';
      b.querySelector('.tes__e').textContent = t === 'AMZN.O' ? 'Primera en publicarse' : 'Tesis en redacción';
      b.addEventListener('click', function () { openPanel(b, NAMES[t], n1.format(c.weight_pct) + ' % de la cartera'); });
      list.appendChild(b);
    });
    var panel = document.getElementById('panel'), opener = null;
    function openPanel(row, name, peso) {
      var r = row.getBoundingClientRect(), h = window.innerHeight;
      panel.style.setProperty('--t', Math.max(0, r.top) + 'px'); panel.style.setProperty('--b', Math.max(0, h - r.bottom) + 'px');
      document.getElementById('panel-name').textContent = name; document.getElementById('panel-peso').textContent = peso;
      panel.hidden = false; panel.scrollTop = 0; document.body.style.overflow = 'hidden'; opener = row;
      document.getElementById('panel-close').focus();
    }
    function close() { panel.hidden = true; document.body.style.overflow = ''; if (opener) opener.focus(); }
    document.getElementById('panel-close').addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) close(); });
  }

  /* Navegadores sin animation-timeline: los gráficos se descubren al entrar en pantalla */
  function wipeFallback() {
    if (window.CSS && CSS.supports && CSS.supports('animation-timeline: view()')) return;
    document.querySelectorAll('.wipe').forEach(function (w) {
      if (reduced) { w.classList.add('in'); return; }
      onVisible(w, function () { w.classList.add('in'); });
    });
  }
})();
