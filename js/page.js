// Hand-drawn touches: rough.js lines (dividers, link underlines) and Rough Notation marks
// (title underlines, the date, the scale bar box, the closing divider).

// Hand-drawn dividers in each day box: a line across under the title and a line between the two
// stages (stacked stages on phones get a line between them instead). Same sketch style as the
// title underlines; a fixed seed per box keeps each line's wobble the same on every redraw.
(() => {
  if (!window.rough) return;
  const STROKE = '#c9cdc3';
  const NS = 'http://www.w3.org/2000/svg';
  const draw = () => document.querySelectorAll('.stages').forEach((box, i) => {
    let svg = box.querySelector('svg.sketch');
    if (!svg) { svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'sketch'); svg.setAttribute('aria-hidden', 'true'); box.prepend(svg); }
    svg.replaceChildren();
    const rc = rough.svg(svg), w = box.clientWidth, h = box.clientHeight;
    const opt = n => ({ stroke: STROKE, strokeWidth: 1.4, roughness: 1.3, bowing: 1.2, seed: 101 + i * 7 + n });
    svg.appendChild(rc.line(0, 1, w, 1, opt(0)));
    const [a, b] = box.querySelectorAll('.stage');
    if (!b) return;
    if (b.offsetTop > a.offsetTop + 4) { const y = b.offsetTop; svg.appendChild(rc.line(0, y, w, y, opt(1))); }
    else { const x = b.offsetLeft; svg.appendChild(rc.line(x, 8, x, h - 4, opt(1))); }
  });
  const drawTops = () => document.querySelectorAll('.sketch-top').forEach((el, i) => {
    let svg = el.querySelector(':scope > svg.sketch');
    if (!svg) { svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'sketch'); svg.setAttribute('aria-hidden', 'true'); el.prepend(svg); }
    svg.replaceChildren();
    svg.appendChild(rough.svg(svg).line(0, 1, el.clientWidth, 1, { stroke: STROKE, strokeWidth: 1.4, roughness: 1.3, bowing: 1.2, seed: 301 + i }));
  });
  // Sketched underline under every text link: one page-wide layer, a line under each line of each link
  const LINKS = 'article a:not(.donate), footer a:not(.foot-logo)';
  let layer;
  const drawLinks = () => {
    if (!layer) { layer = document.createElementNS(NS, 'svg'); layer.setAttribute('class', 'link-sketch'); layer.setAttribute('aria-hidden', 'true'); document.body.appendChild(layer); }
    layer.replaceChildren();
    const de = document.documentElement;
    layer.setAttribute('width', de.scrollWidth); layer.setAttribute('height', de.scrollHeight);
    const rc = rough.svg(layer);
    document.querySelectorAll(LINKS).forEach((a, i) => {
      const g = document.createElementNS(NS, 'g');
      const col = getComputedStyle(a).color;
      [...a.getClientRects()].forEach((r, k) => {
        if (r.width < 2) return;
        const y = r.bottom + scrollY + 1, x = r.left + scrollX;
        g.appendChild(rc.line(x, y, x + r.width, y, { stroke: col, strokeWidth: 1.2, roughness: 1.1, bowing: 1.5, seed: 501 + i * 5 + k }));
      });
      g.style.opacity = .5; g.style.transition = 'opacity .15s';
      a.onmouseenter = () => { g.style.opacity = 1; }; a.onmouseleave = () => { g.style.opacity = .5; };
      layer.appendChild(g);
    });
  };
  const all = () => { draw(); drawTops(); drawLinks(); };
  all();
  let tmr; addEventListener('resize', () => { clearTimeout(tmr); tmr = setTimeout(all, 120); });
  document.fonts?.ready.then(all);
  // photos load lazily and shift the page; redraw when the page height changes
  // ...and when the text column changes width, e.g. when the map is hidden or shown again
  let lastKey = '';
  const art = document.querySelector('article');
  const onLayout = () => {
    const key = document.documentElement.scrollHeight + 'x' + (art ? art.clientWidth : 0) + 'x' + innerWidth;
    if (key !== lastKey) { lastKey = key; clearTimeout(tmr); tmr = setTimeout(all, 80); }
  };
  const ro = new ResizeObserver(onLayout);
  ro.observe(document.body); if (art) ro.observe(art);
  addEventListener('layoutchange', () => { clearTimeout(tmr); tmr = setTimeout(all, 30); });
})();

// Hand-drawn underline under each day title, drawn once as the title scrolls into view
(() => {
  if (!window.RoughNotation) return;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // every mark drawn so far; they are redrawn in place (no animation) when the layout shifts,
  // e.g. when the map is hidden and the text column slides to the middle of the page
  const marks = [];
  const mark = (el, opts) => { const a = RoughNotation.annotate(el, opts); marks.push(a); a.show(); };
  let redrawTmr;
  addEventListener('layoutchange', () => {
    clearTimeout(redrawTmr);
    redrawTmr = setTimeout(() => marks.forEach(a => { a.animate = false; a.hide(); a.show(); }), 60);
  });
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target);
    mark(e.target, { type: 'underline', color: '#D9622B', strokeWidth: 3, padding: [0, 2, 2, 2], iterations: 2, multiline: true, animate: !still, animationDuration: 700 });
  }), { rootMargin: '0px 0px -15% 0px' });
  document.querySelectorAll('.day h2 .rn').forEach(el => io.observe(el));
  // the walk's dates get a hand-drawn orange underline as the page opens
  const date = document.querySelector('.post-date');
  if (date) setTimeout(() => mark(date, { type: 'underline', color: '#D9622B', strokeWidth: 2.5, padding: [0, 2, 2, 2], iterations: 2, animate: !still, animationDuration: 700 }), 400);
  // the map's scale bar gets a sketched box, redrawn whenever its width changes with the zoom
  const scale = document.querySelector('.leaflet-control-scale-line');
  if (scale && window.map) {
    let box = null, lastW = -1, raf = 0;
    const fit = () => {
      raf = 0;
      const w = scale.offsetWidth;
      if (w === lastW) return;
      lastW = w;
      if (box) box.remove();
      box = RoughNotation.annotate(scale, { type: 'box', color: '#2F3542', strokeWidth: 1.5, padding: 2, iterations: 1, animate: false });
      box.show();
    };
    map.on('move zoom', () => { if (!raf) raf = requestAnimationFrame(fit); });
    addEventListener('layoutchange', () => { lastW = -1; if (!raf) raf = requestAnimationFrame(fit); });
    fit();
  }
  // the divider before the closing section: a marker-style highlight band
  const div = document.querySelector('.divider');
  if (div) new IntersectionObserver((entries, o) => entries.forEach(e => {
    if (!e.isIntersecting) return;
    o.unobserve(e.target);
    mark(e.target, { type: 'highlight', color: '#D9622B', iterations: 2, multiline: false, animate: !still, animationDuration: 900 });
  }), { rootMargin: '0px 0px -15% 0px' }).observe(div);
})();
