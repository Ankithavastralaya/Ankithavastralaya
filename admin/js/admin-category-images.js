// Category Images (part of the Homepage Media tab): one direct image link
// per fixed category slot, saved to meta/categoryImages. The home page's
// category tiles (js/category-tile-images.js) read this same doc live —
// no files in the project folder involved at all anymore.

import { db } from '../../js/firebase-init.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const CATEGORIES = ['sarees', 'unstitched', 'readymade', 'jewellery'];
const form = document.getElementById('category-images-form');

async function loadCategoryImages() {
  const snap = await getDoc(doc(db, 'meta', 'categoryImages'));
  const data = snap.exists() ? snap.data() : {};
  CATEGORIES.forEach(cat => {
    document.getElementById('cat-img-' + cat).value = data[cat] || '';
  });
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = {};
  CATEGORIES.forEach(cat => {
    data[cat] = document.getElementById('cat-img-' + cat).value.trim();
  });
  await setDoc(doc(db, 'meta', 'categoryImages'), data, { merge: true });
  showToast('Category images saved');
});

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), 2800);
}

document.addEventListener('DOMContentLoaded', loadCategoryImages);
