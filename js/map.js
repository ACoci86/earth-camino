// Earth Camino route map: follows the reader's scroll, draws walked vs. remaining route,
// and shows an elevation profile underneath.


// true when the map sits across the top of the screen (phones and tablets held upright); matches the stylesheet
const mapOnTop = () => matchMedia('(max-width: 999px) and (orientation: portrait), (max-width: 599px)').matches;

const STOPS = [
  ['Waterford', 52.2593, -7.1101], ['New Ross', 52.3962, -6.9366], ['St Mullins', 52.4887, -6.9286],
  ['Borris', 52.5996, -6.9262], ['Bagenalstown', 52.7003, -6.9587], ['Carlow', 52.8365, -6.9341],
  ['Athy', 52.9918, -6.9870], ['Monasterevin', 53.1410, -7.0646], ['Rathangan', 53.2214, -6.9967],
  ['Sallins', 53.2466, -6.6636], ['Clondalkin', 53.3203, -6.3944], ['Garden of Remembrance', 53.3540, -6.2641]
];
// Each day covers these route legs (leg i runs from STOPS[i] to STOPS[i+1]).
const DAYS = [
  { legs: [0, 1], km: 42, name: 'Waterford to St Mullins' },
  { legs: [2, 3], km: 37.5, name: 'St Mullins to Bagenalstown' },
  { legs: [4, 5], km: 41, name: 'Bagenalstown to Athy' },
  { legs: [6, 7], km: 37.5, name: 'Athy to Rathangan' },
  { legs: [8, 9], km: 50, name: 'Rathangan to Clondalkin' },
  { legs: [10], km: 12, name: 'Clondalkin to Dublin' }
];
const PLANNED_KM = 220;
const ROUTE_COLOR = '#d9622b';

// --- Route geometry: one flat line, with each stop's index and the distance along it ---
const legs = window.ROUTE || [];
const flat = [];
const legStart = [];
legs.forEach((leg, i) => {
  legStart.push(flat.length ? flat.length - 1 : 0);
  (i ? leg.slice(1) : leg).forEach(p => flat.push(L.latLng(p[0], p[1])));
});
legStart.push(flat.length - 1);
const cumKm = [0];
for (let i = 1; i < flat.length; i++) cumKm.push(cumKm[i - 1] + flat[i - 1].distanceTo(flat[i]) / 1000);
const stopIdx = STOPS.map((_, i) => legStart[i]);


