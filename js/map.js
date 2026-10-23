// Earth Camino route map: the whole walk on an interactive map in the page, with a button per day,
// hand-drawn controls, a choice of map styles and an elevation profile underneath.

const STOPS = [
  ['Waterford', 52.2593, -7.1101], ['New Ross', 52.3962, -6.9366], ['St Mullins', 52.4887, -6.9286],
  ['Borris', 52.5996, -6.9262], ['Bagenalstown', 52.7003, -6.9587], ['Carlow', 52.8365, -6.9341],
  ['Athy', 52.9918, -6.9870], ['Monasterevin', 53.1410, -7.0646], ['Rathangan', 53.2214, -6.9967],
  ['Sallins', 53.2466, -6.6636], ['Clondalkin', 53.3203, -6.3944], ['Garden of Remembrance', 53.3540, -6.2641]
];
// Each day covers these route legs (leg i runs from STOPS[i] to STOPS[i+1]); date and times as on the page.
const DAYS = [
  { legs: [0, 1], km: 42, name: 'Waterford to St Mullins', date: 'Monday 9 November', times: ['9am – 12pm', '2pm – 5pm'] },
  { legs: [2, 3], km: 37.5, name: 'St Mullins to Bagenalstown', date: 'Tuesday 10 November', times: ['9am – 12pm', '2pm – 5pm'] },
  { legs: [4, 5], km: 41, name: 'Bagenalstown to Athy', date: 'Wednesday 11 November', times: ['9am – 12.30pm', '2pm – 5.30pm'] },
  { legs: [6, 7], km: 37.5, name: 'Athy to Rathangan', date: 'Thursday 12 November', times: ['9am – 12.30pm', '2pm – 4.30pm'] },
  { legs: [8, 9], km: 50, name: 'Rathangan to Clondalkin', date: 'Friday 13 November', times: ['9am – 2pm', '3pm – 6.30pm'] },
  { legs: [10], km: 12, name: 'Clondalkin to the Garden of Remembrance', date: 'Saturday 14 November', times: ['9am – 12pm', 'Climate March 1pm'] }
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
const dayPts = DAYS.map(d => flat.slice(legStart[d.legs[0]], legStart[d.legs[d.legs.length - 1] + 1] + 1));
const dayEnds = new Set(DAYS.map(d => d.legs[d.legs.length - 1] + 1));   // stops where a day finishes


// --- Map and layers (all free, no key needed) ---
// On phones one finger scrolls the page, not the map: the map pans with buttons and pinch, or freely in full screen.
const touch = L.Browser.mobile;
const map = L.map('map', { zoomControl: false, scrollWheelZoom: false, attributionControl: false, zoomSnap: .25, dragging: !touch, tap: false });
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
let activeLayer = null;
function useLayer(i) {
  if (activeLayer) { map.removeLayer(activeLayer.layer); if (activeLayer.overlay) map.removeLayer(activeLayer.overlay); }
  activeLayer = LAYERS[i];
  activeLayer.layer.addTo(map);
  if (activeLayer.overlay) activeLayer.overlay.addTo(map);
  renderInfo();
}
// the mouse wheel zooms the map only once the map has been clicked, so scrolling the page never gets caught
map.on('click', () => map.scrollWheelZoom.enable());
map.getContainer().addEventListener('mouseleave', () => map.scrollWheelZoom.disable());


// --- Route: one line per day, over a white halo. Hovering a day lifts it; clicking opens its times ---
let shownDay = 0;   // 0 = the whole route
const dayLines = DAYS.map((d, i) => {
  const halo = L.polyline(dayPts[i], { color: '#fff', weight: 9, opacity: .9, lineCap: 'round', lineJoin: 'round', interactive: false }).addTo(map);
  const line = L.polyline(dayPts[i], { color: ROUTE_COLOR, weight: 5, opacity: 1, lineCap: 'round', lineJoin: 'round' }).addTo(map);
  // a wide invisible line on top makes the route easy to hit with a finger
  const hit = L.polyline(dayPts[i], { color: '#000', weight: 22, opacity: 0 }).addTo(map);
  hit.bindTooltip(`Day ${i + 1}: ${d.name}`, { className: 'town', sticky: true, direction: 'top', offset: [0, -10] });
  hit.bindPopup(`<div class="day-pop"><span class="day-pop-n">Day ${i + 1} - ${d.date}</span><strong>${d.name}</strong><span class="day-pop-km">${d.km} km</span>` +
    d.times.map(t => `<span class="stage-time">${t}</span>`).join('') + `<a href="#day-${i + 1}">See the stages</a></div>`, { className: 'day-popup', maxWidth: Math.min(260, map.getSize().x - 150),   // narrower on a phone, so it fits beside the buttons
    // keep the popup, and its close button, clear of the buttons down the right and the elevation strip
    autoPanPaddingTopLeft: L.point(16, 16), autoPanPaddingBottomRight: L.point(60, 110) });
  hit.on('mouseover', () => lift(i, true));
  hit.on('mouseout', () => lift(i, false));
  hit.on('click', () => setChip(i + 1));
  return { halo, line, hit };
});
function lift(i, on) {
  dayLines[i].line.setStyle({ weight: on ? 7 : 5 });
  dayLines[i].halo.setStyle({ weight: on ? 12 : 9 });
}
// when one day is shown, the others fade back
function fadeOthers(day) {
  dayLines.forEach((l, i) => {
    const on = !day || i === day - 1;
    l.line.setStyle({ opacity: on ? 1 : .35 });
    l.halo.setStyle({ opacity: on ? .9 : .4 });
  });
}

// --- Stop markers: start and finish badges, a pin at every stop, and the name of each day's end ---
const ENDPOINT_HTML = {
  start: '<div class="endpoint start"><img src="img/icons/start.svg" alt=""><span>Start</span></div>',
  finish: '<div class="endpoint finish"><img src="img/icons/finish.svg" alt=""><span>Finish</span></div>'
};
STOPS.forEach((s, i) => {
  const start = i === 0, finish = i === STOPS.length - 1;
  const icon = start || finish
    ? L.divIcon({ className: '', html: ENDPOINT_HTML[start ? 'start' : 'finish'], iconSize: [32, 32], iconAnchor: [16, 16] })
    : L.divIcon({ className: '', html: `<div class="pin${dayEnds.has(i) ? ' end' : ''}"></div>`, iconSize: [16, 16], iconAnchor: [8, 8] });
  const m = L.marker([s[1], s[2]], { icon, keyboard: false, zIndexOffset: start || finish ? 500 : 0 }).addTo(map);
  const label = start || finish || dayEnds.has(i);
  const left = s[0] === 'Clondalkin';   // just before the finish badge: its name goes on the other side
  m.bindTooltip(s[0], { className: label ? 'town-label' + (finish ? ' finish-label' : '') : 'town', permanent: label, direction: left ? 'left' : 'right', offset: [start || finish ? 18 : left ? -10 : 10, 0] });
});

// --- Day buttons above the map ---
const wholeBounds = L.latLngBounds(flat);
const chips = [...document.querySelectorAll('.day-chips button')];
const fitPad = () => {
  const strip = document.querySelector('.profile')?.offsetParent ? 96 : 0;   // the elevation strip covers the bottom of the map
  return { paddingTopLeft: [70, 50], paddingBottomRight: [90, 40 + strip] };
};
function setChip(day) {
  shownDay = day;
  chips.forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.day === day)));
  fadeOthers(day);
  drawElevation();
}
function showDay(day) {
  map.closePopup();
  setChip(day);
  map.flyToBounds(day ? L.latLngBounds(dayPts[day - 1]) : wholeBounds, { ...fitPad(), duration: .8 });
}
chips.forEach(b => b.addEventListener('click', () => showDay(+b.dataset.day)));


