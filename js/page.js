// Hand-drawn touches: rough.js lines (dividers, link underlines) and Rough Notation marks
document.documentElement.classList.add('js');   // the stylesheet hides what the script will reveal only when it runs
// (title underlines, the date, the highlights, the closing divider).

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
  // Sketched underline under every text link, drawn inside the link itself (so it moves with the text):
  // one small SVG at the link's top-left corner, a line under each line of the link
  const LINKS = 'main a:not(.cta-btn):not(.finale-logo):not(.leaflet-container a), footer a:not(.foot-logo)';
  const drawLinks = () => document.querySelectorAll(LINKS).forEach((a, i) => {
    let svg = a.querySelector(':scope > svg.link-sketch');
    if (!svg) {
      svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'link-sketch'); svg.setAttribute('aria-hidden', 'true');
      a.classList.add('sketched'); a.appendChild(svg);
      a.addEventListener('mouseenter', () => { svg.style.opacity = 1; }); a.addEventListener('mouseleave', () => { svg.style.opacity = .5; });
    }
    svg.replaceChildren();
    const rects = [...a.getClientRects()].filter(r => r.width >= 2);
    if (!rects.length) return;
    // the SVG covers every line of the link (a wrapped link's later lines can start further left than its
    // first), with real width and height: Safari does not paint an SVG whose size is zero
    const base = rects[0], rc = rough.svg(svg), col = getComputedStyle(a).color;
    const PAD = 4;   // room for the line's wobble
    const left = Math.min(...rects.map(r => r.left)) - PAD, top = Math.min(...rects.map(r => r.top));
    const w = Math.max(...rects.map(r => r.right)) - left + PAD, h = Math.max(...rects.map(r => r.bottom)) - top + PAD + 2;
    svg.style.left = (left - base.left) + 'px'; svg.style.top = (top - base.top) + 'px';
    svg.setAttribute('width', w); svg.setAttribute('height', h);
    rects.forEach((r, k) => {
      const x = r.left - left, y = r.bottom - top + 1;
      svg.appendChild(rc.line(x, y, x + r.width, y, { stroke: col, strokeWidth: 1.2, roughness: 1.1, bowing: 1.5, seed: 501 + i * 5 + k }));
    });
  });
  // hand-drawn boxes with a plain light wash: the joining notes inside a day card (green where you can
  // join, orange where you can't), the grey at-your-own-risk notice, and her peach "why" note
  const drawNotes = () => document.querySelectorAll('.join-note, .risk-note, .why-note').forEach((el, i) => {
    let svg = el.querySelector(':scope > svg.sketch');
    if (!svg) { svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'sketch'); svg.setAttribute('aria-hidden', 'true'); el.prepend(svg); }
    svg.replaceChildren();
    const w = el.offsetWidth, h = el.offsetHeight;
    if (!w) return;   // inside a closed card; drawn when it opens
    const no = el.classList.contains('join-no'), risk = el.classList.contains('risk-note'), why = el.classList.contains('why-note');
    const col = why ? '#2f5d46' : risk ? '#8a908a' : no ? '#D9622B' : '#2f5d46';
    const wash = why ? 'rgba(244,199,168,.22)' : risk ? 'rgba(47,53,66,.035)' : no ? 'rgba(217,98,43,.08)' : 'rgba(47,93,70,.07)';
    svg.appendChild(rough.svg(svg).rectangle(2, 2, w - 4, h - 4, {
      stroke: col, strokeWidth: 1.3, roughness: 1.4, bowing: 1.5,
      fill: wash, fillStyle: 'solid', seed: 701 + i * 3
    }));
  });
  const all = () => { draw(); drawTops(); drawLinks(); drawNotes(); };
  all();
  let tmr; addEventListener('resize', () => { clearTimeout(tmr); tmr = setTimeout(all, 120); });
  document.fonts?.ready.then(all);
  // when the page's width or a card's size changes, lines can wrap differently: redraw
  let lastKey = '';
  const art = document.querySelector('main');
  const onLayout = () => {
    const key = (art ? art.offsetHeight + 'x' + art.clientWidth : document.body.offsetHeight) + 'x' + innerWidth;
    if (key !== lastKey) { lastKey = key; clearTimeout(tmr); tmr = setTimeout(all, 30); }
  };
  const ro = new ResizeObserver(onLayout);
  ro.observe(document.body); if (art) ro.observe(art);
  // a day card opening lays out its stage dividers for the first time
  document.querySelectorAll('details').forEach(d => d.addEventListener('toggle', all));
})();

