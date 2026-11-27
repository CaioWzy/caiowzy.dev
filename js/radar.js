(function () {
  var dataEl = document.getElementById('radar-data');
  var vizEl = document.getElementById('radar-viz');
  var tooltipEl = document.getElementById('radar-tooltip');
  if (!dataEl || !vizEl) return;

  var data = JSON.parse(dataEl.textContent);
  var rings = data.rings || [];
  var quadrants = data.quadrants || [];
  var items = data.items || [];

  var size = 700;
  var center = size / 2;
  var maxRadius = 300;
  var ringRadii = [0, 0.25, 0.50, 0.75, 1.0].map(function (f) {
    return f * maxRadius;
  });

  // Quadrant angles (clockwise from top-left): 0: TL, 1: TR, 2: BR, 3: BL
  var quadrantAngles = [
    [Math.PI, 1.5 * Math.PI],
    [1.5 * Math.PI, 2 * Math.PI],
    [0, 0.5 * Math.PI],
    [0.5 * Math.PI, Math.PI]
  ];

  function hashString(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
    }
    return (h >>> 0) / 4294967295;
  }

  function svgEl(tag, attrs) {
    var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (var k in attrs) {
      el.setAttribute(k, attrs[k]);
    }
    return el;
  }

  // Assign deterministic sequential IDs matching Liquid's quadrant -> ring grouping
  var numberedItems = [];
  var counter = 0;
  quadrants.forEach(function (q, qIdx) {
    rings.forEach(function (r, rIdx) {
      items.forEach(function (item) {
        if (item.quadrant === q.id && item.ring === r.id) {
          counter += 1;
          var rMin = ringRadii[rIdx] + 18;
          var rMax = ringRadii[rIdx + 1] - 18;
          var aMin = quadrantAngles[qIdx][0] + 0.14;
          var aMax = quadrantAngles[qIdx][1] - 0.14;

          var s1 = hashString(item.name + ':r');
          var s2 = hashString(item.name + ':a');
          var rad = rMin + s1 * Math.max(10, rMax - rMin);
          var ang = aMin + s2 * (aMax - aMin);

          numberedItems.push({
            id: counter,
            item: item,
            qIdx: qIdx,
            rIdx: rIdx,
            color: r.color,
            x: center + rad * Math.cos(ang),
            y: center + rad * Math.sin(ang),
            rMin: rMin,
            rMax: rMax,
            aMin: aMin,
            aMax: aMax
          });
        }
      });
    });
  });

  // Simple iterative collision repulsion so blips stay readable
  for (var iter = 0; iter < 40; iter++) {
    for (var i = 0; i < numberedItems.length; i++) {
      for (var j = i + 1; j < numberedItems.length; j++) {
        var a = numberedItems[i];
        var b = numberedItems[j];
        var dx = b.x - a.x;
        var dy = b.y - a.y;
        var dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
        var minDist = 26;
        if (dist < minDist) {
          var push = (minDist - dist) * 0.5;
          var ux = dx / dist;
          var uy = dy / dist;
          a.x -= ux * push;
          a.y -= uy * push;
          b.x += ux * push;
          b.y += uy * push;
        }
      }
    }
  }

  var svg = svgEl('svg', {
    viewBox: '0 0 ' + size + ' ' + size,
    role: 'img',
    'aria-label': 'Tech Radar visualization'
  });

  // Concentric ring circles
  for (var r = rings.length; r >= 1; r--) {
    svg.appendChild(
      svgEl('circle', {
        cx: center,
        cy: center,
        r: ringRadii[r],
        fill: r % 2 === 0 ? '#FAFAFA' : '#FFFFFF',
        stroke: '#E9EFF3',
        'stroke-width': 1
      })
    );
  }

  // Crosshairs
  svg.appendChild(svgEl('line', {
    x1: center - maxRadius, y1: center,
    x2: center + maxRadius, y2: center,
    stroke: '#E9EFF3', 'stroke-width': 1
  }));
  svg.appendChild(svgEl('line', {
    x1: center, y1: center - maxRadius,
    x2: center, y2: center + maxRadius,
    stroke: '#E9EFF3', 'stroke-width': 1
  }));

  // Ring labels along top vertical axis
  rings.forEach(function (ring, idx) {
    var labelY = center - (ringRadii[idx] + ringRadii[idx + 1]) / 2;
    var text = svgEl('text', {
      x: center,
      y: labelY + 4,
      'text-anchor': 'middle',
      fill: '#2B5F72',
      'font-size': '10',
      'font-weight': '600',
      'letter-spacing': '0.08em',
      opacity: '0.65'
    });
    text.textContent = ring.name.toUpperCase();
    svg.appendChild(text);
  });

  // Quadrant corner labels
  var qLabelPos = [
    { x: 12, y: 24, anchor: 'start' },
    { x: size - 12, y: 24, anchor: 'end' },
    { x: size - 12, y: size - 14, anchor: 'end' },
    { x: 12, y: size - 14, anchor: 'start' }
  ];
  quadrants.forEach(function (q, idx) {
    var pos = qLabelPos[idx];
    if (!pos) return;
    var label = svgEl('text', {
      x: pos.x,
      y: pos.y,
      'text-anchor': pos.anchor,
      fill: '#323232',
      'font-size': '12',
      'font-weight': '600'
    });
    label.textContent = q.name;
    svg.appendChild(label);
  });

  // Blips
  var blipGroups = [];
  numberedItems.forEach(function (entry) {
    var g = svgEl('g', {
      class: 'c-radar__blip',
      tabindex: '0',
      'data-blip-id': entry.id,
      'data-quadrant': entry.item.quadrant
    });

    if (entry.item.moved === 1 || entry.item.moved === 'new') {
      var up = svgEl('polygon', {
        points: [
          entry.x + ',' + (entry.y - 13.5),
          (entry.x - 11) + ',' + (entry.y + 6.5),
          (entry.x + 11) + ',' + (entry.y + 6.5)
        ].join(' '),
        fill: entry.color
      });
      g.appendChild(up);
    } else if (entry.item.moved === -1) {
      var down = svgEl('polygon', {
        points: [
          entry.x + ',' + (entry.y + 13.5),
          (entry.x - 11) + ',' + (entry.y - 6.5),
          (entry.x + 11) + ',' + (entry.y - 6.5)
        ].join(' '),
        fill: entry.color
      });
      g.appendChild(down);
    } else {
      g.appendChild(svgEl('circle', {
        cx: entry.x,
        cy: entry.y,
        r: 9.5,
        fill: entry.color
      }));
    }

    var num = svgEl('text', {
      x: entry.x,
      y: entry.y,
      'text-anchor': 'middle',
      'dominant-baseline': 'central',
      fill: '#FFFFFF',
      'font-size': '9',
      'font-weight': '600'
    });
    num.textContent = String(entry.id);
    g.appendChild(num);

    function highlight(active) {
      var row = document.querySelector('.c-radar__item[data-blip-id="' + entry.id + '"]');
      if (row) row.classList.toggle('is-highlighted', active);
      if (tooltipEl) {
        if (active) {
          tooltipEl.textContent = entry.id + '. ' + entry.item.name;
          tooltipEl.style.left = (entry.x / size) * 100 + '%';
          tooltipEl.style.top = (entry.y / size) * 100 + '%';
          tooltipEl.hidden = false;
        } else {
          tooltipEl.hidden = true;
        }
      }
    }

    g.addEventListener('mouseenter', function () { highlight(true); });
    g.addEventListener('mouseleave', function () { highlight(false); });
    g.addEventListener('focus', function () { highlight(true); });
    g.addEventListener('blur', function () { highlight(false); });
    g.addEventListener('click', function () {
      var row = document.querySelector('.c-radar__item[data-blip-id="' + entry.id + '"]');
      if (row) row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    svg.appendChild(g);
    blipGroups.push(g);
  });

  vizEl.appendChild(svg);

  // List <-> Blip hover sync
  document.querySelectorAll('.c-radar__item').forEach(function (row) {
    var id = row.getAttribute('data-blip-id');
    var entry = numberedItems.find(function (e) { return String(e.id) === id; });
    if (!entry) return;
    row.addEventListener('mouseenter', function () {
      if (tooltipEl) {
        tooltipEl.textContent = entry.id + '. ' + entry.item.name;
        tooltipEl.style.left = (entry.x / size) * 100 + '%';
        tooltipEl.style.top = (entry.y / size) * 100 + '%';
        tooltipEl.hidden = false;
      }
      row.classList.add('is-highlighted');
    });
    row.addEventListener('mouseleave', function () {
      if (tooltipEl) tooltipEl.hidden = true;
      row.classList.remove('is-highlighted');
    });
  });

  // Quadrant filter buttons
  var filterBtns = document.querySelectorAll('.c-radar__filter');
  var quadrantSections = document.querySelectorAll('.c-radar__quadrant');

  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var selected = btn.getAttribute('data-quadrant');
      filterBtns.forEach(function (b) { b.classList.toggle('is-active', b === btn); });

      quadrantSections.forEach(function (sec) {
        var match = selected === 'all' || sec.getAttribute('data-quadrant') === selected;
        sec.classList.toggle('is-hidden', !match);
      });

      blipGroups.forEach(function (g) {
        var match = selected === 'all' || g.getAttribute('data-quadrant') === selected;
        g.classList.toggle('is-dimmed', !match);
      });
    });
  });
})();