// --- Map and layers (all free, no key needed) ---
// The route line is drawn on an SVG that covers three times the view (padding 1), so a fast
// pan never reaches its edge; the tile layers below also load a margin around the view.
const map = L.map('map', { zoomControl: false, scrollWheelZoom: false, attributionControl: false, zoomSnap: 0, fadeAnimation: false, renderer: L.svg({ padding: 1 }) });
const esri = path => `https://server.arcgisonline.com/ArcGIS/rest/services/${path}/MapServer/tile/{z}/{y}/{x}`;
const LAYERS = [];
LAYERS.push(
  {
    name: 'Outdoors',
    layer: L.tileLayer(esri('World_Topo_Map'), { maxZoom: 18 }),
    credit: { 'Map data': 'Esri, HERE, Garmin, FAO, USGS, © OpenStreetMap contributors', 'Imagery': '© <a href="https://www.esri.com/">Esri</a>' }
  },
  {
    name: 'Streets',
    layer: L.tileLayer(esri('World_Street_Map'), { maxZoom: 18 }),
    credit: { 'Map data': 'Esri, HERE, Garmin, USGS, © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors', 'Imagery': '© <a href="https://www.esri.com/">Esri</a>' }
  },
  {
    name: 'National Geographic',
    layer: L.tileLayer(esri('NatGeo_World_Map'), { maxZoom: 18, maxNativeZoom: 12 }),   // no detail past level 12 here
    credit: { 'Map data': 'National Geographic, Esri, Garmin, HERE, UNEP-WCMC, USGS, NASA', 'Imagery': '© <a href="https://www.esri.com/">Esri</a>' }
  },
  {
    name: 'Walking routes',
    layer: L.tileLayer(esri('World_Street_Map'), { maxZoom: 18 }),
    // marked long-distance paths (Barrow Way, Grand Canal Way...) drawn over the street map
    overlay: L.tileLayer('https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png', { maxZoom: 18, opacity: .85 }),
    credit: { 'Map data': '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors', 'Imagery': '© <a href="https://www.esri.com/">Esri</a>, routes © <a href="https://hiking.waymarkedtrails.org">Waymarked Trails</a>' }
  },
  {
    name: 'Humanitarian',
    layer: L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', { maxZoom: 18, subdomains: 'abc' }),
    credit: { 'Map data': '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors', 'Imagery': 'Humanitarian OpenStreetMap Team, OpenStreetMap France' }
  },
  {
    name: 'Dark',
    layer: L.tileLayer(esri('Canvas/World_Dark_Gray_Base'), { maxZoom: 16 }),
    credit: { 'Map data': 'Esri, HERE, Garmin, © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors', 'Imagery': '© <a href="https://www.esri.com/">Esri</a>' }
  },
  {
    name: 'Topographic',
    layer: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { maxZoom: 17, subdomains: 'abc' }),
    credit: { 'Map data': '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM', 'Imagery': '© <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)' }
  },
  {
    name: 'Light',
    layer: L.tileLayer(esri('Canvas/World_Light_Gray_Base'), { maxZoom: 16 }),
    credit: { 'Map data': 'Esri, HERE, Garmin, © OpenStreetMap contributors', 'Imagery': '© <a href="https://www.esri.com/">Esri</a>' }
  },
  {
    name: 'Satellite',
    layer: L.tileLayer(esri('World_Imagery'), { maxZoom: 18 }),
    credit: { 'Imagery': '© <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics' }
  }
);
const baseTileBounds = L.GridLayer.prototype._getTiledPixelBounds;
LAYERS.forEach(l => [l.layer, l.overlay].filter(Boolean).forEach(tl => {
  Object.assign(tl.options, { keepBuffer: 8, updateWhenIdle: false, updateInterval: 50 });
  // request tiles for a full view beyond each edge, so even a fast flick never exposes a blank strip
  tl._getTiledPixelBounds = function (center) {
    const b = baseTileBounds.call(this, center), m = b.getSize();
    return L.bounds(b.min.subtract(m), b.max.add(m));
  };
}));
let activeLayer = null;
function useLayer(i) {
  if (activeLayer) { map.removeLayer(activeLayer.layer); if (activeLayer.overlay) map.removeLayer(activeLayer.overlay); }
  activeLayer = LAYERS[i];
  activeLayer.layer.addTo(map);
  if (activeLayer.overlay) activeLayer.overlay.addTo(map);
  renderInfo();
  if (map._loaded) schedulePrefetch();
}

