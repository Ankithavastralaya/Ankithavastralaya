// Top Selling tab: an open-ended repeater — add as many products as
// wanted (any category mix, no limit), each row a Product ID typed in
// directly (with a datalist of "ID — Name" suggestions to cut down on
// typos, but a plain text field, not a forced dropdown). Saved as an
// ordered array of product IDs to meta/topSelling. The home page's
// "Top Selling" carousel (js/catalog.js initTopSelling) reads this same
// doc live — an ID that doesn't match a real product just quietly
// doesn't show anything for that slot.

import { db } from '../../js/firebase-init.js';
import { collection, getDocs, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const repeater = document.getElementById('top-selling-repeater');
const form = document.getElementById('top-selling-form');
const datalist = document.getElementById('ts-product-list');

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function addProductRow(productId) {
  const row = document.createElement('div');
  row.className = 'repeater-row';
  row.innerHTML = `
    <input type="text" class="ts-product-input" list="ts-product-list" placeholder="Product ID, e.g. AV-RMD-002" value="${escapeHtml(productId || '')}">
    <button type="button" class="repeater-remove" aria-label="Remove">&times;</button>`;
  row.querySelector('.repeater-remove').addEventListener('click', () => row.remove());
  repeater.appendChild(row);
}

document.getElementById('top-selling-add').addEventListener('click', () => addProductRow());

async function loadTopSelling() {
  const [productsSnap, tsSnap] = await Promise.all([
    getDocs(collection(db, 'products')),
    getDoc(doc(db, 'meta', 'topSelling'))
  ]);
  const products = productsSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(p => p.active !== false);
  const savedIds = tsSnap.exists() ? (tsSnap.data().ids || []) : [];

  datalist.innerHTML = products.map(p =>
    `<option value="${p.id}">${escapeHtml(p.name)}</option>`
  ).join('');

  repeater.innerHTML = '';
  savedIds.forEach(id => addProductRow(id));
  if (!savedIds.length) addProductRow();
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const ids = Array.from(repeater.querySelectorAll('.ts-product-input'))
    .map(i => i.value.trim()).filter(Boolean);
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
