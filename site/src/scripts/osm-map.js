import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const COLORS = {
  graffiti: '#ffb703',
  'outdoor-art': '#58a6ff',
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function initMap(el) {
  if (el.dataset.ready) return;
  const jsonEl = el.querySelector('script[type="application/json"]');
  if (!jsonEl) return;
  el.dataset.ready = '1';

  const { markers = [], center, zoom = 12, fit = true } = JSON.parse(jsonEl.textContent);
  const map = L.map(el, { scrollWheelZoom: false });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map);

  const latlngs = [];
  for (const marker of markers) {
    if (marker.lat == null || marker.lon == null) continue;
    const latlng = [marker.lat, marker.lon];
    latlngs.push(latlng);
    const color = COLORS[marker.category] ?? '#e6edf3';
    const layer = L.circleMarker(latlng, {
      radius: 8,
      color,
      fillColor: color,
      fillOpacity: 0.9,
      weight: 2,
    });
    if (marker.title && marker.href) {
      layer.bindPopup(`<a href="${escapeHtml(marker.href)}">${escapeHtml(marker.title)}</a>`);
    } else if (marker.title) {
      layer.bindPopup(escapeHtml(marker.title));
    }
    layer.addTo(map);
  }

  const fallback = center ?? { lat: 49.8954, lon: -97.1385 };
  if (fit && latlngs.length > 1) {
    map.fitBounds(latlngs, { padding: [28, 28], maxZoom: 15 });
  } else if (fit && latlngs.length === 1) {
    map.setView(latlngs[0], zoom || 16);
  } else {
    map.setView([fallback.lat, fallback.lon], zoom || 12);
  }
}

function boot() {
  for (const el of document.querySelectorAll('[data-osm-map]')) initMap(el);
}

boot();