// --- Route lines: remaining route dotted, walked part solid ---
const ahead = L.polyline(flat, { color: ROUTE_COLOR, weight: 5, opacity: .9, lineCap: 'round', lineJoin: 'round' }).addTo(map);
const aheadDots = L.polyline(flat, { color: '#fff', weight: 2, dashArray: '1 6', lineCap: 'round', opacity: 1 }).addTo(map);
const walked = L.polyline([], { color: ROUTE_COLOR, weight: 5, opacity: 1, lineCap: 'round', lineJoin: 'round' }).addTo(map);
const walker = L.marker(flat[0] || [0, 0], {
  icon: L.divIcon({ className: '', html: '<div class="walker"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }),
  interactive: false, zIndexOffset: 1000
}).addTo(map);

// Point on the line `km` kilometres from the start, and the index of the vertex after it.
function pointAtKm(km) {
  let i = 1;
  while (i < cumKm.length - 1 && cumKm[i] < km) i++;
  const a = flat[i - 1], b = flat[i];
  const f = Math.min(Math.max((km - cumKm[i - 1]) / ((cumKm[i] - cumKm[i - 1]) || 1), 0), 1);
  return { i, ll: L.latLng(a.lat + (b.lat - a.lat) * f, a.lng + (b.lng - a.lng) * f) };
}
let progressKm = 0;
function setProgress(km) {
  progressKm = km;
  const { i, ll } = pointAtKm(km);
  // Dotted line only runs from here to the next stop; the rest of the route stays hidden.
  const next = STOPS.findIndex((_, j) => cumKm[stopIdx[j]] > km + .01);
  const end = next < 0 ? flat.length - 1 : stopIdx[next];
  const aheadPts = i <= end ? [ll, ...flat.slice(i, end + 1)] : [];
  walked.setLatLngs([...flat.slice(0, i), ll]);
  ahead.setLatLngs(aheadPts);
  aheadDots.setLatLngs(aheadPts);
  walker.setLatLng(ll);
  updateMarkers(km, next);
  drawElevation();
}

// --- Stop markers ---
// Symbols for the two ends of the walk: hand-drawn start (play) and finish (flag) badges
const ENDPOINT_HTML = {
  start: '<div class="endpoint start"><img src="img/icons/start.svg" alt=""><span>Start</span></div>',
  finish: '<div class="endpoint finish"><img src="img/icons/finish.svg" alt=""><span>Finish</span></div>'
};
const markers = STOPS.map((s, i) => {
  const start = i === 0, finish = i === STOPS.length - 1;
  const icon = start || finish
    ? L.divIcon({ className: '', html: ENDPOINT_HTML[start ? 'start' : 'finish'], iconSize: [44, 44], iconAnchor: [22, 22] })
    : L.divIcon({ className: '', html: '<div class="pin"></div>', iconSize: [16, 16], iconAnchor: [8, 8] });
  const m = L.marker([s[1], s[2]], { icon, keyboard: false, zIndexOffset: start || finish ? 500 : 0 }).addTo(map);
  m.bindTooltip(s[0], { className: 'town', direction: 'right', offset: [start || finish ? 22 : 12, 0] });
  return m;
});
// Stops already reached show as small dots; the next stop gets a ring and its name;
// stops further on are hidden until the walk gets close.
let lastNext;
function updateMarkers(km, next) {
  if (next === lastNext) return;
  lastNext = next;
  markers.forEach((m, j) => {
    const el = m.getElement()?.firstChild;
    const reached = cumKm[stopIdx[j]] <= km + .01;
    if (el) {
      el.classList.toggle('next', j === next);
      el.style.opacity = reached || j === next ? 1 : 0;
    }
    if (j === next) m.openTooltip(); else m.closeTooltip();
  });
}

// --- Controls ---
L.control.scale({ position: 'topright', imperial: false, maxWidth: 100 }).addTo(map);
// hand-drawn control icons (img/controls), one per button
const icons = {
  plus: 'zoom-in', minus: 'zoom-out', layers: 'layers',
  full: 'fullscreen', hide: 'hide', download: 'download'
};
const Buttons = L.Control.extend({
  options: { position: 'topright' },
  onAdd() {
    const box = L.DomUtil.create('div', 'ctl');
    const group = (items) => {
      const g = L.DomUtil.create('div', 'ctl', box);
      g.style.gap = '0';
      items.forEach(([key, label, fn], n) => {
        const b = L.DomUtil.create('button', 'ctl-btn', g);
        b.type = 'button';
        b.setAttribute('aria-label', label);
        b.title = label;
        b.innerHTML = `<img src="img/controls/${icons[key]}.svg?v=2" alt="">`;   // ?v= makes browsers fetch updated icons
        if (items.length > 1) {
          b.style.borderRadius = n === 0 ? '6px 6px 0 0' : '0 0 6px 6px';
          if (n) b.style.borderTop = '0';
        }
        L.DomEvent.on(b, 'click', e => { L.DomEvent.stop(e); fn(b); });
      });
    };
    group([['plus', 'Zoom in', () => zoomBy(1)], ['minus', 'Zoom out', () => zoomBy(-1)]]);
    group([['layers', 'Map style', toggleLayers]]);
    group([['full', 'Full screen', toggleFullscreen]]);
    group([['hide', 'Hide map', () => setMapHidden(true)]]);
    group([['download', 'Download route (GPX)', downloadGpx]]);
    L.DomEvent.disableClickPropagation(box);
    return box;
  }
});
new Buttons().addTo(map);

const layerPanel = document.getElementById('layer-panel');
layerPanel.innerHTML = LAYERS.map((l, i) =>
  `<label><input type="radio" name="basemap" id="basemap-${i}" value="${i}"${i === 0 ? ' checked' : ''}> ${l.name}</label>`).join('');
layerPanel.addEventListener('change', e => { useLayer(+e.target.value); closeLayers(); });
let layerBtn = null;
function closeLayers() {
  layerPanel.hidden = true;
  layerBtn?.setAttribute('aria-expanded', 'false');
}
function toggleLayers(btn) {
  layerBtn = btn;
  if (!layerPanel.hidden) return closeLayers();
  // open beside the button that was pressed
  const box = mapBox.getBoundingClientRect(), r = btn.getBoundingClientRect();
  layerPanel.style.top = (r.top - box.top) + 'px';
  layerPanel.style.right = (box.right - r.left + 8) + 'px';
  layerPanel.hidden = false;
  btn.setAttribute('aria-expanded', 'true');
}
document.addEventListener('click', e => {
  if (!layerPanel.hidden && !layerPanel.contains(e.target) && !e.target.closest('[aria-label="Map style"]')) closeLayers();
  if (!infoPanel.hidden && !infoPanel.contains(e.target) && !infoBtn.contains(e.target)) { infoPanel.hidden = true; infoBtn.setAttribute('aria-expanded', 'false'); }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeLayers(); infoPanel.hidden = true; } });
map.on('click dragstart', closeLayers);

const infoBtn = document.getElementById('info-btn');
const infoPanel = document.getElementById('info-panel');
function renderInfo() {
  infoPanel.innerHTML = Object.entries(activeLayer.credit).map(([k, v]) => `<p><b>${k}</b>${v}</p>`).join('') +
    '<p><b>Elevation</b>Open-Meteo, Copernicus DEM</p><p class="made">Made with Leaflet for the Earth Camino</p>';
}
infoBtn.addEventListener('click', () => {
  infoPanel.hidden = !infoPanel.hidden;
  infoBtn.setAttribute('aria-expanded', String(!infoPanel.hidden));
});

const mapBox = document.querySelector('.map-box');
function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else mapBox.requestFullscreen?.().catch(() => {});
}
document.addEventListener('fullscreenchange', () => setTimeout(() => { map.invalidateSize(); drawElevation(); }, 100));

