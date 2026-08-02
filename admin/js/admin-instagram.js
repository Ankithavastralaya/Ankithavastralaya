// Trending Videos tab: an open-ended repeater of direct video links (any
// playable video URL, not Instagram-specific) saved to meta/trendingVideos.
// The public storefront's js/instagram.js reads this same doc live and
// renders every link as a real <video> — no fixed count.

import { db } from '../../js/firebase-init.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const repeater = document.getElementById('insta-videos-repeater');
const form = document.getElementById('insta-form');

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function addVideoRow(url) {
  const row = document.createElement('div');
  row.className = 'repeater-row';
  row.innerHTML = `
    <input type="url" class="insta-video-input" placeholder="https://..." value="${escapeHtml(url || '')}">
    <button type="button" class="repeater-remove" aria-label="Remove">&times;</button>`;
  row.querySelector('.repeater-remove').addEventListener('click', () => row.remove());
  repeater.appendChild(row);
}

document.getElementById('insta-videos-add').addEventListener('click', () => addVideoRow());

async function loadTrendingVideos() {
  const snap = await getDoc(doc(db, 'meta', 'trendingVideos'));
  const urls = snap.exists() ? (snap.data().urls || []) : [];
  repeater.innerHTML = '';
  urls.forEach(url => addVideoRow(url));
  if (!urls.length) addVideoRow();
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const urls = Array.from(repeater.querySelectorAll('.insta-video-input'))
    .map(i => i.value.trim()).filter(Boolean);
  await setDoc(doc(db, 'meta', 'trendingVideos'), { urls }, { merge: true });
  showToast('Trending videos saved');
});

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), 2800);
}

document.addEventListener('DOMContentLoaded', loadTrendingVideos);
