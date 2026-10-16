(function () {
  'use strict';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var css = getComputedStyle(document.documentElement);
  var tok = function (n) { return css.getPropertyValue(n).trim(); };
  var C = {
    bg: tok('--bg'), surface: tok('--surface'), line: tok('--line'), lineStrong: tok('--line-strong'),
    text: tok('--text'), text2: tok('--text-2'), text3: tok('--text-3'),
    cartera: tok('--serie-cartera'), sp: tok('--serie-sp500'), nd: tok('--serie-nasdaq100'), neg: tok('--negative'),
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

  function init(D) {
    document.querySelector('[data-corte]').textContent = fecha(D.meta.corte);
    renderKpis(D);
    renderTable(D);
    renderLine(D);
    renderDrawdown(D);
  }

  function renderKpis(D) {
    document.querySelectorAll('[data-kpi]').forEach(function (box) {
      var t = D.tiles[box.getAttribute('data-kpi')];
      box.querySelectorAll('[data-v]').forEach(function (el) {
        el.textContent = pct(t[el.getAttribute('data-v')], true);
      });
    });
  }

  function renderTable(D) {
    var tb = document.querySelector('#tabla-anual tbody');
    D.annual.forEach(function (a) {
      var tr = document.createElement('tr');
      var cells = [String(a.year), a.tir, a.twr, a.sp500, a.nasdaq100];
      cells.forEach(function (v, i) {
        var td = document.createElement('td');
        if (i === 0) td.textContent = v; else { td.textContent = pct(v, true); if (v < 0) td.className = 'neg'; }
        tr.appendChild(td);
      });
      tb.appendChild(tr);
    });
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
          lineStyle: { color: color, width: width, type: dashed ? [6, 5] : 'solid', cap: 'round', join: 'round' },
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

  function renderDrawdown(D) {
    var w = D.drawdown_worst[0], st = D.stats;
    var box = document.getElementById('dd-stats');
    [
      ['Mayor caída', pct(st.max_drawdown_pct, false), true],
      ['Del máximo al mínimo', fecha(w.inicio, true) + ' → ' + fecha(w.valle, true), false],
      ['Recuperación del máximo', fecha(w.recuperacion, true) + ' (' + w.dias_recuperacion + ' días)', false],
      ['Caída actual', pct(st.drawdown_actual_pct, false), false]
    ].forEach(function (r) {
      var d = document.createElement('div');
      d.innerHTML = '<dt></dt><dd></dd>';
      d.firstChild.textContent = r[0]; d.lastChild.textContent = r[1];
      if (r[2]) d.lastChild.className = 'neg';
      box.appendChild(d);
    });

    var el = document.getElementById('chart-dd');
    onVisible(el, function () {
      var chart = echarts.init(el, null, { renderer: 'canvas' });
      var ms = reduced ? 0 : 2000;
      chart.setOption({
        animation: !reduced, animationDuration: ms, animationEasing: 'cubicInOut',
        textStyle: { fontFamily: C.sans },
        grid: { left: 4, right: 12, top: 16, bottom: 4, containLabel: true },
        xAxis: {
          type: 'time', boundaryGap: false, position: 'top',
          axisLine: { show: false }, axisTick: { show: false },
          axisLabel: { color: C.text3, fontFamily: C.mono, fontSize: 11, hideOverlap: true },
          axisPointer: { lineStyle: { color: C.text3 }, label: { show: false } }
        },
        yAxis: {
          type: 'value', max: 0, axisLine: { show: false }, axisTick: { show: false },
          axisLabel: { color: C.text3, fontFamily: C.mono, fontSize: 11, formatter: function (v) { return v === 0 ? '0 %' : '−' + n0.format(-v) + ' %'; } },
          splitLine: { lineStyle: { color: C.line } }
        },
        tooltip: {
          trigger: 'axis', confine: true, transitionDuration: 0.12,
          backgroundColor: C.surface, borderColor: C.lineStrong, borderWidth: 1, padding: [10, 12],
          extraCssText: 'box-shadow:none;border-radius:10px;',
          formatter: function (ps) {
            var p = ps[0];
            return '<div class="tip"><div class="tip__date">' + fecha(String(p.value[0]).slice(0, 10)) +
              '</div><div class="tip__row"><span class="tip__name">Por debajo del máximo</span><span class="tip__val">' + pct(p.value[1], false) + '</span></div></div>';
          }
        },
        series: [{
          type: 'line', showSymbol: false, symbol: 'circle', symbolSize: 8,
          data: D.drawdown_series.map(function (p) { return [p.d, p.dd]; }),
          lineStyle: { color: C.neg, width: 1.75 }, itemStyle: { color: C.neg },
          areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(244,80,110,0.04)' }, { offset: 1, color: 'rgba(244,80,110,0.32)' }]) },
          markPoint: {
            symbol: 'circle', symbolSize: 8, itemStyle: { color: C.neg, borderColor: C.bg, borderWidth: 2 },
            label: { show: true, position: 'right', color: C.text2, fontFamily: C.mono, fontSize: 11, offset: [4, 0], formatter: function (p) { return pct(p.value, false); } },
            data: [{ type: 'min' }]
          },
          emphasis: { disabled: true }
        }]
      });
      new ResizeObserver(function () { chart.resize(); }).observe(el);
    });
  }
})();