function setMapHidden(off) {
  document.body.classList.toggle('map-off', off);
  // the text column slides sideways without changing size, so tell the hand-drawn lines to redraw
  requestAnimationFrame(() => dispatchEvent(new Event('layoutchange')));
  if (!off) setTimeout(() => { map.invalidateSize(); drawElevation(); }, 50);
}
document.getElementById('show-map').addEventListener('click', () => setMapHidden(false));

function downloadGpx() {
  const pts = flat.map(p => `<trkpt lat="${p.lat.toFixed(5)}" lon="${p.lng.toFixed(5)}"/>`).join('\n');
  const wpts = STOPS.map(s => `<wpt lat="${s[1]}" lon="${s[2]}"><name>${s[0]}</name></wpt>`).join('\n');
  const gpx = `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Earth Camino" xmlns="http://www.topografix.com/GPX/1/1">\n<metadata><name>Earth Camino: Waterford to Dublin</name></metadata>\n${wpts}\n<trk><name>Earth Camino</name><trkseg>\n${pts}\n</trkseg></trk>\n</gpx>\n`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([gpx], { type: 'application/gpx+xml' }));
  a.download = 'earth-camino.gpx';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// --- Elevation profile ---
const ELEV = window.ELEVATION || [];
const canvas = document.getElementById('elev');
const statsEl = document.getElementById('stats');
let gain = 0, loss = 0;
for (let i = 1; i < ELEV.length; i++) {
  const d = ELEV[i][1] - ELEV[i - 1][1];
  if (d > 0) gain += d; else loss -= d;
}
const eMin = Math.min(...ELEV.map(e => e[1]));
const eMax = Math.max(...ELEV.map(e => e[1]));
const totalKm = ELEV.length ? ELEV[ELEV.length - 1][0] : 1;
statsEl.insertAdjacentHTML('beforeend',
  `<span class="opt">Gain: <b>${Math.round(gain)} m</b></span><span class="opt">Loss: <b>${Math.round(loss)} m</b></span>` +
  `<span>Max: <b>${eMax} m</b></span><span>Min: <b>${eMin} m</b></span><span>Distance: <b>${PLANNED_KM} km</b></span>`);
let hoverKm = null;
const hoverMarker = L.marker([0, 0], { icon: L.divIcon({ className: '', html: '<div class="pin hover"></div>', iconSize: [16, 16], iconAnchor: [8, 8] }), interactive: false });

