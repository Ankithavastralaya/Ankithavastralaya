// Product Order tab: a photo grid the owner reorders by dragging tiles
// with the mouse (native HTML5 drag-and-drop, no library). Scope buttons
// switch between the home page and each category — home order is stored
// as a plain array of product IDs in meta/homeOrder, category orders are
// stored as sibling fields on meta/categoryOrder (one array per category
// slug). The storefront (js/catalog.js) sorts by whichever list applies,
// putting anything not yet in it at the end.

import { db } from '../../js/firebase-init.js';
import { collection, getDocs, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const CATEGORY_LABELS = {
  sarees: 'Sarees',
  unstitched: 'Dress Materials',
  readymade: 'Ready-Made Dresses',
  jewellery: 'Jewellery'
};

const list = document.getElementById('home-order-list');
const saveBtn = document.getElementById('home-order-save');
const scopeRow = document.getElementById('order-scope-row');
const scopeNote = document.getElementById('order-scope-note');
let draggedTile = null;
let currentScope = 'home';
let allProductsCache = null;

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
      <span class="home-order-id">${escapeHtml(product.id)}</span>
      <span class="home-order-name">${escapeHtml(product.name)}</span>
    </div>`;
}

async function getAllProductsCached() {
  if (!allProductsCache) {
    const snap = await getDocs(collection(db, 'products'));
    allProductsCache = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p.active !== false);
  }
  return allProductsCache;
}

async function loadOrder(scope) {
  const all = await getAllProductsCached();
  const products = scope === 'home' ? all : all.filter(p => p.category === scope);

  let savedOrder = [];
  if (scope === 'home') {
    const snap = await getDoc(doc(db, 'meta', 'homeOrder'));
    savedOrder = snap.exists() ? (snap.data().ids || []) : [];
  } else {
    const snap = await getDoc(doc(db, 'meta', 'categoryOrder'));
    savedOrder = snap.exists() ? (snap.data()[scope] || []) : [];
  }

  const byId = new Map(products.map(p => [p.id, p]));
  const ordered = [];
  savedOrder.forEach(id => { if (byId.has(id)) { ordered.push(byId.get(id)); byId.delete(id); } });
  byId.forEach(p => ordered.push(p));

  if (!ordered.length) {
    list.innerHTML = '<p class="admin-empty-note">No active products in this section yet.</p>';
    return;
  }
  list.innerHTML = ordered.map(tileHTML).join('');
  list.querySelectorAll('.home-order-tile').forEach(makeDraggable);
}

scopeRow.querySelectorAll('.order-status-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    scopeRow.querySelectorAll('.order-status-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentScope = btn.dataset.scope;
    scopeNote.textContent = currentScope === 'home'
      ? "Drag a product to reorder it — this is the order they'll show on the home page. New products you haven't arranged yet appear at the end until you place them. Don't forget Save."
      : `Drag a product to reorder it — this is the order they'll show on the ${CATEGORY_LABELS[currentScope]} category page. New products you haven't arranged yet appear at the end until you place them. Don't forget Save.`;
    loadOrder(currentScope);
  });
});

saveBtn.addEventListener('click', async () => {
  const ids = Array.from(list.querySelectorAll('.home-order-tile')).map(tile => tile.dataset.id);
  if (currentScope === 'home') {
    await setDoc(doc(db, 'meta', 'homeOrder'), { ids }, { merge: true });
  } else {
    await setDoc(doc(db, 'meta', 'categoryOrder'), { [currentScope]: ids }, { merge: true });
  }
  showToast('Order saved');
});

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), 2800);
}

document.addEventListener('DOMContentLoaded', () => loadOrder('home'));