// --- Controls ---
// hand-drawn control icons (img/controls), one per button
const icons = { plus: 'zoom-in', minus: 'zoom-out', layers: 'layers', full: 'fullscreen', download: 'download' };
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
    group([['plus', 'Zoom in', () => map.zoomIn(1)], ['minus', 'Zoom out', () => map.zoomOut(1)]]);
    group([['layers', 'Map style', toggleLayers]]);
    group([['full', 'Full screen', toggleFullscreen]]);
    group([['download', 'Download route (GPX)', downloadGpx]]);
    L.DomEvent.disableClickPropagation(box);
    return box;
  }
});
new Buttons().addTo(map);

const mapBox = document.querySelector('.map-box');
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
    '<p><b>Route</b>OpenStreetMap walking directions, approximate</p><p><b>Elevation</b>Open-Meteo, Copernicus DEM</p><p class="made">Made with Leaflet for the Earth Camino</p>';
}
infoBtn.addEventListener('click', () => {
  infoPanel.hidden = !infoPanel.hidden;
  infoBtn.setAttribute('aria-expanded', String(!infoPanel.hidden));
});

// in full screen the map can be dragged with one finger too
function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else mapBox.requestFullscreen?.().catch(() => {});
}
document.addEventListener('fullscreenchange', () => {
  if (touch) document.fullscreenElement ? map.dragging.enable() : map.dragging.disable();
  setTimeout(() => { map.invalidateSize(); drawElevation(); }, 100);
});

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
const eMax = Math.max(...ELEV.map(e => e[1]));
const totalKm = ELEV.length ? ELEV[ELEV.length - 1][0] : 1;
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
  area(0, totalKm, 'rgba(244,199,168,.55)');            // peach, like the blobs behind the icons
  if (shownDay) {   // the day picked above the map, in the route orange
    const d = DAYS[shownDay - 1];
    area(cumKm[legStart[d.legs[0]]], cumKm[legStart[d.legs[d.legs.length - 1] + 1]], 'rgba(217,98,43,.45)');
  }
  if (rc) rc.linearPath(ELEV.map(([k, m]) => [x(k), y(m)]), { stroke: ROUTE_COLOR, strokeWidth: 2.2, roughness: .8, bowing: .4, seed: 7 });
  else {
    c.beginPath();
    ELEV.forEach(([k, m], i) => i ? c.lineTo(x(k), y(m)) : c.moveTo(x(k), y(m)));
    c.strokeStyle = ROUTE_COLOR; c.lineWidth = 2.5; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke();
  }

  // hover line
  const mark = (km, color) => line(x(km), top, x(km), h - bottom, { stroke: color, strokeWidth: 1.2, seed: 61 });
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
// clicking the profile flies the map to that point on the walk
canvas.addEventListener('click', e => map.flyTo(flat[idxAtKm(kmAtEvent(e))], 13, { duration: .8 }));
addEventListener('resize', () => { map.invalidateSize(); drawElevation(); });

useLayer(0);
map.fitBounds(wholeBounds, fitPad());
document.fonts?.ready.then(drawElevation);
drawElevation();