function drawElevation() {
  if (!ELEV.length || !canvas.offsetWidth) return;
  const dpr = devicePixelRatio || 1;
  const w = canvas.offsetWidth, h = canvas.offsetHeight;
  canvas.width = w * dpr; canvas.height = h * dpr;
  const c = canvas.getContext('2d');
  c.scale(dpr, dpr);
  const left = 34, right = 4, top = 6, bottom = 4;
  const lo = 0, hi = Math.ceil((eMax + 20) / 50) * 50;
  const x = km => left + (km / totalKm) * (w - left - right);
  const y = m => top + (1 - (m - lo) / (hi - lo)) * (h - top - bottom);
  // lines are sketched with rough.js (same hand-drawn style as the page's dividers); fixed seeds keep
  // each line's wobble identical on every redraw, so the chart doesn't shimmer while scrolling
  const rc = window.rough ? rough.canvas(canvas) : null;
  const line = (x1, y1, x2, y2, o) => rc
    ? rc.line(x1, y1, x2, y2, { roughness: .7, bowing: .6, ...o })
    : (c.beginPath(), c.setLineDash(o.strokeLineDash || []), c.moveTo(x1, y1), c.lineTo(x2, y2), c.strokeStyle = o.stroke, c.lineWidth = o.strokeWidth, c.stroke(), c.setLineDash([]));

  // grid + labels
  c.font = '500 10px "Outfit", system-ui, sans-serif';
  c.fillStyle = '#7a8a7f';
  for (let m = lo; m <= hi; m += 50) {
    line(left, y(m), w - right, y(m), { stroke: 'rgba(47,53,66,.13)', strokeWidth: 1, seed: 11 + m });
    c.fillText(m + ' m', 0, y(m) + 3);
  }
  // day boundaries
  DAYS.forEach((d, i) => {
    if (!i) return;
    const k = cumKm[legStart[d.legs[0]]];
    line(x(k), top, x(k), h - bottom, { stroke: 'rgba(54,117,96,.45)', strokeWidth: 1, strokeLineDash: [3, 4], seed: 31 + i });
  });

  const area = (from, to, fill) => {
    c.beginPath(); c.moveTo(x(from), y(lo));
    ELEV.forEach(([k, m]) => { if (k >= from && k <= to) c.lineTo(x(k), y(m)); });
    c.lineTo(x(to), y(lo)); c.closePath(); c.fillStyle = fill; c.fill();
  };
  const doneKm = progressKm;
  area(0, totalKm, 'rgba(244,199,168,.55)');            // peach, like the blobs behind the icons
  if (doneKm > 0) area(0, doneKm, 'rgba(217,98,43,.5)');  // walked part in the route orange
  if (rc) rc.linearPath(ELEV.map(([k, m]) => [x(k), y(m)]), { stroke: ROUTE_COLOR, strokeWidth: 2.2, roughness: .8, bowing: .4, seed: 7 });
  else {
    c.beginPath();
    ELEV.forEach(([k, m], i) => i ? c.lineTo(x(k), y(m)) : c.moveTo(x(k), y(m)));
    c.strokeStyle = ROUTE_COLOR; c.lineWidth = 2.5; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke();
  }

  // current position + hover line
  const mark = (km, color) => line(x(km), top, x(km), h - bottom, { stroke: color, strokeWidth: 1.2, seed: 61 });
  if (doneKm > 0) { mark(doneKm, '#2F3542'); c.beginPath(); c.arc(x(doneKm), y(ELEV.reduce((a, b) => Math.abs(b[0] - doneKm) < Math.abs(a[0] - doneKm) ? b : a)[1]), 4, 0, Math.PI * 2); c.fillStyle = ROUTE_COLOR; c.fill(); c.lineWidth = 2; c.strokeStyle = '#fff'; c.stroke(); }
  if (hoverKm != null) {
    mark(hoverKm, '#2F3542');
    const e = ELEV.reduce((a, b) => Math.abs(b[0] - hoverKm) < Math.abs(a[0] - hoverKm) ? b : a);
    const label = `${e[1]} m - ${Math.round(hoverKm / totalKm * PLANNED_KM)} km`;
    c.font = '800 11px "Outfit", system-ui, sans-serif';
    const tw = c.measureText(label).width + 14;
    const lx = Math.min(Math.max(x(hoverKm) - tw / 2, left), w - right - tw);
    c.fillStyle = '#367560'; c.beginPath(); c.roundRect(lx, top, tw, 18, 9); c.fill();
    c.fillStyle = '#fff'; c.fillText(label, lx + 7, top + 13);
  }
}
const kmAtEvent = e => {
  const r = canvas.getBoundingClientRect();
  return Math.min(Math.max((e.clientX - r.left - 34) / (r.width - 38), 0), 1) * totalKm;
};
const idxAtKm = km => { let i = 0; while (i < cumKm.length - 1 && cumKm[i] < km) i++; return i; };
canvas.addEventListener('mousemove', e => {
  hoverKm = kmAtEvent(e);
  hoverMarker.setLatLng(flat[idxAtKm(hoverKm)]).addTo(map);
  drawElevation();
});
canvas.addEventListener('mouseleave', () => { hoverKm = null; hoverMarker.remove(); drawElevation(); });
canvas.addEventListener('click', e => {
  scrollToKm(cumKm[idxAtKm(kmAtEvent(e))]);
});

