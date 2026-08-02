// Homepage Order tab: a photo grid the owner reorders by dragging tiles
// with the mouse (native HTML5 drag-and-drop, no library). Order is
// stored as a plain array of product IDs in meta/homeOrder — the
// storefront (js/catalog.js) sorts by this list, putting anything not
// yet in it at the end.

import { db } from '../../js/firebase-init.js';
import { collection, getDocs, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const list = document.getElementById('home-order-list');
const saveBtn = document.getElementById('home-order-save');
let draggedTile = null;

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function makeDraggable(tile) {
  tile.draggable = true;
  tile.addEventListener('dragstart', () => {
    draggedTile = tile;
    tile.classList.add('dragging');
  });
  tile.addEventListener('dragend', () => {
    tile.classList.remove('dragging');
    draggedTile = null;
  });
  tile.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (!draggedTile || draggedTile === tile) return;
    const rect = tile.getBoundingClientRect();
    const before = (e.clientX - rect.left) < rect.width / 2;
    tile.parentNode.insertBefore(draggedTile, before ? tile : tile.nextSibling);
  });
}

function tileHTML(product) {
  const photo = (product.photos && product.photos[0]) || '';
  return `
    <div class="home-order-tile" data-id="${product.id}">
      <img src="${escapeHtml(photo)}" alt="">
      <span class="home-order-name">${escapeHtml(product.name)}</span>
    </div>`;
}

async function loadHomeOrder() {
  const [productsSnap, orderSnap] = await Promise.all([
    getDocs(collection(db, 'products')),
    getDoc(doc(db, 'meta', 'homeOrder'))
  ]);
  const products = productsSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(p => p.active !== false);
  const savedOrder = orderSnap.exists() ? (orderSnap.data().ids || []) : [];

  const byId = new Map(products.map(p => [p.id, p]));
  const ordered = [];
  savedOrder.forEach(id => { if (byId.has(id)) { ordered.push(byId.get(id)); byId.delete(id); } });
  byId.forEach(p => ordered.push(p));

  if (!ordered.length) {
    list.innerHTML = '<p class="admin-empty-note">No active products yet.</p>';
    return;
  }
  list.innerHTML = ordered.map(tileHTML).join('');
  list.querySelectorAll('.home-order-tile').forEach(makeDraggable);
}

saveBtn.addEventListener('click', async () => {
  const ids = Array.from(list.querySelectorAll('.home-order-tile')).map(tile => tile.dataset.id);
  await setDoc(doc(db, 'meta', 'homeOrder'), { ids }, { merge: true });
  showToast('Homepage order saved');
});

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), 2800);
}

document.addEventListener('DOMContentLoaded', loadHomeOrder);