// Hand-drawn underline under each section title, drawn once as the title scrolls into view
(() => {
  if (!window.RoughNotation) return;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // each mark's drawing is placed relative to the nearest positioned ancestor of the marked text
  // (the heading, the day card, the march block: see the stylesheet), so it moves with the text
  const mark = (el, opts) => RoughNotation.annotate(el, opts).show();
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target);
    mark(e.target, { type: 'underline', color: '#D9622B', strokeWidth: 3, padding: [0, 2, 2, 2], iterations: 2, multiline: true, animate: !still, animationDuration: 700 });
  }), { rootMargin: '0px 0px -15% 0px' });
  document.querySelectorAll('.band h2 .rn').forEach(el => io.observe(el));
  // the walk's dates get a hand-drawn orange underline as the page opens
  const date = document.querySelector('.post-date');
  if (date) setTimeout(() => mark(date, { type: 'underline', color: '#D9622B', strokeWidth: 2.5, padding: [0, 2, 2, 2], iterations: 2, animate: !still, animationDuration: 700 }), 400);
  // as the day cards come into view the timeline draws itself down the page (pins and dashes, in CSS),
  // and each day's times get the peach highlighter just after its pin lands
  const days = document.querySelector('.days');
  const times = [...document.querySelectorAll('.day-meta .stage-time')];
  if (days) new IntersectionObserver((entries, o) => entries.forEach(e => {
    if (!e.isIntersecting) return;
    o.unobserve(e.target);
    days.classList.add('in');
    times.forEach((el, i) => setTimeout(() =>
      RoughNotation.annotate(el, { type: 'highlight', color: 'rgba(244,199,168,.6)', iterations: 1, padding: [1, 6], multiline: true, animate: !still, animationDuration: 380 }).show(),
      still ? 0 : i * 500 + 250));
  }), { rootMargin: '0px 0px -25% 0px' }).observe(days);
  // the divider before the closing section: a marker-style highlight band
  const div = document.querySelector('.divider');
  if (div) new IntersectionObserver((entries, o) => entries.forEach(e => {
    if (!e.isIntersecting) return;
    o.unobserve(e.target);
    mark(e.target, { type: 'highlight', color: '#D9622B', iterations: 2, multiline: false, animate: !still, animationDuration: 900 });
  }), { rootMargin: '0px 0px -15% 0px' }).observe(div);
})();

// Day cards slide open and closed (a <details> would otherwise jump), and a link to a day
// (from a map popup) opens that day's card before scrolling to it
(() => {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const EASE = { duration: 320, easing: 'cubic-bezier(.4, 0, .2, 1)' };
  const busy = new WeakSet();
  const openCard = d => {
    if (d.open || busy.has(d)) return;
    d.open = true;
    const body = d.querySelector('.day-body');
    if (still || !body?.animate) return;
    busy.add(d);
    const h = body.offsetHeight;
    body.animate([{ height: '0px', paddingBottom: '0px', opacity: 0 }, { height: h + 'px', opacity: 1 }], EASE).onfinish = () => busy.delete(d);
  };
  const closeCard = d => {
    if (!d.open || busy.has(d)) return;
    const body = d.querySelector('.day-body');
    if (still || !body?.animate) { d.open = false; return; }
    busy.add(d);
    // hold the last frame until the card is shut, so it never flashes back to full height
    const a = body.animate([{ height: body.offsetHeight + 'px', opacity: 1 }, { height: '0px', paddingBottom: '0px', opacity: 0 }], { ...EASE, fill: 'forwards' });
    a.onfinish = () => { d.open = false; a.cancel(); busy.delete(d); };
  };
  document.querySelectorAll('details.day').forEach(d => d.querySelector('summary').addEventListener('click', e => {
    e.preventDefault();
    d.open ? closeCard(d) : openCard(d);
  }));
  const openDay = hash => {
    const d = /^#day-\d$/.test(hash) && document.querySelector(hash);
    if (d && d.tagName === 'DETAILS') { openCard(d); return d; }
  };
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#day-"]');
    const d = a && openDay(a.getAttribute('href'));
    if (!d) return;
    e.preventDefault();
    history.replaceState(null, '', a.getAttribute('href'));
    d.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });
  const d = openDay(location.hash);
  if (d) d.scrollIntoView();
})();