// --- Scroll-driven walk ---
// The map keeps its zoom and pans along the line as you scroll, so the walker moves
// steadily between the places the text mentions instead of jumping.
// The zoom is chosen per day so the map never races: the longer the day's distance
// compared with its stretch of page, the further the map zooms out. The +/- buttons shift it.
let zoomOffset = 0;
function zoomBy(step) {
  zoomOffset = Math.min(Math.max(zoomOffset + step, -3), 3);
  paused = false;
  onScroll();
  schedulePrefetch();
}

// Opening view: the whole Camino, framed above the elevation strip.
const wholeBounds = L.latLngBounds(flat);
function overview() {
  const strip = document.querySelector('.profile')?.offsetParent ? 122 : 0;   // the strip is hidden on some screens
  const zoom = map.getBoundsZoom(wholeBounds, false, L.point(80, 170 + strip));   // extra room for the Start badge and label
  const c = map.unproject(map.project(wholeBounds.getCenter(), zoom).add([0, (strip + 90) / 2]), zoom);
  return { zoom, center: c };
}
function showWholeRoute() {
  walked.setLatLngs([]);
  ahead.setLatLngs(flat);
  aheadDots.setLatLngs(flat);
  walker.setLatLng(flat[0]);
  progressKm = 0;
  lastNext = 'overview';
  markers.forEach(m => {
    const el = m.getElement()?.firstChild;
    if (el) { el.classList.remove('next'); el.style.opacity = 1; }
    m.closeTooltip();
  });
  drawElevation();
}
const nowEl = document.getElementById('now');
const totalLineKm = cumKm[cumKm.length - 1] || 0;
const dayStartKm = DAYS.map(d => cumKm[legStart[d.legs[0]]]);
const dayOfKm = km => { let d = 0; dayStartKm.forEach((k, i) => { if (km >= k - .01) d = i; }); return d; };
let paused = false;
map.on('dragstart', () => { paused = true; });

const day1 = document.getElementById('day-1');
// Each day owns the stretch of page from its heading to the next day's heading (the last day
// runs to the closing section). The walker moves at an even pace through that stretch, so the
// map is always where the text says it is.
const dayEls = DAYS.map((_, i) => document.getElementById('day-' + (i + 1)));
const endEl = document.querySelector('.finale');
const dayLenKm = DAYS.map((_, i) => (i + 1 < DAYS.length ? dayStartKm[i + 1] : totalLineKm) - dayStartKm[i]);
const WALK_RATIO = 0.5;
const ZOOM_WINDOW = 220;          // map pixels travelled per pixel scrolled
const MEAN_LAT = 52.9;
const readingLine = () => innerHeight * (mapOnTop() ? .6 : .45);
function dayLayout() {
  const line = readingLine();
  const tops = [...dayEls, endEl].map(e => e.getBoundingClientRect().top - line);
  const zs = dayLenKm.map((km, i) => {
    const H = Math.max(tops[i + 1] - tops[i], 300);
    const metresPerPx = km * 1000 / (WALK_RATIO * H);
    return Math.min(Math.max(Math.log2(156543 * Math.cos(MEAN_LAT * Math.PI / 180) / metresPerPx), 10.4), 12.9);
  });
  return { tops, zs };
}

// Where the reader has scrolled to: intro progress (0 to 1), km along the route and the zoom to use.
function readScroll() {
  const line = readingLine();
  const introSpan = Math.max(day1.getBoundingClientRect().top + scrollY - line, 1);
  const f = Math.min(Math.max(scrollY / introSpan, 0), 1);
  const { tops, zs } = dayLayout();
  const last = DAYS.length - 1;
  let km, z;
  if (tops[0] > 0) { km = 0; z = zs[0]; }
  else if (tops[last + 1] <= 0) { km = totalLineKm; z = zs[last]; }
  else {
    let d = 0; while (d < last && tops[d + 1] <= 0) d++;
    km = dayStartKm[d] + Math.min(Math.max(-tops[d] / (tops[d + 1] - tops[d]), 0), 1) * dayLenKm[d];
    // the zoom changes only within ZOOM_WINDOW px of scrolling either side of a day heading,
    // so most of the walk runs at a steady zoom with crisp tiles
    z = zs[0];
    for (let i = 1; i <= last; i++) {
      const t = Math.min(Math.max((ZOOM_WINDOW - tops[i]) / (2 * ZOOM_WINDOW), 0), 1);
      z += (zs[i] - z) * t * t * (3 - 2 * t);
    }
  }
  return { f, km: f < 1 ? 0 : km, z: z + zoomOffset, n: 0 };
}

