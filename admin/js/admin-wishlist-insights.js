// Wishlist Insights tab: two views sharing the same live products data —
// (1) joins wishlistCounts (js/wishlist-sync.js — customers' browsers
// increment/decrement these directly, no identity attached) against
// products to show what's currently wishlisted, most-first; (2) lists
// notifyRequests (js/wishlist-notify.js — a customer's optional email/
// phone opt-in) so the owner can reach out once something's restocked.

import { db } from '../../js/firebase-init.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const CATEGORY_LABELS = {
  sarees: 'Sarees',
  unstitched: 'Unstitched Dress Materials',
  readymade: 'Ready-Made Dresses',
  jewellery: 'Jewellery'
};
const STOCK_LABELS = { in_stock: 'In Stock', pre_order: 'Pre-Order', sold_out: 'Sold Out' };

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderWishlistCounts(productsById, countsSnap) {
  const tbody = document.getElementById('wishlist-tbody');
  const emptyNote = document.getElementById('wishlist-empty');

  const rows = countsSnap.docs
    .map(d => ({ product: productsById.get(d.id), count: Number(d.data().count) || 0 }))
    // A product may have been deleted since it was wishlisted, or its
    // count nudged to 0/negative by adds and removes cancelling out —
    // neither is useful to show here.
    .filter(r => r.product && r.count > 0)
    .sort((a, b) => b.count - a.count);

  if (!rows.length) {
    tbody.innerHTML = '';
    emptyNote.style.display = 'block';
    return;
  }
  emptyNote.style.display = 'none';
  tbody.innerHTML = rows.map(({ product, count }) => `
    <tr>
      <td><img src="${escapeHtml((product.photos && product.photos[0]) || '')}" alt=""></td>
      <td>${escapeHtml(product.name)} <span class="product-id-cell">(${escapeHtml(product.id)})</span></td>
      <td>${CATEGORY_LABELS[product.category] || product.category}</td>
      <td>${STOCK_LABELS[product.stockStatus] || product.stockStatus}</td>
      <td><b>${count}</b></td>
    </tr>`).join('');
}

function renderNotifyRequests(productsById, requestsSnap) {
  const tbody = document.getElementById('notify-requests-tbody');
  const emptyNote = document.getElementById('notify-requests-empty');

  const rows = requestsSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  if (!rows.length) {
    tbody.innerHTML = '';
    emptyNote.style.display = 'block';
    return;
  }
  emptyNote.style.display = 'none';
  tbody.innerHTML = rows.map(r => {
    const productNames = (r.productIds || [])
      .map(id => (productsById.get(id) || {}).name || id)
      .join(', ') || '—';
    return `
    <tr>
      <td>${escapeHtml(r.email || '—')}</td>
      <td>${escapeHtml(r.phone || '—')}</td>
      <td>${escapeHtml(productNames)}</td>
      <td>${r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN') : '—'}</td>
    </tr>`;
  }).join('');
}

async function loadWishlistInsights() {
  const [productsSnap, countsSnap, requestsSnap] = await Promise.all([
    getDocs(collection(db, 'products')),
    getDocs(collection(db, 'wishlistCounts')),
    getDocs(collection(db, 'notifyRequests'))
  ]);
  const productsById = new Map(productsSnap.docs.map(d => [d.id, { id: d.id, ...d.data() }]));

  renderWishlistCounts(productsById, countsSnap);
  renderNotifyRequests(productsById, requestsSnap);
}

document.addEventListener('DOMContentLoaded', loadWishlistInsights);