// Quotes and the poem: a sketched bracket beside each quote, a hand-drawn mark on its key words,
// and the poem's lines arriving one by one, all as they scroll into view
(() => {
  if (!window.RoughNotation) return;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PEACH = 'rgba(244,199,168,.6)', ORANGE = '#D9622B';
  const markOf = el => ({
    highlight: { type: 'highlight', color: PEACH, iterations: 1, padding: [1, 4], multiline: true },
    circle: { type: 'circle', color: ORANGE, strokeWidth: 2, padding: [4, 8], iterations: 2 },
    underline: { type: 'underline', color: ORANGE, strokeWidth: 2.5, padding: [0, 2, 2, 2], iterations: 2, multiline: true }
  })[el.dataset.mark];
  const reveal = (root, marks) => {
    const group = marks.map(([el, o]) => RoughNotation.annotate(el, { ...o, animate: !still, animationDuration: 600 }));
    RoughNotation.annotationGroup(group).show();
  };
  const io = new IntersectionObserver((entries, o) => entries.forEach(e => {
    if (!e.isIntersecting) return;
    o.unobserve(e.target);
    const q = e.target;
    const words = [...q.querySelectorAll('em[data-mark]')].map(el => [el, markOf(el)]);
    if (q.classList.contains('quote')) reveal(q, [[q.querySelector('p'), { type: 'bracket', brackets: ['left', 'right'], color: ORANGE, strokeWidth: 2.5, padding: [2, 12] }], ...words]);
    else if (q.classList.contains('poem-text')) {   // the poem: lines fade in, then the marks follow
      q.classList.add('in');
      setTimeout(() => reveal(q, words), still ? 0 : 900);
    }
    else reveal(q, words);   // a marked phrase in the text, e.g. the Day 1 joining note
  }), { rootMargin: '0px 0px -20% 0px' });
  document.querySelectorAll('.quote, .poem-text, .lede:has(em[data-mark]), .risk-note').forEach(el => io.observe(el));
})();

// Her "why" note: an orange tick is drawn beside each reason, one after another, as the note scrolls into view
(() => {
  if (!window.rough) return;
  const note = document.querySelector('.why-note');
  if (!note) return;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NS = 'http://www.w3.org/2000/svg';
  new IntersectionObserver((entries, o) => entries.forEach(e => {
    if (!e.isIntersecting) return;
    o.unobserve(e.target);
    note.querySelectorAll('li').forEach((li, i) => {
      const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'tick'); svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true');
      li.prepend(svg);
      const g = rough.svg(svg).path('M3 13 L9 19 L21 5', { stroke: '#D9622B', strokeWidth: 2.6, roughness: 1.2, bowing: 1, seed: 801 + i });
      svg.appendChild(g);
      if (still) return;
      g.querySelectorAll('path').forEach(p => {
        const len = p.getTotalLength();
        p.style.strokeDasharray = len; p.style.strokeDashoffset = len;
        p.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: 420, delay: 250 + i * 320, easing: 'ease-out', fill: 'forwards' });
      });
    });
  }), { rootMargin: '0px 0px -20% 0px' }).observe(note);
})();