// Scroll the page to the spot where the walker is at a given distance
function scrollToKm(km) {
  const { tops } = dayLayout();
  let d = DAYS.length - 1; while (d > 0 && dayStartKm[d] > km) d--;
  const fr = Math.min(Math.max((km - dayStartKm[d]) / dayLenKm[d], 0), 1);
  scrollBy({ top: tops[d] + fr * (tops[d + 1] - tops[d]) + 1, behavior: 'smooth' });
}

// Per-frame camera move. A zoom change uses Leaflet's own animation step (as flyTo does):
// layers just rescale, instead of rebuilding the route line and tiles on every frame.
let zoomMoving = false, drawnZoom = null;
function moveTo(center, zoom) {
  if (zoom !== map.getZoom()) {
    if (!zoomMoving) { map._stop(); map._moveStart(true, false); zoomMoving = true; drawnZoom = Math.round(map.getZoom()); }
    // flyTo flag: tiles from the previous zoom level stay on screen until the sharper ones
    // have loaded, instead of being removed straight away (which flashed the background)
    map._move(center, zoom, { flyTo: true });
    // during a zoom Leaflet only requests tiles when the tile level changes; ask every frame
    [activeLayer.layer, activeLayer.overlay].forEach(tl => { if (tl && tl._tileZoom !== undefined) tl._update(); });
    // re-project the route line at the new zoom; otherwise it is drawn on a surface still
    // scaled for the old zoom and drifts away from the walker
    map.getRenderer(ahead)._reset();
  } else {
    // plain pan; setView can fall back to a full reset that reloads every tile
    const offset = map.project(center).subtract(map.project(map.getCenter()));
    if (offset.x || offset.y) map.panBy(offset, { animate: false });
  }
}
function settleCamera() {
  if (zoomMoving) { zoomMoving = false; map._moveEnd(true); }
}

// Camera for the opening: whole route at e = 0, Waterford at walking zoom at e = 1.
function introView(e, z, target = flat[0]) {
  const o = overview();
  const zz = o.zoom + (z - o.zoom) * e;
  const a = map.project(o.center, zz), b = map.project(target, zz);
  return { center: map.unproject(a.add(b.subtract(a).multiplyBy(e)), zz), zoom: zz };
}

function whereLabel(km) {
  const d = dayOfKm(km);
  const atStop = STOPS.findIndex((_, j) => Math.abs(cumKm[stopIdx[j]] - km) < .4);
  return km <= 0 ? 'Start - Waterford' : km >= totalLineKm ? 'Finish - Dublin'
    : `Day ${d + 1} - ${atStop >= 0 ? STOPS[atStop][0] : DAYS[d].name}`;
}
function render(f, km, z, n) {
  // walking visuals whenever the walker is away from the start, even while the opening eases in or out
  const walking = f >= 1 || km > .05;
  // the walker dot would sit on top of the start and finish symbols, so it hides while it is on them
  const wEl = walker.getElement(); if (wEl) wEl.style.opacity = !walking || km < .05 || km > totalLineKm - .05 ? 0 : 1;
  if (f < 1) {
    // Opening: whole route, easing in towards the walker's position by the time Day 1 is reached.
    const e = f * f * (3 - 2 * f);
    if (walking) setProgress(km); else if (lastNext !== 'overview') showWholeRoute();
    nowEl.textContent = walking ? whereLabel(km) : 'The whole Camino - Waterford to Dublin';
    if (!paused) { const v = introView(e, z, walking ? pointAtKm(km).ll : flat[0]); moveTo(v.center, v.zoom); }
    return;
  }
  setProgress(km);
  nowEl.textContent = whereLabel(km);
  if (!paused) moveTo(walker.getLatLng(), z);
}

// The map eases towards the scroll position instead of jumping with each wheel step.
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const EASE_SECONDS = reduceMotion ? 0 : .12;
const shown = { f: 0, km: 0, z: 12 };
let goal = { f: 0, km: 0, z: 12, n: 0 };
let running = false, lastT = 0;
function frame(t) {
  goal = readScroll();
  const dt = lastT ? Math.min((t - lastT) / 1000, .1) : 1 / 60;
  lastT = t;
  const k = EASE_SECONDS ? 1 - Math.exp(-dt / EASE_SECONDS * 3) : 1;
  shown.f += (goal.f - shown.f) * k;
  shown.km += (goal.km - shown.km) * k;
  shown.z += (goal.z - shown.z) * k;
  // the eased values only approach their goals; snap the opening when it is all but finished,
  // and the walker to the start when it is all but there, so the two modes hand over cleanly
  if (goal.f >= 1 && shown.f > .999) shown.f = 1;
  if (goal.f < 1 && shown.km < .02) shown.km = 0;
  const done = Math.abs(goal.f - shown.f) < .0005 && Math.abs(goal.km - shown.km) < .005 && Math.abs(goal.z - shown.z) < .002;
  if (done) { shown.f = goal.f; shown.km = goal.km; shown.z = goal.z; }
  render(shown.f, shown.km, shown.z, goal.n);
  if (done) { running = false; lastT = 0; settleCamera(); } else requestAnimationFrame(frame);
}
function onScroll() {
  if (running) return;
  running = true;
  requestAnimationFrame(frame);
}
addEventListener('scroll', () => { paused = false; onScroll(); }, { passive: true });
addEventListener('resize', () => { map.invalidateSize(); drawElevation(); onScroll(); });
markers.forEach((m, i) => m.on('click', () => scrollToKm(cumKm[stopIdx[i]])));

