// Hero Section Images (part of the Homepage Media tab): an open-ended
// repeater of direct image links, same pattern as Trending Videos, saved
// to meta/heroImages. The home page slideshow (js/hero-slideshow.js)
// reads this same doc live — no files in the project folder involved at
// all anymore.

import { db } from '../../js/firebase-init.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const repeater = document.getElementById('hero-images-repeater');
const form = document.getElementById('hero-images-form');

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function addImageRow(url) {
  const row = document.createElement('div');
  row.className = 'repeater-row';
  row.innerHTML = `
    <input type="url" class="hero-image-input" placeholder="https://..." value="${escapeHtml(url || '')}">
    <button type="button" class="repeater-remove" aria-label="Remove">&times;</button>`;
  row.querySelector('.repeater-remove').addEventListener('click', () => row.remove());
  repeater.appendChild(row);
}

document.getElementById('hero-images-add').addEventListener('click', () => addImageRow());

async function loadHeroImages() {
  const snap = await getDoc(doc(db, 'meta', 'heroImages'));
  const urls = snap.exists() ? (snap.data().urls || []) : [];
  repeater.innerHTML = '';
  urls.forEach(url => addImageRow(url));
  if (!urls.length) addImageRow();
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const urls = Array.from(repeater.querySelectorAll('.hero-image-input'))
    .map(i => i.value.trim()).filter(Boolean);
  await setDoc(doc(db, 'meta', 'heroImages'), { urls }, { merge: true });
  showToast('Hero images saved');
});

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), 2800);
}

document.addEventListener('DOMContentLoaded', loadHeroImages);
