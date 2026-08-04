// Renders the "Trending Now" video row — any number of direct video links
// (not Instagram-specific; any playable video URL works), each as a real
// <video> the customer can actually play. Links come live from Firestore
// (meta/trendingVideos), managed from the admin dashboard's Trending
// Videos tab, where the owner can add as many as she wants.

import { db } from './firebase-init.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

function escapeHtmlAttr(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function videoSlotHTML(url) {
  return `
    <div class="insta-video-slot">
      <video src="${escapeHtmlAttr(url)}" controls playsinline preload="metadata"></video>
    </div>`;
}

async function getTrendingVideoUrls() {
  try {
    const snap = await getDoc(doc(db, 'meta', 'trendingVideos'));
    const urls = snap.exists() ? (snap.data().urls || []) : [];
    return urls.filter(Boolean);
  } catch (e) {
    return [];
  }
}

async function renderInstagramVideos(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const urls = await getTrendingVideoUrls();
  const section = container.closest('section');

  if (!urls.length) {
    if (section) section.style.display = 'none';
    return;
  }
  if (section) section.style.display = '';

  container.innerHTML = urls.map(videoSlotHTML).join('');
  // The scroll buttons (js/hscroll-buttons.js) size themselves up once at
  // load, before this async Firestore fetch resolves — nudge them to
  // re-check now that the row actually has content, instead of relying on
  // their blind timeout guess (which a slow connection could outrun).
  container.dispatchEvent(new Event('scroll'));
}

window.renderInstagramVideos = renderInstagramVideos;
