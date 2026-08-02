// Top Selling tab: an open-ended repeater — add as many products as
// wanted (any category mix, no limit), each row a dropdown picking one
// active product. Saved as an ordered array of product IDs to
// meta/topSelling. The home page's "Top Selling" carousel (js/catalog.js
// initTopSelling) reads this same doc live.

import { db } from '../../js/firebase-init.js';
import { collection, getDocs, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const CATEGORY_LABELS = {
  sarees: 'Sarees',
  unstitched: 'Unstitched Dress Materials',
  readymade: 'Ready-Made Dresses',
  jewellery: 'Jewellery'
};

const repeater = document.getElementById('top-selling-repeater');
const form = document.getElementById('top-selling-form');
let optionsHTML = '<option value="">Choose a product…</option>';

function addProductRow(selectedId) {
  const row = document.createElement('div');
  row.className = 'repeater-row';
  row.innerHTML = `
    <select class="ts-product-select">${optionsHTML}</select>
    <button type="button" class="repeater-remove" aria-label="Remove">&times;</button>`;
  row.querySelector('.ts-product-select').value = selectedId || '';
  row.querySelector('.repeater-remove').addEventListener('click', () => row.remove());
  repeater.appendChild(row);
}

document.getElementById('top-selling-add').addEventListener('click', () => addProductRow());

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function loadTopSelling() {
  const [productsSnap, tsSnap] = await Promise.all([
    getDocs(collection(db, 'products')),
    getDoc(doc(db, 'meta', 'topSelling'))
  ]);
  const products = productsSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(p => p.active !== false);
  const savedIds = tsSnap.exists() ? (tsSnap.data().ids || []) : [];

  optionsHTML += products.map(p =>
    `<option value="${p.id}">${escapeHtml(p.name)} — ${CATEGORY_LABELS[p.category] || p.category} — Rs. ${Number(p.price || 0).toLocaleString('en-IN')}</option>`
  ).join('');

  repeater.innerHTML = '';
  savedIds.forEach(id => addProductRow(id));
  if (!savedIds.length) addProductRow();
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const ids = Array.from(repeater.querySelectorAll('.ts-product-select'))
    .map(s => s.value).filter(Boolean);
  await setDoc(doc(db, 'meta', 'topSelling'), { ids }, { merge: true });
  showToast('Top Selling saved');
});

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), 2800);
}

document.addEventListener('DOMContentLoaded', loadTopSelling);