useLayer(0);
map.setView(overview().center, overview().zoom);
document.fonts?.ready.then(drawElevation);
goal = readScroll();
Object.assign(shown, { f: goal.f, km: goal.km, z: goal.z });
render(shown.f, shown.km, shown.z, goal.n);


// --- Preload map tiles along the whole route at the walking zoom, so panning doesn't wait on the network ---
let prefetchRun = 0, prefetchTimer;
// redone whenever the map style or the walking zoom changes
function schedulePrefetch() {
  clearTimeout(prefetchTimer);
  prefetchTimer = setTimeout(prefetchRouteTiles, 500);
}
function prefetchRouteTiles() {
  const run = ++prefetchRun;
  const layer = activeLayer.layer, o = layer.options;
  const zs = dayLayout().zs, T = o.tileSize || 256, z = Math.round(zs[0] + zoomOffset);
  const size = map.getSize();
  const urls = new Set();
  const subs = typeof o.subdomains === 'string' ? o.subdomains.split('') : o.subdomains || ['a'];
  // tiles Leaflet would request for a view centred on `ll` at zoom `zoom`
  const addView = (ll, zoom) => {
    const tz = Math.min(Math.round(zoom), o.maxNativeZoom ?? 99), scale = map.getZoomScale(zoom, tz);   // styles with less detail stop at their last level
    const p = map.project(ll, tz), hx = size.x / 2 / scale, hy = size.y / 2 / scale;
    const x0 = Math.floor((p.x - hx) / T), x1 = Math.floor((p.x + hx) / T);
    const y0 = Math.floor((p.y - hy) / T), y1 = Math.floor((p.y + hy) / T);
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++)
      urls.add(L.Util.template(layer._url, { ...o, s: subs[Math.abs(x + y) % subs.length], x, y, z: tz + (o.zoomOffset || 0), r: '' }));
  };
  for (let e = 0; e <= 1.0001; e += .05) { const v = introView(e, zs[0] + zoomOffset); addView(v.center, v.zoom); }
  for (let km = 0; km <= totalLineKm; km += 2) addView(pointAtKm(km).ll, zs[dayOfKm(km)] + zoomOffset);
  const queue = [...urls];
  let active = 0;
  const next = () => {
    if (run !== prefetchRun) return;
    while (active < 4 && queue.length) {
      active++;
      const img = new Image();
      img.onload = img.onerror = () => { active--; next(); };
      img.src = queue.shift();
    }
  };
  next();
}
// start once the opening view has loaded
activeLayer.layer.once('load', schedulePrefetch);

// --- Keep the map above the footer ---
// The map is pinned to the right edge; when the footer scrolls into view the map's bottom edge
// rises with it, so the footer (and its divider) can run the full width of the page.
(() => {
  const col = document.querySelector('.map-col'), foot = document.querySelector('footer');
  if (!col || !foot) return;
  let last = null, raf = 0;
  const fit = () => {
    raf = 0;
    // phones, or map hidden (only the small Show map button is left): use the stylesheet's position
    if (mapOnTop() || document.body.classList.contains('map-off')) { if (last !== null) { col.style.bottom = ''; last = null; map.invalidateSize({ pan: false }); } return; }
    const b = Math.max(10, innerHeight - foot.getBoundingClientRect().top + 10);
    if (b === last) return;
    last = b; col.style.bottom = b + 'px';
    map.invalidateSize({ pan: false }); drawElevation();
  };
  const ask = () => { if (!raf) raf = requestAnimationFrame(fit); };
  addEventListener('scroll', ask, { passive: true }); addEventListener('resize', ask); addEventListener('layoutchange', ask); fit();
})();
