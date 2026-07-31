// Instagram Videos tab: 4 plain URL inputs, saved to meta/instagramVideos.
// The public storefront's js/instagram.js reads this same doc live.

import { db } from '../../js/firebase-init.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const form = document.getElementById('insta-form');
const inputs = [0, 1, 2, 3].map(i => document.getElementById('insta-url-' + i));

async function loadInstagramUrls() {
  const snap = await getDoc(doc(db, 'meta', 'instagramVideos'));
  const urls = snap.exists() ? (snap.data().urls || []) : [];
  inputs.forEach((input, i) => { input.value = urls[i] || ''; });
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const urls = inputs.map(input => input.value.trim() || null);
  await setDoc(doc(db, 'meta', 'instagramVideos'), { urls }, { merge: true });
  showToast('Instagram links saved');
});

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), 2800);
}

document.addEventListener('DOMContentLoaded', loadInstagramUrls);
